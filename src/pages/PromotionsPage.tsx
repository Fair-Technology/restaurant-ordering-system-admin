import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../services/api';
import { useGetPromotionsQuery } from '../services/promotionsApi';
import { MySpinner } from '../components/ui/MySpinner';
import { MyButton } from '../components/ui/MyButton';
import { codesLimitReached } from '../features/promotions/promotions';
import { PageHeader, Section } from '../components/layout/Page';
import { DiscountCodesCard } from '../components/promotions/DiscountCodesCard';
import { LoyaltyCard } from '../components/promotions/LoyaltyCard';
import { LoyaltyVouchersCard } from '../components/promotions/LoyaltyVouchersCard';
import { usePageTitle } from '../features/layout/usePageTitle';

export function PromotionsPage() {
  usePageTitle('nav.promotions');
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_shop');
  const promotions = useGetPromotionsQuery({ shopId: shopId! }, { skip: !canManage });
  const [showNewCode, setShowNewCode] = useState(false);

  if (isLoading) return <MySpinner />;
  if (isError || !shop) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  const header = <PageHeader eyebrow={t('nav.group.shop')} title={t('nav.promotions')} description={t('promotions.pageSubtitle')} />;

  if (!canManage) {
    return (
      <div>
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

  const limitReached = codesLimitReached(promotions.data.codes.length);

  return (
    <div>
      <PageHeader
        eyebrow={t('nav.group.shop')}
        title={t('nav.promotions')}
        description={t('promotions.pageSubtitle')}
        actions={
          <MyButton type="button" disabled={limitReached} onClick={() => setShowNewCode(true)}>
            {t('promotions.newCode')}
          </MyButton>
        }
      />
      <DiscountCodesCard
        shopId={shopId!}
        shop={shop}
        data={promotions.data}
        showForm={showNewCode}
        onOpenForm={() => setShowNewCode(true)}
        onCloseForm={() => setShowNewCode(false)}
      />
      <LoyaltyCard shopId={shopId!} shop={shop} loyalty={promotions.data.loyalty} />
      <LoyaltyVouchersCard shopId={shopId!} shop={shop} loyaltyEnabled={promotions.data.loyalty.enabled} />
    </div>
  );
}
