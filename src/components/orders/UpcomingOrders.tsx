import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRejectOrderMutation, type RejectReason, type SlotCapacityDto, type UpcomingOrder } from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import { REJECT_REASONS, slotLoadOf, upcomingByDay } from '../../features/orders/intake';
import { chargedCents } from '../../features/orders/refunds';
import { formatCents } from '../../utils/money';
import { MyButton } from '../ui/MyButton';
import { ModeBadge } from './OrderBadges';

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
      <div className="flex items-center gap-2.5 px-1">
        <span className="h-[9px] w-[9px] rounded-full bg-[#8a7f77]" aria-hidden="true" />
        <h2 className="text-[15px] font-bold">{t('orders.upcomingTitle', { count: orders.length })}</h2>
      </div>
      {days.length === 0 && (
        <p className="rounded-2xl border border-dashed border-[#e3d9ce] p-4 text-sm text-[#8a7f77]">{t('orders.upcomingEmpty')}</p>
      )}
      {days.map((day) => (
        <div key={day.day} className="overflow-hidden rounded-2xl border border-line bg-white">
          <h3 className="border-b border-line-soft px-4 py-2.5 text-[13px] font-bold text-[#4a413b]">
            {new Date(day.orders[0].scheduledFor!).toLocaleDateString(i18n.language, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              timeZone,
            })}
            <span className="ml-2 font-medium text-[#8a7f77]">{day.orders.length}</span>
          </h3>
          {day.orders.map((o) => {
            const load = slotLoadOf(capacity, o.scheduledFor);
            return (
              <div key={o.id} className="flex flex-col gap-2 border-b border-line-soft px-4 py-3 text-sm last:border-b-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-[15px] font-bold">
                    {new Date(o.scheduledFor!).toLocaleTimeString(undefined, {
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone,
                    })}
                  </span>
                  <span className="font-bold tracking-[0.02em]">#{o.orderRef}</span>
                  <ModeBadge order={o} />
                  <span className="ml-auto font-bold">
                    {t('orders.reservedOnline', { amount: formatCents(chargedCents(o), o.currency, i18n.language) })}
                  </span>
                </div>
                <span className="text-[#3a322d]">{o.customerName}</span>
                <span className="text-[13px] text-muted">{o.items.map((i) => `${i.quantity} × ${i.productName}`).join(', ')}</span>
                {(o.outsideHours || load) && (
                  <div className="flex flex-wrap gap-1.5">
                    {o.outsideHours && (
                      <span className="rounded-full bg-[#fff6e0] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]">
                        {t('orders.upcomingOutsideHours')}
                      </span>
                    )}
                    {load && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          load.full ? 'bg-[#fdeceb] text-[#b42318]' : 'bg-sand text-[#4a413b]'
                        }`}
                      >
                        {t(load.full ? 'orders.slotFull' : 'orders.slotPlaces', { taken: load.taken, perSlot: load.perSlot })}
                      </span>
                    )}
                  </div>
                )}
                {openId === o.id ? (
                  <div className="flex w-full flex-wrap gap-2">
                    {REJECT_REASONS.map((reason) => (
                      <MyButton
                        key={reason}
                        size="lg"
                        variant="danger"
                        className="min-h-12"
                        disabled={rejecting}
                        onClick={() => void onReject(o, reason)}
                      >
                        {t(`orders.rejectReason.${reason}`)}
                      </MyButton>
                    ))}
                    <MyButton size="lg" variant="ghost" className="min-h-12" onClick={() => setOpenId(null)}>
                      {t('orders.cancel')}
                    </MyButton>
                  </div>
                ) : (
                  <div>
                    <MyButton size="lg" variant="danger" className="min-h-12" onClick={() => setOpenId(o.id)}>
                      {t('orders.reject')}
                    </MyButton>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </section>
  );
}
