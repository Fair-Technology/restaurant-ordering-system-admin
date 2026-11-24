import { describe, expect, it } from 'vitest';
import {
  closureRange,
  closureRequest,
  dayClosure,
  todayInZone,
  upcomingClosures,
  type ShopClosure,
} from './closures';

describe('dayClosure', () => {
  it('uses the winter offset in Berlin', () => {
    const c = dayClosure('2026-12-24', undefined, 'Europe/Berlin');
    expect(c.start).toBe('2026-12-24T00:00:00+01:00');
    expect(c.end).toBe('2026-12-25T00:00:00+01:00');
  });
  it('uses the summer offset in Berlin', () => {
    const c = dayClosure('2026-07-04', undefined, 'Europe/Berlin');
    expect(c.start).toBe('2026-07-04T00:00:00+02:00');
    expect(c.end).toBe('2026-07-05T00:00:00+02:00');
  });
  it('handles Sydney', () => {
    const c = dayClosure('2026-12-24', undefined, 'Australia/Sydney');
    expect(c.start).toBe('2026-12-24T00:00:00+11:00');
    expect(c.end).toBe('2026-12-25T00:00:00+11:00');
  });
  it('computes next midnight per calendar day on a DST day', () => {
    const c = dayClosure('2026-03-29', undefined, 'Europe/Berlin');
    expect(c.start).toBe('2026-03-29T00:00:00+01:00');
    expect(c.end).toBe('2026-03-30T00:00:00+02:00');
    expect(Date.parse(c.end) - Date.parse(c.start)).toBe(23 * 3600 * 1000);
  });
  it('omits blank reasons and trims long ones', () => {
    expect(dayClosure('2026-12-24', '   ', 'Europe/Berlin')).not.toHaveProperty('reason');
    expect(dayClosure('2026-12-24', undefined, 'Europe/Berlin')).not.toHaveProperty('reason');
    expect(dayClosure('2026-12-24', ` ${'x'.repeat(300)} `, 'Europe/Berlin').reason).toHaveLength(200);
  });
});

const now = new Date('2026-11-19T12:00:00Z');
const past: ShopClosure = { id: 'p', start: '2026-11-01T00:00:00+01:00', end: '2026-11-02T00:00:00+01:00' };
const later: ShopClosure = { id: 'l', start: '2026-12-24T00:00:00+01:00', end: '2026-12-25T00:00:00+01:00', reason: ' Xmas ' };
const sooner: ShopClosure = { start: '2026-11-25T00:00:00+01:00', end: '2026-11-26T00:00:00+01:00' };
const ended: ShopClosure = { start: '2026-11-18T00:00:00Z', end: '2026-11-19T12:00:00Z' };

describe('upcomingClosures', () => {
  it('drops ended entries (end <= now) and sorts by start', () => {
    expect(upcomingClosures([later, past, ended, sooner], now)).toEqual([sooner, later]);
  });
});

describe('closureRequest', () => {
  it('drops past, omits absent id, keeps supplied id, trims reason', () => {
    expect(closureRequest([later, past, sooner], now)).toEqual([
      { start: sooner.start, end: sooner.end },
      { id: 'l', start: later.start, end: later.end, reason: 'Xmas' },
    ]);
  });
  it('returns [] for an all-past list', () => {
    expect(closureRequest([past, ended], now)).toEqual([]);
  });
});

describe('closureRange', () => {
  it('spans a 3-day range inclusive of the end day in Berlin', () => {
    const c = closureRange('2026-12-24', '2026-12-26', 'Holidays', 'Europe/Berlin');
    expect(c.start).toBe('2026-12-24T00:00:00+01:00');
    expect(c.end).toBe('2026-12-27T00:00:00+01:00');
    expect(c.reason).toBe('Holidays');
  });
  it('follows the DST change inside a range', () => {
    const c = closureRange('2026-03-28', '2026-03-30', undefined, 'Europe/Berlin');
    expect(c.start).toBe('2026-03-28T00:00:00+01:00');
    expect(c.end).toBe('2026-03-31T00:00:00+02:00');
  });
  it('equals dayClosure for a single day', () => {
    expect(closureRange('2026-12-24', '2026-12-24', ' Eve ', 'Europe/Berlin')).toEqual(
      dayClosure('2026-12-24', ' Eve ', 'Europe/Berlin'),
    );
  });
});

describe('todayInZone', () => {
  it('uses the shop zone calendar date', () => {
    const now = new Date('2026-12-24T23:30:00Z');
    expect(todayInZone('Europe/Berlin', now)).toBe('2026-12-25');
    expect(todayInZone('America/New_York', now)).toBe('2026-12-24');
  });
});
