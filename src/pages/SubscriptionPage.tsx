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
import { PageHeader, Section } from '../components/layout/Page';
import { badgeClass, chipClass } from '../components/layout/pageStyles';

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
      className={`relative flex min-w-0 flex-col rounded-2xl bg-white ${
        isCurrentPlan ? 'border-2 border-ink' : 'border border-line'
      }`}
    >
      <div className="flex flex-1 flex-col p-5">
        {/* Plan name + tagline */}
        <div className="mb-4 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[22px] leading-tight font-semibold">{plan.name}</h3>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{tagline}</p>
          </div>
          {isCurrentPlan && (
            <span className="flex-shrink-0 rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-white">
              {t('subscription.currentPlanBadge')}
            </span>
          )}
        </div>

        {/* Price */}
        <div className="mb-5 border-b border-line-soft pb-5">
          {isFree ? (
            <p className="text-[32px] leading-none font-bold">{t('subscription.free')}</p>
          ) : hasPrice ? (
            <div className="flex items-baseline gap-2">
              <p className="text-[32px] leading-none font-bold">{priceDisplay}</p>
              <span className="text-[13px] text-[#8a7f77]">{periodLabel}</span>
            </div>
          ) : (
            <p className="text-2xl leading-none font-semibold text-[#c8bfb6]">—</p>
          )}
        </div>

        {/* Features */}
        <ul className="mb-6 flex flex-1 flex-col gap-2.5">
          {features.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[13px] text-[#4a413b]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#2f8a4c]" aria-hidden="true" />
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA button */}
        {action === 'current' ? (
          <div className="flex h-10 w-full cursor-default items-center justify-center rounded-full bg-sand text-sm font-semibold text-[#8a7f77] select-none">
            {t('subscription.currentPlanBadge')}
          </div>
        ) : !isOwner ? null : action === 'downgrade_blocked' || action === 'cancel_blocked' ? (
          <div className="w-full rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3 py-2.5 text-center text-xs font-semibold text-[#b42318]">
            {t('subscription.downgradeBlocked', { n: staffCapOf(plan) ?? 0 })}
          </div>
        ) : action === 'downgrade' || action === 'cancel_to_free' ? (
          isCancelPending ? null : (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onChoose(plan, action)}
              className="h-10 w-full rounded-full border border-[#f5c2bd] bg-white text-sm font-bold text-[#b42318] transition-colors hover:bg-[#fdeceb] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isBusy ? t('subscription.cancellingSubscription') : `${t('subscription.downgrade')} to ${plan.name}`}
            </button>
          )
        ) : (
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onChoose(plan, action)}
            className="h-10 w-full rounded-full bg-ink text-sm font-bold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
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

/** One usage line with a warm track and a filled bar; no bar when the plan has no limit. */
function UsageMeter({ label, used, limit, fill, unlimitedText }: { label: string; used: number; limit: number | null; fill: string; unlimitedText: string }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const full = limit !== null && limit > 0 && used >= limit;
  return (
    <div className="px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-semibold">{label}</span>
        <span className={`text-[13px] font-bold ${full ? 'text-[#b42318]' : 'text-[#4a413b]'}`}>
          {limit === null ? `${used} · ${unlimitedText}` : `${used} / ${limit}`}
        </span>
      </div>
      {limit !== null && (
        <div
          role="meter"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          className="mt-2 h-2 overflow-hidden rounded-full bg-[#efe7de]"
        >
          <div className={`h-full rounded-full ${full ? 'bg-[#b42318]' : fill}`} style={{ width: `${pct}%` }} />
        </div>
      )}
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

  const banner = 'mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-3.5 py-2.5 text-sm';
  const bannerBtn = (dark: boolean) =>
    `h-8 rounded-full px-3.5 text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-40 ${
      dark ? 'bg-ink text-white hover:bg-black' : 'border border-[#e3d9ce] bg-white text-ink hover:bg-sand'
    }`;
  const closeBtn = 'ml-auto flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none text-[#8a7f77] hover:bg-white/60 hover:text-ink';
  const staffCap = currentPlan ? staffCapOf(currentPlan) : (staffData?.limit ?? null);
  const status = subscription?.status;
  const statusBadge =
    status === 'active' ? badgeClass.good : status === 'past_due' ? badgeClass.warn : status === 'canceled' || status === 'expired' ? badgeClass.bad : badgeClass.neutral;

  return (
    <div>
      <PageHeader eyebrow={t('nav.group.business')} title={t('nav.subscription')} />

      {/* Payment result banners */}
      {paymentConfirmed && (
        <div role="status" className={`${banner} border-[#cfe6d6] bg-[#e6f3ea] text-[#1d5a32]`}>
          <span>{t('subscription.paymentSuccess')}</span>
          <button type="button" aria-label={t('subscription.dismiss')} onClick={dismissBanner} className={closeBtn}>
            ×
          </button>
        </div>
      )}
      {paymentParam === 'cancelled' && (
        <div role="status" className={`${banner} border-line bg-white text-[#4a413b]`}>
          <span>{t('subscription.paymentCancelled')}</span>
          <button type="button" aria-label={t('subscription.dismiss')} onClick={dismissBanner} className={closeBtn}>
            ×
          </button>
        </div>
      )}

      {/* Action feedback banner */}
      {actionMessage && (
        <div
          role={actionMessage.type === 'error' ? 'alert' : 'status'}
          className={`${banner} ${
            actionMessage.type === 'success'
              ? 'border-[#cfe6d6] bg-[#e6f3ea] text-[#1d5a32]'
              : 'border-[#f5c2bd] bg-[#fdeceb] text-[#8f1c13]'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button type="button" aria-label={t('subscription.dismiss')} onClick={() => setActionMessage(null)} className={closeBtn}>
            ×
          </button>
        </div>
      )}

      {/* Scheduled downgrade banner */}
      {scheduled && (
        <div className={`${banner} border-[#f1dfae] bg-[#fff6e0] text-[#5c3c00]`}>
          <span className="min-w-0 flex-1">
            {t('subscription.changeScheduled', {
              plan: scheduledPlan?.name ?? '',
              date: new Date(scheduled.effectiveAt).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <button type="button" disabled={isKeepingChange} onClick={handleKeepCurrentPlan} className={bannerBtn(false)}>
              {t('subscription.keepCurrentPlan')}
            </button>
          )}
        </div>
      )}

      {/* Failed-payment block */}
      {paymentFailedAt && (
        <div role="alert" className={`${banner} border-[#f5c2bd] bg-[#fdeceb] text-[#8f1c13]`}>
          <span className="min-w-0 flex-1">
            {t('subscription.paymentFailed', {
              date: new Date(graceEnd ?? paymentFailedAt).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <div className="flex flex-shrink-0 gap-2">
              <button type="button" onClick={handleUpdateCard} className={bannerBtn(false)}>
                {t('subscription.updateCard')}
              </button>
              <button type="button" disabled={isPayingNow} onClick={handlePayNow} className={bannerBtn(true)}>
                {t('subscription.payNow')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancel-at-period-end banner */}
      {isCancelPending && subscription?.currentPeriodEnd && (
        <div className={`${banner} border-[#f1dfae] bg-[#fff6e0] text-[#5c3c00]`}>
          <span className="min-w-0 flex-1">
            {t('subscription.cancelScheduled', {
              date: new Date(subscription.currentPeriodEnd).toLocaleDateString(),
            })}
          </span>
          {isOwner && (
            <button type="button" disabled={isResuming} onClick={handleResume} className={bannerBtn(false)}>
              {isResuming ? t('subscription.resuming') : t('subscription.keepPlan')}
            </button>
          )}
        </div>
      )}

      {/* Current plan and usage */}
      <div className="max-w-3xl">
        <Section
          title={t('subscription.currentPlan')}
          hint={subscription?.planSource === 'superadmin_override' ? t('subscription.overrideNote') : undefined}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-line-soft px-4 py-3">
            <span className="font-display text-[22px] leading-tight font-semibold">{currentPlan?.name ?? subscriptionData?.plan?.name ?? '—'}</span>
            {status && <span className={statusBadge}>{t(`subscription.statusValue.${status}`)}</span>}
            <span className="ml-auto flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted">
              {currentInterval && (
                <span>
                  {t('subscription.billingInterval')}:{' '}
                  <span className="font-semibold text-ink">{t(`subscription.${currentInterval}`)}</span>
                </span>
              )}
              {subscription?.currentPeriodEnd && !isCancelPending && (
                <span>
                  {t('subscription.periodEnd')}:{' '}
                  <span className="font-semibold text-ink">{new Date(subscription.currentPeriodEnd).toLocaleDateString()}</span>
                </span>
              )}
            </span>
          </div>
          {limit && (
            <UsageMeter
              label={t('subscription.ordersUsage')}
              used={limit.acceptedOrderCount}
              limit={limit.limit}
              fill="bg-ink"
              unlimitedText={t('subscription.unlimited')}
            />
          )}
          {staffData && (
            <UsageMeter
              label={t('subscription.staffUsage')}
              used={activeStaff}
              limit={staffCap}
              fill="bg-[#2f8a4c]"
              unlimitedText={t('subscription.unlimited')}
            />
          )}
        </Section>
      </div>

      {/* Plan choice */}
      <div className="mt-6 mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold">{t('subscription.choosePlan')}</h2>
        {/* Monthly / yearly toggle */}
        <div role="group" aria-label={t('subscription.billingInterval')} className="flex gap-2">
          {(['monthly', 'yearly'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={interval === value}
              onClick={() => setBillingInterval(value)}
              className={chipClass(interval === value)}
            >
              {t(`subscription.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      {plans.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

      {upgradeError && <p role="alert" className="mt-3 text-sm text-[#b42318]">{upgradeError}</p>}
    </div>
  );
}
