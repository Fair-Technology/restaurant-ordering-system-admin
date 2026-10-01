import { describe, expect, it } from 'vitest';
import { canOfferOnlinePayments } from './paymentPolicy';

describe('canOfferOnlinePayments', () => {
  it('is only true once Stripe onboarding is complete', () => {
    expect(canOfferOnlinePayments('complete')).toBe(true);
    expect(canOfferOnlinePayments('pending')).toBe(false);
    expect(canOfferOnlinePayments('not_started')).toBe(false);
    expect(canOfferOnlinePayments(null)).toBe(false);
    expect(canOfferOnlinePayments(undefined)).toBe(false);
  });
});
