import { describe, expect, it } from 'vitest';

import { isValidRange, rangeFor, todayIn } from './reportRange';

describe('reportRange', () => {
  it("today is the restaurant's date", () => {
    expect(todayIn('Europe/Berlin', new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05');
  });

  it('presets', () => {
    const today = '2026-10-05';
    expect(rangeFor('today', today)).toEqual({ from: '2026-10-05', to: '2026-10-05' });
    expect(rangeFor('yesterday', today)).toEqual({ from: '2026-10-04', to: '2026-10-04' });
    expect(rangeFor('last7', today)).toEqual({ from: '2026-09-29', to: '2026-10-05' });
    expect(rangeFor('thisMonth', today)).toEqual({ from: '2026-10-01', to: '2026-10-05' });
    expect(rangeFor('lastMonth', today)).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(rangeFor('lastMonth', '2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(rangeFor('lastMonth', '2026-01-10')).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  });

  it("custom ranges follow the server's rules", () => {
    expect(isValidRange('2026-10-06', '2026-10-05')).toBe(false);
    expect(isValidRange('2026-01-01', '2026-04-02')).toBe(true);
    expect(isValidRange('2026-01-01', '2026-04-03')).toBe(false);
    expect(isValidRange('2026-02-30', '2026-03-01')).toBe(false);
  });
});
