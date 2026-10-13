import { describe, expect, it } from 'vitest';

import type { WeeklyHoursDto } from '../../services/ordersApi';
import { defaultDeliveryFeeTaxClassId, deliveryBody, deliveryFeeVat, deliveryFormOf, invalidZoneRows } from './deliverySettings';

const EMPTY_WEEK: WeeklyHoursDto = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
const WEEK: WeeklyHoursDto = { ...EMPTY_WEEK, mon: [{ open: '17:00', close: '22:00' }] };
const zone = (postcode: string) => ({ postcode, feeCents: 0, minOrderCents: 0 });

describe('delivery settings helpers', () => {
  it('reads the stored delivery settings', () => {
    expect(deliveryFormOf(undefined)).toEqual({
      delivery: false,
      ownHours: false,
      hours: EMPTY_WEEK,
      zones: [],
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
      ),
    ).toEqual({
      delivery: true,
      ownHours: true,
      hours: WEEK,
      zones: [{ postcode: '10115', feeCents: 250, minOrderCents: 1500 }],
    });
  });

  it('builds the save body', () => {
    const form = {
      delivery: true,
      ownHours: false,
      hours: WEEK,
      zones: [{ postcode: ' 10 115', feeCents: 250, minOrderCents: 1500 }],
    };
    const expected = {
      delivery: true,
      deliveryHours: null,
      deliveryZones: [{ postcode: '10115', feeCents: 250, minOrderCents: 1500 }],
    };
    expect(deliveryBody(form)).toEqual(expected);
    expect(deliveryBody({ ...form, ownHours: true })).toEqual({ ...expected, deliveryHours: WEEK });
  });

  it('never sends a fee tax class, whatever the stored settings hold', () => {
    const form = deliveryFormOf({
      autoRejectMinutes: 10,
      alertEmail: null,
      delivery: true,
      deliveryFeeTaxClassId: 'food',
    });
    expect('deliveryFeeTaxClassId' in deliveryBody(form)).toBe(false);
  });

  const E = (id: string, isActive = true) => ({ id, labels: { de: id === 'delivery' ? 'Lieferung' : id, en: id === 'delivery' ? 'Delivery' : id }, isActive });

  it('the fee class is the active Delivery class, else the country default', () => {
    expect(defaultDeliveryFeeTaxClassId({ taxClasses: [E('food'), E('delivery')], defaultTaxClassId: 'food' })).toBe('delivery');
    expect(defaultDeliveryFeeTaxClassId({ taxClasses: [E('food'), E('delivery', false)], defaultTaxClassId: 'food' })).toBe('food');
    expect(defaultDeliveryFeeTaxClassId({ taxClasses: [E('food')], defaultTaxClassId: 'food' })).toBe('food');
  });

  it('names the fee class and its delivery rate in the owner language', () => {
    const refs = {
      taxClasses: [E('food'), E('delivery')],
      defaultTaxClassId: 'food',
      currentTaxRates: [
        { taxClassId: 'food', rates: { collection: 700, delivery: 700, dine_in: 700 } },
        { taxClassId: 'delivery', rates: { collection: 1900, delivery: 1900, dine_in: 1900 } },
      ],
    };
    expect(deliveryFeeVat(refs, 'de')).toEqual({ name: 'Lieferung', rate: '19 %' });
    expect(deliveryFeeVat(refs, 'en')).toEqual({ name: 'Delivery', rate: '19%' });
    expect(deliveryFeeVat({ ...refs, taxClasses: [], defaultTaxClassId: null }, 'en')).toBeNull();
  });

  it('marks bad and repeated postcodes', () => {
    expect(invalidZoneRows([zone('10115'), zone('1011'), zone('10 115'), zone('01067')], 'DE')).toEqual([1, 2]);
    expect(invalidZoneRows([zone('A-1010')], 'AT')).toEqual([]);
  });
});
