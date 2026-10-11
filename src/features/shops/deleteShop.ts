import type { ShopResponse } from '../../services/api';

/** Only the shop's owner may delete it (the backend enforces this too). */
export function canDeleteShop(callerRole: ShopResponse['callerRole']): boolean {
  return callerRole === 'owner';
}

/** The delete button unlocks only when the typed text equals the shop name exactly. */
export function isShopNameMatch(typed: string, shopName: string | undefined): boolean {
  return !!shopName && typed.trim() === shopName.trim();
}

export type DeleteShopErrorKind = 'openOrders' | 'forbidden' | 'generic';

/** Maps a failed delete call to the message the owner should see. */
export function deleteShopErrorKind(error: unknown): DeleteShopErrorKind {
  if (typeof error !== 'object' || error === null) return 'generic';
  const { status, data } = error as { status?: unknown; data?: unknown };
  const code =
    typeof data === 'object' && data !== null ? (data as { code?: unknown }).code : undefined;
  if (status === 409 && code === 'OPEN_ORDERS') return 'openOrders';
  if (status === 403) return 'forbidden';
  return 'generic';
}

/** Hide deleted shops from lists (the backend filters too; this is a safety net). */
export function visibleShops<T extends { isDeleted?: boolean }>(shops: T[]): T[] {
  return shops.filter((s) => !s.isDeleted);
}
