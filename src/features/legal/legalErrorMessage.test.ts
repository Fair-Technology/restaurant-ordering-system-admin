import { describe, expect, it } from 'vitest';
import en from '../../../public/locales/en/common.json';
import { translateLegalError } from './legalErrorMessage';

function lookup(key: string): string {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof v === 'string' ? v : key;
}
const t = (key: string, opts?: Record<string, unknown>) =>
  lookup(key).replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? ''));

const FB = 'Could not save.';
const err = (data: Record<string, unknown>) => ({ data });

describe('translateLegalError', () => {
  it('translates an invalid email with the on-screen label', () => {
    const m = translateLegalError(
      err({ error: 'impressum.email is not a valid email address', errorCode: 'IMPRESSUM_EMAIL_INVALID', field: 'email' }),
      t,
      FB,
    );
    expect(m).toContain(lookup('legal.f.email'));
    expect(m).toBe(`${lookup('legal.f.email')} is not a valid email address.`);
    expect(m).not.toContain('impressum.email');
  });

  it('translates an invalid VAT ID with the on-screen label', () => {
    const m = translateLegalError(
      err({ error: 'impressum.vatId bad', errorCode: 'IMPRESSUM_VAT_ID_INVALID', field: 'vatId' }),
      t,
      FB,
    );
    expect(m).toContain(lookup('legal.f.vatId'));
    expect(m).not.toContain('impressum.vatId');
  });

  it('interpolates field and max for too-long', () => {
    const m = translateLegalError(
      err({ errorCode: 'IMPRESSUM_FIELD_TOO_LONG', field: 'city', max: 300 }),
      t,
      FB,
    );
    expect(m).toBe(`${lookup('legal.f.city')} may be at most 300 characters.`);
  });

  it('uses the tax number and legal-text labels', () => {
    expect(translateLegalError(err({ errorCode: 'TAX_NUMBER_TOO_LONG', field: 'taxNumber', max: 30 }), t, FB))
      .toBe(`${lookup('legal.taxNumber')} may be at most 30 characters.`);
    expect(translateLegalError(err({ errorCode: 'LEGAL_TEXT_TOO_LONG', field: 'terms', max: 5000 }), t, FB))
      .toContain(lookup('legal.termsTitle'));
  });

  it('uses the invoice-extras label family', () => {
    const m = translateLegalError(err({ errorCode: 'INVOICE_EXTRAS_IBAN_INVALID', field: 'iban' }), t, FB);
    expect(m).toBe(`${lookup('legal.f2.iban')} is not a valid IBAN.`);
  });

  it('falls back to data.error without an errorCode', () => {
    expect(translateLegalError(err({ error: 'Open orders exist', code: 'OPEN_ORDERS' }), t, FB)).toBe('Open orders exist');
    expect(translateLegalError(new Error('network'), t, FB)).toBe(FB);
  });

  it('falls back for an unrecognised errorCode', () => {
    expect(translateLegalError(err({ error: 'Something new', errorCode: 'BRAND_NEW' }), t, FB)).toBe('Something new');
    expect(translateLegalError(err({ errorCode: 'BRAND_NEW' }), t, FB)).toBe(FB);
  });
});
