import { describe, expect, it } from 'vitest';

import { getCurrencySymbol } from './currency';

describe('getCurrencySymbol', () => {
  it('returns the euro sign for EUR', () => {
    expect(getCurrencySymbol('EUR')).toBe('€');
  });

  it('returns the dollar sign for AUD', () => {
    expect(getCurrencySymbol('AUD')).toBe('$');
  });
});
