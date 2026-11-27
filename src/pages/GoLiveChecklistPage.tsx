import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetGoLiveStatusQuery, useGetShopByIdQuery, useUpdateShopMutation } from '../services/api';
import { GoLiveChecklist } from '../components/shop/GoLiveChecklist';
import { PageHeader, Section } from '../components/layout/Page';
import { MyButton } from '../components/ui/MyButton';
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { usePageTitle } from '../features/layout/usePageTitle';

export function GoLiveChecklistPage() {
  usePageTitle('shops.goLive.title');
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_shop');
  const { data: status, isLoading: statusLoading } = useGetGoLiveStatusQuery({ shopId: shopId! }, { skip: !canManage });
  const [updateShop, { isLoading: switching }] = useUpdateShopMutation();
  const [failed, setFailed] = useState(false);

  if (isLoading || (canManage && statusLoading)) return <MySpinner label={t('shops.loadingSettings')} />;
  if (isError || !shop) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  if (!canManage) {
    return (
      <div className="max-w-[720px]">
        <PageHeader eyebrow={t('nav.group.shop')} title={t('shops.goLive.title')} />
        <MyCard className="p-5">
          <p className="text-sm text-[#4a413b]">{t('shops.membersAccessDenied')}</p>
        </MyCard>
      </div>
    );
  }
  if (!status) return <p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p>;

  const open = status.criteria.filter((c) => !c.met).length;

  const handleSwitchOnline = async () => {
    setFailed(false);
    try {
      await updateShop({ shopId: shopId!, body: { isPaused: false } }).unwrap();
      toast.success(t('shops.statusSaved'));
      navigate(`/shops/${shopId}/dashboard`);
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="max-w-[720px]">
      <PageHeader
        eyebrow={t('nav.group.shop')}
        title={t('shops.goLive.title')}
        description={status.allMet ? t('shops.goLive.leadDone') : t('shops.goLive.lead')}
      />
      <Section padded>
        <GoLiveChecklist shopId={shopId!} status={status} />
        {failed && (
          <p role="alert" className="mt-3 text-xs text-red-500">
            {t('shops.goLive.error')}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-4">
          <span className="text-sm text-gray-600">
            {open === 0 ? t('shops.goLive.openCountZero') : t('shops.goLive.openCount', { count: open })}
          </span>
          <MyButton
            variant="primary"
            size="sm"
            onClick={handleSwitchOnline}
            disabled={!status.allMet || switching}
            isPending={switching}
          >
            {switching ? t('shops.goLive.switchingOnline') : t('shops.goLive.switchOnline')}
          </MyButton>
        </div>
      </Section>
    </div>
  );
}
