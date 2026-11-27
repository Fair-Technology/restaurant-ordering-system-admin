import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useNow } from '../../features/orders/useNow';
import type { GetShopResultDto } from '../../services/api';
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
import { TakeShopOfflineModal } from './GoLiveModal';
import { PauseOrdersDialog } from './PauseOrdersDialog';

interface Props {
  shop: GetShopResultDto;
  onRefetch: () => void;
}

/**
 * The shop's two status switches: Online (off = the storefront shows no menu at all) and
 * Accepting orders (off = paused: menu stays, ordering refused), plus the optional message
 * diners see while paused. On always means normal operation.
 */
export function ShopStatusCard({ shop, onRefetch }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const shopId = shop.id!;
  const [updateShop, { isLoading: saving }] = useUpdateShopMutation();
  const [fetchGoLiveStatus, { isFetching: goLiveChecking }] = useLazyGetGoLiveStatusQuery();
  const [modal, setModal] = useState<'offline' | 'pauseOrders' | null>(null);
  const [messageState, setMessageState] = useState<string | null>(null);

  const nowMs = useNow(30_000);
  const liveState = shopLiveState(shop, nowMs);
  const online = liveState !== 'offline';
  const takenOfflineByPlatform = shop.offlineBySuperadmin === true;
  const message = messageState ?? shop.ordersPausedMessage ?? '';
  const busy = saving || goLiveChecking;

  const save = async (updateShopRequest: Parameters<typeof updateShop>[0]['body'], saved?: string) => {
    try {
      await updateShop({ shopId, body: updateShopRequest }).unwrap();
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
    try {
      const result = await fetchGoLiveStatus({ shopId }).unwrap();
      if (result.allMet) await save({ isPaused: false });
      else navigate(`/shops/${shopId}/go-live`);
    } catch {
      toast.error(t('shops.statusFailedToSave'));
    }
  };

  return (
    <Section
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
          disabled={!canGoOnline(shop)}
          isPending={busy}
          labelledBy="shop-online-label"
          describedBy="shop-online-help"
        />
      </div>

      <div className="mt-4 space-y-3 border-t border-line-soft pt-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p id="accepting-orders-label" className="text-sm font-semibold text-ink">
              {t('shops.statusAcceptingOrders')}
            </p>
            <p id="accepting-orders-help" className="text-[13px] text-muted">
              {t('shops.statusAcceptingOrdersHelp')}
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
            checked={!isOrdersPausedAt(shop, nowMs)}
            onChange={(next) => (next ? save({ ordersPaused: false }) : setModal('pauseOrders'))}
            disabled={!canToggleOrdersPause(shop, nowMs)}
            isPending={busy}
            labelledBy="accepting-orders-label"
            describedBy="accepting-orders-help"
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
              disabled={messageState === null}
              isPending={busy}
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
