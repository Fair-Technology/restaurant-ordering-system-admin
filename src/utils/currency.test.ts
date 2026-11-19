import { describe, expect, it } from 'vitest';

import { DEFAULT_CURRENCY, getCurrencySymbol, getCurrencySymbolOrDefault } from './currency';

describe('getCurrencySymbol', () => {
  it('returns the euro sign for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns the dollar sign for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('$');
  });
});

describe('getCurrencySymbolOrDefault', () => {
  it('uses the shop currency when present', () => {
    expect(getCurrencySymbolOrDefault('AUD')).toBe('$');
    expect(getCurrencySymbolOrDefault('EUR')).toBe('€');
  });

  it('falls back to the platform default currency when absent or empty', () => {
    expect(getCurrencySymbolOrDefault(undefined)).toBe('€');
    expect(getCurrencySymbolOrDefault(null)).toBe('€');
    expect(getCurrencySymbolOrDefault('')).toBe('€');
  });

  it('agrees with the default used by the money formatters', () => {
    expect(getCurrencySymbolOrDefault(undefined)).toBe(getCurrencySymbol(DEFAULT_CURRENCY));
  });
});
