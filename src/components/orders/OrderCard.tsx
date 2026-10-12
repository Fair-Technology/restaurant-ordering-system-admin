import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, PackageCheck, Truck, TriangleAlert } from 'lucide-react';
import {
  useAcceptOrderMutation,
  useCompleteOrderMutation,
  useDispatchOrderMutation,
  useMarkOrderReadyMutation,
  useRejectOrderMutation,
  type IntakeOrder,
  type RejectReason,
} from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import {
  REJECT_REASONS,
  formatCountdown,
  nextActionFor,
  prepChoices,
  scheduledReadyMs,
  secondsUntil,
} from '../../features/orders/intake';
import { chargedCents } from '../../features/orders/refunds';
import { formatCents } from '../../utils/money';
import { MyButton } from '../ui/MyButton';
import { ModeBadge, StateBadge } from './OrderBadges';

interface Props {
  shopId: string;
  order: IntakeOrder;
  nowMs: number;
  defaultPrepMinutes: number;
  timeZone: string;
  pendingAccept: boolean;
  onAcceptStart: (orderId: string, prepMinutes: number) => void;
  onAcceptFailed: (orderId: string) => void;
  onFailed: () => void;
}

type Panel = 'none' | 'accept' | 'reject';

function formatTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', timeZone });
}

export function OrderCard({
  shopId,
  order,
  nowMs,
  defaultPrepMinutes,
  timeZone,
  pendingAccept,
  onAcceptStart,
  onAcceptFailed,
  onFailed,
}: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>('none');
  const [acceptOrder, { isLoading: accepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: rejecting }] = useRejectOrderMutation();
  const [markReady, { isLoading: marking }] = useMarkOrderReadyMutation();
  const [dispatchOrder, { isLoading: dispatching }] = useDispatchOrderMutation();
  const [completeOrder, { isLoading: completing }] = useCompleteOrderMutation();
  const busy = accepting || rejecting || marking || dispatching || completing;

  const money = (cents: number) => formatCents(cents, order.currency, i18n.language);
  const countdown = secondsUntil(order.autoRejectAt, nowMs);
  const minutesAgo = Math.max(0, Math.floor((nowMs - Date.parse(order.createdAt)) / 60000));

  const run = async (action: () => Promise<unknown>) => {
    try {
      await action();
      setPanel('none');
    } catch {
      toast.error(t('orders.actionFailed'));
      onFailed();
    }
  };

  // The board shows the card as accepted from the first tap, so this card may be replaced by one in
  // another column before the server answers. Results therefore go only through the parent callbacks.
  const accept = async (minutes: number) => {
    onAcceptStart(order.id, minutes);
    try {
      await acceptOrder({ shopId, orderId: order.id, prepMinutes: minutes }).unwrap();
      setPanel('none');
    } catch {
      onAcceptFailed(order.id);
      toast.error(t('orders.actionFailed'));
      onFailed();
    }
  };

  const onReject = (reason: RejectReason) => {
    if (!window.confirm(t('orders.rejectConfirm', { ref: order.orderRef }))) return;
    void run(() => rejectOrder({ shopId, orderId: order.id, reason }).unwrap());
  };

  const touch = 'min-h-12';
  const paymentLine =
    order.paymentStatus === 'authorized'
      ? t('orders.reservedOnline', { amount: money(chargedCents(order)) })
      : order.paymentStatus === 'paid'
        ? t('orders.paidOnline', { amount: money(chargedCents(order)) })
        : money(chargedCents(order));
  const hasActions = ['PLACED', 'ACCEPTED', 'OUT_FOR_DELIVERY', 'READY'].includes(order.state);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex flex-col gap-2 border-b border-line-soft px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="text-xl font-bold tracking-[0.02em]">#{order.orderRef}</span>
          <ModeBadge order={order} large />
          <StateBadge order={order} />
          <span className="ml-auto inline-flex items-center gap-1 text-[13px] text-muted">
            <Clock size={14} aria-hidden="true" />
            {t('orders.placedAgo', { minutes: minutesAgo })}
          </span>
        </div>
        {(order.scheduledFor || order.autoAccepted || (order.table && order.fulfilmentMode !== 'dine_in')) && (
          <div className="flex flex-wrap gap-1.5">
            {order.table && order.fulfilmentMode !== 'dine_in' && (
              <span className="rounded-full bg-[#e0f2fe] px-2.5 py-0.5 text-[13px] font-bold text-[#075985]">
                {t('orders.table', { label: order.table.label })}
              </span>
            )}
            {order.scheduledFor && (
              <span className="rounded-full bg-sand px-2.5 py-0.5 text-[13px] font-semibold text-[#4a413b]">
                {t('orders.scheduledFor', { time: formatTime(order.scheduledFor, timeZone) })}
              </span>
            )}
            {order.autoAccepted && (
              <span className="rounded-full bg-[#e6f3ea] px-2.5 py-0.5 text-[13px] font-semibold text-[#1d5a32]">
                {t('orders.autoAccepted')}
              </span>
            )}
          </div>
        )}
        {order.state === 'PLACED' && countdown !== null && (
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#b42318]">
            <TriangleAlert size={16} aria-hidden="true" />
            {t('orders.autoRejectIn', { time: formatCountdown(countdown) })}
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2.5 border-b border-line-soft px-4 py-3">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex h-7 min-w-8 items-center justify-center rounded-lg bg-sand px-1.5 text-[15px] font-bold">
              {item.quantity}&times;
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-bold">{item.productName}</span>
              {item.selectedVariantOptionName && <span className="text-[13px] text-muted">{item.selectedVariantOptionName}</span>}
              {item.selectedAddonOptionNames && item.selectedAddonOptionNames.length > 0 && (
                <span className="text-[13px] text-muted">+ {item.selectedAddonOptionNames.join(', ')}</span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2.5 px-4 py-3 text-sm">
        {order.customerNotes && (
          <div className="rounded-[10px] border border-[#f1dfae] bg-[#fff6e0] px-3 py-2.5 text-[#5c3c00]">
            <strong className="block text-xs tracking-[0.06em] uppercase">{t('orders.notes')}</strong>
            {order.customerNotes}
          </div>
        )}
        {order.deliveryAddress && (
          <div className="rounded-[10px] border border-line bg-cream px-3 py-2.5 text-[#3a322d]">
            <strong className="block text-xs tracking-[0.06em] uppercase">{t('orders.deliverTo')}</strong>
            {order.deliveryAddress.street}, {order.deliveryAddress.postcode} {order.deliveryAddress.city}
            <a className="block font-semibold text-ink underline" href={`tel:${order.customerPhone}`}>
              {order.customerPhone}
            </a>
          </div>
        )}
        <div className="text-[#3a322d]">
          {order.customerName} &middot;{' '}
          <a href={`tel:${order.customerPhone}`} className="font-semibold text-ink underline">
            {order.customerPhone}
          </a>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-bold">{paymentLine}</span>
          {order.fulfilmentMode === 'delivery' && order.deliveryFeeCents != null && (
            <span className="text-[13px] text-muted">{t('orders.inclDeliveryFee', { amount: money(order.deliveryFeeCents) })}</span>
          )}
          {order.discount && (
            <span className="text-[13px] text-muted">
              {t('orders.inclDiscount', { code: order.discount.code, amount: money(order.discount.cents) })}
            </span>
          )}
        </div>
      </div>

      {hasActions && (
        <div className="flex flex-col gap-2 border-t border-line-soft px-4 pt-3 pb-4">
          {order.state === 'PLACED' && (
            <div className="space-y-2">
              {panel === 'none' && (
                <div className="grid grid-cols-2 gap-2">
                  <MyButton size="lg" className={touch} disabled={busy} onClick={() => setPanel('accept')}>
                    {t('orders.accept')}
                  </MyButton>
                  <MyButton size="lg" variant="danger" className={touch} disabled={busy} onClick={() => setPanel('reject')}>
                    {t('orders.reject')}
                  </MyButton>
                </div>
              )}
              {panel === 'accept' && (
                <div className="grid grid-cols-2 gap-2">
                  {order.scheduledFor ? (
                    <MyButton
                      size="lg"
                      className={`col-span-2 ${touch}`}
                      disabled={busy}
                      onClick={() => void accept(defaultPrepMinutes)}
                    >
                      {t('orders.acceptScheduled', {
                        time: formatTime(
                          new Date(scheduledReadyMs(order.scheduledFor, nowMs, defaultPrepMinutes)).toISOString(),
                          timeZone,
                        ),
                      })}
                    </MyButton>
                  ) : (
                    prepChoices(defaultPrepMinutes).map((minutes) => (
                      <MyButton
                        key={minutes}
                        size="lg"
                        className={touch}
                        disabled={busy}
                        onClick={() => void accept(minutes)}
                      >
                        {t('orders.acceptReadyIn', { minutes })}
                      </MyButton>
                    ))
                  )}
                </div>
              )}
              {panel === 'reject' && (
                <div className="grid grid-cols-2 gap-2">
                  {REJECT_REASONS.map((reason) => (
                    <MyButton
                      key={reason}
                      size="lg"
                      variant="danger"
                      className={touch}
                      disabled={busy}
                      onClick={() => onReject(reason)}
                    >
                      {t(`orders.rejectReason.${reason}`)}
                    </MyButton>
                  ))}
                </div>
              )}
              {panel !== 'none' && (
                <MyButton size="lg" variant="ghost" className={`w-full ${touch}`} onClick={() => setPanel('none')}>
                  {t('orders.cancel')}
                </MyButton>
              )}
            </div>
          )}

          {order.state === 'ACCEPTED' && (
            <div className="space-y-2">
              {order.readyAt && (
                <div className="text-[13px] font-bold text-ink">
                  {t(order.fulfilmentMode === 'delivery' ? 'orders.deliverBy' : 'orders.readyAt', {
                    time: formatTime(order.readyAt, timeZone),
                  })}
                </div>
              )}
              {pendingAccept && <div className="text-[13px] text-muted">{t('orders.acceptPending')}</div>}
              {nextActionFor(order) === 'dispatch' ? (
                <MyButton
                  size="lg"
                  className={`w-full gap-2 ${touch}`}
                  disabled={busy || pendingAccept}
                  onClick={() => void run(() => dispatchOrder({ shopId, orderId: order.id }).unwrap())}
                >
                  <Truck size={18} />
                  {t('orders.dispatch')}
                </MyButton>
              ) : (
                <MyButton
                  size="lg"
                  className={`w-full gap-2 ${touch}`}
                  disabled={busy || pendingAccept}
                  onClick={() => void run(() => markReady({ shopId, orderId: order.id }).unwrap())}
                >
                  <PackageCheck size={18} />
                  {t('orders.markReady')}
                </MyButton>
              )}
            </div>
          )}

          {order.state === 'OUT_FOR_DELIVERY' && (
            <div className="space-y-2">
              <MyButton
                size="lg"
                className={`w-full gap-2 ${touch}`}
                disabled={busy}
                onClick={() => void run(() => completeOrder({ shopId, orderId: order.id }).unwrap())}
              >
                <PackageCheck size={18} />
                {t('orders.delivered')}
              </MyButton>
            </div>
          )}

          {order.state === 'READY' && (
            <MyButton
              size="lg"
              className={`w-full gap-2 ${touch}`}
              disabled={busy}
              onClick={() => void run(() => completeOrder({ shopId, orderId: order.id }).unwrap())}
            >
              <PackageCheck size={18} />
              {t('orders.handOver')}
            </MyButton>
          )}
        </div>
      )}
    </div>
  );
}
