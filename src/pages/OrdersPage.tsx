import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Smartphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { OrderHistoryList } from '../components/orders/OrderHistoryList';
import { OrderIntakeBoard } from '../components/orders/OrderIntakeBoard';

export function OrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'history' ? 'history' : 'live';

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-medium rounded-xl border transition-colors ${
      active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button type="button" className={tabClass(tab === 'live')} onClick={() => setSearchParams({})}>
          {t('orders.tabLive')}
        </button>
        <button
          type="button"
          className={tabClass(tab === 'history')}
          onClick={() => setSearchParams({ tab: 'history' })}
        >
          {t('orders.tabHistory')}
        </button>
        <Link
          to={`/shops/${shopId}/phone`}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <Smartphone size={16} />
          {t('orders.phoneView')}
        </Link>
      </div>
      {tab === 'live' ? <OrderIntakeBoard shopId={shopId!} /> : <OrderHistoryList shopId={shopId!} />}
    </div>
  );
}
