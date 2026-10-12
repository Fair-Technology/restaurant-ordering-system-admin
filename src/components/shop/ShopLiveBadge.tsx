import { useTranslation } from 'react-i18next';
import type { ShopLiveState } from '../../features/shops/shopStatus';
import { badgeClass } from '../layout/pageStyles';

const STYLE: Record<ShopLiveState, { badge: string; dot: string }> = {
  online: { badge: badgeClass.good, dot: 'bg-[#2f8a4c]' },
  ordersPaused: { badge: badgeClass.warn, dot: 'bg-[#d97706]' },
  offline: { badge: badgeClass.neutral, dot: 'bg-[#9a8f86]' },
};

const LABEL: Record<ShopLiveState, string> = {
  online: 'nav.acceptingOrders',
  ordersPaused: 'nav.ordersPausedBadge',
  offline: 'overview.paused',
};

/** "Nimmt Bestellungen an" / "Bestellungen pausiert" / "Offline" as a small coloured badge. */
export function ShopLiveBadge({ state }: { state: ShopLiveState }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${STYLE[state].badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${STYLE[state].dot}`} aria-hidden="true" />
      {t(LABEL[state])}
    </span>
  );
}
