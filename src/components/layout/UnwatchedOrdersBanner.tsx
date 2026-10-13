import { Link, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetOrderQueueQuery } from '../../services/ordersApi';
import { showsUnwatchedWarning } from '../../features/orders/ordersScreen';

interface UnwatchedOrdersBannerProps {
  shopId: string;
  canSeeOrders: boolean;
}

/** Warns while auto-accept is on but no orders board is open, so new orders would wait for a hand-accept. */
export function UnwatchedOrdersBanner({ shopId, canSeeOrders }: UnwatchedOrdersBannerProps) {
  const { t } = useTranslation();
  const onOrdersPage = useMatch('/shops/:shopId/orders') !== null;
  // Same arguments as the TopNav badge, so both share one cache entry
  const { data } = useGetOrderQueueQuery({ shopId }, { skip: !canSeeOrders, pollingInterval: 30000 });

  if (!showsUnwatchedWarning(data, onOrdersPage)) return null;

  return (
    <div
      role="status"
      className="mb-4 px-4 py-3 rounded-xl border text-sm flex items-center justify-between gap-4 bg-amber-50 border-amber-200 text-amber-900"
    >
      <span>{t('orders.unwatchedBanner')}</span>
      <Link
        to={`/shops/${shopId}/orders`}
        className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150"
      >
        {t('orders.unwatchedOpen')}
      </Link>
    </div>
  );
}
