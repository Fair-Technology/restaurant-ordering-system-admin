import { formatCents } from '../../utils/money';
import { parseAmountToCents } from '../orders/refunds';
import type { CreateDiscountCodeBody, DiscountCodeDto, LoyaltyVoucherDto } from '../../services/promotionsApi';

export type CodeStatus = 'active' | 'off' | 'scheduled' | 'expired' | 'used_up';

export function codeStatus(
  c: Pick<DiscountCodeDto, 'active' | 'validFrom' | 'validUntil' | 'totalLimit' | 'uses'>,
  today: string,
): CodeStatus {
  if (!c.active) return 'off';
  if (c.validUntil && today > c.validUntil) return 'expired';
  if (c.totalLimit !== null && c.uses >= c.totalLimit) return 'used_up';
  if (c.validFrom && today < c.validFrom) return 'scheduled';
  return 'active';
}

export const LOYALTY_VOUCHERS_PAGE_SIZE = 20;

export type LoyaltyVoucherStatus = 'used' | 'expired' | 'active';

export function loyaltyVoucherStatus(
  v: Pick<LoyaltyVoucherDto, 'used' | 'expiresOn'>,
  today: string,
): LoyaltyVoucherStatus {
  if (v.used) return 'used';
  if (today > v.expiresOn) return 'expired';
  return 'active';
}

export function codeValueLabel(
  c: Pick<DiscountCodeDto, 'kind' | 'percent' | 'amountCents'>,
  currency: string,
  language: string,
): string {
  return c.kind === 'percent' ? `${c.percent} %` : formatCents(c.amountCents ?? 0, currency, language);
}

export interface CodeForm {
  code: string;
  kind: 'percent' | 'amount';
  value: string;
  minOrder: string;
  validFrom: string;
  validUntil: string;
  totalLimit: string;
  perEmailLimit: string;
}

export type CodeFormError = 'code' | 'value' | 'minOrder' | 'dates' | 'totalLimit' | 'perEmailLimit';

// whole number from 1 to hi, null when empty, 'bad' otherwise
function wholeOrEmpty(text: string, hi: number): number | null | 'bad' {
  const s = text.trim();
  if (s === '') return null;
  return /^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= hi ? Number(s) : 'bad';
}

export function codeFormToBody(f: CodeForm): CreateDiscountCodeBody | { error: CodeFormError } {
  const code = f.code.trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,20}$/.test(code) || code.startsWith('L-')) return { error: 'code' };

  let value: Pick<CreateDiscountCodeBody, 'percent' | 'amountCents'>;
  if (f.kind === 'percent') {
    const p = /^\d{1,3}$/.test(f.value.trim()) ? Number(f.value.trim()) : NaN;
    if (!(p >= 1 && p <= 100)) return { error: 'value' };
    value = { percent: p };
  } else {
    const cents = parseAmountToCents(f.value);
    if (cents === null || cents > 10000) return { error: 'value' };
    value = { amountCents: cents };
  }

  const min = f.minOrder.trim() === '' ? 0 : parseAmountToCents(f.minOrder);
  if (min === null || min > 100000) return { error: 'minOrder' };

  const from = f.validFrom || null;
  const until = f.validUntil || null;
  if (from && until && until < from) return { error: 'dates' };

  const total = wholeOrEmpty(f.totalLimit, 100000);
  if (total === 'bad') return { error: 'totalLimit' };
  const perEmail = wholeOrEmpty(f.perEmailLimit, 100);
  if (perEmail === 'bad') return { error: 'perEmailLimit' };

  return {
    code,
    kind: f.kind,
    ...value,
    minSubtotalCents: min,
    validFrom: from,
    validUntil: until,
    totalLimit: total,
    perEmailLimit: perEmail,
  };
}

/** Today's date in the restaurant's calendar, 'YYYY-MM-DD'. */
export function shopToday(timeZone: string, nowMs: number): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(nowMs));
}

/** The most discount codes a shop can have (the server refuses more). */
export const CODES_LIMIT = 50;

export function codesLimitReached(count: number): boolean {
  return count >= CODES_LIMIT;
}

/** How many codes customers can use right now. */
export function activeCodeCount(
  codes: Array<Pick<DiscountCodeDto, 'active' | 'validFrom' | 'validUntil' | 'totalLimit' | 'uses'>>,
  today: string,
): number {
  return codes.filter((c) => codeStatus(c, today) === 'active').length;
}

export const EMPTY_CODE_FORM: CodeForm = {
  code: '',
  kind: 'percent',
  value: '',
  minOrder: '',
  validFrom: '',
  validUntil: '',
  totalLimit: '',
  perEmailLimit: '1',
};

/** True when any field differs from the empty form (so closing it would lose typing). */
export function isCodeFormDirty(form: CodeForm): boolean {
  return (Object.keys(EMPTY_CODE_FORM) as Array<keyof CodeForm>).some((key) => form[key] !== EMPTY_CODE_FORM[key]);
}

/** What the loyalty status line says, from the saved rule: off, or on with its count and reward. */
export function loyaltyStatus(
  loyalty: { enabled: boolean; everyOrders: number; rewardCents: number },
): { enabled: false } | { enabled: true; every: number; rewardCents: number } {
  return loyalty.enabled
    ? { enabled: true, every: loyalty.everyOrders, rewardCents: loyalty.rewardCents }
    : { enabled: false };
}

export type CodeFilter = 'all' | 'active' | 'scheduled' | 'ended' | 'off';
export const CODE_FILTERS: CodeFilter[] = ['all', 'active', 'scheduled', 'ended', 'off'];

export function matchesCodeFilter(status: CodeStatus, filter: CodeFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'ended') return status === 'expired' || status === 'used_up';
  return status === filter;
}

/** What the "Valid" column says: always/from/until/range, plus whether it's the dimmed "Always" case. */
export type ValidLabel =
  | { kind: 'always' }
  | { kind: 'from'; date: string }
  | { kind: 'until'; date: string }
  | { kind: 'range'; from: string; until: string };

export function validLabel(c: Pick<DiscountCodeDto, 'validFrom' | 'validUntil'>): ValidLabel {
  if (c.validFrom && c.validUntil) return { kind: 'range', from: c.validFrom, until: c.validUntil };
  if (c.validFrom) return { kind: 'from', date: c.validFrom };
  if (c.validUntil) return { kind: 'until', date: c.validUntil };
  return { kind: 'always' };
}
