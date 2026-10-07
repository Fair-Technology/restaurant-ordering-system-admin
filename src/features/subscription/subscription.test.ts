import { describe, expect, it } from 'vitest';
import type { GetShopSubscriptionApiResponse } from '../../services/api';
import type { OrderLimitStatusDto } from '../../services/subscriptionApi';
import { limitBannerOf } from './limitBanner';
import { currentPlanIdOf, isFreePlan } from './planDisplay';

const status = (over: Partial<OrderLimitStatusDto>): OrderLimitStatusDto => ({
  periodKey: '2026-10',
  acceptedOrderCount: 0,
  limit: 30,
  warningLevel: 0,
  limitReached: false,
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
