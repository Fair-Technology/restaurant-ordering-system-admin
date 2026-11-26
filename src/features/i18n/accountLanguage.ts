export type AccountLanguage = 'en' | 'de';

/** The browser's language narrowed to a supported account language, or null if the browser's
 * language isn't one we support. Reads `navigator.language` directly (never i18n's own resolved
 * language, which may already be a *previous* person's cached choice on a shared device). */
export function supportedBrowserLanguage(nav: Pick<Navigator, 'language'> = navigator): AccountLanguage | null {
  const code = nav.language?.split('-')[0];
  return code === 'de' || code === 'en' ? code : null;
}

/** What to do with the UI language right after a sign-in, given the account's stored language
 * (undefined/null = nothing saved yet) and the restaurant's language to fall back to when the
 * browser's language isn't supported (spec §11). First sign-in: the browser's language if
 * supported, else the restaurant's; either way, report that it must be persisted so it sticks
 * for next time. When there is no restaurant yet and the browser language is unsupported, show
 * English for this session without persisting it, so the account stays unset until a real
 * restaurant language is available. */
export function resolveLoginLanguage(
  stored: AccountLanguage | null | undefined,
  restaurantLanguage: AccountLanguage | null | undefined,
  nav?: Pick<Navigator, 'language'>,
): { language: AccountLanguage; persist: boolean } {
  if (stored) return { language: stored, persist: false };
  const browser = supportedBrowserLanguage(nav);
  if (browser) return { language: browser, persist: true };
  if (restaurantLanguage) return { language: restaurantLanguage, persist: true };
  return { language: 'en', persist: false };
}
