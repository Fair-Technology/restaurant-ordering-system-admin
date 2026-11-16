import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../../services/api';
import { shopLandingPath } from '../../features/auth/redirects';
import { MySpinner } from '../ui/MySpinner';

/** The shop's index route: sends the user to the first page they may open (the Dashboard when they can see it). */
export function ShopIndexRedirect() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });

  if (!shop) return <MySpinner label={t('shops.loadingShop')} />;
  return <Navigate to={shopLandingPath(shopId!, shop.callerPermissions ?? [])} replace />;
}
