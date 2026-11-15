import { describe, expect, it } from 'vitest';

import { clearSoldOutPatch, endOfServiceDayIso, isSoldOutUntil, soldOutTodayPatch } from './soldOut';

describe('isSoldOutUntil', () => {
  const now = Date.parse('2026-11-16T10:00:00.000Z');

  it('is sold out while the window is in the future', () => {
    expect(isSoldOutUntil('2026-11-16T23:00:00.000Z', now)).toBe(true);
  });

  it('is back on once the window has passed', () => {
    expect(isSoldOutUntil('2026-11-16T09:59:59.000Z', now)).toBe(false);
  });

  it('treats a missing or malformed value as not sold out', () => {
    expect(isSoldOutUntil(null, now)).toBe(false);
    expect(isSoldOutUntil(undefined, now)).toBe(false);
    expect(isSoldOutUntil('not-a-date', now)).toBe(false);
  });

  it('is not sold out at the exact boundary instant', () => {
    expect(isSoldOutUntil('2026-11-16T10:00:00.000Z', now)).toBe(false);
  });
});

describe('endOfServiceDayIso', () => {
  it('ends the day at the shop local midnight, not the browser one', () => {
    // 11:00 in Berlin (UTC+1 in November) → midnight tonight is 23:00 UTC.
    expect(endOfServiceDayIso('Europe/Berlin', new Date('2026-11-16T10:00:00.000Z'))).toBe(
      '2026-11-16T23:00:00.000Z',
    );
  });

  it('handles a zone east of UTC', () => {
    // 11:30 in Sydney (UTC+11 in November) → midnight is 13:00 UTC same day.
    expect(endOfServiceDayIso('Australia/Sydney', new Date('2026-11-16T00:30:00.000Z'))).toBe(
      '2026-11-16T13:00:00.000Z',
    );
  });

  it('rolls to the next calendar day for UTC', () => {
    expect(endOfServiceDayIso('UTC', new Date('2026-11-16T10:00:00.000Z'))).toBe(
      '2026-11-17T00:00:00.000Z',
    );
  });

  it('lands inside the shop day it was asked for', () => {
    const now = new Date('2026-11-16T22:30:00.000Z'); // 06:30 next day, Sydney
    const end = endOfServiceDayIso('Australia/Sydney', now);
    expect(Date.parse(end)).toBeGreaterThan(now.getTime());
    expect(end).toBe('2026-11-17T13:00:00.000Z');
  });
});

describe('sold out patches', () => {
  it('marks sold out with the end of the shop day', () => {
    const patch = soldOutTodayPatch('UTC', new Date('2026-11-16T10:00:00.000Z'));
    expect(patch).toEqual({ unavailableUntil: '2026-11-17T00:00:00.000Z' });
  });

  it('clears the window with null', () => {
    expect(clearSoldOutPatch).toEqual({ unavailableUntil: null });
  });
});
