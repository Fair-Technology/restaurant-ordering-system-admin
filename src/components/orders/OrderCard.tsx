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

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <div className="space-y-1">
        {order.scheduledFor && (
          <div className="inline-block rounded-lg bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-900">
            {t('orders.scheduledFor', { time: formatTime(order.scheduledFor, timeZone) })}
          </div>
        )}
        {order.table && (
          <div className="inline-block rounded-lg bg-amber-100 px-3 py-1 text-xl font-bold text-amber-900">
            {t('orders.table', { label: order.table.label })}
          </div>
        )}
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-mono font-semibold text-gray-900">{order.orderRef}</span>
          <span className="text-xs text-gray-500">{t(`orders.fulfilment.${order.fulfilmentMode}`)}</span>
        </div>
        <div className="text-sm font-medium text-gray-800">
          {order.paymentStatus === 'authorized'
            ? t('orders.reservedOnline', { amount: money(chargedCents(order)) })
            : order.paymentStatus === 'paid'
              ? t('orders.paidOnline', { amount: money(chargedCents(order)) })
              : money(chargedCents(order))}
        </div>
        {order.fulfilmentMode === 'delivery' && order.deliveryFeeCents != null && (
          <div className="text-xs text-gray-500">
            {t('orders.inclDeliveryFee', { amount: money(order.deliveryFeeCents) })}
          </div>
        )}
        {order.autoAccepted && (
          <span className="inline-block text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            {t('orders.autoAccepted')}
          </span>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Clock size={14} />
          {t('orders.placedAgo', { minutes: minutesAgo })}
        </div>
        {order.state === 'PLACED' && countdown !== null && (
          <div className="flex items-center gap-1 text-sm font-medium text-red-600">
            <TriangleAlert size={16} />
            {t('orders.autoRejectIn', { time: formatCountdown(countdown) })}
          </div>
        )}
      </div>

      <ul className="text-sm text-gray-800 space-y-1">
        {order.items.map((item, i) => (
          <li key={i}>
            <span className="font-medium">
              {item.quantity} &times; {item.productName}
            </span>
            {item.selectedVariantOptionName && (
              <span className="block text-xs text-gray-500">{item.selectedVariantOptionName}</span>
            )}
            {item.selectedAddonOptionNames && item.selectedAddonOptionNames.length > 0 && (
              <span className="block text-xs text-gray-500">+ {item.selectedAddonOptionNames.join(', ')}</span>
            )}
          </li>
        ))}
      </ul>

      {order.customerNotes && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-900">
          <span className="block text-xs font-semibold">{t('orders.notes')}</span>
          {order.customerNotes}
        </div>
      )}

      {order.deliveryAddress && (
        <div className="bg-sky-50 border border-sky-200 rounded-lg px-3 py-2 text-sm text-sky-900">
          <span className="block text-xs font-semibold">{t('orders.deliverTo')}</span>
          {order.deliveryAddress.street}, {order.deliveryAddress.postcode} {order.deliveryAddress.city}
          <a className="block underline" href={`tel:${order.customerPhone}`}>
            {order.customerPhone}
          </a>
        </div>
      )}

      <div className="text-sm text-gray-600">
        {order.customerName} &middot; {order.customerPhone}
      </div>

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
            <div className="text-sm font-medium text-gray-800">
              {t(order.fulfilmentMode === 'delivery' ? 'orders.deliverBy' : 'orders.readyAt', {
                time: formatTime(order.readyAt, timeZone),
              })}
            </div>
          )}
          {pendingAccept && <div className="text-sm text-gray-500">{t('orders.acceptPending')}</div>}
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
          <span className="inline-block text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
            {t('orders.state.OUT_FOR_DELIVERY')}
          </span>
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
  );
}
