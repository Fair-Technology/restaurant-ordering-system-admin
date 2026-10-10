import type { MenuLanguage } from '../../services/api';

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
