/**
 * The countries a restaurant may be opened in. A country is "opened" once its tax table,
 * legal pages and privacy check are done; anything else would give the shop the wrong
 * currency, tax rules and Stripe country. Add a country here only after that groundwork.
 */
export interface OpenedCountry {
  /** ISO 3166-1 alpha-2, upper case */
  code: string;
  /** English name; the address country on creation */
  label: string;
  /** ISO 4217 */
  currency: string;
  /** IANA */
  timezone: string;
}

export const OPENED_COUNTRIES: readonly OpenedCountry[] = [
  { code: 'DE', label: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
];

/** The opened country for a code, or undefined when the country is not open yet. */
export function openedCountry(code: string | null | undefined): OpenedCountry | undefined {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return undefined;
  return OPENED_COUNTRIES.find((c) => c.code === normalized);
}
