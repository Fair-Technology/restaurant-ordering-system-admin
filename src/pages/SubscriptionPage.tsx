import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle2 } from 'lucide-react';
import {
  useGetShopByIdQuery,
  useGetShopSubscriptionQuery,
  useGetVisiblePlansQuery,
  useGetPlanPricingQuery,
  useCreateSubscriptionCheckoutMutation,
  useCancelShopSubscriptionMutation,
  useResumeShopSubscriptionMutation,
} from '../services/api';
import type { PlanResponse } from '../services/api';
import { MySpinner } from '../components/ui/MySpinner';

// Taglines shown beneath each plan name, indexed by sort position
const PLAN_TAGLINES = [
  'Everything you need to start taking orders online.',
  'Perfect for growing shops with higher volume.',
  'Built for busy venues that need maximum power.',
  'Enterprise-grade with zero limits on your business.',
];

// Base features every plan includes
const BASE_FEATURES = [
  'Online ordering storefront',
  'Product catalog management',
  'Real-time order dashboard',
  'Customer email notifications',
  'Basic analytics & reporting',
];

// Extra features unlocked on paid plans
const PAID_FEATURES = [
  'Custom branding & colours',
  'Advanced analytics & reports',
  'Multiple staff accounts',
  'Priority support',
];

function formatLimitKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPrice(cents: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

interface PlanCardProps {
  plan: PlanResponse;
  index: number;
  currency: string;
  isCurrentPlan: boolean;
  isDowngrade: boolean;
  isCancelPending: boolean;
  isOwner: boolean;
  onUpgrade: (planId: string) => void;
  onDowngrade: (planId: string) => void;
  isUpgrading: boolean;
  isDowngrading: boolean;
}

function PlanCard({
  plan,
  index,
  currency,
  isCurrentPlan,
  isDowngrade,
  isCancelPending,
  isOwner,
  onUpgrade,
  onDowngrade,
  isUpgrading,
  isDowngrading,
}: PlanCardProps) {
  const { t } = useTranslation();
  const { data: pricingList } = useGetPlanPricingQuery({ planId: plan.id });

  const pricing = pricingList?.find(
    (p) => p.currency.toUpperCase() === currency.toUpperCase(),
  );

  const isFree = plan.internalKey === 'free';
  const tagline = PLAN_TAGLINES[index] ?? 'The right plan for your business.';

  let priceDisplay = '';
  let periodLabel = '';
  let hasPrice = false;

  if (isFree) {
    priceDisplay = t('subscription.free');
  } else if (pricing) {
    const amount = pricing.monthlyAmountCents;
    if (amount > 0) {
      priceDisplay = formatPrice(amount, currency);
      periodLabel = t('subscription.perMonth');
      hasPrice = true;
    }
  }

  const limitFeatures = plan.limits.map(
    (l) => `${l.value === -1 ? 'Unlimited' : l.value.toLocaleString()} ${formatLimitKey(l.key)}`,
  );
  const staticFeatures = isFree ? BASE_FEATURES : [...BASE_FEATURES, ...PAID_FEATURES];
  const features = limitFeatures.length > 0 ? [...limitFeatures, ...staticFeatures] : staticFeatures;

  return (
    <div
      className={`relative flex flex-col flex-1 min-w-[220px] rounded-2xl overflow-hidden transition-all duration-200 ${
        isCurrentPlan
          ? 'bg-white border-2 border-gray-900 shadow-sm'
          : 'bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300'
      }`}
    >
      {/* Current plan badge */}
      {isCurrentPlan && (
        <div className="absolute top-4 right-4">
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-900 text-white">
            {t('subscription.currentPlanBadge')}
          </span>
        </div>
      )}

      <div className="flex flex-col flex-1 p-6">
        {/* Plan name + tagline */}
        <div className="mb-6 pr-6">
          <h3 className="text-xl font-bold text-gray-900 mb-1.5">{plan.name}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{tagline}</p>
        </div>

        {/* Price */}
        <div className="mb-7">
          {isFree ? (
            <p className="text-4xl font-bold text-gray-900">{t('subscription.free')}</p>
          ) : hasPrice ? (
            <div className="flex items-baseline gap-2.5">
              <p className="text-4xl font-bold text-gray-900">{priceDisplay}</p>
              <span className="text-sm text-gray-400">{periodLabel}</span>
            </div>
          ) : (
            <p className="text-2xl font-semibold text-gray-300">—</p>
          )}
        </div>

        {/* Features */}
        <ul className="flex flex-col gap-3 flex-1 mb-8">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-600">
              <CheckCircle2 className="w-4 h-4 text-gray-900 flex-shrink-0 mt-0.5" />
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA button */}
        {isCurrentPlan ? (
          <div className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-100 border border-gray-200 text-gray-400 text-center cursor-default select-none">
            {t('subscription.currentPlanBadge')}
          </div>
        ) : isDowngrade && isOwner && !isCancelPending ? (
          <button
            disabled={isDowngrading}
            onClick={() => onDowngrade(plan.id)}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDowngrading
              ? t('subscription.cancellingSubscription')
              : `${t('subscription.downgrade')} to ${plan.name}`}
          </button>
        ) : isOwner && !isFree ? (
          <button
            disabled={isUpgrading}
            onClick={() => onUpgrade(plan.id)}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isUpgrading ? t('subscription.upgrading') : `${t('subscription.upgrade')} to ${plan.name}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SubscriptionPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null);
  const [isDowngrading, setIsDowngrading] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: shop, isLoading: shopLoading } = useGetShopByIdQuery({ shopId: shopId! });
  const { data: subscriptionData, isLoading: subLoading } = useGetShopSubscriptionQuery(
    { shopId: shopId! },
    { refetchOnMountOrArgChange: true },
  );
  const { data: plansData, isLoading: plansLoading } = useGetVisiblePlansQuery();
  const [createSubscriptionCheckout] = useCreateSubscriptionCheckoutMutation();
  const [cancelShopSubscription] = useCancelShopSubscriptionMutation();
  const [resumeShopSubscription] = useResumeShopSubscriptionMutation();

  const paymentParam = searchParams.get('payment');

  function dismissBanner() {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('payment');
      return next;
    });
  }

  const isOwner = (shop?.callerPermissions ?? []).includes('manage_billing');

  const subscription = subscriptionData?.subscription;

  async function handleUpgrade(planId: string) {
    if (!shopId) return;
    setUpgradeError(null);
    setUpgradingPlanId(planId);
    try {
      const result = await createSubscriptionCheckout({ shopId, planId, billingInterval: 'monthly' }).unwrap();
      window.location.href = result.url;
    } catch {
      setUpgradeError(t('subscription.upgradeError'));
      setUpgradingPlanId(null);
    }
  }

  async function handleDowngrade() {
    if (!shopId) return;
    setIsDowngrading(true);
    setActionMessage(null);
    try {
      await cancelShopSubscription({ shopId }).unwrap();
      setActionMessage({ type: 'success', text: t('subscription.cancelSuccess') });
    } catch {
      setActionMessage({ type: 'error', text: t('subscription.upgradeError') });
    } finally {
      setIsDowngrading(false);
    }
  }

  async function handleResume() {
    if (!shopId) return;
    setIsResuming(true);
    setActionMessage(null);
    try {
      await resumeShopSubscription({ shopId }).unwrap();
      setActionMessage({ type: 'success', text: t('subscription.resumeSuccess') });
    } catch {
      setActionMessage({ type: 'error', text: t('subscription.upgradeError') });
    } finally {
      setIsResuming(false);
    }
  }

  if (shopLoading || subLoading || plansLoading) {
    return <MySpinner label={t('subscription.loading')} />;
  }

  const currency = shop?.currency ?? 'USD';
  const plans = plansData?.plans ?? [];
  const isCancelPending = subscription?.cancelAtPeriodEnd === true;
  const currentPlan = plans.find((p) => p.id === subscription?.planId);

  return (
    <div className="flex flex-col gap-6">
      {/* Payment result banners */}
      {paymentParam === 'success' && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-700 text-sm">
          <span>{t('subscription.paymentSuccess')}</span>
          <button
            onClick={dismissBanner}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}
      {paymentParam === 'cancelled' && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-600 text-sm">
          <span>{t('subscription.paymentCancelled')}</span>
          <button
            onClick={dismissBanner}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Action feedback banner */}
      {actionMessage && (
        <div className={`flex items-center justify-between gap-4 px-4 py-3 rounded-xl border text-sm ${
          actionMessage.type === 'success'
            ? 'bg-gray-50 border-gray-200 text-gray-700'
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ×
          </button>
        </div>
      )}

      {/* Cancel-at-period-end banner */}
      {isCancelPending && subscription?.currentPeriodEnd && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          <span>
            {t('subscription.cancelScheduled', {
              date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <button
              disabled={isResuming}
              onClick={handleResume}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isResuming ? t('subscription.resuming') : t('subscription.keepPlan')}
            </button>
          )}
        </div>
      )}

      {/* Plan cards */}
      {plans.length > 0 && (
        <div className="flex gap-4 items-stretch">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              currency={currency}
              isCurrentPlan={subscription?.planId === plan.id}
              isDowngrade={
                currentPlan !== undefined &&
                plan.sortOrder < currentPlan.sortOrder &&
                !isCancelPending
              }
              isCancelPending={isCancelPending}
              isOwner={isOwner}
              onUpgrade={handleUpgrade}
              onDowngrade={handleDowngrade}
              isUpgrading={upgradingPlanId === plan.id}
              isDowngrading={isDowngrading}
            />
          ))}
        </div>
      )}

      {upgradeError && <p className="text-sm text-red-600">{upgradeError}</p>}
    </div>
  );
}
