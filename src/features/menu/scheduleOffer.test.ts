import { describe, expect, it } from 'vitest';
import { buildSchedulePayload } from './scheduleOffer';

const base = {
  enabled: true,
  startDate: '2026-01-01',
  endDate: '2026-02-01',
  startTime: '16:00',
  endTime: '18:00',
  daysOfWeek: [1, 2],
  timeWindowEnabled: true,
  noEndDate: false,
  offerEnabled: true,
  offerPrice: 500,
  offerLabel: 'Happy Hour',
  extraLanguage: 'en' as const,
  offerLabelTranslations: { en: 'Happy Hour' },
};

describe('buildSchedulePayload', () => {
  it('includes translations when offer on, extra language and label present', () => {
    expect(buildSchedulePayload(base)).toEqual({
      startDate: '2026-01-01',
      endDate: '2026-02-01',
      startTime: '16:00',
      endTime: '18:00',
      daysOfWeek: [1, 2],
      offerPrice: 500,
      offerLabel: 'Happy Hour',
      offerLabelTranslations: { en: 'Happy Hour' },
    });
  });

  it('omits translations without an extra language', () => {
    expect(buildSchedulePayload({ ...base, extraLanguage: undefined })).not.toHaveProperty('offerLabelTranslations');
  });

  it.each(['', '   '])('omits translations when label is %j', (offerLabel) => {
    const p = buildSchedulePayload({ ...base, offerLabel });
    expect(p).not.toHaveProperty('offerLabelTranslations');
    expect(p?.offerLabel).toBe(offerLabel === '' ? null : offerLabel);
  });

  it('omits translations and nulls offer fields when offer is off', () => {
    const p = buildSchedulePayload({ ...base, offerEnabled: false });
    expect(p).not.toHaveProperty('offerLabelTranslations');
    expect(p?.offerLabel).toBeNull();
    expect(p?.offerPrice).toBeNull();
  });

  it('returns null when schedule is disabled', () => {
    expect(buildSchedulePayload({ ...base, enabled: false })).toBeNull();
  });

  it('keeps existing date/time behaviour', () => {
    const p = buildSchedulePayload({ ...base, noEndDate: true, timeWindowEnabled: false });
    expect(p?.endDate).toBeNull();
    expect(p?.startTime).toBeNull();
    expect(p?.endTime).toBeNull();
    expect(buildSchedulePayload({ ...base, endDate: '' })?.endDate).toBeNull();
  });
});
