import { describe, expect, it } from 'vitest';
import en from '../../../public/locales/en/common.json';
import { translateServerError } from './serverErrorMessage';

function lookup(key: string): string {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v : key;
}
const t = (key: string, opts?: Record<string, unknown>) =>
  lookup(key).replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? ''));

const FB = 'Could not save.';
const err = (data: Record<string, unknown>) => ({ status: 400, data });

describe('translateServerError', () => {
  it('translates a duplicate category name using the page label', () => {
    const m = translateServerError(
      err({ error: 'A category named "Pizza" already exists.', errorCode: 'CATEGORY_NAME_EXISTS', field: 'name' }),
      t,
      FB,
      () => 'Name',
    );
    expect(m).toBe('This Name already exists.');
    expect(m).not.toContain('Pizza');
  });

  it('translates a duplicate discount code', () => {
    const m = translateServerError(
      err({ error: 'This code already exists for this restaurant', errorCode: 'DISCOUNT_CODE_EXISTS', field: 'code' }),
      t,
      FB,
      (k) => (k === 'code' ? 'Code' : undefined),
    );
    expect(m).toBe('This Code already exists.');
  });

  it('title-cases the raw field when no label is supplied', () => {
    expect(translateServerError(err({ errorCode: 'SHOP_SLUG_TAKEN', field: 'shopSlug' }), t, FB)).toBe(
      'This Shop Slug already exists.',
    );
  });

  it('formats both refund amounts as currency', () => {
    const m = translateServerError(
      err({
        error: 'Stripe could not make the refund: Refund amount (EUR4.00) is greater than unrefunded amount on charge (EUR2.49)',
        errorCode: 'REFUND_EXCEEDS_UNREFUNDED',
        requestedCents: 400,
        availableCents: 249,
      }),
      t,
      FB,
      undefined,
      { currency: 'EUR', language: 'en' },
    );
    expect(m).toContain('€4.00');
    expect(m).toContain('€2.49');
    expect(m).not.toContain('Stripe');
  });

  it('gives a translated generic refund failure for other Stripe declines', () => {
    const m = translateServerError(err({ error: 'Stripe could not make the refund: boom', errorCode: 'REFUND_FAILED' }), t, FB);
    expect(m).toBe(lookup('errors.refundFailed'));
    expect(m).not.toContain('boom');
  });

  it('interpolates max for limit codes', () => {
    expect(translateServerError(err({ errorCode: 'DISCOUNT_CODE_MAX_REACHED', max: 50 }), t, FB)).toBe(
      'The limit of 50 has been reached.',
    );
  });

  it('groups *_INVALID codes behind one field sentence', () => {
    expect(translateServerError(err({ errorCode: 'DISCOUNT_VALUE_INVALID', field: 'value' }), t, FB, () => 'Value')).toBe(
      'Please check Value and try again.',
    );
    expect(translateServerError(err({ errorCode: 'DELIVERY_INVALID' }), t, FB)).toBe(lookup('errors.generic'));
  });

  it('handles concurrent changes', () => {
    expect(translateServerError(err({ errorCode: 'SETTINGS_CHANGED_CONCURRENTLY' }), t, FB)).toBe(
      lookup('errors.changedConcurrently'),
    );
  });

  it('never leaks the raw English sentence for unknown or missing codes', () => {
    expect(translateServerError(err({ error: 'Raw English', errorCode: 'SOMETHING_NEW' }), t, FB)).toBe(lookup('errors.generic'));
    expect(translateServerError(err({ error: 'Raw English' }), t, FB)).toBe(lookup('errors.generic'));
  });

  it('uses the caller fallback when there is no response body', () => {
    expect(translateServerError(new Error('x'), t, FB)).toBe(FB);
    expect(translateServerError({ status: 'FETCH_ERROR' }, t, FB)).toContain('reach the server');
  });

  it('keeps en and de errors.* keys in sync', async () => {
    const de = (await import('../../../public/locales/de/common.json')).default as { errors: Record<string, string> };
    expect(Object.keys(de.errors).sort()).toEqual(Object.keys((en as { errors: Record<string, string> }).errors).sort());
  });
});
