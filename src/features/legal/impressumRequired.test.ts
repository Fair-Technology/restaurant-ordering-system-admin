// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { requiredImpressumKeys } from './impressumRequired';

const BASE = ['legalName', 'street', 'postcode', 'city', 'country', 'phone', 'email'];

describe('requiredImpressumKeys', () => {
  it.each(['sole_trader', 'other'] as const)('%s: base fields only', (f) => {
    expect([...requiredImpressumKeys(f)].sort()).toEqual([...BASE].sort());
  });
  it('gbr adds representatives only', () => {
    expect([...requiredImpressumKeys('gbr')].sort()).toEqual([...BASE, 'representatives'].sort());
  });
  it('ek adds register fields only', () => {
    expect([...requiredImpressumKeys('ek')].sort()).toEqual([...BASE, 'registerCourt', 'registerNumber'].sort());
  });
  it.each(['ohg', 'kg', 'gmbh', 'ug'] as const)('%s adds representatives and register', (f) => {
    expect([...requiredImpressumKeys(f)].sort()).toEqual([...BASE, 'representatives', 'registerCourt', 'registerNumber'].sort());
  });
  it('never requires vatId or supervisoryAuthority', () => {
    for (const f of ['sole_trader', 'ek', 'gbr', 'ohg', 'kg', 'gmbh', 'ug', 'other'] as const) {
      const k = requiredImpressumKeys(f);
      expect(k.has('vatId')).toBe(false);
      expect(k.has('supervisoryAuthority')).toBe(false);
    }
  });
});
