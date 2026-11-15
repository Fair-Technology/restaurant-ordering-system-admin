import type { GetShopResultDto } from '../../services/api';

/** Only the shop's owner may download a month's receipts (the backend enforces this too). */
export function canDownloadMonthlyReceipts(
  callerRole: GetShopResultDto['callerRole'] | undefined,
): boolean {
  return callerRole === 'owner';
}

/** The restaurant's local month ('YYYY-MM') at `now` — the form the archive endpoint expects. */
export function receiptMonthIn(timeZone: string, now: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value ?? '';
  const month = parts.find((part) => part.type === 'month')?.value ?? '';
  return `${year}-${month}`;
}

export type ReceiptsArchiveErrorKind = 'empty' | 'forbidden' | 'failed';

/** 404 means the month holds no documents; 403 means the caller is not the owner. */
export function receiptsArchiveErrorKind(error: unknown): ReceiptsArchiveErrorKind {
  const status =
    typeof error === 'object' && error !== null ? (error as { status?: unknown }).status : undefined;
  if (status === 404) return 'empty';
  if (status === 403) return 'forbidden';
  return 'failed';
}
