import type { ShopDataExportDto } from '../../services/legalApi';
import { toCsv } from './csv';

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function buildOrdersCsv(e: ShopDataExportDto): string {
  return toCsv(
    [
      'orderRef', 'createdAt', 'state', 'fulfilmentMode', 'paymentMethod', 'paymentStatus',
      'currency', 'subtotal', 'customerName', 'customerEmail', 'customerPhone', 'items',
    ],
    e.orders.map((o) => [
      o.orderRef,
      o.createdAt,
      o.state,
      o.fulfilmentMode,
      o.payment.method,
      o.payment.status,
      o.currency,
      centsToDecimal(o.subtotalCents),
      o.customerName,
      o.customerEmail,
      o.customerPhone,
      o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' | '),
    ]),
  );
}

export function buildCustomersCsv(e: ShopDataExportDto): string {
  return toCsv(
    ['name', 'email', 'phone', 'orderCount', 'firstOrderAt', 'lastOrderAt'],
    e.customers.map((c) => [c.name, c.email, c.phone, String(c.orderCount), c.firstOrderAt, c.lastOrderAt]),
  );
}
