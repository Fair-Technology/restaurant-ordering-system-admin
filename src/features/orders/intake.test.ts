import { describe, expect, it } from 'vitest';
import type { IntakeOrder } from '../../services/ordersApi';
import {
  connectionState,
  formatCountdown,
  groupQueue,
  hasWaitingOrders,
  prepChoices,
  secondsUntil,
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
});
