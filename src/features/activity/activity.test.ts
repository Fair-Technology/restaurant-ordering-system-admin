import { describe, expect, it } from 'vitest';
import type { TFunction } from 'i18next';
import {
  areaOfAction,
  formatChangeValue,
  groupEntriesByDay,
  parseArea,
  parsePage,
  resolveChangeFieldLabel,
  showingRange,
} from './activity';

const ctx = { language: 'en', currency: 'EUR', countryCode: 'DE', timeZone: 'Europe/Berlin' };
const f = (v: unknown, field = 'name') => formatChangeValue(v, field, ctx);

describe('formatChangeValue', () => {
  it('shows a dash for empty values', () => {
    expect(f(null)).toBe('—');
    expect(f(undefined)).toBe('—');
    expect(f('')).toBe('—');
  });
  it('formats booleans with the translator when given, else English', () => {
    expect(f(true)).toBe('Yes');
    expect(f(false)).toBe('No');
    const t = ((k: string) => (k === 'common.yes' ? 'Ja' : 'Nein')) as unknown as TFunction;
    expect(formatChangeValue(true, 'available', ctx, t)).toBe('Ja');
    expect(formatChangeValue(false, 'available', ctx, t)).toBe('Nein');
  });
  it('formats *Cents fields as money and other numbers as plain numbers', () => {
    expect(f(1250, 'refundedCents')).toMatch(/12[.,]50/);
    expect(f(1250, 'refundedCents')).toContain('€');
    expect(f(1250, 'prepMinutes')).not.toContain('€');
    expect(f(1250, 'prepMinutes')).toMatch(/1.?250/);
    // case-sensitive: "cents" alone is not a money field
    expect(f(5, 'cents')).toBe('5');
  });
  it('formats ISO dates and datetimes, passes other strings through', () => {
    expect(f('2026-03-05')).toContain('2026');
    expect(f('2026-03-05')).not.toMatch(/\d:\d/);
    expect(f('2026-03-05T22:30:00Z')).toMatch(/23:30/); // Berlin, UTC+1
    expect(f('Margherita')).toBe('Margherita');
  });
  it('joins arrays, recursing into elements', () => {
    expect(f([])).toBe('—');
    expect(f(['a', 'b'])).toBe('a, b');
    expect(f([1, [true, null]])).toBe('1, Yes, —');
  });
  it('flattens objects, recursing, and never emits [object Object]', () => {
    expect(f({ a: 1, b: 'x' })).toBe('a: 1, b: x');
    const nested = f({ zone: { name: 'Mitte', fees: [{ minCents: 500 }] }, list: [{ k: null }] });
    expect(nested).toBe('zone: name: Mitte, fees: minCents: €5.00, list: k: —'.replace('€5.00', f(500, 'minCents')));
    expect(nested).not.toContain('[object');
    expect(f({})).toBe('—');
  });
});

describe('resolveChangeFieldLabel', () => {
  const t = ((_key: string, opts?: { returnObjects?: boolean }) =>
    opts?.returnObjects ? { price: 'Price' } : '') as unknown as TFunction;
  it('uses the translation when present', () => {
    expect(resolveChangeFieldLabel('price', t)).toBe('Price');
  });
  it('humanises dotted and camelCase keys otherwise', () => {
    expect(resolveChangeFieldLabel('closures.added', t)).toBe('Closures added');
    expect(resolveChangeFieldLabel('autoAcceptHours', t)).toBe('Auto accept hours');
  });
});

describe('groupEntriesByDay', () => {
  // 2026-06-15 02:30 UTC = 2026-06-14 22:30 in New York, 2026-06-15 11:30 in Tokyo
  const now = Date.parse('2026-06-15T02:30:00Z');
  const entries = [
    { id: 'a', timestamp: '2026-06-15T01:00:00Z' }, // NY: 14th (today); Tokyo: 15th (today)
    { id: 'b', timestamp: '2026-06-14T20:00:00Z' }, // NY: 14th (today); Tokyo: 15th (today)
    { id: 'c', timestamp: '2026-06-14T02:00:00Z' }, // NY: 13th (yesterday); Tokyo: 14th (yesterday)
    { id: 'd', timestamp: '2026-06-10T12:00:00Z' },
  ];
  it('buckets by the shop day in New York, not the runner zone', () => {
    const g = groupEntriesByDay(entries, 'America/New_York', now);
    expect(g.map((x) => [x.key, x.label.kind, x.entries.map((e) => e.id)])).toEqual([
      ['2026-06-14', 'today', ['a', 'b']],
      ['2026-06-13', 'yesterday', ['c']],
      ['2026-06-10', 'date', ['d']],
    ]);
  });
  it('buckets by the shop day in Tokyo', () => {
    const g = groupEntriesByDay(entries, 'Asia/Tokyo', now);
    expect(g.map((x) => [x.key, x.label.kind, x.entries.map((e) => e.id)])).toEqual([
      ['2026-06-15', 'today', ['a', 'b']],
      ['2026-06-14', 'yesterday', ['c']],
      ['2026-06-10', 'date', ['d']],
    ]);
  });
  it('keeps arrival order', () => {
    const g = groupEntriesByDay([entries[3], entries[0]], 'Asia/Tokyo', now);
    expect(g.map((x) => x.key)).toEqual(['2026-06-10', '2026-06-15']);
  });
});

describe('helpers', () => {
  it('maps actions to areas', () => {
    // one representative per area
    expect(areaOfAction('product.update')).toBe('menu');
    expect(areaOfAction('order.refund')).toBe('orders');
    expect(areaOfAction('order.accept')).toBe('orders');
    expect(areaOfAction('order.decline')).toBe('orders');
    expect(areaOfAction('promotion.code_create')).toBe('discounts');
    expect(areaOfAction('staff.create')).toBe('staff');
    expect(areaOfAction('subscription.upgrade')).toBe('subscription');
    expect(areaOfAction('shop.logo')).toBe('shop');
    // not a prefix scheme
    expect(areaOfAction('shop.busy_mode')).toBe('orders');
    expect(areaOfAction('shop.orders_auto_paused')).toBe('orders');
    expect(areaOfAction('shop.missed_orders_pause_limit')).toBe('orders');
    expect(areaOfAction('promotion.code_update')).toBe('discounts');
    expect(areaOfAction('promotion.loyalty_update')).toBe('discounts');
    for (const a of [
      'customer.erase',
      'content_report.decided',
      'platform_legal_identity.update',
      'role_permissions.update',
      'config.maxShopsDefault.update',
      'reference_lists.update',
      'user.limits.update',
    ]) {
      expect(areaOfAction(a)).toBe('shop');
    }
    for (const a of ['combo.create', 'category.delete', 'optionGroup.option.enable']) {
      expect(areaOfAction(a)).toBe('menu');
    }
    // unknown / future actions, including inherited object keys, fall back to shop
    expect(areaOfAction('something.new')).toBe('shop');
    expect(areaOfAction('constructor')).toBe('shop');
  });
  it('parses URL params defensively', () => {
    expect(parseArea('menu')).toBe('menu');
    expect(parseArea('bogus')).toBe('all');
    expect(parseArea(null)).toBe('all');
    expect(parsePage('3')).toBe(3);
    expect(parsePage('0')).toBe(1);
    expect(parsePage('x')).toBe(1);
  });
  it('computes the showing range', () => {
    expect(showingRange(1, 20, 45)).toEqual({ from: 1, to: 20 });
    expect(showingRange(3, 20, 45)).toEqual({ from: 41, to: 45 });
    expect(showingRange(1, 20, 0)).toEqual({ from: 0, to: 0 });
  });
});
