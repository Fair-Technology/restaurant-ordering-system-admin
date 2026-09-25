import { useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery, useReactivateShopMutation } from '../../services/api';
import { MySpinner } from '../ui/MySpinner';
import { useState } from 'react';

export function ShopLayout() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const [reactivateShop] = useReactivateShopMutation();
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  if (isLoading) return <MySpinner label={t('shops.loadingShop')} />;
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  const isOwner = (shop.callerPermissions ?? []).includes('manage_billing');

  async function handleReactivate() {
    if (!shopId) return;
    setIsReactivating(true);
    setReactivateError(null);
    try {
      await reactivateShop({ shopId }).unwrap();
    } catch (err: any) {
      setReactivateError(err?.data?.error ?? t('subscription.upgradeError'));
    } finally {
      setIsReactivating(false);
    }
  }

  return (
    <>
      {shop.isDeactivatedDueToLimits && (
        <div className="mx-4 mt-4 flex flex-col gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
          <p>{t('subscription.deactivatedBanner')}</p>
          {reactivateError && <p className="text-red-600 text-xs">{reactivateError}</p>}
          {isOwner && (
            <button
              disabled={isReactivating}
              onClick={handleReactivate}
              className="self-start mt-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 hover:bg-red-200 border border-red-300 text-red-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isReactivating ? t('subscription.reactivating') : t('subscription.reactivate')}
            </button>
          )}
        </div>
      )}
      <Outlet />
    </>
  );
}
