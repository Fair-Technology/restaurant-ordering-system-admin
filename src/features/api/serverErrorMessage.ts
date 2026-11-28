import { formatCents } from '../../utils/money';
import { isNetworkError, isTimeoutError, apiErrorMessage } from './errorMessage';

type T = (key: string, opts?: Record<string, unknown>) => string;

interface ServerErrorData {
  error?: string;
  errorCode?: unknown;
  field?: unknown;
  max?: unknown;
  requestedCents?: unknown;
  availableCents?: unknown;
}

export interface ServerErrorMoney {
  currency: string;
  language: string;
}

const EXISTS = new Set([
  'CATEGORY_NAME_EXISTS',
  'DISCOUNT_CODE_EXISTS',
  'SHOP_NAME_EXISTS',
  'STAFF_USERNAME_TAKEN',
  'SHOP_SLUG_TAKEN',
  'PLAN_KEY_EXISTS',
]);

const LIMIT = new Set([
  'DISCOUNT_CODE_MAX_REACHED',
  'SHOP_LIMIT_REACHED',
  'STAFF_LIMIT_REACHED',
  'DOWNGRADE_BLOCKED_STAFF',
]);

const CONCURRENT = new Set(['SETTINGS_CHANGED_CONCURRENTLY', 'PROMOTIONS_CHANGED_CONCURRENTLY']);

const titleCase = (s: string) =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());

function isFieldValidation(code: string): boolean {
  return code.endsWith('_INVALID') || code.endsWith('_REQUIRED');
}

/**
 * Localized message for an RTK Query error, built from the backend's stable
 * `errorCode` (+ `field`, `max`, cents). The raw English `data.error` sentence is never shown:
 * an unrecognised code gives the translated generic message. `fallback` is used only when
 * the error carries no response body at all (network/timeout keep their own messages).
 */
export function translateServerError(
  err: unknown,
  t: T,
  fallback: string,
  fieldLabel?: (key: string) => string | undefined,
  money?: ServerErrorMoney,
): string {
  const data = (err as { data?: ServerErrorData } | null | undefined)?.data;
  if (!data || typeof data !== 'object') {
    return isNetworkError(err) || isTimeoutError(err) ? apiErrorMessage(err, fallback) : fallback;
  }
  const code = data.errorCode;
  if (typeof code !== 'string') return t('errors.generic');

  const fieldKey = typeof data.field === 'string' ? data.field : undefined;
  const field = fieldKey ? (fieldLabel?.(fieldKey) ?? titleCase(fieldKey)) : undefined;
  const max = data.max;

  if (EXISTS.has(code)) return field ? t('errors.exists', { field }) : t('errors.existsNoField');
  if (LIMIT.has(code)) return typeof max === 'number' ? t('errors.limitReached', { max }) : t('errors.generic');
  if (CONCURRENT.has(code)) return t('errors.changedConcurrently');

  switch (code) {
    case 'REFUND_EXCEEDS_UNREFUNDED': {
      const { requestedCents, availableCents } = data;
      if (typeof requestedCents !== 'number' || typeof availableCents !== 'number') return t('errors.generic');
      const fmt = (c: number) => formatCents(c, money?.currency ?? 'EUR', money?.language ?? 'en');
      return t('errors.refundExceeds', { requested: fmt(requestedCents), available: fmt(availableCents) });
    }
    case 'REFUND_FAILED':
      return t('errors.refundFailed');
    default:
      if (isFieldValidation(code)) return field ? t('errors.fieldInvalid', { field }) : t('errors.generic');
      return t('errors.generic');
  }
}
