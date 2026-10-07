import { describe, expect, it } from 'vitest';
import type { GetShopSubscriptionApiResponse } from '../../services/api';
import type { OrderLimitStatusDto } from '../../services/subscriptionApi';
import { limitBannerOf } from './limitBanner';
import { currentPlanIdOf, isFreePlan } from './planDisplay';
import { planActionFor } from './planAction';

const status = (over: Partial<OrderLimitStatusDto>): OrderLimitStatusDto => ({
  periodKey: '2026-10',
  acceptedOrderCount: 0,
  limit: 30,
  warningLevel: 0,
  limitReached: false,
  payment: { inGrace: false, graceEndsAt: null, droppedForNonPayment: false },
  ...over,
});

describe('limitBannerOf', () => {
  it('no banner without a limit or below 80 %', () => {
    expect(limitBannerOf(undefined)).toBeNull();
    expect(limitBannerOf(status({ limit: null, warningLevel: 0 }))).toBeNull();
    expect(limitBannerOf(status({ acceptedOrderCount: 20, warningLevel: 0 }))).toBeNull();
  });

  it('an amber banner from 80 %', () => {
    expect(limitBannerOf(status({ acceptedOrderCount: 24, warningLevel: 80 }))).toEqual({ level: 80, count: 24, limit: 30, tone: 'warning' });
  });

  it('a red banner at the limit', () => {
    expect(limitBannerOf(status({ acceptedOrderCount: 30, warningLevel: 100, limitReached: true }))?.tone).toBe('stop');
  });
});

describe('planDisplay', () => {
  it('the default plan is the free one', () => {
    expect(isFreePlan({ isDefault: true })).toBe(true);
    expect(isFreePlan({ isDefault: false })).toBe(false);
  });

  it('the plan in force comes from entitlements', () => {
    const data = {
      subscription: { planId: 'plan-max' },
      plan: null,
      entitlements: { planId: 'plan-pro', limits: {}, limitOverrideActive: false, planOverrideExpired: false },
    } as unknown as GetShopSubscriptionApiResponse;
    expect(currentPlanIdOf(data)).toBe('plan-pro');
    expect(currentPlanIdOf({ ...data, entitlements: undefined })).toBe('plan-max');
    expect(currentPlanIdOf(undefined)).toBeUndefined();
  });
});

describe('planActionFor', () => {
  const plan = (id: string, sortOrder: number, cap?: number, isDefault = false) => ({
    id,
    sortOrder,
    isDefault,
    limits: cap === undefined ? [] : [{ key: 'STAFF_ACCOUNTS', value: cap }],
  });

  it('a higher plan is an upgrade', () => {
    expect(
      planActionFor({ current: plan('pro', 2), currentInterval: 'monthly', target: plan('max', 3), targetInterval: 'monthly', activeStaff: 2 }),
    ).toBe('upgrade');
  });

  it('a lower plan with too many staff is blocked', () => {
    expect(
      planActionFor({ current: plan('max', 3), currentInterval: 'monthly', target: plan('pro', 2, 2), targetInterval: 'monthly', activeStaff: 3 }),
    ).toBe('downgrade_blocked');
    expect(
      planActionFor({ current: plan('max', 3), currentInterval: 'monthly', target: plan('pro', 2, 2), targetInterval: 'monthly', activeStaff: 2 }),
    ).toBe('downgrade');
  });

  it('the free plan is a cancel', () => {
    const free = plan('free', 1, 5, true);
    expect(planActionFor({ current: plan('pro', 2), currentInterval: 'monthly', target: free, targetInterval: 'monthly', activeStaff: 3 })).toBe('cancel_to_free');
    expect(planActionFor({ current: plan('pro', 2), currentInterval: 'monthly', target: free, targetInterval: 'monthly', activeStaff: 6 })).toBe('cancel_blocked');
  });

  it('the same plan on the other interval is a switch', () => {
    const pro = plan('pro', 2);
    expect(planActionFor({ current: pro, currentInterval: 'monthly', target: pro, targetInterval: 'yearly', activeStaff: 1 })).toBe('switch_interval');
    expect(planActionFor({ current: pro, currentInterval: 'monthly', target: pro, targetInterval: 'monthly', activeStaff: 1 })).toBe('current');
  });
});
