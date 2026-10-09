import type { ExportOrder, ShopDataExportDto } from '../../services/legalApi';
import { toCsv } from './csv';

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export function formatAddress(a: ExportOrder['customerAddress']): string {
  if (!a) return '';
  const cityLine = [a.postcode, a.city].filter(Boolean).join(' ');
  return [a.street, cityLine, a.country].filter(Boolean).join(', ');
}

export function formatDeliveryAddress(a: ExportOrder['deliveryAddress']): string {
  return a ? `${a.street}, ${a.postcode} ${a.city}` : '';
}

function deliveryFeeOf(o: ExportOrder): string {
  const fee = (o.charges ?? []).filter((c) => c.kind === 'delivery_fee');
  return fee.length === 0 ? '' : centsToDecimal(fee.reduce((sum, c) => sum + c.grossCents, 0));
}

export function buildOrdersCsv(e: ShopDataExportDto): string {
  return toCsv(
    [
      'orderRef', 'createdAt', 'state', 'fulfilmentMode', 'paymentMethod', 'paymentStatus',
      'currency', 'subtotal', 'customerName', 'customerEmail', 'customerPhone', 'customerAddress', 'items',
      'deliveryFee', 'total', 'deliveryAddress', 'discountCode', 'discount',
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
      formatAddress(o.customerAddress),
      o.items.map((i) => `${i.quantity}× ${i.productName}`).join(' | '),
      deliveryFeeOf(o),
      centsToDecimal(o.totalCents ?? o.subtotalCents),
      formatDeliveryAddress(o.deliveryAddress),
      o.discount?.code ?? '',
      o.discount ? centsToDecimal(o.discount.cents) : '',
    ]),
  );
}

export function buildCustomersCsv(e: ShopDataExportDto): string {
  return toCsv(
    ['name', 'email', 'phone', 'orderCount', 'firstOrderAt', 'lastOrderAt'],
    e.customers.map((c) => [c.name, c.email, c.phone, String(c.orderCount), c.firstOrderAt, c.lastOrderAt]),
  );
}
