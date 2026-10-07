import type { GetShopSubscriptionApiResponse, PlanResponse } from '../../services/api';

/** The free plan is the one flagged as the default, never one matched by name. */
export function isFreePlan(plan: Pick<PlanResponse, 'isDefault'>): boolean {
  return plan.isDefault;
}

/** The plan actually in force (honours expired overrides), falling back to the stored plan. */
export function currentPlanIdOf(data: GetShopSubscriptionApiResponse | undefined): string | undefined {
  return data?.entitlements?.planId ?? data?.subscription.planId;
}
