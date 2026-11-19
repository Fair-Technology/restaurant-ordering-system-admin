import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrdersPage } from './OrdersPage';
import { readStaffSession } from '../features/staff/staffSession';
import { useGetShopByIdQuery } from '../services/api';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';
import { usePageTitle } from '../features/layout/usePageTitle';

/** The staff bookmark/QR entry: the one Orders page, under a thin phone shell. */
export function PhoneOrdersPage() {
  usePageTitle('phone.pageTitle');
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const isStaff = readStaffSession() !== null;
  const linkClass =
    'inline-flex h-9 items-center rounded-full border border-[#e3d9ce] bg-white px-3 text-[13px] font-semibold text-[#4a413b] hover:bg-sand';

  return (
    <div className="flex h-dvh flex-col">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 pt-3 pb-1 sm:px-7">
        <div className="flex min-w-0 items-center gap-2.5">
          {shop && <ShopLogoBadge shop={shop} size={28} />}
          <span className="truncate text-[13px] font-semibold text-[#4a413b]">{shop?.name ?? ''}</span>
        </div>
        <div className="flex gap-2">
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
      <main className="flex min-h-0 flex-1 flex-col">
        <OrdersPage />
      </main>
    </div>
  );
}
