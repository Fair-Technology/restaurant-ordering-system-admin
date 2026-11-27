import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { GetGoLiveStatusApiResponse, GetShopResultDto } from '../../services/api';
import { goLiveFixLink } from '../../features/shops/goLiveFixLink';
import { GO_LIVE_FALLBACK_GROUP, groupGoLiveCriteria } from '../../features/shops/goLiveGroups';

interface Props {
  shopId: string;
  status: GetGoLiveStatusApiResponse;
  /** Called when a "Set up" link is followed (the dialog closes itself). */
  onNavigate?: () => void;
  /** Shop's Stripe Connect state; refines the stripe_connected row. */
  stripe?: GetShopResultDto['stripe'];
}

/** Progress bar + grouped go-live criteria, shared by the dialog and the Dashboard card. */
export function GoLiveChecklist({ shopId, status, onNavigate, stripe }: Props) {
  const { t, i18n } = useTranslation();
  const criteria = status.criteria;
  const total = criteria.length;
  const done = criteria.filter((c) => c.met).length;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const groups = groupGoLiveCriteria(criteria);

  return (
    <>
  <div className="border-b border-gray-100 px-5 py-3 sm:px-6">
    <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-600">
      <span>{t('shops.goLive.doneOf', { done, total })}</span>
      <span>{percent}%</span>
    </div>
    <div
      role="progressbar"
      aria-label={t('shops.goLive.progressLabel')}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={done}
      className="h-2 overflow-hidden rounded-full bg-gray-100"
    >
      <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${percent}%` }} />
    </div>
  </div>

  <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 sm:px-6">
    {groups.map((group) => {
      const groupDone = group.criteria.filter((c) => c.met).length;
      const isFallback = group.id === GO_LIVE_FALLBACK_GROUP.id;
      return (
        <section key={group.id} aria-label={t(group.titleKey)}>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-gray-500">
            <h3>{t(group.titleKey)}</h3>
            <span className="font-medium normal-case tracking-normal">
              {t('shops.goLive.groupCount', { done: groupDone, total: group.criteria.length })}
            </span>
          </div>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100">
            {group.criteria.map((criterion) => {
              const known = !isFallback && i18n.exists(`shops.goLive.criteria.${criterion.key}.title`);
              const title = known ? t(`shops.goLive.criteria.${criterion.key}.title`) : criterion.description;
              const stripeState =
                criterion.key === 'stripe_connected' && !criterion.met
                  ? stripe?.connectOnboardingStatus === 'pending'
                    ? 'verifying'
                    : stripe?.connectAccountId
                      ? 'detailsMissing'
                      : 'notStarted'
                  : null;
              const hint =
                stripeState === 'verifying'
                  ? t('shops.goLive.criteria.stripe_connected.hintVerifying')
                  : stripeState === 'detailsMissing'
                    ? t('shops.goLive.criteria.stripe_connected.hintDetailsMissing')
                    : known
                      ? t(`shops.goLive.criteria.${criterion.key}.hint`)
                      : criterion.description;
              const fixLink = goLiveFixLink(shopId, criterion.key, status.hasAnyProducts);
              return (
                <li key={criterion.key} className="flex items-center gap-3 px-3 py-3">
                  {criterion.met ? (
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500 text-white">
                      <Check size={12} strokeWidth={3} aria-hidden="true" />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full border-2 border-gray-300" aria-hidden="true" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{title}</p>
                    {hint !== title && <p className="text-xs text-gray-500">{hint}</p>}
                  </div>
                  {criterion.met ? (
                    <span className="shrink-0 text-xs font-medium text-green-600">{t('shops.goLive.done')}</span>
                  ) : stripeState === 'verifying' ? (
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="text-xs font-medium text-gray-500">{t('shops.goLive.stripePendingReview')}</span>
                      <Link
                        to={fixLink}
                        onClick={onNavigate}
                        aria-label={t('shops.goLive.setupAria', { title })}
                        className="text-xs text-gray-500 underline hover:text-gray-700"
                      >
                        {t('shops.goLive.stripeViewStatus')}
                      </Link>
                    </div>
                  ) : (
                    <Link
                      to={fixLink}
                      onClick={onNavigate}
                      aria-label={t('shops.goLive.setupAria', { title })}
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {stripeState === 'detailsMissing' ? t('shops.goLive.stripeContinue') : t('shops.goLive.setup')}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      );
    })}
  </div>
    </>
  );
}
