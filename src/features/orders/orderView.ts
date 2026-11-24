import type { IntakeOrder } from '../../services/ordersApi';
import { groupQueue } from './intake';

/**
 * Every value `?filter=` accepts. 'open' is the All view (the default) and must stay valid for old links.
 */
export const ORDER_FILTERS = ['open', 'new', 'work', 'ready', 'upcoming'] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/** The chips in the row: the three live states. */
export const ORDER_STATE_FILTERS = ['new', 'work', 'ready'] as const;
export type OrderStateFilter = (typeof ORDER_STATE_FILTERS)[number];

/** The time-axis views: offered beside the chip row, never in it. */
export const ORDER_SCOPE_FILTERS = ['upcoming'] as const;
export type OrderScopeFilter = (typeof ORDER_SCOPE_FILTERS)[number];

/** Reads the `?filter=` parameter. 'history' no longer exists, so an old link falls back to All; the
 *  page then sends it on to `?day=last7` (see OrdersPage). */
export function parseOrderFilter(params: URLSearchParams): OrderFilter {
  const value = params.get('filter');
  if ((ORDER_FILTERS as readonly string[]).includes(value ?? '')) return value as OrderFilter;
  return 'open';
}

export type LiveGroupKey = 'new' | 'work' | 'ready';

export interface LiveGroup {
  key: LiveGroupKey;
  orders: IntakeOrder[];
}

const due = (o: IntakeOrder) => (o.readyAt ? Date.parse(o.readyAt) : Number.POSITIVE_INFINITY);

/** The live orders in the three sections of the list; orders in progress sorted by when they are due. */
export function liveGroups(orders: IntakeOrder[], filter: OrderFilter): LiveGroup[] {
  const { waiting, inProgress, ready } = groupQueue(orders);
  const all: LiveGroup[] = [
    { key: 'new', orders: waiting },
    { key: 'work', orders: [...inProgress].sort((a, b) => due(a) - due(b)) },
    { key: 'ready', orders: ready },
  ];
  if (filter === 'open') return all;
  return all.filter((g) => g.key === filter);
}

export interface BoardColumn {
  key: LiveGroupKey;
  orders: IntakeOrder[];
}

/**
 * The board's columns, in the default order.
 *
 * The board IS the stage view, so it never narrows to one stage: a leftover `?filter=new|work|ready`
 * link from the list is ignored, and every order in `orders` is grouped by stage.
 *
 * `new` is dropped while it is empty — an empty New column is dead width, and a new order must never
 * arrive into a narrower board than the one the staffer is looking at. `work` and `ready` are always
 * drawn, because an empty "In progress" is itself information.
 */
export function boardColumns(orders: IntakeOrder[]): BoardColumn[] {
  const { waiting, inProgress, ready } = groupQueue(orders);
  const waitingSince = (o: IntakeOrder) => {
    const at = enteredStateAt(o);
    return at === null ? null : Date.parse(at);
  };
  const newColumn: BoardColumn = {
    key: 'new',
    orders: [...waiting].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt)),
  };
  return [
    ...(newColumn.orders.length > 0 ? [newColumn] : []),
    { key: 'work', orders: [...inProgress].sort((a, b) => due(a) - due(b)) },
    {
      key: 'ready',
      orders: [...ready].sort((a, b) => {
        const x = waitingSince(a);
        const y = waitingSince(b);
        if (x === null && y === null) return 0;
        if (x === null) return 1;
        if (y === null) return -1;
        return x - y;
      }),
    },
  ];
}

/** Search by order number (with or without #), guest name or table. */
export function matchesOrderSearch(order: IntakeOrder, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return true;
  if ([order.orderRef, order.customerName, order.table?.label ?? ''].some((field) => field.toLowerCase().includes(q))) {
    return true;
  }
  const digits = q.replace(/\D/g, '');
  return digits !== '' && (order.customerPhone ?? '').replace(/\D/g, '').includes(digits);
}

/** "2× Pomodoro, 1× Mittagsmenü" — the dishes of a combo count once, under the combo's name. */
export function itemSummary(
  items: ReadonlyArray<{ productName: string; quantity: number; combo?: { line: number; name: string } | null }>,
): string {
  const parts: string[] = [];
  const seenCombos = new Set<number>();
  for (const item of items) {
    if (item.combo) {
      if (seenCombos.has(item.combo.line)) continue;
      seenCombos.add(item.combo.line);
      parts.push(`${item.quantity}× ${item.combo.name}`);
    } else {
      parts.push(`${item.quantity}× ${item.productName}`);
    }
  }
  return parts.join(', ');
}

/** When the order reached its current state, from its history (null when the history doesn't say). */
export function enteredStateAt(order: Pick<IntakeOrder, 'state' | 'history'>): string | null {
  const history = order.history ?? [];
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].to === order.state) return history[i].at;
  }
  return null;
}

export type OrderTiming =
  | { kind: 'reject'; seconds: number; progress: number; urgent: boolean }
  | { kind: 'due'; delivery: boolean; minutes: number; promised: number | null; progress: number; urgent: boolean }
  | { kind: 'waiting' | 'out'; minutes: number | null }
  | null;

/** Overdue orders stop counting here — "overdue 2h+" — and are flagged stale. */
export const OVERDUE_CAP_MINUTES = 120;

export type OverdueLabel =
  | { key: 'orders.live.late'; params: { minutes: number }; stale: false }
  | { key: 'orders.live.lateCapped'; params: { hours: number }; stale: true };

/**
 * How to say how late an order is. Up to the cap the real minutes; past it the capped label plus a
 * stale flag, so a 40-hour-old order never prints "61430 min overdue".
 */
export function overdueLabel(lateMinutes: number): OverdueLabel {
  const minutes = Math.max(0, Math.round(lateMinutes));
  if (minutes >= OVERDUE_CAP_MINUTES) {
    return { key: 'orders.live.lateCapped', params: { hours: OVERDUE_CAP_MINUTES / 60 }, stale: true };
  }
  return { key: 'orders.live.late', params: { minutes }, stale: false };
}

export type DurationLabel =
  | { key: 'orders.live.unitMinutes'; params: { minutes: number } }
  | { key: 'orders.live.unitHours'; params: { hours: number } }
  | { key: 'orders.live.unitHoursMinutes'; params: { hours: number; minutes: number } }
  | { key: 'orders.live.unitDays'; params: { days: number } };

/**
 * How to say a duration (how long something has been waiting). Minutes under an hour, hours (plus
 * leftover minutes) under a day, days from a day up — so a 17-hour wait never prints "1063 min".
 */
export function formatDuration(totalMinutes: number): DurationLabel {
  const minutes = Math.max(0, Math.round(totalMinutes));
  if (minutes < 60) return { key: 'orders.live.unitMinutes', params: { minutes } };
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return { key: 'orders.live.unitHours', params: { hours } };
    return { key: 'orders.live.unitHoursMinutes', params: { hours, minutes: rem } };
  }
  const days = Math.floor(minutes / 1440);
  return { key: 'orders.live.unitDays', params: { days } };
}

const minutesBetween = (fromMs: number, toMs: number) => Math.max(0, Math.round((toMs - fromMs) / 60000));

/**
 * The clock that matters for an order right now: new → time left before it is rejected automatically,
 * in progress → minutes until it is due (negative when late), ready or out → how long it has waited.
 * `progress` (0–1) fills the bar in the detail column.
 */
export function orderTiming(order: IntakeOrder, nowMs: number): OrderTiming {
  if (order.state === 'PLACED') {
    if (!order.autoRejectAt) return null;
    const end = Date.parse(order.autoRejectAt);
    const seconds = Math.max(0, Math.ceil((end - nowMs) / 1000));
    const total = Math.max(1, end - Date.parse(order.createdAt));
    return { kind: 'reject', seconds, progress: Math.min(1, Math.max(0, (end - nowMs) / total)), urgent: seconds < 120 };
  }
  if (order.state === 'ACCEPTED') {
    if (!order.readyAt) return null;
    const readyMs = Date.parse(order.readyAt);
    const startMs = order.acceptedAt ? Date.parse(order.acceptedAt) : Date.parse(order.createdAt);
    const minutes = Math.ceil((readyMs - nowMs) / 60000);
    const span = Math.max(1, readyMs - startMs);
    return {
      kind: 'due',
      delivery: order.fulfilmentMode === 'delivery',
      minutes,
      promised: order.prepMinutes,
      progress: Math.min(1, Math.max(0, (nowMs - startMs) / span)),
      urgent: minutes <= 5,
    };
  }
  if (order.state === 'READY' || order.state === 'OUT_FOR_DELIVERY') {
    const since = enteredStateAt(order);
    return { kind: order.state === 'READY' ? 'waiting' : 'out', minutes: since ? minutesBetween(Date.parse(since), nowMs) : null };
  }
  return null;
}
