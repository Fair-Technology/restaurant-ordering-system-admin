import { useTranslation } from 'react-i18next';
import type { IntakeOrder } from '../../services/ordersApi';

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

/** Where the order stands, in the colours of the list's sections. */
export function StateBadge({ order }: { order: Pick<IntakeOrder, 'displayState'> }) {
  const { t } = useTranslation();
  const s = order.displayState;
  const style =
    s === 'PLACED'
      ? 'bg-[#fdeee6] text-[#c2410c]'
      : s === 'ACCEPTED' || s === 'IN_PREPARATION'
        ? 'bg-sand text-ink'
        : s === 'READY' || s === 'OUT_FOR_DELIVERY' || s === 'COMPLETED'
          ? 'bg-[#e6f3ea] text-[#1d5a32]'
          : 'bg-[#fdeceb] text-[#b42318]';
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap ${style}`}>{t(`orders.state.${s}`)}</span>;
}
