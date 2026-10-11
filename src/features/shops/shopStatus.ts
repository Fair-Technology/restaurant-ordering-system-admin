import type { ShopResponse } from '../../services/api';

/** What diners currently experience: no menu, menu without ordering, or the normal shop. */
export type ShopLiveState = 'offline' | 'ordersPaused' | 'online';

export const ORDERS_PAUSED_MESSAGE_MAX = 280;

type StatusFields = Pick<ShopResponse, 'isPaused' | 'ordersPaused' | 'offlineBySuperadmin'>;

/** Offline wins over paused: a shop that shows no menu cannot also be "paused". */
export function shopLiveState(shop: StatusFields | undefined): ShopLiveState {
  if (!shop) return 'offline';
  if (shop.offlineBySuperadmin || shop.isPaused !== false) return 'offline';
  return shop.ordersPaused ? 'ordersPaused' : 'online';
}

/** The owner cannot switch a shop online that the platform took offline. */
export function canGoOnline(shop: StatusFields | undefined): boolean {
  return !shop?.offlineBySuperadmin;
}

/** The pause-orders toggle only makes sense while the shop is shown to diners. */
export function canToggleOrdersPause(shop: StatusFields | undefined): boolean {
  return shopLiveState(shop) !== 'offline';
}

/** True when a failed update was refused because the platform took the shop offline. */
export function isOfflineBySuperadminError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { status, data } = error as { status?: unknown; data?: unknown };
  const code =
    typeof data === 'object' && data !== null ? (data as { code?: unknown }).code : undefined;
  return status === 409 && code === 'SHOP_OFFLINE_BY_SUPERADMIN';
}

/** Trims the message. An empty one is sent as "" so the server clears a stored message (left out, it keeps the old one); the backend caps it at 280. */
export function cleanOrdersPausedMessage(message: string): string {
  return message.trim();
}
