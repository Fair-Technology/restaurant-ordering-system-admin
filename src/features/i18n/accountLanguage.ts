export type AccountLanguage = 'en' | 'de';

/** The browser's language, narrowed to a supported account language. Reads `navigator.language`
 * directly (never i18n's own resolved language, which may already be a *previous* person's
 * cached choice on a shared device — that staleness is exactly the bug this ticket fixes). */
export function browserAccountLanguage(nav: Pick<Navigator, 'language'> = navigator): AccountLanguage {
  return nav.language?.split('-')[0] === 'de' ? 'de' : 'en';
}

/** What to do with the UI language right after a sign-in, given the account's stored language
 * (undefined/null = nothing saved yet). First sign-in: default from the browser and report that
 * it must be persisted back to the account so it sticks for next time. */
export function resolveLoginLanguage(
  stored: AccountLanguage | null | undefined,
  nav?: Pick<Navigator, 'language'>,
): { language: AccountLanguage; persist: boolean } {
  if (stored) return { language: stored, persist: false };
  return { language: browserAccountLanguage(nav), persist: true };
}
