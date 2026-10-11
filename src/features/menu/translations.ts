import type { MenuLanguage, TranslationMap } from '../../services/api';

const ORIGINAL_LANGUAGE_COUNTRIES = ['DE', 'AT', 'CH'];

/** The shop's menu languages, original first. Mirrors the backend: with none saved, the country decides (DE/AT/CH → German, else English). */
export function menuLanguagesOf(shop: { menuLanguages?: MenuLanguage[]; countryCode?: string }): MenuLanguage[] {
  if (shop.menuLanguages?.length) return shop.menuLanguages;
  return [ORIGINAL_LANGUAGE_COUNTRIES.includes((shop.countryCode ?? '').toUpperCase()) ? 'de' : 'en'];
}

/** Pre-fill for the "Menu language" choice when creating a shop: German browsers/UIs (de, de-AT, ...) get German, everything else English. */
export function defaultMenuLanguageForUiLanguage(language: string | undefined): MenuLanguage {
  return (language ?? '').toLowerCase().startsWith('de') ? 'de' : 'en';
}

/** Returns a copy of a translation map with one language's text replaced. */
export function withTranslation(map: TranslationMap | undefined, lang: MenuLanguage, value: string): TranslationMap {
  return { ...(map ?? {}), [lang]: value };
}

/** The tab to show: the one picked, if the shop still offers it, else the original (first) language. */
export function resolveActiveLanguage(languages: MenuLanguage[], picked: MenuLanguage | undefined): MenuLanguage | undefined {
  return picked && languages.includes(picked) ? picked : languages[0];
}

/** A text can be translated only when the original has something in it; empty originals are hidden on the translation tab. */
export function hasOriginalText(original: string | undefined): boolean {
  return (original ?? '').trim() !== '';
}
