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
      'AB3-K7P;2026-10-01T10:00:00Z;COMPLETED;collection;cash;cash_collected;EUR;12,50;Anna;a@x.example;1;2× Carbonara',
    );
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
