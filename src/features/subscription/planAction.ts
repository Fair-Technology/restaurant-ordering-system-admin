import type { PlanResponse } from '../../services/api';

export type PlanAction =
  | 'current'
  | 'upgrade'
  | 'switch_interval'
  | 'downgrade'
  | 'downgrade_blocked'
  | 'cancel_to_free'
  | 'cancel_blocked';

export type BillingInterval = 'monthly' | 'yearly';

/** The staff-account cap of a plan, or null when it has none (or is unlimited). */
export function staffCapOf(plan: Pick<PlanResponse, 'limits'>): number | null {
  const cap = plan.limits.find((l) => l.key === 'STAFF_ACCOUNTS')?.value;
  return cap === undefined || cap === -1 ? null : cap;
}

/** What the button on a plan card does. A higher `sortOrder` means a higher plan. */
export function planActionFor(input: {
  current: Pick<PlanResponse, 'id' | 'sortOrder'>;
  currentInterval: BillingInterval | null;
  target: Pick<PlanResponse, 'id' | 'sortOrder' | 'isDefault' | 'limits'>;
  targetInterval: BillingInterval;
  activeStaff: number;
}): PlanAction {
  const cap = staffCapOf(input.target);
  const blocked = cap !== null && input.activeStaff > cap;
  if (input.target.id === input.current.id) {
    return input.currentInterval === null || input.currentInterval === input.targetInterval ? 'current' : 'switch_interval';
  }
  if (input.target.isDefault) return blocked ? 'cancel_blocked' : 'cancel_to_free';
  if (input.target.sortOrder > input.current.sortOrder) return 'upgrade';
  return blocked ? 'downgrade_blocked' : 'downgrade';
}
