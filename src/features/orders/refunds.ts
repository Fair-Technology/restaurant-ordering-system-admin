export const PAYMENT_STATUSES = [
  'authorized',
  'paid',
  'partially_refunded',
  'refunded',
  'canceled',
  'not_paid_online',
] as const;

const REFUNDABLE_STATES = ['ACCEPTED', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED'];
const REFUNDABLE_PAYMENT_STATUSES = ['paid', 'partially_refunded'];

// '3,50' / '3.50' / '10' -> cents, whatever the UI language (owners in Germany type a comma even in
// the English admin); anything that is not a positive amount with at most two decimals -> null
export function parseAmountToCents(text: string): number | null {
  const [whole, fraction, ...rest] = text.trim().split(/[.,]/);
  if (rest.length > 0 || !/^\d+$/.test(whole ?? '')) return null;
  if (fraction !== undefined && !/^\d{1,2}$/.test(fraction)) return null;
  const cents = Number(whole) * 100 + Number((fraction ?? '').padEnd(2, '0') || '0');
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** What the diner paid: dishes plus delivery fee. Orders from before delivery have no totalCents. */
export function chargedCents(o: { subtotalCents: number; totalCents?: number }): number {
  return o.totalCents ?? o.subtotalCents;
}

export function refundableCents(o: { subtotalCents: number; totalCents?: number; refundedCents: number }): number {
  return Math.max(0, chargedCents(o) - o.refundedCents);
}

export function canRefund(
  o: { state: string; paymentStatus: string; subtotalCents: number; totalCents?: number; refundedCents: number },
  permissions: readonly string[],
): boolean {
  return (
    permissions.includes('refund_orders') &&
    REFUNDABLE_STATES.includes(o.state) &&
    REFUNDABLE_PAYMENT_STATUSES.includes(o.paymentStatus) &&
    refundableCents(o) > 0
  );
}

// per line: ordered quantity minus what earlier item refunds already covered (free-amount refunds have no lines)
export function remainingQuantities(o: {
  items: ReadonlyArray<{ quantity: number }>;
  refunds: ReadonlyArray<{ lines: ReadonlyArray<{ lineIndex: number; quantity: number }> }>;
}): number[] {
  const left = o.items.map((item) => item.quantity);
  for (const refund of o.refunds) {
    for (const line of refund.lines) {
      if (line.lineIndex in left) left[line.lineIndex] -= line.quantity;
    }
  }
  return left.map((n) => Math.max(0, n));
}

export function itemSelectionCents(
  o: { items: ReadonlyArray<{ unitPriceCents: number }> },
  selection: Readonly<Record<number, number>>,
): number {
  return Object.entries(selection).reduce(
    (sum, [index, quantity]) => sum + (o.items[Number(index)]?.unitPriceCents ?? 0) * quantity,
    0,
  );
}

export function selectionToItems(
  selection: Readonly<Record<number, number>>,
): Array<{ lineIndex: number; quantity: number }> {
  return Object.entries(selection)
    .map(([index, quantity]) => ({ lineIndex: Number(index), quantity }))
    .filter((line) => line.quantity > 0)
    .sort((a, b) => a.lineIndex - b.lineIndex);
}
