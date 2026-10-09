import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';
import { useGetOwnerOverviewQuery } from '../services/reportsApi';
import { MyButton } from '../components/ui/MyButton';
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';
import { formatCents } from '../utils/money';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { accounts } = useMsal();
  const { data, isLoading, isError, isFetching, refetch } = useGetOwnerOverviewQuery();
  const firstName = accounts[0]?.name?.split(' ')[0] ?? null;

  if (isLoading) return <MySpinner label={t('overview.loading')} />;
  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-red-500">{t('overview.loadError')}</p>
        <MyButton variant="secondary" onClick={() => void refetch()}>
          {t('overview.refresh')}
        </MyButton>
      </div>
    );
  }

  const linkClass = 'text-sm font-medium text-gray-700 hover:text-gray-900 underline-offset-2 hover:underline';

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">
            {firstName ? t('dashboard.welcomeBack', { name: firstName }) : t('overview.title')}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">{t('overview.subtitle')}</p>
        </div>
        <MyButton variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          {t('overview.refresh')}
        </MyButton>
      </div>

      {data.combinedToday && data.shops.length > 1 && (
        <p className="text-sm font-medium text-gray-700">
          {t('overview.combined', {
            amount: formatCents(data.combinedToday.takingsCents, data.combinedToday.currency, i18n.language),
            count: data.combinedToday.orderCount,
          })}
        </p>
      )}
      {data.truncated && <p className="text-sm text-gray-500">{t('overview.truncated')}</p>}

      {data.shops.length === 0 ? (
        <div className="space-y-3">
          <p className="text-gray-500">{t('overview.empty')}</p>
          <Link to="/shops" className={linkClass}>
            {t('overview.goToShops')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {data.shops.map((s) => (
            <MyCard key={s.shopId} className="p-5 space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">{s.name}</h2>
                {s.isPaused && (
                  <span className="text-xs font-medium bg-red-50 text-red-600 rounded-full px-2 py-0.5">
                    {t('overview.paused')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{t('overview.todayTakings')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {formatCents(s.today.takingsCents, s.currency, i18n.language)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">{t('overview.todayOrders')}</p>
                  <p className="text-2xl font-semibold text-gray-900">{s.today.orderCount}</p>
                </div>
              </div>
              <p className={`text-sm ${s.waitingCount > 0 ? 'text-amber-600 font-medium' : 'text-gray-500'}`}>
                {t('overview.waiting', { count: s.waitingCount })}
              </p>
              <p className="text-sm text-gray-500">
                {s.orderLimit.limit === null
                  ? t('overview.unlimited', { count: s.orderLimit.acceptedOrderCount })
                  : t('overview.limit', { count: s.orderLimit.acceptedOrderCount, limit: s.orderLimit.limit })}
              </p>
              <div className="flex gap-4">
                <Link to={`/shops/${s.shopId}/orders`} className={linkClass}>
                  {t('overview.openOrders')}
                </Link>
                <Link to={`/shops/${s.shopId}/reports`} className={linkClass}>
                  {t('overview.openReports')}
                </Link>
                <Link to={`/shops/${s.shopId}/phone`} className={linkClass}>
                  {t('overview.openPhone')}
                </Link>
              </div>
            </MyCard>
          ))}
        </div>
      )}
    </div>
  );
}
