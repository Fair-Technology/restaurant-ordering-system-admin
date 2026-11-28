import { describe, expect, it } from 'vitest';
import type { IntakeOrder } from '../../services/ordersApi';
import type { OrderHistoryEntry } from '../../services/api';
import { boardColumns, enteredStateAt, formatDuration, itemSummary, liveGroups, matchesOrderSearch, orderTiming, overdueLabel, OVERDUE_CAP_MINUTES, parseOrderFilter, showsNoSearchMatch, wasHandedOver, ORDER_FILTERS, ORDER_SCOPE_FILTERS, ORDER_STATE_FILTERS } from './orderView';

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

  it('no longer knows History: old links fall back to All (the page redirects them to ?day=last7)', () => {
    expect(parseOrderFilter(new URLSearchParams('filter=history'))).toBe('open');
    expect(parseOrderFilter(new URLSearchParams('tab=history'))).toBe('open');
  });
});

describe('order filter groupings', () => {
  it('partition ORDER_FILTERS: All, the states, the scopes', () => {
    const all = ['open', ...ORDER_STATE_FILTERS, ...ORDER_SCOPE_FILTERS];
    expect(all.length).toBeGreaterThan(0);
    expect([...all].sort()).toEqual([...ORDER_FILTERS].sort());
    expect(new Set(all).size).toBe(all.length);
  });

  it('keeps All and the scopes out of the state chips', () => {
    for (const f of ['open', 'upcoming']) {
      expect((ORDER_STATE_FILTERS as readonly string[]).includes(f)).toBe(false);
    }
  });

  it('treats All as the default and as a valid old link', () => {
    expect(parseOrderFilter(new URLSearchParams('filter=open'))).toBe('open');
    expect(parseOrderFilter(new URLSearchParams(''))).toBe('open');
  });

  it('round-trips every filter through the URL', () => {
    for (const f of ORDER_FILTERS) {
      expect(parseOrderFilter(new URLSearchParams('filter=' + f))).toBe(f);
    }
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

describe('boardColumns', () => {
  const entry = (to: 'READY' | 'OUT_FOR_DELIVERY', at: string) =>
    ({ from: 'ACCEPTED', to, at, actor: { type: 'system' } }) as unknown as OrderHistoryEntry;
  const ids = (cols: ReturnType<typeof boardColumns>, key: string) => cols.find((c) => c.key === key)!.orders.map((o) => o.id);

  it('lists new orders oldest first', () => {
    const input = [
      order({ id: 'b', createdAt: min(-5) }),
      order({ id: 'c', createdAt: min(-1) }),
      order({ id: 'a', createdAt: min(-9) }),
    ];
    expect(ids(boardColumns(input), 'new')).toEqual(['a', 'b', 'c']);
  });

  it('lists in-progress orders by due time with no due time last', () => {
    const work = { state: 'ACCEPTED' as const, displayState: 'IN_PREPARATION' as const };
    const input = [
      order({ id: 'none', ...work, readyAt: null }),
      order({ id: 'late', ...work, readyAt: min(15) }),
      order({ id: 'soon', ...work, readyAt: min(4) }),
    ];
    expect(ids(boardColumns(input), 'work')).toEqual(['soon', 'late', 'none']);
  });

  it('lists ready orders longest waiting first, unknown last in input order', () => {
    const ready = { state: 'READY' as const, displayState: 'READY' as const };
    const input = [
      order({ id: 'n1', ...ready }),
      order({ id: 'recent', ...ready, history: [entry('READY', min(-2))] }),
      order({ id: 'n2', ...ready }),
      order({ id: 'old', state: 'OUT_FOR_DELIVERY', displayState: 'OUT_FOR_DELIVERY', history: [entry('OUT_FOR_DELIVERY', min(-12))] }),
    ];
    expect(ids(boardColumns(input), 'ready')).toEqual(['old', 'recent', 'n1', 'n2']);
  });

  it('drops the New column while it is empty, and always draws In progress and Ready', () => {
    const work = order({ id: 'w', state: 'ACCEPTED', displayState: 'IN_PREPARATION', readyAt: min(15) });
    // In progress and Ready render even with nothing in them — an empty "In progress" is information.
    expect(boardColumns([work]).map((c) => c.key)).toEqual(['work', 'ready']);
    expect(boardColumns([]).map((c) => c.key)).toEqual(['work', 'ready']);
    // One new order puts the column back, in the default order.
    expect(boardColumns([order({ id: 'n' }), work]).map((c) => [c.key, c.orders.map((o) => o.id)])).toEqual([
      ['new', ['n']],
      ['work', ['w']],
      ['ready', []],
    ]);
  });

  it('does not reorder the input array', () => {
    const input = [order({ id: 'b', createdAt: min(-1) }), order({ id: 'a', createdAt: min(-9) })];
    boardColumns(input);
    expect(input.map((o) => o.id)).toEqual(['b', 'a']);
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
  it('finds by phone, ignoring formatting on either side', () => {
    const p = order({ customerPhone: '+61 412-345 678' });
    expect(matchesOrderSearch(p, '+61 412 345 678')).toBe(true);
    expect(matchesOrderSearch(p, '61412345678')).toBe(true);
    expect(matchesOrderSearch(p, '412-345')).toBe(true);
    expect(matchesOrderSearch(p, '345')).toBe(true);
    expect(matchesOrderSearch(order({ customerPhone: '0412345678' }), '0412-345-678')).toBe(true);
    expect(matchesOrderSearch(p, '0499')).toBe(false);
  });
  it('does not match phones for queries that are not phone-like (reference fragment with a digit)', () => {
    // default phone is '0170': contains "1", but 'tb1' is a reference-like query, not a phone number
    const other = order({ orderRef: 'ZZZZ', customerName: 'Max', customerPhone: '0170' });
    expect(matchesOrderSearch(other, 'tb1')).toBe(false);
    expect(matchesOrderSearch(other, 'tb1-qqi')).toBe(false);
  });
  it('does not treat queries with fewer than 3 digits as phone searches', () => {
    const other = order({ orderRef: 'ZZZZ', customerName: 'Max', customerPhone: '0170' });
    expect(matchesOrderSearch(other, '12')).toBe(false);
    expect(matchesOrderSearch(other, '+1')).toBe(false);
    expect(matchesOrderSearch(other, '017')).toBe(true);
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
    ] as unknown as OrderHistoryEntry[];  // the spec declares `from` non-nullable; the initial entry stores null
    expect(enteredStateAt({ state: 'READY', history })).toBe(min(-3));
    expect(enteredStateAt({ state: 'COMPLETED', history })).toBeNull();
  });
});

describe('wasHandedOver', () => {
  const entry = (to: string, at: string) => ({ from: null, to, at, actor: { type: 'system' } });
  const withHistory = (...entries: ReturnType<typeof entry>[]) => entries as unknown as OrderHistoryEntry[];

  it('is true once the order reached COMPLETED', () => {
    const history = withHistory(entry('READY', min(-10)), entry('COMPLETED', min(-5)));
    expect(wasHandedOver(order({ state: 'COMPLETED', displayState: 'COMPLETED', history }))).toBe(true);
  });

  it('stays true after a post-handover refund changed the displayState', () => {
    const history = withHistory(entry('READY', min(-10)), entry('COMPLETED', min(-5)));
    expect(wasHandedOver(order({ displayState: 'REFUNDED', history }))).toBe(true);
  });

  it('is false when the order never reached COMPLETED', () => {
    expect(wasHandedOver(order({ state: 'READY', displayState: 'READY', history: withHistory(entry('READY', min(-5))) }))).toBe(false);
    expect(wasHandedOver(order({ displayState: 'REFUNDED', history: withHistory(entry('READY', min(-5)), entry('REFUNDED', min(-1))) }))).toBe(false);
  });

  it('is false without a history, and does not throw', () => {
    expect(wasHandedOver(order({ history: [] }))).toBe(false);
    expect(wasHandedOver({ history: undefined as unknown as OrderHistoryEntry[] })).toBe(false);
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

describe('formatDuration', () => {
  it('shows plain minutes under an hour', () => {
    expect(formatDuration(59)).toEqual({ key: 'orders.live.unitMinutes', params: { minutes: 59 } });
  });
  it('switches to hours at exactly 60 minutes', () => {
    expect(formatDuration(60)).toEqual({ key: 'orders.live.unitHours', params: { hours: 1 } });
  });
  it('shows hours plus leftover minutes', () => {
    expect(formatDuration(1439)).toEqual({ key: 'orders.live.unitHoursMinutes', params: { hours: 23, minutes: 59 } });
  });
  it('switches to days at exactly 1440 minutes', () => {
    expect(formatDuration(1440)).toEqual({ key: 'orders.live.unitDays', params: { days: 1 } });
  });
  it('rounds and clamps like overdueLabel does', () => {
    expect(formatDuration(-7)).toEqual({ key: 'orders.live.unitMinutes', params: { minutes: 0 } });
    expect(formatDuration(0.4)).toEqual({ key: 'orders.live.unitMinutes', params: { minutes: 0 } });
  });
});

describe('overdueLabel', () => {
  it('shows the real minutes under the cap', () => {
    expect(overdueLabel(5)).toEqual({ key: 'orders.live.late', params: { minutes: 5 }, stale: false });
  });
  it('is still uncapped one minute below the cap', () => {
    expect(overdueLabel(OVERDUE_CAP_MINUTES - 1)).toEqual({ key: 'orders.live.late', params: { minutes: 119 }, stale: false });
  });
  it('caps exactly at 120 minutes and flags stale', () => {
    expect(overdueLabel(120)).toEqual({ key: 'orders.live.lateCapped', params: { hours: 2 }, stale: true });
  });
  it('never lets a huge minute count into the label', () => {
    const label = overdueLabel(61430);
    expect(label).toEqual({ key: 'orders.live.lateCapped', params: { hours: 2 }, stale: true });
    expect(JSON.stringify(label)).not.toContain('61430');
  });
  it('clamps negative input to 0 minutes', () => {
    expect(overdueLabel(-7)).toEqual({ key: 'orders.live.late', params: { minutes: 0 }, stale: false });
  });
  it('rounds fractional input', () => {
    expect(overdueLabel(0.4)).toEqual({ key: 'orders.live.late', params: { minutes: 0 }, stale: false });
  });
});

describe('showsNoSearchMatch', () => {
  it('is false for an empty or whitespace query regardless of handed-over matches', () => {
    expect(showsNoSearchMatch('', 0)).toBe(false);
    expect(showsNoSearchMatch('   ', 0)).toBe(false);
    expect(showsNoSearchMatch('  ', 3)).toBe(false);
  });
  it('is true when a query matches nothing in the handed-over section', () => {
    expect(showsNoSearchMatch('A7F3', 0)).toBe(true);
  });
  it('is false when the query matches a handed-over order', () => {
    expect(showsNoSearchMatch('A7F3', 1)).toBe(false);
  });
});
