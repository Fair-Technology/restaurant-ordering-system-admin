import { describe, expect, it } from 'vitest';

import type { WeeklyHoursDto } from '../../services/ordersApi';
import { deliveryBody, deliveryFormOf, invalidZoneRows } from './deliverySettings';

const EMPTY_WEEK: WeeklyHoursDto = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
const WEEK: WeeklyHoursDto = { ...EMPTY_WEEK, mon: [{ open: '17:00', close: '22:00' }] };
const zone = (postcode: string) => ({ postcode, feeCents: 0, minOrderCents: 0 });

describe('delivery settings helpers', () => {
  it('reads the stored delivery settings', () => {
    expect(deliveryFormOf(undefined, 'food')).toEqual({
      delivery: false,
      ownHours: false,
      hours: EMPTY_WEEK,
      zones: [],
      feeTaxClassId: 'food',
    });
    expect(
      deliveryFormOf(
        {
          autoRejectMinutes: 10,
          alertEmail: null,
          delivery: true,
          deliveryZones: [{ postcode: '10115', feeCents: 250, minOrderCents: 1500 }],
          deliveryHours: WEEK,
          deliveryFeeTaxClassId: 'beverage',
        },
        'food',
      ),
    ).toEqual({
      delivery: true,
      ownHours: true,
      hours: WEEK,
      zones: [{ postcode: '10115', feeCents: 250, minOrderCents: 1500 }],
      feeTaxClassId: 'beverage',
    });
  });

  it('builds the save body', () => {
    const form = {
      delivery: true,
      ownHours: false,
      hours: WEEK,
      zones: [{ postcode: ' 10 115', feeCents: 250, minOrderCents: 1500 }],
      feeTaxClassId: 'food',
    };
    const expected = {
      delivery: true,
      deliveryHours: null,
      deliveryZones: [{ postcode: '10115', feeCents: 250, minOrderCents: 1500 }],
      deliveryFeeTaxClassId: 'food',
    };
    expect(deliveryBody(form)).toEqual(expected);
    expect(deliveryBody({ ...form, ownHours: true })).toEqual({ ...expected, deliveryHours: WEEK });
  });

  it('marks bad and repeated postcodes', () => {
    expect(invalidZoneRows([zone('10115'), zone('1011'), zone('10 115'), zone('01067')], 'DE')).toEqual([1, 2]);
    expect(invalidZoneRows([zone('A-1010')], 'AT')).toEqual([]);
  });
});
