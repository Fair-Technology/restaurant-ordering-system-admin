import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

/**
 * The backend's literal error sentence for a platform-wide Stripe-key failure, returned as HTTP 409 with only
 * `error` in the body (no machine-readable `code`), so we match on the sentence itself.
 * Source: rs-backend `src/domain/order/orderErrors.ts` (PAYMENT_CONFIG_UNAVAILABLE_ERROR), mapped by
 * `src/functions/_shared/mapResultToHttp.ts` case CONFLICT. A `code` field in that body would be the durable
 * fix — that is a backend follow-up, not part of this change.
 */
export const PAYMENT_CONFIG_UNAVAILABLE_ERROR =
  'The payment service refused the request because of a platform setup problem, not the card. The order is still waiting and nothing was charged — try again once the platform has fixed it.';

/** True when a failed order action is the platform's broken-payment-setup conflict, not a changed order. */
export function isPaymentConfigConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { status, data } = error as FetchBaseQueryError;
  if (status !== 409) return false;
  if (typeof data !== 'object' || data === null) return false;
  return (data as { error?: unknown }).error === PAYMENT_CONFIG_UNAVAILABLE_ERROR;
}
