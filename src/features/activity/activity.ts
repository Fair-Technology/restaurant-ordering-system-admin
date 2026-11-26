import type { TFunction } from 'i18next';
import { formatShopCents, formatShopDate, formatShopDateTime, formatShopNumber } from '../../utils/locale';
import { shopToday } from '../promotions/promotions';
import { humaniseActionKey } from './activityLabels';

export const ACTIVITY_PAGE_SIZE = 20;

/** Backend `area` values; `all` is a client-only sentinel meaning "omit the param". */
export const AREA_FILTERS = ['all', 'menu', 'orders', 'shop', 'discounts', 'staff', 'subscription'] as const;
export type AreaFilter = (typeof AREA_FILTERS)[number];
export type ActivityArea = Exclude<AreaFilter, 'all'>;

export function parseArea(value: string | null): AreaFilter {
  return (AREA_FILTERS as readonly string[]).includes(value ?? '') ? (value as AreaFilter) : 'all';
}

export function parsePage(value: string | null): number {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

const AREA_BY_PREFIX: Record<string, ActivityArea> = {
  product: 'menu',
  category: 'menu',
  optionGroup: 'menu',
  combo: 'menu',
  order: 'orders',
  customer: 'orders',
  promotion: 'discounts',
  staff: 'staff',
  role_permissions: 'staff',
  subscription: 'subscription',
};

/** The area tag for an entry, derived from its action key ("product.update" → menu). */
export function areaOfAction(action: string): ActivityArea {
  return AREA_BY_PREFIX[action.split('.')[0]] ?? 'shop';
}

export interface ChangeValueContext {
  language: string;
  currency: string;
  countryCode?: string | null;
  timeZone?: string;
}

const EMPTY = '—';
const ISO_DATE = /^\d{4}-\d{2}-\d{2}/;
const HAS_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** Readable text for an audit change value. Never lets an object/array reach a template literal raw. */
export function formatChangeValue(value: unknown, field: string, ctx: ChangeValueContext, t?: TFunction): string {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (typeof value === 'boolean') {
    const key = value ? 'common.yes' : 'common.no';
    return t ? String(t(key)) : value ? 'Yes' : 'No';
  }
  if (typeof value === 'number') {
    return field.endsWith('Cents')
      ? formatShopCents(value, ctx.currency, ctx.language, ctx.countryCode)
      : formatShopNumber(value, ctx.language, ctx.countryCode);
  }
  if (typeof value === 'string') {
    if (ISO_DATE.test(value) && !Number.isNaN(new Date(value).getTime())) {
      if (HAS_TIME.test(value)) return formatShopDateTime(value, ctx.language, ctx.countryCode, ctx.timeZone);
      // date-only strings are calendar days: format in UTC so the day never shifts
      return formatShopDate(value, ctx.language, ctx.countryCode, { year: 'numeric', month: 'short', day: 'numeric' }, 'UTC');
    }
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return EMPTY;
    return value.map((v) => formatChangeValue(v, field, ctx, t)).join(', ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return EMPTY;
    return entries.map(([k, v]) => `${k}: ${formatChangeValue(v, k, ctx, t)}`).join(', ');
  }
  return String(value);
}

/** Translated label for a changed field ("closures.added" → "Closures added" when untranslated). */
export function resolveChangeFieldLabel(field: string, t: TFunction): string {
  const labels = t('activity.field', { returnObjects: true, defaultValue: {} }) as unknown;
  if (labels && typeof labels === 'object') {
    const label = (labels as Record<string, unknown>)[field];
    if (typeof label === 'string') return label;
  }
  return humaniseActionKey(field);
}

export type DayLabel = { kind: 'today' } | { kind: 'yesterday' } | { kind: 'date'; timestamp: string };

export interface DayGroup<E> {
  key: string;
  label: DayLabel;
  entries: E[];
}

/** YYYY-MM-DD of the calendar day before `day`. */
function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
}

/** Buckets entries by the shop's local calendar day, keeping arrival order. */
export function groupEntriesByDay<E extends { timestamp: string }>(
  entries: E[],
  timeZone: string,
  nowMs: number,
): DayGroup<E>[] {
  const today = shopToday(timeZone, nowMs);
  const yesterday = previousDay(today);
  const groups: DayGroup<E>[] = [];
  const byKey = new Map<string, DayGroup<E>>();
  for (const entry of entries) {
    const key = shopToday(timeZone, new Date(entry.timestamp).getTime());
    let group = byKey.get(key);
    if (!group) {
      const label: DayLabel =
        key === today ? { kind: 'today' } : key === yesterday ? { kind: 'yesterday' } : { kind: 'date', timestamp: entry.timestamp };
      group = { key, label, entries: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.entries.push(entry);
  }
  return groups;
}

/** 1-based inclusive range shown by "Showing X–Y of N". */
export function showingRange(page: number, pageSize: number, total: number): { from: number; to: number } {
  if (total === 0) return { from: 0, to: 0 };
  return { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) };
}
