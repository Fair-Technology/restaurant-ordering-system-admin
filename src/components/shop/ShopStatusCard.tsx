import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useLazyGetGoLiveStatusQuery, useUpdateShopMutation } from '../../services/api';
import {
  ORDERS_PAUSED_MESSAGE_MAX,
  canGoOnline,
  canToggleOrdersPause,
  cleanOrdersPausedMessage,
  isOfflineBySuperadminError,
  shopLiveState,
} from '../../features/shops/shopStatus';
import { useToast } from '../../contexts/ToastContext';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';
import { MySwitch } from '../ui/MySwitch';
import { GoLiveCriteriaModal, PauseShopModal } from './GoLiveModal';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

/**
 * The shop's two status switches: Online (off = the storefront shows no menu at all) and
 * Pause orders (menu stays, ordering refused), plus the optional message diners see while paused.
 */
export function ShopStatusCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const shopId = shop.id!;
  const [updateShop, { isLoading: saving }] = useUpdateShopMutation();
  const [fetchGoLiveStatus, { data: goLiveStatus, isFetching: goLiveChecking }] = useLazyGetGoLiveStatusQuery();
  const [modal, setModal] = useState<'criteria' | 'offline' | null>(null);
  const [messageState, setMessageState] = useState<string | null>(null);

  const liveState = shopLiveState(shop);
  const online = liveState !== 'offline';
  const takenOfflineByPlatform = shop.offlineBySuperadmin === true;
  const message = messageState ?? shop.ordersPausedMessage ?? '';
  const busy = saving || goLiveChecking;

  const save = async (updateShopRequest: Parameters<typeof updateShop>[0]['updateShopRequest'], saved?: string) => {
    try {
      await updateShop({ shopId, updateShopRequest }).unwrap();
      onRefetch();
      if (saved) toast.success(saved);
      return true;
    } catch (err) {
      toast.error(isOfflineBySuperadminError(err) ? t('nav.offlineBySuperadminToast') : t('shops.statusFailedToSave'));
      return false;
    }
  };

  // Going offline asks for confirmation; going online first runs the go-live checklist
  const changeOnline = async (next: boolean) => {
    if (!next) {
      setModal('offline');
      return;
    }
    const result = await fetchGoLiveStatus({ shopId }).unwrap();
    if (result.allMet) await save({ isPaused: false });
    else setModal('criteria');
  };

  return (
    <MyCard className="p-5 space-y-5" id="shop-status">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{t('shops.shopStatusTitle')}</p>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="shop-online-label" className="text-sm font-medium text-gray-900">
            {t('shops.statusOnline')}
          </p>
          <p id="shop-online-help" className="text-sm text-gray-500">
            {t('shops.statusOnlineHelp')}
          </p>
          {takenOfflineByPlatform && <p className="mt-1 text-sm text-red-600">{t('nav.offlineBySuperadmin')}</p>}
        </div>
        <MySwitch
          checked={online}
          onChange={changeOnline}
          disabled={busy || !canGoOnline(shop)}
          labelledBy="shop-online-label"
          describedBy="shop-online-help"
        />
      </div>

      <div className="border-t border-gray-200 pt-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="orders-paused-label" className="text-sm font-medium text-gray-900">
              {t('shops.statusPaused')}
            </p>
            <p id="orders-paused-help" className="text-sm text-gray-500">
              {t('shops.statusPauseHelp')}
            </p>
          </div>
          <MySwitch
            checked={shop.ordersPaused === true}
            onChange={(next) => save({ ordersPaused: next })}
            disabled={busy || !canToggleOrdersPause(shop)}
            labelledBy="orders-paused-label"
            describedBy="orders-paused-help"
          />
        </div>
        {liveState === 'ordersPaused' && (
          <div className="space-y-2">
            <span className="text-sm text-gray-600">{t('shops.statusPauseMessage')}</span>
            <MyInput
              maxLength={ORDERS_PAUSED_MESSAGE_MAX}
              value={message}
              placeholder={t('shops.statusPauseMessagePlaceholder')}
              onChange={(e) => setMessageState(e.target.value)}
            />
            <MyButton
              size="sm"
              disabled={busy || messageState === null}
              onClick={async () => {
                if (await save({ ordersPausedMessage: cleanOrdersPausedMessage(message) }, t('shops.statusSaved'))) {
                  setMessageState(null);
                }
              }}
            >
              {t('shops.statusSaveMessage')}
            </MyButton>
          </div>
        )}
      </div>

      {modal === 'criteria' && goLiveStatus && (
        <GoLiveCriteriaModal shopId={shopId} status={goLiveStatus} onClose={() => setModal(null)} />
      )}
      {modal === 'offline' && (
        <PauseShopModal
          shopId={shopId}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            onRefetch();
          }}
        />
      )}
    </MyCard>
  );
}
