import { describe, expect, it } from 'vitest';

import { PAYMENT_CONFIG_UNAVAILABLE_ERROR, isPaymentConfigConflict } from './paymentErrors';

describe('isPaymentConfigConflict', () => {
  it('matches the platform payment-setup conflict', () => {
    expect(isPaymentConfigConflict({ status: 409, data: { error: PAYMENT_CONFIG_UNAVAILABLE_ERROR } })).toBe(true);
  });

  it('rejects a 409 with any other error', () => {
    expect(isPaymentConfigConflict({ status: 409, data: { error: 'Order is no longer waiting' } })).toBe(false);
  });

  it('rejects a 409 whose data has no error', () => {
    expect(isPaymentConfigConflict({ status: 409, data: {} })).toBe(false);
  });

  it('rejects the same sentence on a non-409 status', () => {
    expect(isPaymentConfigConflict({ status: 500, data: { error: PAYMENT_CONFIG_UNAVAILABLE_ERROR } })).toBe(false);
  });

  it('rejects a network error', () => {
    expect(isPaymentConfigConflict({ status: 'FETCH_ERROR', error: 'TypeError: Failed to fetch' })).toBe(false);
  });

  it('rejects undefined', () => {
    expect(isPaymentConfigConflict(undefined)).toBe(false);
  });

  it('keeps the exact backend sentence', () => {
    expect(PAYMENT_CONFIG_UNAVAILABLE_ERROR).toBe(
      'The payment service refused the request because of a platform setup problem, not the card. The order is still waiting and nothing was charged — try again once the platform has fixed it.',
    );
  });
});
