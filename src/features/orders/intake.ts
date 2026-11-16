import type { IntakeOrder, SlotCapacityDto, UpcomingOrder } from '../../services/ordersApi';

export const REJECT_REASONS = ['too_busy', 'item_unavailable', 'closing_soon', 'other'] as const;

export type CardAction = 'markReady' | 'dispatch' | 'handOver' | 'delivered';

/** The kitchen's next button for an order: delivery goes out for delivery instead of ready. */
export function nextActionFor(o: Pick<IntakeOrder, 'state' | 'fulfilmentMode'>): CardAction | null {
  if (o.state === 'ACCEPTED') return o.fulfilmentMode === 'delivery' ? 'dispatch' : 'markReady';
  if (o.state === 'READY') return 'handOver';
  if (o.state === 'OUT_FOR_DELIVERY') return 'delivered';
  return null;
}

export function groupQueue(orders: IntakeOrder[]): {
  waiting: IntakeOrder[];
  inProgress: IntakeOrder[];
  ready: IntakeOrder[];
} {
  return {
    waiting: orders.filter((o) => o.displayState === 'PLACED'),
    inProgress: orders.filter((o) => o.displayState === 'ACCEPTED' || o.displayState === 'IN_PREPARATION'),
    ready: orders.filter((o) => o.displayState === 'READY' || o.displayState === 'OUT_FOR_DELIVERY'),
  };
}

export function hasWaitingOrders(orders: IntakeOrder[]): boolean {
  return orders.some((o) => o.state === 'PLACED');
}

export function secondsUntil(iso: string | null, nowMs: number): number | null {
  if (iso === null) return null;
  return Math.max(0, Math.ceil((Date.parse(iso) - nowMs) / 1000));
}

export function formatCountdown(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export const MAX_READY_MINUTES = 240;
export const PENDING_ACCEPT_MAX_MS = 60_000;

export function prepChoices(defaultMinutes: number): number[] {
  return [defaultMinutes, defaultMinutes + 10, defaultMinutes + 20, defaultMinutes + 30].filter(
    (m) => m <= MAX_READY_MINUTES,
  );
}

/** Same rule as the server's readyAtFor: the booked time if still ahead, else now + prep. */
export function scheduledReadyMs(scheduledFor: string, atMs: number, prepMinutes: number): number {
  const slot = Date.parse(scheduledFor);
  return atMs < slot ? slot : atMs + prepMinutes * 60_000;
}

export interface UpcomingDay {
  /** 'YYYY-MM-DD' in the restaurant's zone */
  day: string;
  orders: UpcomingOrder[];
}

/** Booked orders sorted by time and grouped by the restaurant's calendar day. */
export function upcomingByDay(orders: readonly UpcomingOrder[], timeZone: string): UpcomingDay[] {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const sorted = [...orders]
    .filter((o) => o.scheduledFor)
    .sort((a, b) => Date.parse(a.scheduledFor!) - Date.parse(b.scheduledFor!));
  const out: UpcomingDay[] = [];
  for (const o of sorted) {
    const day = fmt.format(new Date(o.scheduledFor!));
    const last = out[out.length - 1];
    if (last && last.day === day) last.orders.push(o);
    else out.push({ day, orders: [o] });
  }
  return out;
}

export interface SlotLoad {
  taken: number;
  perSlot: number;
  full: boolean;
}

/** How full a booked time is, or null when the restaurant has no limit. */
export function slotLoadOf(capacity: SlotCapacityDto | null | undefined, scheduledFor: string | null | undefined): SlotLoad | null {
  if (!capacity || !scheduledFor) return null;
  const taken = capacity.taken[scheduledFor] ?? 0;
  return { taken, perSlot: capacity.perSlot, full: taken >= capacity.perSlot };
}

export interface PendingAccept {
  prepMinutes: number;
  atMs: number;
}

/** Shows an order staff just accepted as in progress while the server is still taking the payment. */
export function withPendingAccepts(orders: IntakeOrder[], pending: ReadonlyMap<string, PendingAccept>): IntakeOrder[] {
  if (pending.size === 0) return orders;
  return orders.map((o) => {
    const p = pending.get(o.id);
    if (!p || o.state !== 'PLACED') return o;
    return {
      ...o,
      state: 'ACCEPTED' as const,
      displayState: 'IN_PREPARATION' as const,
      prepMinutes: p.prepMinutes,
      acceptedAt: new Date(p.atMs).toISOString(),
      readyAt: new Date(
        o.scheduledFor ? scheduledReadyMs(o.scheduledFor, p.atMs, p.prepMinutes) : p.atMs + p.prepMinutes * 60_000,
      ).toISOString(),
    };
  });
}

/** Keeps only pending accepts still waiting on the server and younger than a minute. Returns the same map when nothing changed. */
export function pruneSettledAccepts(
  pending: ReadonlyMap<string, PendingAccept>,
  orders: IntakeOrder[],
  nowMs: number,
): ReadonlyMap<string, PendingAccept> {
  const waiting = new Set(orders.filter((o) => o.state === 'PLACED').map((o) => o.id));
  const keep = [...pending].filter(([id, p]) => waiting.has(id) && nowMs - p.atMs <= PENDING_ACCEPT_MAX_MS);
  return keep.length === pending.size ? pending : new Map(keep);
}

/** Removes one pending accept (the accept call failed). Returns the same map if the id was absent. */
export function withoutPendingAccept(
  pending: ReadonlyMap<string, PendingAccept>,
  orderId: string,
): ReadonlyMap<string, PendingAccept> {
  if (!pending.has(orderId)) return pending;
  const next = new Map(pending);
  next.delete(orderId);
  return next;
}

export type ConnectionState = 'connecting' | 'connected' | 'offline';

export function connectionState(input: {
  lastSuccessAt: number | undefined;
  isError: boolean;
  nowMs: number;
}): ConnectionState {
  if (input.isError) return 'offline';
  if (input.lastSuccessAt === undefined) return 'connecting';
  return input.nowMs - input.lastSuccessAt > 30000 ? 'offline' : 'connected';
}

export function newlyAutoAcceptedIds(orders: IntakeOrder[], seen: ReadonlySet<string>): string[] {
  return orders.filter((o) => o.autoAccepted && !seen.has(o.id)).map((o) => o.id);
}
