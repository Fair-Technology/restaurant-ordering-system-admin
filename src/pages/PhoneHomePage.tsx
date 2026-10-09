import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { readStaffSession } from '../features/staff/staffSession';
import { useGetMyShopsQuery } from '../services/api';
import { MySpinner } from '../components/ui/MySpinner';

export function PhoneHomePage() {
  const { t } = useTranslation();
  const staff = readStaffSession();
  const { data, isLoading } = useGetMyShopsQuery(undefined, { skip: staff !== null });

  if (staff) return <Navigate to={`/shops/${staff.shopId}/phone`} replace />;
  if (isLoading) return <MySpinner />;

  const shops = data?.shops ?? [];
  if (shops.length === 0) {
    return (
      <div className="max-w-md mx-auto px-3 py-6 space-y-3">
        <p className="text-gray-500">{t('phone.noRestaurant')}</p>
        <Link to="/shops" className="text-sm font-medium text-gray-700 underline">
          {t('overview.goToShops')}
        </Link>
      </div>
    );
  }
  if (shops.length === 1) return <Navigate to={`/shops/${shops[0].id}/phone`} replace />;

  return (
    <div className="max-w-md mx-auto px-3 py-6 space-y-3">
      <h1 className="text-lg font-semibold text-gray-900">{t('phone.pickRestaurant')}</h1>
      {shops.map((s) => (
        <Link
          key={s.id}
          to={`/shops/${s.id}/phone`}
          className="block bg-white border border-gray-200 rounded-2xl px-4 py-4 text-base font-medium text-gray-900"
        >
          {s.name}
        </Link>
      ))}
    </div>
  );
}
