import { describe, expect, it } from 'vitest';
import type { IntakeOrder, UpcomingOrder } from '../../services/ordersApi';
import {
  connectionState,
  formatCountdown,
  groupQueue,
  hasWaitingOrders,
  newlyAutoAcceptedIds,
  nextActionFor,
  prepChoices,
  pruneSettledAccepts,
  scheduledReadyMs,
  secondsUntil,
  slotLoadOf,
  upcomingByDay,
  withoutPendingAccept,
  withPendingAccepts,
} from './intake';

const base = {} as IntakeOrder;
const order = (id: string, state: string, displayState: string): IntakeOrder =>
  ({ ...base, id, state, displayState }) as unknown as IntakeOrder;

describe('intake helpers', () => {
  it('groups the queue into three columns', () => {
    const g = groupQueue([
      order('P1', 'PLACED', 'PLACED'),
      order('A1', 'ACCEPTED', 'IN_PREPARATION'),
      order('R1', 'READY', 'READY'),
      order('P2', 'PLACED', 'PLACED'),
    ]);
    expect(g.waiting.map((o) => o.id)).toEqual(['P1', 'P2']);
    expect(g.inProgress.map((o) => o.id)).toEqual(['A1']);
    expect(g.ready.map((o) => o.id)).toEqual(['R1']);
  });

  it('picks the second button by mode', () => {
    const o = (state: string, fulfilmentMode: string) => ({ state, fulfilmentMode }) as unknown as IntakeOrder;
    expect(nextActionFor(o('ACCEPTED', 'collection'))).toBe('markReady');
    expect(nextActionFor(o('ACCEPTED', 'delivery'))).toBe('dispatch');
    expect(nextActionFor(o('READY', 'collection'))).toBe('handOver');
    expect(nextActionFor(o('OUT_FOR_DELIVERY', 'delivery'))).toBe('delivered');
    expect(nextActionFor(o('PLACED', 'delivery'))).toBeNull();
  });

  it('orders on their way sit with the ready ones', () => {
    expect(groupQueue([order('D1', 'OUT_FOR_DELIVERY', 'OUT_FOR_DELIVERY')]).ready.map((o) => o.id)).toEqual(['D1']);
  });

  it('knows when orders are waiting', () => {
    expect(hasWaitingOrders([order('A1', 'ACCEPTED', 'ACCEPTED'), order('P1', 'PLACED', 'PLACED')])).toBe(true);
    expect(hasWaitingOrders([order('A1', 'ACCEPTED', 'ACCEPTED')])).toBe(false);
  });

  it('counts down to auto-decline', () => {
    const now = Date.parse('2026-10-05T10:08:30.000Z');
    expect(secondsUntil('2026-10-05T10:10:00.000Z', now)).toBe(90);
    expect(secondsUntil('2026-10-05T10:05:00.000Z', now)).toBe(0);
    expect(secondsUntil(null, now)).toBeNull();
  });

  it('formats a countdown', () => {
    expect(formatCountdown(90)).toBe('1:30');
    expect(formatCountdown(5)).toBe('0:05');
  });

  it('offers four ready times', () => {
    expect(prepChoices(20)).toEqual([20, 30, 40, 50]);
  });

  it('reports the connection', () => {
    expect(connectionState({ lastSuccessAt: 1000, isError: false, nowMs: 20000 })).toBe('connected');
    expect(connectionState({ lastSuccessAt: 1000, isError: false, nowMs: 31001 })).toBe('offline');
    expect(connectionState({ lastSuccessAt: 1000, isError: true, nowMs: 2000 })).toBe('offline');
    expect(connectionState({ lastSuccessAt: undefined, isError: false, nowMs: 2000 })).toBe('connecting');
  });

  it('spots orders accepted automatically since the last look', () => {
    const auto = (id: string, autoAccepted: boolean) => ({ ...order(id, 'ACCEPTED', 'ACCEPTED'), autoAccepted }) as IntakeOrder;
    expect(newlyAutoAcceptedIds([auto('A', true), auto('B', true), auto('C', false)], new Set(['A']))).toEqual(['B']);
  });
  it('never offers a ready time over 240 minutes', () => {
    expect(prepChoices(220)).toEqual([220, 230, 240]);
    expect(prepChoices(20)).toEqual([20, 30, 40, 50]);
  });

  it('shows an order being accepted as in progress', () => {
    const out = withPendingAccepts(
      [order('P1', 'PLACED', 'PLACED'), order('P2', 'PLACED', 'PLACED')],
      new Map([['P1', { prepMinutes: 40, atMs: Date.parse('2026-10-05T10:00:00.000Z') }]]),
    );
    expect(out[0]).toMatchObject({
      state: 'ACCEPTED',
      displayState: 'IN_PREPARATION',
      prepMinutes: 40,
      readyAt: '2026-10-05T10:40:00.000Z',
    });
    expect(out[1].state).toBe('PLACED');
    expect(groupQueue(out).inProgress.map((o) => o.id)).toEqual(['P1']);
    expect(hasWaitingOrders([out[0]])).toBe(false);
  });

  it('a pending accept on an order no longer waiting is ignored', () => {
    const out = withPendingAccepts([order('R1', 'REJECTED', 'REJECTED')], new Map([['R1', { prepMinutes: 20, atMs: 0 }]]));
    expect(out[0].state).toBe('REJECTED');
  });

  it('forgets accepts the server has settled', () => {
    const m = new Map([
      ['P1', { prepMinutes: 20, atMs: 0 }],
      ['A1', { prepMinutes: 20, atMs: 0 }],
    ]);
    const pruned = pruneSettledAccepts(m, [order('P1', 'PLACED', 'PLACED'), order('A1', 'ACCEPTED', 'IN_PREPARATION')], 1_000);
    expect([...pruned.keys()]).toEqual(['P1']);
    const k = new Map([['P1', { prepMinutes: 20, atMs: 0 }]]);
    expect(pruneSettledAccepts(k, [order('P1', 'PLACED', 'PLACED')], 1_000)).toBe(k);
  });

  it('a pending accept older than a minute is dropped', () => {
    const m = new Map([['P1', { prepMinutes: 20, atMs: 0 }]]);
    const waiting = [order('P1', 'PLACED', 'PLACED')];
    expect(pruneSettledAccepts(m, waiting, 61_000).size).toBe(0);
    expect(pruneSettledAccepts(m, waiting, 60_000).size).toBe(1);
  });

  it('a failed accept is removed', () => {
    const m = new Map([['P1', { prepMinutes: 20, atMs: 0 }]]);
    expect(withoutPendingAccept(m, 'P1').size).toBe(0);
    expect(withoutPendingAccept(m, 'X')).toBe(m);
  });

  it('keeps the booked time when a scheduled order is accepted early', () => {
    const slot = '2026-10-05T16:00:00.000Z';
    expect(scheduledReadyMs(slot, Date.parse('2026-10-05T15:42:00Z'), 20)).toBe(Date.parse(slot));
    expect(scheduledReadyMs(slot, Date.parse('2026-10-05T16:10:00Z'), 20)).toBe(Date.parse('2026-10-05T16:30:00.000Z'));
  });

  it('an accepted scheduled order shows its booked time at once', () => {
    const out = withPendingAccepts(
      [{ ...order('S1', 'PLACED', 'PLACED'), scheduledFor: '2026-10-05T16:00:00.000Z' } as IntakeOrder],
      new Map([['S1', { prepMinutes: 20, atMs: Date.parse('2026-10-05T15:42:00.000Z') }]]),
    );
    expect(out[0].readyAt).toBe('2026-10-05T16:00:00.000Z');
  });

  it("groups upcoming orders by the restaurant's day", () => {
    const u = (id: string, at: string) => ({ ...base, id, scheduledFor: at, outsideHours: false }) as unknown as UpcomingOrder;
    expect(
      upcomingByDay(
        [u('o5', '2026-10-06T16:00:00.000Z'), u('o4', '2026-10-05T16:00:00.000Z'), u('o6', '2026-10-05T22:30:00.000Z')],
        'Europe/Berlin',
      ).map((d) => [d.day, d.orders.map((o) => o.id)]),
    ).toEqual([
      ['2026-10-05', ['o4']],
      ['2026-10-06', ['o6', 'o5']],
    ]);
    expect(upcomingByDay([], 'Europe/Berlin')).toEqual([]);
  });

  it('says how full a booked time is', () => {
    const X = '2026-10-05T16:00:00.000Z';
    expect(slotLoadOf(null, X)).toBeNull();
    expect(slotLoadOf(undefined, X)).toBeNull();
    expect(slotLoadOf({ perSlot: 2, taken: { [X]: 1 } }, X)).toEqual({ taken: 1, perSlot: 2, full: false });
    expect(slotLoadOf({ perSlot: 2, taken: { [X]: 2 } }, X)).toEqual({ taken: 2, perSlot: 2, full: true });
    expect(slotLoadOf({ perSlot: 2, taken: { [X]: 3 } }, X)).toEqual({ taken: 3, perSlot: 2, full: true });
    expect(slotLoadOf({ perSlot: 2, taken: {} }, X)).toEqual({ taken: 0, perSlot: 2, full: false });
    expect(slotLoadOf({ perSlot: 2, taken: {} }, null)).toBeNull();
  });
});
