import { describe, expect, it } from 'vitest';
import { formatCents } from './money';

describe('formatCents', () => {
  it('German euro', () => {
    expect(formatCents(1050, 'EUR', 'de').replace(/\s/g, ' ')).toBe('10,50 €');
  });
  it('English euro', () => {
    expect(formatCents(1050, 'EUR', 'en')).toBe('€10.50');
  });
  it('English Australian dollars', () => {
    expect(formatCents(1050, 'AUD', 'en')).toBe('A$10.50');
  });
});
