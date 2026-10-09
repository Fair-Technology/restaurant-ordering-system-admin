import { describe, expect, it } from 'vitest';

import {
  canRefund,
  chargedCents,
  comboLineGroup,
  itemSelectionCents,
  parseAmountToCents,
  refundableCents,
  remainingQuantities,
  selectionToItems,
  setLineQuantity,
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

  it('a discounted line refunds what was paid for it', () => {
    const items = [
      { unitPriceCents: 1050, quantity: 1, lineTotalCents: 1050, discountCents: 250 },
      { unitPriceCents: 350, quantity: 2, lineTotalCents: 700, discountCents: 133 },
    ];
    expect(itemSelectionCents({ items, refunds: [] }, { 1: 1 })).toBe(283);
    expect(itemSelectionCents({ items, refunds: [{ lines: [{ lineIndex: 1, quantity: 1 }] }] }, { 1: 1 })).toBe(284);
    expect(itemSelectionCents({ items, refunds: [] }, { 0: 1, 1: 2 })).toBe(1367);
  });

  it('turns the selection into request items', () => {
    expect(selectionToItems({ 1: 1, 0: 0, 3: 2 })).toEqual([
      { lineIndex: 1, quantity: 1 },
      { lineIndex: 3, quantity: 2 },
    ]);
  });

  it('refundable amount includes the delivery fee', () => {
    expect(refundableCents({ subtotalCents: 1050, totalCents: 1300, refundedCents: 1050 })).toBe(250);
    expect(
      canRefund(
        { state: 'OUT_FOR_DELIVERY', paymentStatus: 'paid', subtotalCents: 1050, totalCents: 1300, refundedCents: 0 },
        ['refund_orders'],
      ),
    ).toBe(true);
    expect(chargedCents({ subtotalCents: 1050 })).toBe(1050);
  });
});

describe('combo lines in the refund panel', () => {
  const items = [
    { comboInstanceId: 'c1' },
    { comboInstanceId: 'c1' },
    {},
    { comboInstanceId: 'c2' },
  ];

  it('a combo line finds the other lines of its combo', () => {
    expect(comboLineGroup(items, 0)).toEqual([0, 1]);
    expect(comboLineGroup(items, 1)).toEqual([0, 1]);
    expect(comboLineGroup(items, 2)).toEqual([2]);
    expect(comboLineGroup(items, 3)).toEqual([3]);
  });

  it('ticking one line of a combo ticks all of them, and unticking clears all', () => {
    const left = [2, 2, 1, 2];
    const ticked = setLineQuantity(items, left, {}, 1, 1);
    expect(ticked).toEqual({ 0: 1, 1: 1 });
    expect(setLineQuantity(items, left, ticked, 0, 0)).toEqual({ 0: 0, 1: 0 });
    expect(setLineQuantity(items, left, ticked, 2, 1)).toEqual({ 0: 1, 1: 1, 2: 1 });
  });

  it('is capped by the combo line with the least left', () => {
    expect(setLineQuantity(items, [2, 1, 1, 2], {}, 0, 2)).toEqual({ 0: 1, 1: 1 });
  });
});
