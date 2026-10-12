import { describe, expect, it } from 'vitest';
import type { IntakeOrder } from '../../services/ordersApi';
import { enteredStateAt, itemSummary, liveGroups, matchesOrderSearch, orderTiming, parseOrderFilter } from './orderView';

const NOW = Date.parse('2026-10-12T12:00:00Z');
const min = (m: number) => new Date(NOW + m * 60000).toISOString();

function order(overrides: Partial<IntakeOrder>): IntakeOrder {
  return {
    id: 'o1',
    orderRef: 'A7F3',
    state: 'PLACED',
    displayState: 'PLACED',
    fulfilmentMode: 'collection',
    table: null,
    paymentStatus: 'authorized',
    readyAt: null,
    items: [],
    subtotalCents: 1000,
    currency: 'EUR',
    customerName: 'Laura M.',
    customerEmail: 'l@example.com',
    customerPhone: '0170',
    history: [],
    createdAt: min(-2),
    autoRejectAt: min(3),
    acceptedAt: null,
    prepMinutes: null,
    taxBreakdown: [],
    rejectionNote: null,
    customerAddress: null,
    refundedCents: 0,
    refunds: [],
    releaseFailure: null,
    documents: [],
    autoAccepted: false,
    ...overrides,
  };
}

const item = (productName: string, quantity = 1, combo?: { line: number; name: string }) => ({
  productId: productName,
  productName,
  quantity,
  unitPriceCents: 100,
  lineTotalCents: 100 * quantity,
  combo: combo ? { ...combo, productId: 'c' } : null,
});

describe('parseOrderFilter', () => {
  it('reads the chip from the address', () => {
    expect(parseOrderFilter(new URLSearchParams('filter=work'))).toBe('work');
    expect(parseOrderFilter(new URLSearchParams(''))).toBe('open');
    expect(parseOrderFilter(new URLSearchParams('filter=nonsense'))).toBe('open');
  });

  it('keeps old links to the history working', () => {
    expect(parseOrderFilter(new URLSearchParams('tab=history'))).toBe('history');
  });
});

describe('liveGroups', () => {
  const placed = order({ id: 'n' });
  const late = order({ id: 'w1', state: 'ACCEPTED', displayState: 'IN_PREPARATION', readyAt: min(15) });
  const soon = order({ id: 'w2', state: 'ACCEPTED', displayState: 'IN_PREPARATION', readyAt: min(4) });
  const ready = order({ id: 'r', state: 'READY', displayState: 'READY' });
  const out = order({ id: 'o', state: 'OUT_FOR_DELIVERY', displayState: 'OUT_FOR_DELIVERY' });

  it('splits the queue into new, in progress (soonest due first) and ready or out', () => {
    const groups = liveGroups([placed, late, ready, soon, out], 'open');
    expect(groups.map((g) => [g.key, g.orders.map((o) => o.id)])).toEqual([
      ['new', ['n']],
      ['work', ['w2', 'w1']],
      ['ready', ['r', 'o']],
    ]);
  });

  it('shows only the chosen section', () => {
    expect(liveGroups([placed, late], 'work').map((g) => g.key)).toEqual(['work']);
  });
});

describe('matchesOrderSearch', () => {
  const o = order({ table: { label: '7' } });
  it('finds by number, with or without #, by name and by table', () => {
    expect(matchesOrderSearch(o, 'a7f')).toBe(true);
    expect(matchesOrderSearch(o, '#A7F3')).toBe(true);
    expect(matchesOrderSearch(o, 'laura')).toBe(true);
    expect(matchesOrderSearch(o, '7')).toBe(true);
    expect(matchesOrderSearch(o, '  ')).toBe(true);
    expect(matchesOrderSearch(o, 'jonas')).toBe(false);
  });
});

describe('itemSummary', () => {
  it('lists dishes and names a combo once', () => {
    const items = [
      item('Pomodoro', 2),
      item('Arrabbiata', 1, { line: 0, name: 'Mittagsmenü' }),
      item('Cola', 1, { line: 0, name: 'Mittagsmenü' }),
      item('Cola 0,33 l'),
    ];
    expect(itemSummary(items)).toBe('2× Pomodoro, 1× Mittagsmenü, 1× Cola 0,33 l');
  });
});

describe('enteredStateAt', () => {
  it('is the last time the order moved into its state', () => {
    const history = [
      { from: null, to: 'PLACED' as const, at: min(-20), actor: { type: 'customer' as const } },
      { from: 'PLACED' as const, to: 'ACCEPTED' as const, at: min(-18), actor: { type: 'system' as const } },
      { from: 'ACCEPTED' as const, to: 'READY' as const, at: min(-3), actor: { type: 'system' as const } },
    ];
    expect(enteredStateAt({ state: 'READY', history })).toBe(min(-3));
    expect(enteredStateAt({ state: 'COMPLETED', history })).toBeNull();
  });
});

describe('orderTiming', () => {
  it('counts down to the automatic rejection of a new order', () => {
    const timing = orderTiming(order({ createdAt: min(-2), autoRejectAt: min(3) }), NOW);
    expect(timing).toEqual({ kind: 'reject', seconds: 180, progress: 0.6, urgent: false });
    expect(orderTiming(order({ autoRejectAt: min(1) }), NOW)).toMatchObject({ urgent: true });
  });

  it('counts down to when an order in progress is due, and goes negative when it is late', () => {
    const working = order({ state: 'ACCEPTED', acceptedAt: min(-10), readyAt: min(10), prepMinutes: 20 });
    expect(orderTiming(working, NOW)).toEqual({ kind: 'due', delivery: false, minutes: 10, promised: 20, progress: 0.5, urgent: false });
    const late = order({ state: 'ACCEPTED', acceptedAt: min(-25), readyAt: min(-5), fulfilmentMode: 'delivery' });
    expect(orderTiming(late, NOW)).toMatchObject({ minutes: -5, delivery: true, urgent: true, progress: 1 });
  });

  it('says how long a ready order has been waiting', () => {
    const history = [{ from: 'ACCEPTED' as const, to: 'READY' as const, at: min(-3), actor: { type: 'system' as const } }];
    expect(orderTiming(order({ state: 'READY', history }), NOW)).toEqual({ kind: 'waiting', minutes: 3 });
    expect(orderTiming(order({ state: 'OUT_FOR_DELIVERY' }), NOW)).toEqual({ kind: 'out', minutes: null });
  });

  it('has nothing to count for a closed order', () => {
    expect(orderTiming(order({ state: 'COMPLETED' }), NOW)).toBeNull();
  });
});
