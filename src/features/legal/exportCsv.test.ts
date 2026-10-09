import { describe, expect, it } from 'vitest';

import type { ShopDataExportDto } from '../../services/legalApi';
import { buildCustomersCsv, buildOrdersCsv } from './exportCsv';

const base = {
  formatVersion: 1,
  exportedAt: '2026-10-05T00:00:00Z',
  shop: {},
  categories: [],
  products: [],
  orders: [],
  customers: [],
} as unknown as ShopDataExportDto;

describe('export CSVs', () => {
  it('orders CSV columns and comma decimals', () => {
    const csv = buildOrdersCsv({
      ...base,
      orders: [
        {
          id: 'o1',
          orderRef: 'AB3-K7P',
          createdAt: '2026-10-01T10:00:00Z',
          state: 'COMPLETED',
          fulfilmentMode: 'collection',
          payment: { method: 'cash', status: 'cash_collected', stripePaymentIntentId: null },
          currency: 'EUR',
          subtotalCents: 1250,
          customerName: 'Anna',
          customerEmail: 'a@x.example',
          customerPhone: '1',
          items: [{ productName: 'Carbonara', quantity: 2 }],
        },
      ],
    });
    expect(csv.split('\r\n')[1]).toBe(
      'AB3-K7P;2026-10-01T10:00:00Z;COMPLETED;collection;cash;cash_collected;EUR;12,50;Anna;a@x.example;1;;2× Carbonara;;12,50;;;',
    );
  });

  it('orders CSV adds the delivery fee, total and address', () => {
    const csv = buildOrdersCsv({
      ...base,
      orders: [
        {
          id: 'o3', orderRef: 'EF5-N9R', createdAt: '2026-10-01T10:00:00Z', state: 'COMPLETED',
          fulfilmentMode: 'delivery', payment: { method: 'card', status: 'paid', stripePaymentIntentId: null },
          currency: 'EUR', subtotalCents: 1050, totalCents: 1300,
          charges: [{ kind: 'delivery_fee', grossCents: 250 }],
          deliveryAddress: { street: 'Teststraße 1', postcode: '10115', city: 'Berlin' },
          customerName: 'Cy', customerEmail: 'c@x.example', customerPhone: '3',
          items: [],
        },
      ],
    });
    expect(csv.split('\r\n')[1]).toMatch(/;2,50;13,00;Teststraße 1, 10115 Berlin;;$/);
  });

  it('orders CSV lists the discount', () => {
    const csv = buildOrdersCsv({
      ...base,
      orders: [
        {
          id: 'o3', orderRef: 'CD5-M2N', createdAt: '2026-10-01T10:00:00Z', state: 'COMPLETED',
          fulfilmentMode: 'collection',
          payment: { method: 'cash', status: 'cash_collected', stripePaymentIntentId: null },
          currency: 'EUR', subtotalCents: 1400, totalCents: 1260,
          discount: { code: 'WELCOME10', cents: 140 },
          customerName: 'Di', customerEmail: 'd@x.example', customerPhone: '4',
          items: [],
        },
      ],
    });
    expect(csv.split('\r\n')[1]).toMatch(/;WELCOME10;1,40$/);
  });

  it('orders CSV writes the diner address on one line', () => {
    const csv = buildOrdersCsv({
      ...base,
      orders: [
        {
          id: 'o2', orderRef: 'CD4-M8Q', createdAt: '2026-10-01T10:00:00Z', state: 'COMPLETED',
          fulfilmentMode: 'delivery', payment: { method: 'card', status: 'paid', stripePaymentIntentId: null },
          currency: 'EUR', subtotalCents: 500, customerName: 'Ben', customerEmail: 'b@x.example', customerPhone: '2',
          customerAddress: { street: 'Hauptstr. 1', postcode: '10115', city: 'Berlin', country: 'Deutschland' },
          items: [],
        },
      ],
    });
    expect(csv.split('\r\n')[1]).toContain(';Hauptstr. 1, 10115 Berlin, Deutschland;');
  });

  it('customers CSV', () => {
    const csv = buildCustomersCsv({
      ...base,
      customers: [
        {
          name: 'Anna B',
          email: 'anna@example.com',
          phone: '222',
          orderCount: 2,
          firstOrderAt: '2026-10-01T10:00:00Z',
          lastOrderAt: '2026-10-02T10:00:00Z',
        },
      ],
    });
    expect(csv.split('\r\n')[1]).toBe('Anna B;anna@example.com;222;2;2026-10-01T10:00:00Z;2026-10-02T10:00:00Z');
  });
});
