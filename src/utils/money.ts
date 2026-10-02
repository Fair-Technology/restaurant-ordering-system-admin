export function formatCents(cents: number, currency: string, language: string): string {
  return new Intl.NumberFormat(language.startsWith('de') ? 'de-DE' : 'en-GB', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}
