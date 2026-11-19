const LANGUAGE_DEFAULT_COUNTRY: Record<string, string> = { de: 'DE', en: 'GB' };

function baseLanguage(language: string): string {
  return language.toLowerCase().startsWith('de') ? 'de' : 'en';
}

/**
 * BCP-47 locale tag built from the UI language and the SHOP's country code
 * (never the browser locale, never the signed-in user's locale). Falls back
 * to a per-language default when the shop has no country code yet.
 */
export function shopLocale(language: string, countryCode?: string | null): string {
  const lang = baseLanguage(language);
  const country = countryCode?.trim().toUpperCase();
  return country ? `${lang}-${country}` : `${lang}-${LANGUAGE_DEFAULT_COUNTRY[lang]}`;
}

export function formatShopDate(
  value: string | number | Date,
  language: string,
  countryCode?: string | null,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string,
): string {
  const locale = shopLocale(language, countryCode);
  return new Intl.DateTimeFormat(locale, { ...options, ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
}

/** Date + time, e.g. "19. Nov. 2026, 17:01" (de) / "19 Nov 2026, 17:01" (en-GB). */
export function formatShopDateTime(
  value: string | number | Date,
  language: string,
  countryCode?: string | null,
  timeZone?: string,
): string {
  return formatShopDate(
    value,
    language,
    countryCode,
    { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' },
    timeZone,
  );
}

export function formatShopNumber(
  value: number,
  language: string,
  countryCode?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(shopLocale(language, countryCode), options).format(value);
}

export function formatShopCents(
  cents: number,
  currency: string,
  language: string,
  countryCode?: string | null,
  options?: Intl.NumberFormatOptions,
): string {
  return formatShopNumber(cents / 100, language, countryCode, { style: 'currency', currency, ...options });
}
