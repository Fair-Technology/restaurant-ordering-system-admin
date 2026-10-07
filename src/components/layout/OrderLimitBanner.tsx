import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetOrderLimitQuery } from '../../services/subscriptionApi';
import { limitBannerOf } from '../../features/subscription/limitBanner';

interface OrderLimitBannerProps {
  shopId: string;
  canManageBilling: boolean;
}

/** Shown to everyone in the restaurant from 80 % of the monthly order limit. Deliberately not closable. */
export function OrderLimitBanner({ shopId, canManageBilling }: OrderLimitBannerProps) {
  const { t } = useTranslation();
  const { data } = useGetOrderLimitQuery({ shopId }, { pollingInterval: 60_000 });
  const banner = limitBannerOf(data);
  if (!banner) return null;

  const tone = banner.tone === 'stop' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900';

  return (
    <div role="status" className={`mx-4 mt-4 px-4 py-3 rounded-xl border text-sm flex items-center justify-between gap-4 ${tone}`}>
      <span>
        {t(banner.tone === 'stop' ? 'orderLimit.bannerStop' : 'orderLimit.bannerWarning', {
          count: banner.count,
          limit: banner.limit,
          percent: banner.level,
        })}
      </span>
      {canManageBilling ? (
        <Link
          to={`/shops/${shopId}/subscription`}
          className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150"
        >
          {t('orderLimit.upgrade')}
        </Link>
      ) : (
        <span className="shrink-0 font-medium">{t('orderLimit.askOwner')}</span>
      )}
    </div>
  );
}
