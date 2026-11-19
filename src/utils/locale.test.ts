import { describe, expect, it } from 'vitest';
import { formatShopCents, formatShopDate, formatShopDateTime, shopLocale } from './locale';

describe('shopLocale', () => {
  it('combines language and shop country', () => {
    expect(shopLocale('de', 'DE')).toBe('de-DE');
    expect(shopLocale('en', 'AU')).toBe('en-AU');
    expect(shopLocale('de-AT', ' at ')).toBe('de-AT');
  });
  it('falls back per language without a country', () => {
    expect(shopLocale('de', undefined)).toBe('de-DE');
    expect(shopLocale('en', null)).toBe('en-GB');
    expect(shopLocale('en', '  ')).toBe('en-GB');
  });
});

describe('formatShopDate', () => {
  const date = '2026-11-19T12:00:00Z';
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' };
  it('is day-first dotted for a German shop', () => {
    expect(formatShopDate(date, 'de', 'DE', opts, 'UTC')).toBe('19.11.2026');
  });
  it('is day-first slashed for an Australian shop', () => {
    expect(formatShopDate(date, 'en', 'AU', opts, 'UTC')).toBe('19/11/2026');
  });
  it('respects the shop timezone', () => {
    expect(formatShopDate('2026-11-19T23:30:00Z', 'en', 'AU', opts, 'Australia/Sydney')).toBe('20/11/2026');
  });
});

describe('formatShopDateTime / formatShopCents', () => {
  it('includes time of day', () => {
    expect(formatShopDateTime('2026-11-19T16:01:00Z', 'en', 'GB', 'Europe/London')).toContain('16:01');
  });
  it('formats currency by shop country', () => {
    expect(formatShopCents(1050, 'EUR', 'de', 'DE').replace(/\s/g, ' ')).toBe('10,50 €');
  });
});
