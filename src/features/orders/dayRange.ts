export type DaySelection = 'today' | 'yesterday' | 'last7' | { date: string };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `?day=` → a selection. Anything unrecognised (or an impossible date) falls back to today. */
export function parseDaySelection(raw: string | null): DaySelection {
  if (raw === 'yesterday' || raw === 'last7') return raw;
  const m = raw ? DATE_RE.exec(raw) : null;
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const probe = new Date(Date.UTC(y, mo - 1, d));
    if (probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d) return { date: raw! };
  }
  return 'today';
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

/** The local day(s) in `timeZone` as UTC instants: [from, to) — `to` is exclusive. */
export function dayRange(sel: DaySelection, timeZone: string, now: Date): { fromIso: string; toIso: string } {
  let start: { y: number; m: number; d: number };
  let days = 1;
  if (typeof sel === 'object') {
    const [y, m, d] = sel.date.split('-').map(Number);
    start = { y, m, d };
  } else {
    const today = localDate(now.getTime(), timeZone);
    if (sel === 'today') start = today;
    else if (sel === 'yesterday') start = { ...today, d: today.d - 1 };
    else {
      start = { ...today, d: today.d - 6 };
      days = 7;
    }
  }
  const from = localMidnight(start.y, start.m, start.d, timeZone);
  const to = localMidnight(start.y, start.m, start.d + days, timeZone);
  return {
    fromIso: new Date(from).toISOString(),
    toIso: new Date(to).toISOString(),
  };
}
