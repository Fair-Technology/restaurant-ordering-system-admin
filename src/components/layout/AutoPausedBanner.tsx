import { useTranslation } from 'react-i18next';
import { useUpdateShopMutation, type ShopResponse } from '../../services/api';
import { autoPausedCount } from '../../features/shops/shopStatus';
import { useNow } from '../../features/orders/useNow';
import { useToast } from '../../contexts/ToastContext';

/** Tells the owner that orders were paused automatically after missed orders, with a one-click way back. */
export function AutoPausedBanner({ shop }: { shop: ShopResponse }) {
  const { t } = useTranslation();
  const toast = useToast();
  const nowMs = useNow(30_000);
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const count = autoPausedCount(shop, nowMs);

  if (count === null) return null;

  const canManage = (shop.callerPermissions ?? []).includes('manage_shop');
  const resume = async () => {
    try {
      await updateShop({ shopId: shop.id!, updateShopRequest: { ordersPaused: false } }).unwrap();
    } catch {
      toast.error(t('shops.statusFailedToSave'));
    }
  };

  return (
    <div
      role="status"
      className="mb-4 px-4 py-3 rounded-xl border text-sm flex items-center justify-between gap-4 bg-amber-50 border-amber-200 text-amber-900"
    >
      <span>{t('shops.autoPausedBanner', { count })}</span>
      {canManage && (
        <button
          type="button"
          onClick={() => void resume()}
          disabled={isLoading}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 disabled:opacity-50"
        >
          {t('shops.autoPausedResume')}
        </button>
      )}
    </div>
  );
}
