import { useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../../services/api';
import { MySpinner } from '../ui/MySpinner';
import { OrderLimitBanner } from './OrderLimitBanner';

export function ShopLayout() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });

  if (isLoading) return <MySpinner label={t('shops.loadingShop')} />;
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  const isOwner = (shop.callerPermissions ?? []).includes('manage_billing');

  return (
    <>
      <OrderLimitBanner shopId={shopId!} canManageBilling={isOwner} />
      <Outlet />
    </>
  );
}
