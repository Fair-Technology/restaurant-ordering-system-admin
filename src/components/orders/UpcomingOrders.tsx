import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRejectOrderMutation, type RejectReason, type SlotCapacityDto, type UpcomingOrder } from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import { REJECT_REASONS, slotLoadOf, upcomingByDay } from '../../features/orders/intake';
import { chargedCents } from '../../features/orders/refunds';
import { formatCents } from '../../utils/money';
import { MyButton } from '../ui/MyButton';

interface Props {
  shopId: string;
  orders: UpcomingOrder[];
  capacity: SlotCapacityDto | null;
  timeZone: string;
  onFailed: () => void;
}

export function UpcomingOrders({ shopId, orders, capacity, timeZone, onFailed }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [rejectOrder, { isLoading: rejecting }] = useRejectOrderMutation();
  const days = upcomingByDay(orders, timeZone);

  const onReject = async (order: UpcomingOrder, reason: RejectReason) => {
    if (!window.confirm(t('orders.rejectConfirm', { ref: order.orderRef }))) return;
    try {
      await rejectOrder({ shopId, orderId: order.id, reason }).unwrap();
      setOpenId(null);
    } catch {
      toast.error(t('orders.actionFailed'));
      onFailed();
    }
  };

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-gray-700">{t('orders.upcomingTitle', { count: orders.length })}</h2>
      {days.length === 0 && <p className="text-sm text-gray-400">{t('orders.upcomingEmpty')}</p>}
      {days.map((day) => (
        <div key={day.day} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-gray-500">
            {new Date(day.orders[0].scheduledFor!).toLocaleDateString(i18n.language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone,
            })}
          </h3>
          {day.orders.map((o) => {
            const load = slotLoadOf(capacity, o.scheduledFor);
            return (
              <div
                key={o.id}
                className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm flex flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="font-bold text-gray-900">
                  {new Date(o.scheduledFor!).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone,
                  })}
                </span>
                <span className="font-mono text-gray-900">{o.orderRef}</span>
                <span className="text-gray-500">{t(`orders.fulfilment.${o.fulfilmentMode}`)}</span>
                <span className="text-gray-800">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ')}</span>
                <span className="text-gray-800">
                  {t('orders.reservedOnline', { amount: formatCents(chargedCents(o), o.currency, i18n.language) })}
                </span>
                <span className="text-gray-600">{o.customerName}</span>
                {o.outsideHours && (
                  <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {t('orders.upcomingOutsideHours')}
                  </span>
                )}
                {load && (
                  <span
                    className={
                      load.full
                        ? 'text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full'
                        : 'text-xs text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full'
                    }
                  >
                    {t(load.full ? 'orders.slotFull' : 'orders.slotPlaces', { taken: load.taken, perSlot: load.perSlot })}
                  </span>
                )}
                {openId === o.id ? (
                  <div className="flex flex-wrap gap-2 w-full">
                    {REJECT_REASONS.map((reason) => (
                      <MyButton
                        key={reason}
                        size="sm"
                        variant="danger"
                        disabled={rejecting}
                        onClick={() => void onReject(o, reason)}
                      >
                        {t(`orders.rejectReason.${reason}`)}
                      </MyButton>
                    ))}
                    <MyButton size="sm" variant="ghost" onClick={() => setOpenId(null)}>
                      {t('orders.cancel')}
                    </MyButton>
                  </div>
                ) : (
                  <MyButton size="sm" variant="danger" onClick={() => setOpenId(o.id)}>
                    {t('orders.reject')}
                  </MyButton>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
