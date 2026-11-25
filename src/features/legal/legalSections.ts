import type { TFunction } from 'i18next';
import type { SectionNavItem } from '../../components/shop/SettingsSectionNav';
import type { LegalLanguage, ShopLegalSettingsDto } from '../../services/legalApi';
import { formatShopDate } from '../../utils/locale';

export const LEGAL_SECTION_KEYS = ['dpa', 'impressum', 'terms', 'withdrawal', 'privacy', 'invoiceExtras', 'data'] as const;
export type LegalSectionKey = (typeof LEGAL_SECTION_KEYS)[number];
export type LegalSectionItem = SectionNavItem<LegalSectionKey>;

const REQUIRED_KEYS = ['dpa', 'impressum', 'terms', 'withdrawal', 'privacy'] as const;

/** The section named in `?section=`; anything missing or unknown falls back to the first. */
export function parseLegalSection(raw: string | null): LegalSectionKey {
  return (LEGAL_SECTION_KEYS as readonly string[]).includes(raw ?? '') ? (raw as LegalSectionKey) : 'dpa';
}

/** The DPA state as a sentence (`long`, shown in the card) or a short nav line. One source of truth. */
export function dpaStatusLine(
  dpa: ShopLegalSettingsDto['dpa'],
  t: TFunction,
  lang: string,
  countryCode: string,
  form: 'long' | 'short' = 'long',
): string {
  const { accepted, currentVersion } = dpa;
  const p = form === 'short' ? 'legal.status.' : 'legal.';
  if (!accepted) return t(form === 'short' ? `${p}dpaNotAccepted` : 'legal.dpaNotAccepted');
  if (accepted.version === currentVersion) {
    return t(form === 'short' ? `${p}dpaAccepted` : 'legal.dpaAcceptedOn', {
      version: accepted.version,
      date: formatShopDate(accepted.acceptedAt, lang, countryCode),
    });
  }
  return t(form === 'short' ? `${p}dpaNewVersion` : 'legal.dpaNewVersion', { version: currentVersion });
}

export function buildLegalSections(opts: {
  legal: ShopLegalSettingsDto;
  t: TFunction;
  lang: LegalLanguage;
  countryCode: string;
}): LegalSectionItem[] {
  const { legal, t, lang, countryCode } = opts;
  const c = legal.completeness;
  const done = t('legal.complete');
  return [
    { key: 'dpa', title: t('legal.sections.dpa'), status: dpaStatusLine(legal.dpa, t, lang, countryCode, 'short') },
    {
      key: 'impressum',
      title: t('legal.sections.impressum'),
      status: c.impressum ? done : t('legal.status.impressumMissing', { count: legal.missingImpressumFields.length }),
    },
    { key: 'terms', title: t('legal.sections.terms'), status: c.terms ? done : t('legal.status.missing') },
    { key: 'withdrawal', title: t('legal.sections.withdrawal'), status: c.withdrawal ? done : t('legal.status.missing') },
    {
      key: 'privacy',
      title: t('legal.sections.privacy'),
      status: c.privacyNotice ? done : t('legal.status.privacyNeedsAttention'),
    },
    {
      key: 'invoiceExtras',
      title: t('legal.sections.invoiceExtras'),
      status: legal.invoiceLegalExtras?.iban?.trim() ? t('legal.status.invoiceIbanSet') : t('legal.status.invoiceOptionalNotSet'),
    },
    { key: 'data', title: t('legal.sections.data'), danger: true },
  ];
}

export interface LegalGoLiveMissingItem { key: LegalSectionKey; label: string }
export interface LegalGoLiveSummaryData { completeCount: number; total: number; missing: LegalGoLiveMissingItem[] }

export function buildLegalGoLiveSummary(
  sections: LegalSectionItem[],
  legal: ShopLegalSettingsDto,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept for the specified signature
  _t: TFunction,
): LegalGoLiveSummaryData {
  const c = legal.completeness;
  const complete: Record<(typeof REQUIRED_KEYS)[number], boolean> = {
    dpa: c.dpa, impressum: c.impressum, terms: c.terms, withdrawal: c.withdrawal, privacy: c.privacyNotice,
  };
  const missing: LegalGoLiveMissingItem[] = [];
  for (const key of REQUIRED_KEYS) {
    if (complete[key]) continue;
    const s = sections.find((x) => x.key === key);
    if (s) missing.push({ key, label: s.status ? `${s.title}: ${s.status}` : s.title });
  }
  return { completeCount: REQUIRED_KEYS.length - missing.length, total: REQUIRED_KEYS.length, missing };
}
