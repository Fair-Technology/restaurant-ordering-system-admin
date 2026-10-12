import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { OrderIntakeBoard } from '../components/orders/OrderIntakeBoard';
import { readStaffSession } from '../features/staff/staffSession';
import { useGetShopByIdQuery } from '../services/api';
import { ShopLogoBadge } from '../components/shop/ShopLogoBadge';

export function PhoneOrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const isStaff = readStaffSession() !== null;
  const linkClass =
    'inline-flex h-9 items-center rounded-full border border-[#e3d9ce] bg-white px-3 text-[13px] font-semibold text-[#4a413b] hover:bg-sand';

  return (
    <div className="mx-auto max-w-md space-y-3 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-center gap-2.5">
          {shop && <ShopLogoBadge shop={shop} size={34} />}
          <div className="min-w-0">
            <div className="text-[12px] text-muted">{t('nav.orders')}</div>
            <h1 className="truncate font-display text-[22px] leading-tight font-semibold">{shop?.name ?? ''}</h1>
          </div>
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
      <OrderIntakeBoard shopId={shopId!} variant="phone" />
    </div>
  );
}
