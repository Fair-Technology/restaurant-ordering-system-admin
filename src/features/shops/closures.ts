export const CLOSURE_REASON_MAX_LENGTH = 200;

export type ShopClosure = { id?: string; start: string; end: string; reason?: string };

/** Offset of `timeZone` at the instant `at`, in minutes east of UTC. */
export function zoneOffsetMinutes(timeZone: string, at: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Local wall-clock date "YYYY-MM-DD" at 00:00 in `timeZone` -> the UTC instant. */
function wallMidnight(dateStr: string, timeZone: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  let guess = Date.UTC(y, m - 1, d, 0, 0, 0);
  for (let i = 0; i < 2; i += 1) {
    guess = Date.UTC(y, m - 1, d, 0, 0, 0) - zoneOffsetMinutes(timeZone, new Date(guess)) * 60000;
  }
  return new Date(guess);
}

/** `at` as ISO-8601 carrying `timeZone`'s offset, e.g. 2026-12-24T00:00:00+01:00 */
function isoWithOffset(at: Date, timeZone: string): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(at)) p[part.type] = part.value;
  const off = zoneOffsetMinutes(timeZone, at);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${sign}${hh}:${mm}`;
}

function nextDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const n = new Date(Date.UTC(y, m - 1, d + 1));
  const mm = String(n.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(n.getUTCDate()).padStart(2, '0');
  return `${n.getUTCFullYear()}-${mm}-${dd}`;
}

function zoneOrDefault(timeZone?: string): string {
  return timeZone?.trim() || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function trimReason(reason?: string): string | undefined {
  const t = reason?.trim();
  return t ? t.slice(0, CLOSURE_REASON_MAX_LENGTH) : undefined;
}

/** Today's calendar date "YYYY-MM-DD" in the shop's zone. */
export function todayInZone(timeZone?: string, now: Date = new Date()): string {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: zoneOrDefault(timeZone),
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(now)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}`;
}

/** Picked calendar dates (end inclusive) -> the closure window [00:00 start day, 00:00 day after end) in the shop's zone. */
export function closureRange(startStr: string, endStr: string, reason?: string, timeZone?: string): ShopClosure {
  const tz = zoneOrDefault(timeZone);
  const start = wallMidnight(startStr, tz);
  const end = wallMidnight(nextDate(endStr), tz);
  const trimmed = trimReason(reason);
  return { start: isoWithOffset(start, tz), end: isoWithOffset(end, tz), ...(trimmed ? { reason: trimmed } : {}) };
}

/** A picked calendar date -> the closure window [00:00 that day, 00:00 the next day) in the shop's zone. */
export function dayClosure(dateStr: string, reason?: string, timeZone?: string): ShopClosure {
  return closureRange(dateStr, dateStr, reason, timeZone);
}

/** Closures still running or ahead of `now`, soonest first. */
export function upcomingClosures(entries: ShopClosure[], now: Date = new Date()): ShopClosure[] {
  return entries
    .filter((c) => Date.parse(c.end) > now.getTime())
    .slice()
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

/** The list to send to updateShop: past closures dropped, reasons trimmed, sorted; [] clears. */
export function closureRequest(entries: ShopClosure[], now: Date = new Date()) {
  return upcomingClosures(entries, now).map((c) => {
    const reason = trimReason(c.reason);
    return {
      ...(c.id ? { id: c.id } : {}),
      start: c.start,
      end: c.end,
      ...(reason ? { reason } : {}),
    };
  });
}

/** A closure window as text in the shop's zone: "24 Dec 2026" or "24 Dec 2026 – 26 Dec 2026". */
export function formatClosureRange(entry: ShopClosure, timeZone?: string, locale = 'en'): string {
  const tz = zoneOrDefault(timeZone);
  const fmt = (at: Date) =>
    new Intl.DateTimeFormat(locale, { timeZone: tz, day: 'numeric', month: 'short', year: 'numeric' }).format(at);
  const first = fmt(new Date(Date.parse(entry.start)));
  const last = fmt(new Date(Date.parse(entry.end) - 1));
  return first === last ? first : `${first} – ${last}`;
}
