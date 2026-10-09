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

// What the diner paid for the ticked units. A discounted line refunds its paid share, with the same
// rounding as the server (what is paid for k units is floor(paid * k / quantity)).
export function itemSelectionCents(
  o: {
    items: ReadonlyArray<{ unitPriceCents: number; quantity?: number; lineTotalCents?: number; discountCents?: number }>;
    refunds?: ReadonlyArray<{ lines: ReadonlyArray<{ lineIndex: number; quantity: number }> }>;
  },
  selection: Readonly<Record<number, number>>,
): number {
  const already = (index: number) =>
    (o.refunds ?? []).reduce(
      (sum, r) => sum + r.lines.filter((l) => l.lineIndex === index).reduce((t, l) => t + l.quantity, 0),
      0,
    );
  return Object.entries(selection).reduce((sum, [key, count]) => {
    const index = Number(key);
    const item = o.items[index];
    if (!item) return sum;
    const quantity = item.quantity;
    if (!item.discountCents || !quantity) return sum + item.unitPriceCents * count;
    const paid = (item.lineTotalCents ?? item.unitPriceCents * quantity) - item.discountCents;
    const paidFor = (units: number) => Math.floor((paid * units) / quantity);
    const from = already(index);
    return sum + paidFor(from + count) - paidFor(from);
  }, 0);
}

export function selectionToItems(
  selection: Readonly<Record<number, number>>,
): Array<{ lineIndex: number; quantity: number }> {
  return Object.entries(selection)
    .map(([index, quantity]) => ({ lineIndex: Number(index), quantity }))
    .filter((line) => line.quantity > 0)
    .sort((a, b) => a.lineIndex - b.lineIndex);
}

// Lines that belong to one combo share a comboInstanceId. A combo is refunded whole, so these lines move together.
export function comboLineGroup(items: ReadonlyArray<{ comboInstanceId?: string }>, index: number): number[] {
  const id = items[index]?.comboInstanceId;
  if (!id) return [index];
  return items.flatMap((item, i) => (item.comboInstanceId === id ? [i] : []));
}

// Sets the ticked quantity of a line; for a combo line the same quantity goes to every line of that combo,
// capped by the line with the least left.
export function setLineQuantity(
  items: ReadonlyArray<{ comboInstanceId?: string }>,
  left: readonly number[],
  selection: Readonly<Record<number, number>>,
  index: number,
  quantity: number,
): Record<number, number> {
  const group = comboLineGroup(items, index);
  const cap = Math.min(...group.map((i) => left[i] ?? 0));
  const next = { ...selection };
  for (const i of group) next[i] = Math.min(Math.max(0, quantity), cap);
  return next;
}
