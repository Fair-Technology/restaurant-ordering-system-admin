import type { CategorySchedule } from '../../services/api';

/** Days in the order a German or English week is read: Monday first. 0 = Sunday, as the API counts. */
export const WEEK_DAYS = [1, 2, 3, 4, 5, 6, 0];

export const DEFAULT_SCHEDULE: CategorySchedule = { daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:30', endTime: '14:30' };

/** Short weekday name, e.g. "Mo" / "Mon". 4 January 2026 was a Sunday. */
export function dayName(day: number, language: string): string {
  return new Intl.DateTimeFormat(language, { weekday: 'short' })
    .format(new Date(Date.UTC(2026, 0, 4 + day, 12)))
    .replace(/\.$/, '');
}

/** True when the schedule can be saved: a day picked and the end after the start. */
export function isScheduleValid(s: CategorySchedule): boolean {
  return s.daysOfWeek.length > 0 && /^\d\d:\d\d$/.test(s.startTime) && /^\d\d:\d\d$/.test(s.endTime) && s.endTime > s.startTime;
}

/** "Mo–Fr · 11:30–14:30": runs of consecutive days are joined with a dash. */
export function formatSchedule(s: CategorySchedule, language: string): string {
  const picked = WEEK_DAYS.filter((d) => s.daysOfWeek.includes(d));
  const runs: number[][] = [];
  for (const d of picked) {
    const last = runs[runs.length - 1];
    if (last && WEEK_DAYS.indexOf(d) === WEEK_DAYS.indexOf(last[last.length - 1]) + 1) last.push(d);
    else runs.push([d]);
  }
  const days = runs
    .map((r) => (r.length > 2 ? `${dayName(r[0], language)}–${dayName(r[r.length - 1], language)}` : r.map((d) => dayName(d, language)).join(', ')))
    .join(', ');
  return `${days} · ${s.startTime}–${s.endTime}`;
}
