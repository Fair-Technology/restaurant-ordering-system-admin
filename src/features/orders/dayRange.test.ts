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
  it('parses the week/month presets', () => {
    for (const k of ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth']) expect(parseDaySelection(k)).toBe(k);
  });
  it('parses custom ranges and rejects bad ones', () => {
    expect(parseDaySelection('2026-11-01..2026-11-15')).toEqual({ from: '2026-11-01', to: '2026-11-15' });
    expect(parseDaySelection('2026-11-15..2026-11-01')).toBe('today');
    expect(parseDaySelection('2026-13-01..2026-11-15')).toBe('today');
    expect(parseDaySelection('2026-11-01..foo')).toBe('today');
  });
});

const hours = (r: { fromIso: string; toIso: string }) => (Date.parse(r.toIso) - Date.parse(r.fromIso)) / 3_600_000;

describe('dayRange presets and custom ranges (Europe/Berlin)', () => {
  const MARCH = new Date('2026-03-10T12:00:00Z');
  it('thisWeek / lastWeek meet exactly, 168h each', () => {
    const tw = dayRange('thisWeek', BERLIN, MARCH);
    const lw = dayRange('lastWeek', BERLIN, MARCH);
    expect(tw).toEqual({ fromIso: '2026-03-08T23:00:00.000Z', toIso: '2026-03-15T23:00:00.000Z' });
    expect(hours(tw)).toBe(168);
    expect(lw).toEqual({ fromIso: '2026-03-01T23:00:00.000Z', toIso: '2026-03-08T23:00:00.000Z' });
    expect(hours(lw)).toBe(168);
    expect(lw.toIso).toBe(tw.fromIso);
  });
  it('thisMonth (31 local days incl. spring-forward) and lastMonth (28 days)', () => {
    const tm = dayRange('thisMonth', BERLIN, MARCH);
    expect(tm).toEqual({ fromIso: '2026-02-28T23:00:00.000Z', toIso: '2026-03-31T22:00:00.000Z' });
    expect(hours(tm)).toBe(743);
    const lm = dayRange('lastMonth', BERLIN, MARCH);
    expect(lm).toEqual({ fromIso: '2026-01-31T23:00:00.000Z', toIso: '2026-02-28T23:00:00.000Z' });
    expect(hours(lm)).toBe(672);
  });
  it('DST week (spring) is 7 local days = 167h', () => {
    const tw = dayRange('thisWeek', BERLIN, new Date('2026-03-26T12:00:00Z'));
    expect(tw).toEqual({ fromIso: '2026-03-22T23:00:00.000Z', toIso: '2026-03-29T22:00:00.000Z' });
    expect(hours(tw)).toBe(167);
    expect(dayRange({ date: '2026-03-30' }, BERLIN, MARCH).fromIso).toBe(tw.toIso);
  });
  it('DST month (autumn) is 31 local days = 745h', () => {
    const tm = dayRange('thisMonth', BERLIN, new Date('2026-10-15T12:00:00Z'));
    expect(tm).toEqual({ fromIso: '2026-09-30T22:00:00.000Z', toIso: '2026-10-31T23:00:00.000Z' });
    expect(hours(tm)).toBe(745);
  });
  it('custom ranges', () => {
    const a = dayRange({ from: '2026-11-01', to: '2026-11-15' }, BERLIN, NOW);
    expect(a).toEqual({ fromIso: '2026-10-31T23:00:00.000Z', toIso: '2026-11-15T23:00:00.000Z' });
    expect(hours(a)).toBe(360);
    const b = dayRange({ from: '2026-11-15', to: '2026-11-15' }, BERLIN, NOW);
    expect(b).toEqual({ fromIso: '2026-11-14T23:00:00.000Z', toIso: '2026-11-15T23:00:00.000Z' });
    expect(hours(b)).toBe(24);
    const c = dayRange({ from: '2026-10-24', to: '2026-10-26' }, BERLIN, NOW);
    expect(c).toEqual({ fromIso: '2026-10-23T22:00:00.000Z', toIso: '2026-10-26T23:00:00.000Z' });
    expect(hours(c)).toBe(73);
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
