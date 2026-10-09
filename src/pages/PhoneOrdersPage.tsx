import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderIntakeBoard } from '../components/orders/OrderIntakeBoard';
import { readStaffSession } from '../features/staff/staffSession';
import { useGetShopByIdQuery } from '../services/api';

export function PhoneOrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const isStaff = readStaffSession() !== null;
  const linkClass = 'text-sm font-medium text-gray-600 underline underline-offset-2';

  return (
    <div className="max-w-md mx-auto px-3 py-3 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h1 className="text-lg font-semibold text-gray-900">{shop?.name ?? ''}</h1>
        <div className="flex gap-4">
          <Link to={`/shops/${shopId}/orders`} className={linkClass}>
            {t('orders.fullAdmin')}
          </Link>
          {!isStaff && (
            <Link to="/phone" className={linkClass}>
              {t('orders.switchRestaurant')}
            </Link>
          )}
        </div>
      </div>
      <OrderIntakeBoard shopId={shopId!} variant="phone" />
    </div>
  );
}
