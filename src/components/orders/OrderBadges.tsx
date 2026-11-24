import { useTranslation } from 'react-i18next';
import type { IntakeOrder } from '../../services/ordersApi';
import { lastRefundFailed } from '../../features/orders/refunds';

const MODE_STYLE: Record<IntakeOrder['fulfilmentMode'], string> = {
  collection: 'bg-sand text-[#4a413b]',
  delivery: 'bg-[#fdeee6] text-[#7c2a09]',
  dine_in: 'bg-[#e0f2fe] text-[#075985]',
};

/** "Abholung", "Lieferung" or "Tisch 7". */
export function ModeBadge({ order, large = false }: { order: Pick<IntakeOrder, 'fulfilmentMode' | 'table'>; large?: boolean }) {
  const { t } = useTranslation();
  const label =
    order.fulfilmentMode === 'dine_in' && order.table
      ? t('orders.table', { label: order.table.label })
      : t(`orders.fulfilment.${order.fulfilmentMode}`);
  return (
    <span
      className={`rounded-full font-bold whitespace-nowrap ${MODE_STYLE[order.fulfilmentMode]} ${
        large ? 'px-2.5 py-0.5 text-[13px]' : 'px-2 py-0.5 text-[11px]'
      }`}
    >
      {label}
    </span>
  );
}

/** Refund outcome next to the state pill; nothing for orders without a (visible) refund. */
export function RefundStatusBadge({ order }: { order: Pick<IntakeOrder, 'paymentStatus' | 'refundedCents' | 'refunds'> }) {
  const { t } = useTranslation();
  const failed = lastRefundFailed(order);
  const label = failed
    ? 'orders.payment.refundFailed'
    : order.paymentStatus === 'refunded'
      ? 'orders.payment.refunded'
      : order.paymentStatus === 'partially_refunded'
        ? 'orders.payment.partially_refunded'
        : null;
  if (!label) return null;
  const style = failed ? 'bg-[#fdeceb] text-[#b42318]' : 'bg-[#efe7de] text-[#4a413b]';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${style}`}>{t(label)}</span>;
}

/** Where the order stands, in the colours of the list's sections, plus any refund outcome. */
export function StateBadge({
  order,
}: {
  order: Pick<IntakeOrder, 'displayState' | 'paymentStatus' | 'refundedCents' | 'refunds'>;
}) {
  const { t } = useTranslation();
  const s = order.displayState;
  const style =
    s === 'PLACED'
      ? 'bg-[#fdeee6] text-[#c2410c]'
      : s === 'ACCEPTED' || s === 'IN_PREPARATION'
        ? 'bg-sand text-ink'
        : s === 'READY' || s === 'OUT_FOR_DELIVERY' || s === 'COMPLETED'
          ? 'bg-[#e6f3ea] text-[#1d5a32]'
          : s === 'REFUNDED'
            ? 'bg-[#efe7de] text-[#4a413b]'
            : 'bg-[#fdeceb] text-[#b42318]';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${style}`}>{t(`orders.state.${s}`)}</span>
      <RefundStatusBadge order={order} />
    </span>
  );
}
