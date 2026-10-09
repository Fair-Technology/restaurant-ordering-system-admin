import type { ShopResponse } from '../../services/api';

export const SLOT_CAPACITY_MAX = 50;

/** What the field shows for the stored limit: '' when there is none. */
export function slotCapacityInputOf(s: ShopResponse['orderSettings']): string {
  const v = s?.slotCapacity;
  return typeof v === 'number' ? String(v) : '';
}

/** What the owner typed: null when empty, 'invalid' unless a whole number from 1 to 50. */
export function slotCapacityFromInput(raw: string): number | null | 'invalid' {
  const t = raw.trim();
  if (t === '') return null;
  if (!/^\d+$/.test(t)) return 'invalid';
  const n = Number(t);
  return n >= 1 && n <= SLOT_CAPACITY_MAX ? n : 'invalid';
}
