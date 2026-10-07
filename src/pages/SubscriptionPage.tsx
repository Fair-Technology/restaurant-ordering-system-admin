import { useEffect, useRef, useState } from 'react';
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
  useListStaffQuery,
} from '../services/api';
import type { PlanResponse } from '../services/api';
import {
  useGetOrderLimitQuery,
  useConfirmSubscriptionCheckoutMutation,
  useCancelScheduledChangeMutation,
  useCreateBillingPortalSessionMutation,
  useRetrySubscriptionPaymentMutation,
} from '../services/subscriptionApi';
import { planActionFor, staffCapOf } from '../features/subscription/planAction';
import type { BillingInterval, PlanAction } from '../features/subscription/planAction';
import { currentPlanIdOf, isFreePlan } from '../features/subscription/planDisplay';
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
  interval: BillingInterval;
  isCurrentPlan: boolean;
  action: PlanAction;
  isCancelPending: boolean;
  isOwner: boolean;
  onChoose: (plan: PlanResponse, action: PlanAction) => void;
  isBusy: boolean;
}

function PlanCard({
  plan,
  index,
  currency,
  interval,
  isCurrentPlan,
  action,
  isCancelPending,
  isOwner,
  onChoose,
  isBusy,
}: PlanCardProps) {
  const { t } = useTranslation();
  const { data: pricingList } = useGetPlanPricingQuery({ planId: plan.id });

  const pricing = pricingList?.find(
    (p) => p.currency.toUpperCase() === currency.toUpperCase(),
  );

  const isFree = isFreePlan(plan);
  const tagline = PLAN_TAGLINES[index] ?? 'The right plan for your business.';

  let priceDisplay = '';
  let periodLabel = '';
  let hasPrice = false;

  if (isFree) {
    priceDisplay = t('subscription.free');
  } else if (pricing) {
    const amount = interval === 'yearly' ? pricing.yearlyAmountCents : pricing.monthlyAmountCents;
    if (amount > 0) {
      priceDisplay = formatPrice(amount, currency);
      periodLabel = t(interval === 'yearly' ? 'subscription.perYear' : 'subscription.perMonth');
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
        {action === 'current' ? (
          <div className="w-full py-2.5 rounded-xl text-sm font-medium bg-gray-100 border border-gray-200 text-gray-400 text-center cursor-default select-none">
            {t('subscription.currentPlanBadge')}
          </div>
        ) : !isOwner ? null : action === 'downgrade_blocked' || action === 'cancel_blocked' ? (
          <div className="w-full py-2.5 px-3 rounded-xl text-xs font-medium bg-red-50 border border-red-200 text-red-700 text-center">
            {t('subscription.downgradeBlocked', { n: staffCapOf(plan) ?? 0 })}
          </div>
        ) : action === 'downgrade' || action === 'cancel_to_free' ? (
          isCancelPending ? null : (
            <button
              disabled={isBusy}
              onClick={() => onChoose(plan, action)}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isBusy ? t('subscription.cancellingSubscription') : `${t('subscription.downgrade')} to ${plan.name}`}
            </button>
          )
        ) : (
          <button
            disabled={isBusy}
            onClick={() => onChoose(plan, action)}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isBusy
              ? t('subscription.upgrading')
              : action === 'switch_interval'
                ? `${t('subscription.billingInterval')}: ${t(interval === 'yearly' ? 'subscription.yearly' : 'subscription.monthly')}`
                : `${t('subscription.upgrade')} to ${plan.name}`}
          </button>
        )}
      </div>
    </div>
  );
}

export function SubscriptionPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
  const [interval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [isKeepingChange, setIsKeepingChange] = useState(false);
  const [isPayingNow, setIsPayingNow] = useState(false);
  const confirmedSessionRef = useRef<string | null>(null);
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
  const [confirmSubscriptionCheckout] = useConfirmSubscriptionCheckoutMutation();
  const [cancelScheduledChange] = useCancelScheduledChangeMutation();
  const [createBillingPortalSession] = useCreateBillingPortalSessionMutation();
  const [retrySubscriptionPayment] = useRetrySubscriptionPaymentMutation();
  const { data: staffData } = useListStaffQuery({ shopId: shopId! });

  const paymentParam = searchParams.get('payment');
  const sessionId = searchParams.get('session_id');

  function dismissBanner() {
    setPaymentConfirmed(false);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('payment');
      next.delete('session_id');
      return next;
    });
  }

  // Start the toggle on the interval the shop already pays, so its own plan reads as current.
  const paidInterval = subscriptionData?.subscription.billingInterval ?? null;
  useEffect(() => {
    if (paidInterval) setBillingInterval(paidInterval);
  }, [paidInterval]);

  // Back from Stripe Checkout: ask the server to read the session so the plan changes without waiting for the webhook.
  useEffect(() => {
    if (!shopId || paymentParam !== 'success' || !sessionId || confirmedSessionRef.current === sessionId) return;
    confirmedSessionRef.current = sessionId;
    confirmSubscriptionCheckout({ shopId, sessionId })
      .unwrap()
      .then(() => setPaymentConfirmed(true))
      .catch(() => setActionMessage({ type: 'error', text: t('subscription.upgradeError') }))
      .finally(() =>
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete('payment');
          next.delete('session_id');
          return next;
        }),
      );
  }, [shopId, paymentParam, sessionId, confirmSubscriptionCheckout, setSearchParams, t]);

  const isOwner = (shop?.callerPermissions ?? []).includes('manage_billing');

  const subscription = subscriptionData?.subscription;
  const { data: limit } = useGetOrderLimitQuery({ shopId: shopId! });

  async function handleChoose(plan: PlanResponse, action: PlanAction) {
    if (!shopId) return;
    setUpgradeError(null);
    setActionMessage(null);
    setBusyPlanId(plan.id);
    try {
      if (action === 'cancel_to_free') {
        await cancelShopSubscription({ shopId }).unwrap();
        setActionMessage({ type: 'success', text: t('subscription.cancelSuccess') });
        return;
      }
      const result = await createSubscriptionCheckout({ shopId, planId: plan.id, billingInterval: interval }).unwrap();
      if (result.kind === 'checkout') {
        window.location.href = result.url;
        return;
      }
      if (result.kind === 'applied') setActionMessage({ type: 'success', text: t('subscription.upgradeApplied') });
    } catch (err) {
      setUpgradeError((err as { data?: { error?: string } })?.data?.error ?? t('subscription.upgradeError'));
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleKeepCurrentPlan() {
    if (!shopId) return;
    setIsKeepingChange(true);
    setActionMessage(null);
    try {
      await cancelScheduledChange({ shopId }).unwrap();
    } catch {
      setActionMessage({ type: 'error', text: t('subscription.upgradeError') });
    } finally {
      setIsKeepingChange(false);
    }
  }

  async function handleUpdateCard() {
    if (!shopId) return;
    setActionMessage(null);
    try {
      const { url } = await createBillingPortalSession({ shopId }).unwrap();
      window.location.href = url;
    } catch {
      setActionMessage({ type: 'error', text: t('subscription.upgradeError') });
    }
  }

  async function handlePayNow() {
    if (!shopId) return;
    setIsPayingNow(true);
    setActionMessage(null);
    try {
      await retrySubscriptionPayment({ shopId }).unwrap();
    } catch (err) {
      setActionMessage({
        type: 'error',
        text: (err as { data?: { error?: string } })?.data?.error ?? t('subscription.upgradeError'),
      });
    } finally {
      setIsPayingNow(false);
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
  const currentPlanId = currentPlanIdOf(subscriptionData);
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const currentInterval = subscription?.billingInterval ?? null;
  const activeStaff = staffData?.activeCount ?? 0;
  const scheduled = subscription?.scheduledChange ?? null;
  const scheduledPlan = scheduled ? plans.find((p) => p.id === scheduled.planId) : undefined;
  const paymentFailedAt = subscription?.status === 'past_due' ? subscription.paymentFailedAt : null;
  const graceEnd = subscriptionData?.entitlements?.graceEndsAt ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Payment result banners */}
      {paymentConfirmed && (
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

      {/* Scheduled downgrade banner */}
      {scheduled && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          <span>
            {t('subscription.changeScheduled', {
              plan: scheduledPlan?.name ?? '',
              date: new Date(scheduled.effectiveAt).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <button
              disabled={isKeepingChange}
              onClick={handleKeepCurrentPlan}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 hover:bg-yellow-200 border border-yellow-300 text-yellow-900 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('subscription.keepCurrentPlan')}
            </button>
          )}
        </div>
      )}

      {/* Failed-payment block */}
      {paymentFailedAt && (
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
          <span>
            {t('subscription.paymentFailed', {
              date: new Date(graceEnd ?? paymentFailedAt).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <div className="shrink-0 flex gap-2">
              <button
                onClick={handleUpdateCard}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 transition-all"
              >
                {t('subscription.updateCard')}
              </button>
              <button
                disabled={isPayingNow}
                onClick={handlePayNow}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-900 hover:bg-gray-800 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('subscription.payNow')}
              </button>
            </div>
          )}
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

      {limit && (
        <p className="text-sm text-gray-600">
          {limit.limit === null
            ? t('orderLimit.usageUnlimited', { count: limit.acceptedOrderCount })
            : t('orderLimit.usageLine', { count: limit.acceptedOrderCount, limit: limit.limit })}
        </p>
      )}

      {/* Monthly / yearly toggle */}
      <div className="inline-flex self-start rounded-xl border border-gray-200 bg-white p-1 text-sm font-medium">
        {(['monthly', 'yearly'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setBillingInterval(value)}
            className={`px-4 py-1.5 rounded-lg transition-all ${
              interval === value ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t(`subscription.${value}`)}
          </button>
        ))}
      </div>

      {/* Plan cards */}
      {plans.length > 0 && (
        <div className="flex gap-4 items-stretch">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={index}
              currency={currency}
              isCurrentPlan={currentPlanId === plan.id}
              interval={interval}
              isCancelPending={isCancelPending}
              isOwner={isOwner}
              action={planActionFor({
                current: currentPlan ?? { id: currentPlanId ?? '', sortOrder: 0 },
                currentInterval,
                target: plan,
                targetInterval: interval,
                activeStaff,
              })}
              onChoose={handleChoose}
              isBusy={busyPlanId === plan.id}
            />
          ))}
        </div>
      )}

      {upgradeError && <p className="text-sm text-red-600">{upgradeError}</p>}
    </div>
  );
}
