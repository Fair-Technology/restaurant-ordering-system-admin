import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';
import { useGetOwnerOverviewQuery } from '../services/reportsApi';
import { useGetMyShopsQuery } from '../services/api';
import { shopLiveState } from '../features/shops/shopStatus';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { PageHeader, Section, EmptyNote } from '../components/layout/Page';
import { badgeClass, pillClass } from '../components/layout/pageStyles';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';
import { ShopLiveBadge } from '../components/shop/ShopLiveBadge';
import { formatCents } from '../utils/money';

export function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { accounts } = useMsal();
  const { data, isLoading, isError, isFetching, refetch } = useGetOwnerOverviewQuery();
  // Only for the logo and the exact status (paused orders); the overview itself has neither
  const { data: myShops } = useGetMyShopsQuery();
  const firstName = accounts[0]?.name?.split(' ')[0] ?? null;

  if (isLoading) return <MySpinner label={t('overview.loading')} />;
  if (isError || !data) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[#b42318]">{t('overview.loadError')}</p>
        <MyButton variant="secondary" onClick={() => void refetch()}>
          {t('overview.refresh')}
        </MyButton>
      </div>
    );
  }

  const shopById = new Map((myShops?.shops ?? []).map((s) => [s.id, s]));

  return (
    <div>
      <PageHeader
        eyebrow={firstName ? t('dashboard.welcomeBack', { name: firstName }) : undefined}
        title={t('overview.title')}
        description={t('overview.subtitle')}
        actions={
          <MyButton variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
            {t('overview.refresh')}
          </MyButton>
        }
      />

      {(data.combinedToday && data.shops.length > 1) || data.truncated ? (
        <div className="mb-3.5 flex flex-wrap items-center gap-2">
          {data.combinedToday && data.shops.length > 1 && (
            <span className="inline-flex h-9 items-center rounded-full border border-line bg-white px-3.5 text-[13px] font-semibold text-[#4a413b]">
              {t('overview.combined', {
                amount: formatCents(data.combinedToday.takingsCents, data.combinedToday.currency, i18n.language),
                count: data.combinedToday.orderCount,
              })}
            </span>
          )}
          {data.truncated && <span className="text-[13px] text-muted">{t('overview.truncated')}</span>}
        </div>
      ) : null}

      {data.shops.length === 0 ? (
        <Section>
          <EmptyNote>{t('overview.empty')}</EmptyNote>
          <div className="px-4 pb-4">
            <Link to="/shops" className={`inline-flex items-center ${pillClass(true)}`}>
              {t('overview.goToShops')}
            </Link>
          </div>
        </Section>
      ) : (
        <div className="grid gap-[18px] md:grid-cols-2">
          {data.shops.map((s) => {
            const shop = shopById.get(s.shopId);
            const live = shop ? shopLiveState(shop) : s.isPaused ? 'offline' : 'online';
            return (
              <section key={s.shopId} className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-4 py-3">
                  <ShopLogoBadge shop={shop ?? { name: s.name }} size={36} />
                  <h2 className="min-w-0 flex-1 truncate text-[15px] font-bold">{s.name}</h2>
                  <ShopLiveBadge state={live} />
                </div>
                <div className="grid grid-cols-2 border-b border-line-soft">
                  <div className="border-r border-line-soft px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-[#8a7f77]">{t('overview.todayTakings')}</p>
                    <p className="mt-0.5 font-display text-[26px] leading-tight font-semibold">
                      {formatCents(s.today.takingsCents, s.currency, i18n.language)}
                    </p>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-[12px] font-semibold text-[#8a7f77]">{t('overview.todayOrders')}</p>
                    <p className="mt-0.5 font-display text-[26px] leading-tight font-semibold">{s.today.orderCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <span className={s.waitingCount > 0 ? badgeClass.warn : badgeClass.neutral}>
                    {t('overview.waiting', { count: s.waitingCount })}
                  </span>
                  <span className={`text-[13px] ${s.orderLimit.limitReached ? 'font-semibold text-[#b42318]' : 'text-muted'}`}>
                    {s.orderLimit.limit === null
                      ? t('overview.unlimited', { count: s.orderLimit.acceptedOrderCount })
                      : t('overview.limit', { count: s.orderLimit.acceptedOrderCount, limit: s.orderLimit.limit })}
                  </span>
                </div>
                <div className="mt-auto flex flex-wrap gap-2 border-t border-line-soft px-4 py-3">
                  <Link to={`/shops/${s.shopId}/orders`} className={`inline-flex items-center ${pillClass(true)}`}>
                    {t('overview.openOrders')}
                  </Link>
                  <Link to={`/shops/${s.shopId}/reports`} className={`inline-flex items-center ${pillClass(false)}`}>
                    {t('overview.openReports')}
                  </Link>
                  <Link to={`/shops/${s.shopId}/phone`} className={`inline-flex items-center ${pillClass(false)}`}>
                    {t('overview.openPhone')}
                  </Link>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
