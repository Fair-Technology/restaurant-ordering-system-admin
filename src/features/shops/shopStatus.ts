import type { ShopResponse } from '../../services/api';
import type { OrdersPauseDto } from '../../services/ordersApi';

/** How long a pause lasts; the server works out the end time. */
export type OrdersPauseDuration = 'minutes_30' | 'rest_of_day' | 'until_switched_back';
export const PAUSE_DURATIONS: readonly OrdersPauseDuration[] = ['minutes_30', 'rest_of_day', 'until_switched_back'];

/** What diners currently experience: no menu, menu without ordering, or the normal shop. */
export type ShopLiveState = 'offline' | 'ordersPaused' | 'online';

export const ORDERS_PAUSED_MESSAGE_MAX = 280;

type StatusFields = Pick<ShopResponse, 'isPaused' | 'ordersPaused' | 'offlineBySuperadmin' | 'ordersPausedUntil'>;
type PauseFields = Pick<ShopResponse, 'ordersPaused' | 'ordersPausedUntil' | 'ordersAutoPaused'>;

/** A timed pause is over once its end time has passed; an unreadable end counts as still paused. */
export function isOrdersPausedAt(
  shop: Pick<ShopResponse, 'ordersPaused' | 'ordersPausedUntil'> | undefined,
  nowMs: number,
): boolean {
  if (!shop?.ordersPaused) return false;
  if (!shop.ordersPausedUntil) return true;
  const end = Date.parse(shop.ordersPausedUntil);
  return !Number.isFinite(end) || nowMs < end;
}

/** The end time as HH:MM in the shop's time zone. */
export function formatPauseEnd(untilIso: string, timeZone: string, language: string): string {
  return new Intl.DateTimeFormat(language.startsWith('de') ? 'de-DE' : 'en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(untilIso));
}

/** How many missed orders paused the shop, while that automatic pause is in force; otherwise null. */
export function autoPausedCount(shop: PauseFields | undefined, nowMs: number): number | null {
  return shop && isOrdersPausedAt(shop, nowMs) ? shop.ordersAutoPaused?.missedOrders ?? null : null;
}

/** True when the order queue (newer than the shop) disagrees about the pause, so the shop should be refetched. */
export function shopPauseOutOfDate(
  queuePause: OrdersPauseDto | undefined,
  queueAtMs: number | undefined,
  shop: PauseFields | undefined,
  shopAtMs: number | undefined,
  nowMs: number,
): boolean {
  if (!queuePause || !shop || queueAtMs === undefined || shopAtMs === undefined || queueAtMs <= shopAtMs) return false;
  return (
    queuePause.ordersPaused !== isOrdersPausedAt(shop, nowMs) ||
    (queuePause.ordersAutoPaused?.missedOrders ?? null) !== autoPausedCount(shop, nowMs)
  );
}

/** Offline wins over paused: a shop that shows no menu cannot also be "paused". */
export function shopLiveState(shop: StatusFields | undefined, nowMs: number = Date.now()): ShopLiveState {
  if (!shop) return 'offline';
  if (shop.offlineBySuperadmin || shop.isPaused !== false) return 'offline';
  return isOrdersPausedAt(shop, nowMs) ? 'ordersPaused' : 'online';
}

/** The owner cannot switch a shop online that the platform took offline. */
export function canGoOnline(shop: StatusFields | undefined): boolean {
  return !shop?.offlineBySuperadmin;
}

/** The pause-orders toggle only makes sense while the shop is shown to diners. */
export function canToggleOrdersPause(shop: StatusFields | undefined, nowMs: number = Date.now()): boolean {
  return shopLiveState(shop, nowMs) !== 'offline';
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
