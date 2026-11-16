export type DaySelection =
  | 'today'
  | 'yesterday'
  | 'last7'
  | 'thisWeek'
  | 'lastWeek'
  | 'thisMonth'
  | 'lastMonth'
  | { date: string }
  | { from: string; to: string };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Custom range in the `?day=` param: `YYYY-MM-DD..YYYY-MM-DD`, both ends INCLUSIVE local dates. */
const RANGE_RE = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/;
const RANGE_PRESETS = ['thisWeek', 'lastWeek', 'thisMonth', 'lastMonth'];

/** True only for a real calendar date (`2026-02-30` is rejected). */
function isRealDate(s: string): boolean {
  const m = DATE_RE.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const probe = new Date(Date.UTC(y, mo - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

/** The longest window one selection may cover: a custom range is clamped to this many months. */
export const MAX_RANGE_MONTHS = 6;

/** Calendar-month shift of a `YYYY-MM-DD` local date; an overflowing day rolls forward (Date.UTC). */
function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + months, d));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/**
 * Clamp a custom range to MAX_RANGE_MONTHS. The END is kept and the START moves forward, so a window
 * that is too long shows the most recent MAX_RANGE_MONTHS up to the last day picked. A window of
 * exactly MAX_RANGE_MONTHS is allowed unchanged (`capped: false`); the test is
 * `to <= addMonths(from, MAX_RANGE_MONTHS)`. When a day overflows a shorter month the shift can only
 * make the window a few days SHORTER, never longer.
 */
export function clampDayRange(from: string, to: string): { from: string; to: string; capped: boolean } {
  if (to <= addMonths(from, MAX_RANGE_MONTHS)) return { from, to, capped: false };
  return { from: addMonths(to, -MAX_RANGE_MONTHS), to, capped: true };
}

export interface ParsedDaySearch {
  selection: DaySelection;
  /** True when a picked/edited custom range was longer than MAX_RANGE_MONTHS and had to be clamped. */
  rangeCapped: boolean;
}

/**
 * `?day=` → the selection the page shows, plus whether a custom range had to be clamped. Anything
 * unrecognised — including an impossible date or a REVERSED custom range (`from > to`) — falls back to
 * today. The CLAMP lives here, so a hand-edited URL is clamped exactly like a picked range.
 */
export function parseDaySearch(raw: string | null): ParsedDaySearch {
  if (raw === 'yesterday' || raw === 'last7' || (raw !== null && RANGE_PRESETS.includes(raw))) {
    return { selection: raw as DaySelection, rangeCapped: false };
  }
  const rm = raw ? RANGE_RE.exec(raw) : null;
  if (rm && isRealDate(rm[1]) && isRealDate(rm[2]) && rm[1] <= rm[2]) {
    const { from, to, capped } = clampDayRange(rm[1], rm[2]);
    return { selection: { from, to }, rangeCapped: capped };
  }
  if (raw && isRealDate(raw)) return { selection: { date: raw }, rangeCapped: false };
  return { selection: 'today', rangeCapped: false };
}

/** `?day=` → a selection (the clamped one). Kept for callers/tests that do not need the cap flag. */
export function parseDaySelection(raw: string | null): DaySelection {
  return parseDaySearch(raw).selection;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
function offsetMs(instant: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(new Date(instant));
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant at which the local wall clock in `timeZone` reads y-m-d 00:00 (month/day may overflow). */
function localMidnight(y: number, m: number, d: number, timeZone: string): number {
  const wall = Date.UTC(y, m - 1, d);
  // Two passes settle the offset even when the guess lands across a DST change.
  let guess = wall - offsetMs(wall, timeZone);
  guess = wall - offsetMs(guess, timeZone);
  return guess;
}

function localDate(instant: number, timeZone: string): { y: number; m: number; d: number } {
  const local = new Date(instant + offsetMs(instant, timeZone));
  return {
    y: local.getUTCFullYear(),
    m: local.getUTCMonth() + 1,
    d: local.getUTCDate(),
  };
}

type LocalDate = { y: number; m: number; d: number };

/** Shift a local calendar date by whole days; month/year overflow is normalised by Date.UTC. */
function addDays(date: LocalDate, days: number): LocalDate {
  const t = new Date(Date.UTC(date.y, date.m - 1, date.d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

/** Monday of the local week containing `date` (weeks start Monday). */
function mondayOf(date: LocalDate): LocalDate {
  const dow = new Date(Date.UTC(date.y, date.m - 1, date.d)).getUTCDay(); // 0=Sun .. 6=Sat
  return addDays(date, -((dow + 6) % 7));
}

/**
 * The local day(s) in `timeZone` as UTC instants: [from, to) — `to` is EXCLUSIVE.
 *
 * Ranges resolve on the shop's LOCAL calendar and are then converted to UTC:
 *  - weeks start Monday, months start on the 1st;
 *  - `thisWeek` = this Monday → next Monday, `lastWeek` = previous Monday → this Monday;
 *  - `thisMonth` = 1st of this month → 1st of next month, `lastMonth` = 1st of last month → 1st of this month;
 *  - a custom range = start of the first picked local date → start of the day after the last picked date.
 * Boundaries are local midnights, so every range is a whole number of local days and a 23h/25h DST day
 * still counts as exactly one day.
 */
export function dayRange(sel: DaySelection, timeZone: string, now: Date): { fromIso: string; toIso: string } {
  const today = localDate(now.getTime(), timeZone);
  let from: LocalDate;
  let to: LocalDate;
  if (typeof sel === 'object' && 'date' in sel) {
    const [y, m, d] = sel.date.split('-').map(Number);
    from = { y, m, d };
    to = addDays(from, 1);
  } else if (typeof sel === 'object') {
    const [fy, fm, fd] = sel.from.split('-').map(Number);
    const [ty, tm, td] = sel.to.split('-').map(Number);
    from = { y: fy, m: fm, d: fd };
    to = { y: ty, m: tm, d: td + 1 }; // the day after the last picked date
  } else if (sel === 'today') {
    from = today;
    to = addDays(today, 1);
  } else if (sel === 'yesterday') {
    from = addDays(today, -1);
    to = today;
  } else if (sel === 'last7') {
    from = addDays(today, -6);
    to = addDays(today, 1);
  } else if (sel === 'thisWeek') {
    from = mondayOf(today);
    to = addDays(from, 7);
  } else if (sel === 'lastWeek') {
    const monday = mondayOf(today);
    from = addDays(monday, -7);
    to = monday;
  } else if (sel === 'thisMonth') {
    from = { y: today.y, m: today.m, d: 1 };
    to = { y: today.y, m: today.m + 1, d: 1 };
  } else {
    from = { y: today.y, m: today.m - 1, d: 1 };
    to = { y: today.y, m: today.m, d: 1 };
  }
  const fromMs = localMidnight(from.y, from.m, from.d, timeZone);
  const toMs = localMidnight(to.y, to.m, to.d, timeZone);
  return { fromIso: new Date(fromMs).toISOString(), toIso: new Date(toMs).toISOString() };
}
