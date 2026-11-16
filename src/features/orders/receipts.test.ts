import { describe, expect, it } from 'vitest';

import { canDownloadMonthlyReceipts, receiptMonthIn, receiptsArchiveErrorKind } from './receipts';

describe('monthly receipts download', () => {
  it('lets only the owner download', () => {
    expect(canDownloadMonthlyReceipts('owner')).toBe(true);
    expect(canDownloadMonthlyReceipts('manager')).toBe(false);
    expect(canDownloadMonthlyReceipts('staff')).toBe(false);
    expect(canDownloadMonthlyReceipts('superadmin')).toBe(false);
    expect(canDownloadMonthlyReceipts(undefined)).toBe(false);
  });

  it('reads the month in the restaurant time zone', () => {
    // 02:00 UTC on 1 November is still 31 October in New York
    const now = new Date('2026-11-01T02:00:00Z');
    expect(receiptMonthIn('Europe/Berlin', now)).toBe('2026-11');
    expect(receiptMonthIn('America/New_York', now)).toBe('2026-10');
  });

  it('maps the archive errors to the message to show', () => {
    expect(receiptsArchiveErrorKind({ status: 404 })).toBe('empty');
    expect(receiptsArchiveErrorKind({ status: 403 })).toBe('forbidden');
    expect(receiptsArchiveErrorKind({ status: 500 })).toBe('failed');
    expect(receiptsArchiveErrorKind(undefined)).toBe('failed');
  });
});
