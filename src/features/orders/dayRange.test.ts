import { describe, expect, it } from 'vitest';
import { dayRange, parseDaySelection } from './dayRange';

const BERLIN = 'Europe/Berlin';
const NOW = new Date('2026-11-16T12:00:00Z');

describe('parseDaySelection', () => {
  it('defaults to today', () => {
    expect(parseDaySelection(null)).toBe('today');
    expect(parseDaySelection('today')).toBe('today');
    expect(parseDaySelection('garbage')).toBe('today');
    expect(parseDaySelection('2026-02-30')).toBe('today');
  });
  it('parses keywords and explicit dates', () => {
    expect(parseDaySelection('yesterday')).toBe('yesterday');
    expect(parseDaySelection('last7')).toBe('last7');
    expect(parseDaySelection('2026-11-15')).toEqual({ date: '2026-11-15' });
  });
});

describe('dayRange', () => {
  it('today (Berlin is UTC+1 in November)', () => {
    expect(dayRange('today', BERLIN, NOW)).toEqual({
      fromIso: '2026-11-15T23:00:00.000Z',
      toIso: '2026-11-16T23:00:00.000Z',
    });
  });
  it('uses the local date, not the UTC one', () => {
    expect(dayRange('today', BERLIN, new Date('2026-11-16T23:30:00Z')).fromIso).toBe('2026-11-16T23:00:00.000Z');
  });
  it('yesterday', () => {
    expect(dayRange('yesterday', BERLIN, NOW)).toEqual({
      fromIso: '2026-11-14T23:00:00.000Z',
      toIso: '2026-11-15T23:00:00.000Z',
    });
  });
  it('last7 runs from today-6 to tomorrow', () => {
    expect(dayRange('last7', BERLIN, NOW)).toEqual({
      fromIso: '2026-11-09T23:00:00.000Z',
      toIso: '2026-11-16T23:00:00.000Z',
    });
  });
  it('an explicit date', () => {
    expect(dayRange({ date: '2026-07-04' }, BERLIN, NOW)).toEqual({
      fromIso: '2026-07-03T22:00:00.000Z',
      toIso: '2026-07-04T22:00:00.000Z',
    });
  });
  it('is exactly one local day across the spring DST change (2026-03-29, Berlin)', () => {
    const r = dayRange({ date: '2026-03-29' }, BERLIN, NOW);
    expect(r).toEqual({
      fromIso: '2026-03-28T23:00:00.000Z',
      toIso: '2026-03-29T22:00:00.000Z',
    });
    expect((Date.parse(r.toIso) - Date.parse(r.fromIso)) / 3600000).toBe(23);
    // the day after starts exactly where it ends, on summer time
    expect(dayRange({ date: '2026-03-30' }, BERLIN, NOW).fromIso).toBe(r.toIso);
  });
  it('is exactly one local day across the autumn DST change (2026-10-25, Berlin)', () => {
    const r = dayRange({ date: '2026-10-25' }, BERLIN, NOW);
    expect(r).toEqual({
      fromIso: '2026-10-24T22:00:00.000Z',
      toIso: '2026-10-25T23:00:00.000Z',
    });
    expect((Date.parse(r.toIso) - Date.parse(r.fromIso)) / 3600000).toBe(25);
  });
  it('today during the DST day', () => {
    expect(dayRange('today', BERLIN, new Date('2026-03-29T12:00:00Z'))).toEqual({
      fromIso: '2026-03-28T23:00:00.000Z',
      toIso: '2026-03-29T22:00:00.000Z',
    });
  });
});
