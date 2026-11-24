import { describe, expect, it } from 'vitest';
import { hasAgeRestrictedItem } from './ageRestricted';

describe('hasAgeRestrictedItem', () => {
  it('is true only when a line is 18+', () => {
    expect(hasAgeRestrictedItem({ items: [{ ageRestricted: false }, {}] })).toBe(false);
    expect(hasAgeRestrictedItem({ items: [{}, { ageRestricted: true }] })).toBe(true);
  });
});
