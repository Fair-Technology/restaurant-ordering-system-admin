export function getCurrencySymbol(currency: string): string {
  return (
    new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
    })
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? currency
  );
}

export const DEFAULT_CURRENCY = 'EUR';

/**
 * Symbol for a shop currency that may be absent. Falls back to the same
 * DEFAULT_CURRENCY the money formatters use, so the symbol can never disagree
 * with the formatted amount.
 */
export function getCurrencySymbolOrDefault(currency: string | null | undefined): string {
  return getCurrencySymbol(currency || DEFAULT_CURRENCY);
}
