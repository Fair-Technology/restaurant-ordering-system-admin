import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../services/api';
import { useGetPromotionsQuery } from '../services/promotionsApi';
import { MySpinner } from '../components/ui/MySpinner';
import { PageHeader, Section } from '../components/layout/Page';
import { DiscountCodesCard } from '../components/promotions/DiscountCodesCard';
import { LoyaltyCard } from '../components/promotions/LoyaltyCard';

export function PromotionsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_shop');
  const promotions = useGetPromotionsQuery({ shopId: shopId! }, { skip: !canManage });

  if (isLoading) return <MySpinner />;
  if (isError || !shop) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  const header = <PageHeader eyebrow={t('nav.group.shop')} title={t('nav.promotions')} />;

  if (!canManage) {
    return (
      <div className="max-w-3xl">
        {header}
        <Section padded>
          <p className="text-sm text-[#4a413b]">{t('promotions.accessDenied')}</p>
        </Section>
      </div>
    );
  }

  if (promotions.isLoading) return <MySpinner />;
  if (promotions.isError || !promotions.data) {
    return <p className="text-[#b42318]">{t('promotions.saveFailed')}</p>;
  }

  return (
    <div className="max-w-3xl">
      {header}
      <DiscountCodesCard shopId={shopId!} shop={shop} data={promotions.data} />
      <LoyaltyCard shopId={shopId!} shop={shop} loyalty={promotions.data.loyalty} />
    </div>
  );
}
