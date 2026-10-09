export const REPORT_PRESETS = ['today', 'yesterday', 'last7', 'thisMonth', 'lastMonth'] as const;
export type ReportPreset = (typeof REPORT_PRESETS)[number];
export const REPORT_MAX_DAYS = 92;

/** 'YYYY-MM-DD' plus n calendar days. */
export function addDays(date: string, n: number): string {
  return new Date(Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)) + n))
    .toISOString()
    .slice(0, 10);
}

/** The restaurant's calendar date at `now`. */
export function todayIn(timeZone: string, now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function rangeFor(preset: ReportPreset, today: string): { from: string; to: string } {
  switch (preset) {
    case 'today':
      return { from: today, to: today };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { from: y, to: y };
    }
    case 'last7':
      return { from: addDays(today, -6), to: today };
    case 'thisMonth':
      return { from: `${today.slice(0, 7)}-01`, to: today };
    case 'lastMonth': {
      const end = addDays(`${today.slice(0, 7)}-01`, -1);
      return { from: `${end.slice(0, 7)}-01`, to: end };
    }
  }
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isRealDate = (s: string) => DATE.test(s) && addDays(s, 0) === s;

/** Same rules as the server: real dates, from not after to, at most 92 days inclusive. */
export function isValidRange(from: string, to: string): boolean {
  if (!isRealDate(from) || !isRealDate(to) || from > to) return false;
  const span = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000 + 1;
  return span <= REPORT_MAX_DAYS;
}
