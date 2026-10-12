import { describe, expect, it } from 'vitest';
import { formatSchedule, isScheduleValid } from './categorySchedule';

describe('category schedule', () => {
  it('joins weekdays into a range', () => {
    expect(formatSchedule({ daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:30', endTime: '14:30' }, 'de')).toBe('Mo–Fr · 11:30–14:30');
    expect(formatSchedule({ daysOfWeek: [1, 2, 3, 4, 5], startTime: '11:30', endTime: '14:30' }, 'en')).toBe('Mon–Fri · 11:30–14:30');
  });
  it('lists separate days, with Sunday last', () => {
    expect(formatSchedule({ daysOfWeek: [0, 6], startTime: '10:00', endTime: '15:00' }, 'en')).toBe('Sat, Sun · 10:00–15:00');
    expect(formatSchedule({ daysOfWeek: [1, 3], startTime: '10:00', endTime: '15:00' }, 'en')).toBe('Mon, Wed · 10:00–15:00');
  });
  it('needs a day and an end after the start', () => {
    expect(isScheduleValid({ daysOfWeek: [], startTime: '10:00', endTime: '15:00' })).toBe(false);
    expect(isScheduleValid({ daysOfWeek: [1], startTime: '15:00', endTime: '15:00' })).toBe(false);
    expect(isScheduleValid({ daysOfWeek: [1], startTime: '10:00', endTime: '15:00' })).toBe(true);
  });
});
