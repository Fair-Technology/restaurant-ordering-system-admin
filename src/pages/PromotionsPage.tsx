import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../services/api';
import { useGetPromotionsQuery } from '../services/promotionsApi';
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';
import { DiscountCodesCard } from '../components/promotions/DiscountCodesCard';
import { LoyaltyCard } from '../components/promotions/LoyaltyCard';

export function PromotionsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_shop');
  const promotions = useGetPromotionsQuery({ shopId: shopId! }, { skip: !canManage });

  if (isLoading) return <MySpinner />;
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <MyCard className="p-5">
          <p className="text-sm text-gray-600">{t('promotions.accessDenied')}</p>
        </MyCard>
      </div>
    );
  }

  if (promotions.isLoading) return <MySpinner />;
  if (promotions.isError || !promotions.data) {
    return <p className="text-red-500">{t('promotions.saveFailed')}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900">{t('nav.promotions')}</h1>
      <DiscountCodesCard shopId={shopId!} shop={shop} data={promotions.data} />
      <LoyaltyCard shopId={shopId!} shop={shop} loyalty={promotions.data.loyalty} />
    </div>
  );
}
