import { describe, expect, it } from 'vitest';

import {
  canRefund,
  itemSelectionCents,
  parseAmountToCents,
  refundableCents,
  remainingQuantities,
  selectionToItems,
} from './refunds';

const paid = { state: 'COMPLETED', paymentStatus: 'paid', subtotalCents: 1000, refundedCents: 0 };

describe('refund helpers', () => {
  it('turns a typed amount into cents', () => {
    expect(parseAmountToCents('3,50')).toBe(350);
    expect(parseAmountToCents('3.50')).toBe(350);
    expect(parseAmountToCents('10')).toBe(1000);
    expect(parseAmountToCents('1,5')).toBe(150);
    for (const bad of ['abc', '-1', '3,505', '0', '', '1,2,3', '1.2,3', '1,000.00']) {
      expect(parseAmountToCents(bad)).toBeNull();
    }
  });

  it('who may refund what', () => {
    expect(canRefund(paid, ['refund_orders'])).toBe(true);
    expect(canRefund(paid, ['view_orders'])).toBe(false);
    expect(canRefund({ ...paid, state: 'PLACED' }, ['refund_orders'])).toBe(false);
    expect(canRefund({ ...paid, paymentStatus: 'refunded', refundedCents: 1000 }, ['refund_orders'])).toBe(false);
    expect(canRefund({ ...paid, paymentStatus: 'authorized' }, ['refund_orders'])).toBe(false);
    expect(canRefund({ ...paid, paymentStatus: 'not_paid_online' }, ['refund_orders'])).toBe(false);
    expect(
      canRefund({ ...paid, paymentStatus: 'partially_refunded', refundedCents: 700 }, ['refund_orders']),
    ).toBe(true);
  });

  it('refundable amount', () => {
    expect(refundableCents({ subtotalCents: 1000, refundedCents: 250 })).toBe(750);
  });

  it('counts what is left on each line', () => {
    expect(
      remainingQuantities({
        items: [{ quantity: 1 }, { quantity: 2 }],
        refunds: [{ lines: [{ lineIndex: 1, quantity: 1 }] }, { lines: [] }],
      }),
    ).toEqual([1, 1]);
  });

  it('adds up the ticked items', () => {
    const order = { items: [{ unitPriceCents: 1050 }, { unitPriceCents: 350 }] };
    expect(itemSelectionCents(order, { 1: 1 })).toBe(350);
    expect(itemSelectionCents(order, { 0: 1, 1: 2 })).toBe(1750);
    expect(itemSelectionCents(order, {})).toBe(0);
  });

  it('turns the selection into request items', () => {
    expect(selectionToItems({ 1: 1, 0: 0, 3: 2 })).toEqual([
      { lineIndex: 1, quantity: 1 },
      { lineIndex: 3, quantity: 2 },
    ]);
  });
});
