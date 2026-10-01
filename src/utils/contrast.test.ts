import { describe, expect, it } from 'vitest';

import { accentContrastOnWhite } from './contrast';

describe('accentContrastOnWhite', () => {
  it('flags pale yellow as too light', () => {
    const result = accentContrastOnWhite('#FFFF66');
    expect(result?.ok).toBe(false);
    expect(result?.ratio.toFixed(2)).toBe('1.06');
  });

  it('accepts the default accent', () => {
    const result = accentContrastOnWhite('#C2410C');
    expect(result?.ok).toBe(true);
  });

  it('returns null for an invalid hex', () => {
    expect(accentContrastOnWhite('#12')).toBeNull();
  });
});
