// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { DeliveryCard } from './DeliveryCard';
import en from '../../../public/locales/en/common.json';
import de from '../../../public/locales/de/common.json';

const h = vi.hoisted(() => ({ lang: 'en', dicts: {} as Record<string, unknown> }));
h.dicts = { en, de };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], h.dicts[h.lang]);
      return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k])) : key;
    },
    i18n: { language: h.lang },
  }),
}));
vi.mock('../../services/ordersApi', () => ({
  useUpdateOrderSettingsMutation: () => [vi.fn(), { isLoading: false }],
}));

function renderCard(postcode: string) {
  const shop = {
    id: 's1',
    countryCode: 'DE',
    orderSettings: { delivery: true, deliveryZones: [{ postcode, feeCents: 250, minOrderCents: 1500 }] },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render(<DeliveryCard shop={shop as any} refs={undefined} onRefetch={vi.fn()} />);
}

afterEach(cleanup);

function expectDistinctInputs(fee: string, min: string, postcode: string) {
  const feeInput = screen.getByLabelText(fee);
  const minInput = screen.getByLabelText(min);
  const postcodeInput = screen.getByLabelText(postcode);
  for (const el of [feeInput, minInput, postcodeInput]) expect(el.tagName).toBe('INPUT');
  expect(feeInput).not.toBe(minInput);
  expect(feeInput).not.toBe(postcodeInput);
  expect(minInput).not.toBe(postcodeInput);
}

describe('DeliveryCard input labels', () => {
  it('names fee and min-order inputs per postcode (en)', () => {
    h.lang = 'en';
    renderCard('12345');
    expectDistinctInputs('Delivery fee for postcode 12345', 'Minimum order for postcode 12345', 'Postcode');
  });

  it('names fee and min-order inputs per postcode (de)', () => {
    h.lang = 'de';
    renderCard('12345');
    expectDistinctInputs('Liefergebühr für Postleitzahl 12345', 'Mindestbestellwert für Postleitzahl 12345', 'Postleitzahl');
  });

  it('falls back to the new-postcode name when the postcode is empty', () => {
    h.lang = 'en';
    renderCard('');
    expect(screen.getByLabelText('Delivery fee for postcode new postcode').tagName).toBe('INPUT');
    expect(screen.getByLabelText('Minimum order for postcode new postcode').tagName).toBe('INPUT');
  });
});
