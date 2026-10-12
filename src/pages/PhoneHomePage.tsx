import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { readStaffSession } from '../features/staff/staffSession';
import { useGetMyShopsQuery } from '../services/api';
import { MySpinner } from '../components/ui/MySpinner';
import { pillClass } from '../components/layout/pageStyles';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';

export function PhoneHomePage() {
  const { t } = useTranslation();
  const staff = readStaffSession();
  const { data, isLoading } = useGetMyShopsQuery(undefined, { skip: staff !== null });

  if (staff) return <Navigate to={`/shops/${staff.shopId}/phone`} replace />;
  if (isLoading) return <MySpinner />;

  const shops = data?.shops ?? [];
  if (shops.length === 0) {
    return (
      <div className="mx-auto max-w-md space-y-3 px-3 py-6">
        <div className="rounded-2xl border border-line bg-white p-4">
          <p className="text-sm text-muted">{t('phone.noRestaurant')}</p>
          <Link to="/shops" className={`mt-3 inline-flex items-center ${pillClass(true)}`}>
            {t('overview.goToShops')}
          </Link>
        </div>
      </div>
    );
  }
  if (shops.length === 1) return <Navigate to={`/shops/${shops[0].id}/phone`} replace />;

  return (
    <div className="mx-auto max-w-md px-3 py-6">
      <h1 className="mb-3.5 font-display text-[26px] leading-tight font-semibold">{t('phone.pickRestaurant')}</h1>
      <div className="overflow-hidden rounded-2xl border border-line bg-white">
        {shops.map((s) => (
          <Link
            key={s.id}
            to={`/shops/${s.id}/phone`}
            className="flex min-h-14 items-center gap-3 border-b border-line-soft px-4 py-3 text-base font-bold text-ink transition-colors last:border-b-0 hover:bg-cream"
          >
            <ShopLogoBadge shop={s} size={36} />
            <span className="min-w-0 flex-1 truncate">{s.name}</span>
            <ChevronRight size={18} className="text-[#8a7f77]" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </div>
  );
}
