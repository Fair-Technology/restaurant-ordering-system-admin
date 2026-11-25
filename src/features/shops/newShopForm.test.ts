import { describe, expect, it } from 'vitest';
import { OPENED_COUNTRIES, openedCountry } from './openedCountries';
import { defaultNewShopForm, newShopFormError, withCountry } from './newShopForm';
import type { NewShopFormValues } from './newShopForm';

describe('openedCountry', () => {
  it('resolves codes case-insensitively and trimmed', () => {
    expect(openedCountry('de')?.label).toBe('Germany');
    expect(openedCountry(' DE ')?.label).toBe('Germany');
  });
  it('is undefined for empty or unopened input', () => {
    expect(openedCountry('')).toBeUndefined();
    expect(openedCountry('  ')).toBeUndefined();
    expect(openedCountry(undefined)).toBeUndefined();
    expect(openedCountry(null)).toBeUndefined();
    expect(openedCountry('AU')).toBeUndefined();
  });
  it.each(OPENED_COUNTRIES.map((c) => [c.code, c] as const))('%s is complete', (code, c) => {
    expect(c.code).toMatch(/^[A-Z]{2}$/);
    expect(c.currency).toMatch(/^[A-Z]{3}$/);
    expect(c.timezone).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$/);
    expect(c.label.length).toBeGreaterThan(0);
    expect(openedCountry(code)).toBe(c);
  });
});

describe('defaultNewShopForm', () => {
  it('has no country, currency or time zone', () => {
    const f = defaultNewShopForm('de');
    expect(f.countryCode).toBe('');
    expect(f.currency).toBeUndefined();
    expect(f.timezone).toBeUndefined();
    expect(f.address?.country).toBe('');
    expect(f.menuLanguage).toBe('de');
  });
});

describe('withCountry', () => {
  it('sets country, currency, time zone and address country together', () => {
    const f = withCountry(defaultNewShopForm('en'), openedCountry('DE')!, 'Germany');
    expect(f.countryCode).toBe('DE');
    expect(f.currency).toBe('EUR');
    expect(f.timezone).toBe('Europe/Berlin');
    expect(f.address?.country).toBe('Germany');
  });
  it('keeps the rest of the address', () => {
    const base = { ...defaultNewShopForm('en'), address: { street: 'Main 1', city: 'Berlin' } };
    expect(withCountry(base, openedCountry('DE')!, 'Germany').address).toEqual({
      street: 'Main 1',
      city: 'Berlin',
      country: 'Germany',
    });
  });
});

describe('newShopFormError', () => {
  const complete: NewShopFormValues = {
    name: 'Cafe Berlin',
    slug: 'cafe-berlin',
    countryCode: 'DE',
  };
  it('requires a country', () => {
    expect(newShopFormError({ ...complete, countryCode: '' }, true)).toBe('country');
  });
  it('rejects a country that is not opened', () => {
    expect(newShopFormError({ ...complete, countryCode: 'AU' }, true)).toBe('country');
  });
  it('is null for a complete form with DPA accepted', () => {
    expect(newShopFormError(complete, true)).toBeNull();
  });
  it('requires a well-formed slug that was confirmed available', () => {
    expect(newShopFormError({ ...complete, slug: '' }, true)).toBe('slug');
    expect(newShopFormError({ ...complete, slug: 'Bad Slug' }, true)).toBe('slug');
    expect(newShopFormError(complete, true, false)).toBe('slug');
  });
  it('reports problems in form order', () => {
    expect(newShopFormError({ name: 'ab', countryCode: '' }, false)).toBe('name');
    expect(newShopFormError({ name: 'abc', slug: '', countryCode: '' }, false)).toBe('slug');
    expect(newShopFormError({ name: 'abc', slug: 'abc', countryCode: '' }, false)).toBe('country');
    expect(newShopFormError(complete, false)).toBe('dpa');
  });
});
