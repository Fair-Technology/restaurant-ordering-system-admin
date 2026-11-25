import { describe, expect, it } from 'vitest';

import {
  CODES_LIMIT,
  EMPTY_CODE_FORM,
  activeCodeCount,
  codeFormToBody,
  codeStatus,
  codeValueLabel,
  codesLimitReached,
  isCodeFormDirty,
  loyaltyStatus,
  shopToday,
  type CodeForm,
} from './promotions';

describe('discount code helpers', () => {
  it('says what state a code is in', () => {
    const base = { active: true, validFrom: null, validUntil: null, totalLimit: null, uses: 0 };
    const today = '2026-10-09';
    expect(codeStatus(base, today)).toBe('active');
    expect(codeStatus({ ...base, active: false }, today)).toBe('off');
    expect(codeStatus({ ...base, validUntil: '2026-10-08' }, today)).toBe('expired');
    expect(codeStatus({ ...base, totalLimit: 3, uses: 3 }, today)).toBe('used_up');
    expect(codeStatus({ ...base, validFrom: '2026-10-10' }, today)).toBe('scheduled');
  });

  it('labels the value', () => {
    expect(codeValueLabel({ kind: 'percent', percent: 10, amountCents: null }, 'EUR', 'de')).toBe('10 %');
    expect(codeValueLabel({ kind: 'amount', percent: null, amountCents: 500 }, 'EUR', 'de')).toMatch(/^5,00\s€$/);
  });

  const form: CodeForm = {
    code: ' welcome10 ',
    kind: 'percent',
    value: '10',
    minOrder: '',
    validFrom: '',
    validUntil: '',
    totalLimit: '',
    perEmailLimit: '1',
  };

  it('turns the form into a request', () => {
    expect(codeFormToBody(form)).toEqual({
      code: 'WELCOME10',
      kind: 'percent',
      percent: 10,
      minSubtotalCents: 0,
      validFrom: null,
      validUntil: null,
      totalLimit: null,
      perEmailLimit: 1,
    });
    expect(codeFormToBody({ ...form, kind: 'amount', value: '5,50', minOrder: '15' })).toEqual(
      expect.objectContaining({ amountCents: 550, minSubtotalCents: 1500 }),
    );
  });

  it('refuses a bad form', () => {
    expect(codeFormToBody({ ...form, code: 'L-ABCD2345' })).toEqual({ error: 'code' });
    expect(codeFormToBody({ ...form, value: '0' })).toEqual({ error: 'value' });
    expect(codeFormToBody({ ...form, value: '101' })).toEqual({ error: 'value' });
    expect(codeFormToBody({ ...form, kind: 'amount', value: '101' })).toEqual({ error: 'value' });
    expect(codeFormToBody({ ...form, validFrom: '2026-10-20', validUntil: '2026-10-10' })).toEqual({
      error: 'dates',
    });
    expect(codeFormToBody({ ...form, totalLimit: '0' })).toEqual({ error: 'totalLimit' });
    expect(codeFormToBody({ ...form, perEmailLimit: 'x' })).toEqual({ error: 'perEmailLimit' });
  });

  it("gives today in the restaurant's zone", () => {
    expect(shopToday('Europe/Berlin', Date.parse('2026-10-09T22:30:00Z'))).toBe('2026-10-10');
  });

  it('stops at 50 codes', () => {
    expect(CODES_LIMIT).toBe(50);
    expect(codesLimitReached(49)).toBe(false);
    expect(codesLimitReached(50)).toBe(true);
    expect(codesLimitReached(51)).toBe(true);
  });

  it('counts only the codes that work today', () => {
    const base = { active: true, validFrom: null, validUntil: null, totalLimit: null, uses: 0 };
    const codes = [
      base,
      { ...base, active: false },
      { ...base, validUntil: '2026-10-08' },
      { ...base, totalLimit: 1, uses: 1 },
      { ...base, validFrom: '2026-10-10' },
      { ...base, totalLimit: 5, uses: 2 },
    ];
    expect(activeCodeCount(codes, '2026-10-09')).toBe(2);
    expect(activeCodeCount([], '2026-10-09')).toBe(0);
  });

  it('knows when the form has unsaved typing', () => {
    expect(isCodeFormDirty(EMPTY_CODE_FORM)).toBe(false);
    expect(isCodeFormDirty({ ...EMPTY_CODE_FORM })).toBe(false);
    expect(isCodeFormDirty({ ...EMPTY_CODE_FORM, code: 'A' })).toBe(true);
    expect(isCodeFormDirty({ ...EMPTY_CODE_FORM, kind: 'amount' })).toBe(true);
    expect(isCodeFormDirty({ ...EMPTY_CODE_FORM, perEmailLimit: '' })).toBe(true);
  });

  it('summarises the saved loyalty rule', () => {
    expect(loyaltyStatus({ enabled: false, everyOrders: 5, rewardCents: 500 })).toEqual({ enabled: false });
    expect(loyaltyStatus({ enabled: true, everyOrders: 5, rewardCents: 500 })).toEqual({
      enabled: true,
      every: 5,
      rewardCents: 500,
    });
  });
});
