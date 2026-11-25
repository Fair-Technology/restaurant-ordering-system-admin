import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import type { ShopLegalSettingsDto } from '../../services/legalApi';
import {
  buildLegalGoLiveSummary,
  buildLegalSections,
  dpaStatusLine,
  LEGAL_SECTION_KEYS,
  parseLegalSection,
} from './legalSections';

const t = ((key: string, o?: Record<string, unknown>) =>
  o ? `${key}|${Object.entries(o).filter(([k]) => k !== 'date').map(([k, v]) => `${k}=${v}`).join(',')}` : key) as unknown as TFunction;

function legal(over: Partial<ShopLegalSettingsDto> = {}, completeness: Partial<ShopLegalSettingsDto['completeness']> = {}): ShopLegalSettingsDto {
  return {
    impressum: null, terms: null, withdrawal: null, privacyAddition: null,
    missingImpressumFields: [],
    completeness: { dpa: false, impressum: false, terms: false, withdrawal: false, privacyNotice: false, ...completeness },
    dpa: { currentVersion: '2', currentIsDraft: false, accepted: null },
    platformIdentityComplete: false, callerIsOwner: true, taxNumber: '', invoiceLegalExtras: null,
    ...over,
  } as unknown as ShopLegalSettingsDto;
}
const build = (l: ShopLegalSettingsDto) => buildLegalSections({ legal: l, t, lang: 'en', countryCode: 'DE' });
const status = (l: ShopLegalSettingsDto, key: string) => build(l).find((s) => s.key === key)?.status;

describe('parseLegalSection', () => {
  it('accepts known keys and falls back to dpa', () => {
    for (const k of LEGAL_SECTION_KEYS) expect(parseLegalSection(k)).toBe(k);
    expect(parseLegalSection(null)).toBe('dpa');
    expect(parseLegalSection('nope')).toBe('dpa');
  });
});

describe('dpaStatusLine', () => {
  const accepted = (version: string) => ({ currentVersion: '2', currentIsDraft: false, accepted: { version, acceptedAt: '2026-01-05T10:00:00Z' } }) as ShopLegalSettingsDto['dpa'];
  it('never accepted', () => {
    expect(dpaStatusLine(legal().dpa, t, 'en', 'DE', 'short')).toBe('legal.status.dpaNotAccepted');
    expect(dpaStatusLine(legal().dpa, t, 'en', 'DE')).toBe('legal.dpaNotAccepted');
  });
  it('accepted and current', () => {
    expect(dpaStatusLine(accepted('2'), t, 'en', 'DE', 'short')).toBe('legal.status.dpaAccepted|version=2');
    expect(dpaStatusLine(accepted('2'), t, 'en', 'DE')).toBe('legal.dpaAcceptedOn|version=2');
  });
  it('accepted but stale', () => {
    expect(dpaStatusLine(accepted('1'), t, 'en', 'DE', 'short')).toBe('legal.status.dpaNewVersion|version=2');
    expect(dpaStatusLine(accepted('1'), t, 'en', 'DE')).toBe('legal.dpaNewVersion|version=2');
  });
});

describe('buildLegalSections', () => {
  it('has the fixed order, with data as a danger item without status', () => {
    const s = build(legal());
    expect(s.map((x) => x.key)).toEqual(['dpa', 'impressum', 'terms', 'withdrawal', 'privacy', 'invoiceExtras', 'data']);
    expect(s[6].danger).toBe(true);
    expect(s[6].status).toBeUndefined();
    expect(s.slice(0, 6).every((x) => !x.danger)).toBe(true);
  });
  it('impressum, terms, withdrawal, privacy: incomplete', () => {
    const l = legal({ missingImpressumFields: ['city', 'phone'] as never });
    expect(status(l, 'impressum')).toBe('legal.status.impressumMissing|count=2');
    expect(status(l, 'terms')).toBe('legal.status.missing');
    expect(status(l, 'withdrawal')).toBe('legal.status.missing');
    expect(status(l, 'privacy')).toBe('legal.status.privacyNeedsAttention');
  });
  it('impressum, terms, withdrawal, privacy: complete', () => {
    const l = legal({}, { impressum: true, terms: true, withdrawal: true, privacyNotice: true });
    for (const k of ['impressum', 'terms', 'withdrawal', 'privacy']) expect(status(l, k)).toBe('legal.complete');
  });
  it('invoiceExtras is informational, never danger', () => {
    const set = legal({ invoiceLegalExtras: { managingDirector: '', court: '', registerNumber: '', iban: 'DE89', bic: '' } });
    expect(status(set, 'invoiceExtras')).toBe('legal.status.invoiceIbanSet');
    for (const l of [set, legal(), legal({ invoiceLegalExtras: { managingDirector: '', court: '', registerNumber: '', iban: '  ', bic: '' } })]) {
      expect(build(l).find((x) => x.key === 'invoiceExtras')?.danger).toBeUndefined();
    }
    expect(status(legal(), 'invoiceExtras')).toBe('legal.status.invoiceOptionalNotSet');
  });
});

describe('buildLegalGoLiveSummary', () => {
  it('all complete', () => {
    const l = legal({}, { dpa: true, impressum: true, terms: true, withdrawal: true, privacyNotice: true });
    expect(buildLegalGoLiveSummary(build(l), l, t)).toEqual({ completeCount: 5, total: 5, missing: [] });
  });
  it('lists incomplete required items with nav-matching labels, ignoring optional ones', () => {
    const l = legal({ missingImpressumFields: ['city', 'phone'] as never }, { terms: true, withdrawal: true });
    const r = buildLegalGoLiveSummary(build(l), l, t);
    expect(r.completeCount).toBe(2);
    expect(r.total).toBe(5);
    expect(r.missing.map((m) => m.key)).toEqual(['dpa', 'impressum', 'privacy']);
    expect(r.missing[0].label).toBe('legal.sections.dpa: legal.status.dpaNotAccepted');
    expect(r.missing[1].label).toBe('legal.sections.impressum: legal.status.impressumMissing|count=2');
  });
});
