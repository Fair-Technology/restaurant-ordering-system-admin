import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../../services/api';
import { MySpinner } from '../ui/MySpinner';
import { MyButton } from '../ui/MyButton';
import { OrderLimitBanner } from './OrderLimitBanner';
import { AutoPausedBanner } from './AutoPausedBanner';

export function ShopLayout() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: shop, isLoading, isError, error } = useGetShopByIdQuery({ shopId: shopId! });

  if (isLoading) return <MySpinner label={t('shops.loadingShop')} />;
  if (isError || !shop) {
    const status =
      typeof (error as { status?: unknown })?.status === 'number'
        ? (error as { status: number }).status
        : undefined;
    const [title, description] =
      status === 404
        ? [t('shops.shopNotFoundTitle'), t('shops.shopNotFoundDescription')]
        : status === 403
          ? [t('shops.shopNotAllowedTitle'), t('shops.shopNotAllowedDescription')]
          : [t('shops.failedToLoadShop'), t('shops.failedToLoadShopDescription')];
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
        <h1 className="font-display text-[30px] leading-tight font-semibold">{title}</h1>
        <p className="max-w-sm text-sm text-muted">{description}</p>
        <MyButton className="mt-2" onClick={() => navigate('/shops')}>
          {t('notFound.backToShops')}
        </MyButton>
      </div>
    );
  }

  const isOwner = (shop.callerPermissions ?? []).includes('manage_billing');

  return (
    <>
      <OrderLimitBanner shopId={shopId!} canManageBilling={isOwner} />
      <AutoPausedBanner shop={shop} />
      <Outlet />
    </>
  );
}
