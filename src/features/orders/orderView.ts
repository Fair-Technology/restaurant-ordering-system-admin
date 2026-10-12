import type { IntakeOrder } from '../../services/ordersApi';
import { groupQueue } from './intake';

/** The chips above the orders list. */
export const ORDER_FILTERS = ['open', 'new', 'work', 'ready', 'upcoming', 'history'] as const;
export type OrderFilter = (typeof ORDER_FILTERS)[number];

/** Reads the `?filter=` parameter; the old `?tab=history` still opens the history. */
export function parseOrderFilter(params: URLSearchParams): OrderFilter {
  const value = params.get('filter');
  if ((ORDER_FILTERS as readonly string[]).includes(value ?? '')) return value as OrderFilter;
  return params.get('tab') === 'history' ? 'history' : 'open';
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

/** Search by order number (with or without #), guest name or table. */
export function matchesOrderSearch(order: IntakeOrder, query: string): boolean {
  const q = query.trim().toLowerCase().replace(/^#/, '');
  if (!q) return true;
  return [order.orderRef, order.customerName, order.table?.label ?? '']
    .some((field) => field.toLowerCase().includes(q));
}

/** "2× Pomodoro, 1× Mittagsmenü" — the dishes of a combo count once, under the combo's name. */
export function itemSummary(items: IntakeOrder['items']): string {
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
