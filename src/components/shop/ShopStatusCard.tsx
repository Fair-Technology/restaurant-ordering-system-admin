import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNow } from '../../features/orders/useNow';
import type { ShopResponse } from '../../services/api';
import { useLazyGetGoLiveStatusQuery, useUpdateShopMutation } from '../../services/api';
import {
  ORDERS_PAUSED_MESSAGE_MAX,
  canGoOnline,
  canToggleOrdersPause,
  cleanOrdersPausedMessage,
  formatPauseEnd,
  isOfflineBySuperadminError,
  isOrdersPausedAt,
  shopLiveState,
} from '../../features/shops/shopStatus';
import { useToast } from '../../contexts/ToastContext';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';
import { MySwitch } from '../ui/MySwitch';
import { GoLiveCriteriaModal, TakeShopOfflineModal } from './GoLiveModal';
import { PauseOrdersDialog } from './PauseOrdersDialog';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

/**
 * The shop's two status switches: Online (off = the storefront shows no menu at all) and
 * Pause orders (menu stays, ordering refused), plus the optional message diners see while paused.
 */
export function ShopStatusCard({ shop, onRefetch }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const shopId = shop.id!;
  const [updateShop, { isLoading: saving }] = useUpdateShopMutation();
  const [fetchGoLiveStatus, { data: goLiveStatus, isFetching: goLiveChecking }] = useLazyGetGoLiveStatusQuery();
  const [modal, setModal] = useState<'criteria' | 'offline' | 'pauseOrders' | null>(null);
  const [messageState, setMessageState] = useState<string | null>(null);

  const nowMs = useNow(30_000);
  const liveState = shopLiveState(shop, nowMs);
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
    <Section
      id="shop-status"
      className="scroll-mt-[72px]! lg:scroll-mt-6!"
      title={t('shops.shopStatusTitle')}
      description={t('shops.settingsPage.statusDescription')}
      padded
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p id="shop-online-label" className="text-sm font-semibold text-ink">
            {t('shops.statusOnline')}
          </p>
          <p id="shop-online-help" className="text-[13px] text-muted">
            {t('shops.statusOnlineHelp')}
          </p>
          {takenOfflineByPlatform && <p className="mt-1 text-sm text-[#b42318]">{t('nav.offlineBySuperadmin')}</p>}
        </div>
        <MySwitch
          checked={online}
          onChange={changeOnline}
          disabled={busy || !canGoOnline(shop)}
          labelledBy="shop-online-label"
          describedBy="shop-online-help"
        />
      </div>

      <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="orders-paused-label" className="text-sm font-semibold text-ink">
              {t('shops.statusPaused')}
            </p>
            <p id="orders-paused-help" className="text-[13px] text-muted">
              {t('shops.statusPauseHelp')}
            </p>
            {liveState === 'ordersPaused' && shop.ordersPausedUntil && (
              <p className="text-[13px] text-muted">
                {t('shops.pausedUntil', {
                  time: formatPauseEnd(shop.ordersPausedUntil, shop.timezone ?? 'Europe/Berlin', i18n.language),
                })}
              </p>
            )}
          </div>
          <MySwitch
            checked={isOrdersPausedAt(shop, nowMs)}
            onChange={(next) => (next ? setModal('pauseOrders') : save({ ordersPaused: false }))}
            disabled={busy || !canToggleOrdersPause(shop, nowMs)}
            labelledBy="orders-paused-label"
            describedBy="orders-paused-help"
          />
        </div>
        {liveState === 'ordersPaused' && (
          <div className="space-y-2">
            <span className="block text-[13px] font-semibold text-[#4a413b]">{t('shops.statusPauseMessage')}</span>
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
        <TakeShopOfflineModal
          shopId={shopId}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null);
            onRefetch();
          }}
        />
      )}
      {modal === 'pauseOrders' && (
        <PauseOrdersDialog
          shopId={shopId}
          onClose={() => setModal(null)}
          onPaused={() => {
            setModal(null);
            onRefetch();
          }}
        />
      )}
    </Section>
  );
}
