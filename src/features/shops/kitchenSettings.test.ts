import { describe, expect, it } from 'vitest';
import { autoAcceptBody, autoAcceptChoiceOf, kitchenTimingBody, kitchenTimingOf, weekOf, WEEK_DAYS } from './kitchenSettings';

const W = {
  mon: [{ open: '09:00', close: '18:00' }],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
};

describe('kitchen settings helpers', () => {
  it('reads the auto-accept choice', () => {
    expect(autoAcceptChoiceOf(undefined)).toBe('always');
    expect(autoAcceptChoiceOf({ autoRejectMinutes: 10, alertEmail: null, autoAccept: false })).toBe('never');
    expect(autoAcceptChoiceOf({ autoRejectMinutes: 10, alertEmail: null, autoAccept: true, autoAcceptHours: null })).toBe('always');
    expect(autoAcceptChoiceOf({ autoRejectMinutes: 10, alertEmail: null, autoAccept: true, autoAcceptHours: W })).toBe('scheduled');
    expect(autoAcceptChoiceOf({ autoRejectMinutes: 10, alertEmail: null })).toBe('always');
  });

  it('builds the save body for each choice', () => {
    expect(autoAcceptBody('never', W)).toEqual({ autoAccept: false });
    expect(autoAcceptBody('always', W)).toEqual({ autoAccept: true, autoAcceptHours: null });
    expect(autoAcceptBody('scheduled', W)).toEqual({ autoAccept: true, autoAcceptHours: W });
  });

  it('fills in missing days', () => {
    expect(weekOf({ mon: [{ open: '09:00', close: '18:00' }] })).toEqual(W);
    const empty = weekOf(null);
    for (const d of WEEK_DAYS) expect(empty[d]).toEqual([]);
  });

  it('reads kitchen timing with defaults', () => {
    expect(kitchenTimingOf(undefined)).toEqual({ collection: 20, dineIn: 20, lastOrdersMinutes: null, busyExtraMinutes: 20 });
    expect(
      kitchenTimingOf({
        autoRejectMinutes: 10,
        alertEmail: null,
        prepMinutes: { collection: 25 },
        lastOrdersMinutes: 0,
        busyExtraMinutes: 30,
      }),
    ).toEqual({ collection: 25, dineIn: 20, lastOrdersMinutes: 0, busyExtraMinutes: 30 });
  });

  it('builds the kitchen timing body', () => {
    expect(kitchenTimingBody({ collection: 25, dineIn: 30, lastOrdersMinutes: null, busyExtraMinutes: 15 })).toEqual({
      prepMinutes: { collection: 25, dine_in: 30 },
      lastOrdersMinutes: null,
      busyExtraMinutes: 15,
    });
  });
});
