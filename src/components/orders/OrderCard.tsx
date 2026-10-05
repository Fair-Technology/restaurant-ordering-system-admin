import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, PackageCheck, TriangleAlert } from 'lucide-react';
import {
  useAcceptOrderMutation,
  useCompleteOrderMutation,
  useMarkOrderReadyMutation,
  useRejectOrderMutation,
  type IntakeOrder,
  type RejectReason,
} from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import { REJECT_REASONS, formatCountdown, prepChoices, secondsUntil } from '../../features/orders/intake';
import { formatCents } from '../../utils/money';
import { MyButton } from '../ui/MyButton';

interface Props {
  shopId: string;
  order: IntakeOrder;
  nowMs: number;
  defaultPrepMinutes: number;
  onFailed: () => void;
}

type Panel = 'none' | 'accept' | 'reject';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function OrderCard({ shopId, order, nowMs, defaultPrepMinutes, onFailed }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [panel, setPanel] = useState<Panel>('none');
  const [acceptOrder, { isLoading: accepting }] = useAcceptOrderMutation();
  const [rejectOrder, { isLoading: rejecting }] = useRejectOrderMutation();
  const [markReady, { isLoading: marking }] = useMarkOrderReadyMutation();
  const [completeOrder, { isLoading: completing }] = useCompleteOrderMutation();
  const busy = accepting || rejecting || marking || completing;

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

  const onReject = (reason: RejectReason) => {
    if (!window.confirm(t('orders.rejectConfirm', { ref: order.orderRef }))) return;
    void run(() => rejectOrder({ shopId, orderId: order.id, reason }).unwrap());
  };

  const touch = 'min-h-12';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <div className="space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-2xl font-mono font-semibold text-gray-900">{order.orderRef}</span>
          <span className="text-xs text-gray-500">{t(`orders.fulfilment.${order.fulfilmentMode}`)}</span>
        </div>
        <div className="text-sm font-medium text-gray-800">
          {money(order.subtotalCents)}
        </div>
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
              {prepChoices(defaultPrepMinutes).map((minutes) => (
                <MyButton
                  key={minutes}
                  size="lg"
                  className={touch}
                  disabled={busy}
                  onClick={() => void run(() => acceptOrder({ shopId, orderId: order.id, prepMinutes: minutes }).unwrap())}
                >
                  {t('orders.acceptReadyIn', { minutes })}
                </MyButton>
              ))}
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
            <div className="text-sm font-medium text-gray-800">{t('orders.readyAt', { time: formatTime(order.readyAt) })}</div>
          )}
          <MyButton
            size="lg"
            className={`w-full gap-2 ${touch}`}
            disabled={busy}
            onClick={() => void run(() => markReady({ shopId, orderId: order.id }).unwrap())}
          >
            <PackageCheck size={18} />
            {t('orders.markReady')}
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
