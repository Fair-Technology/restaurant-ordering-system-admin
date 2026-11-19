import { formatShopCents } from './locale';

export function formatCents(cents: number, currency: string, language: string, countryCode?: string | null): string {
  return formatShopCents(cents, currency, language, countryCode);
}
