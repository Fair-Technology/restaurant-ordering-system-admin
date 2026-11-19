import { describe, expect, it } from 'vitest';

import { isPlausiblePhone } from './validatePhone';

describe('isPlausiblePhone', () => {
  it('rejects empty and whitespace-only strings', () => {
    expect(isPlausiblePhone('')).toBe(false);
    expect(isPlausiblePhone('   ')).toBe(false);
  });

  it('rejects letters and disallowed characters', () => {
    expect(isPlausiblePhone('abc')).toBe(false);
    expect(isPlausiblePhone('<b>x</b>')).toBe(false);
  });

  it('rejects too few or too many digits', () => {
    expect(isPlausiblePhone('123')).toBe(false);
    expect(isPlausiblePhone('1234567890123456')).toBe(false);
  });

  it('rejects strings longer than 30 characters', () => {
    expect(isPlausiblePhone(`1234567${'-'.repeat(30)}`)).toBe(false);
  });

  it('accepts valid phone numbers', () => {
    expect(isPlausiblePhone('+49 170 1234567')).toBe(true);
    expect(isPlausiblePhone('(555) 123-4567')).toBe(true);
    expect(isPlausiblePhone('0170-1234567')).toBe(true);
  });
});
