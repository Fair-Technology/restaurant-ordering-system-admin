/** Maps the admin UI language (en | de, possibly region-tagged) to a Stripe Connect-JS locale. */
export function stripeLocaleForUiLanguage(language: string): string {
  return language.startsWith('de') ? 'de-DE' : 'en-GB';
}
