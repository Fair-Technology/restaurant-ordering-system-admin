// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { StateBadge } from './OrderBadges';

// Resolve keys against the real English bundle so the test also proves the i18n keys exist.
const en = JSON.parse(readFileSync('public/locales/en/common.json', 'utf-8')) as Record<string, unknown>;
const lookup = (key: string): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof value === 'string' ? value : key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => lookup(key), i18n: { language: 'en' } }),
}));

afterEach(cleanup);

type Props = Parameters<typeof StateBadge>[0]['order'];
const base: Props = { displayState: 'COMPLETED', paymentStatus: 'paid', refundedCents: 0, refunds: [] };
const refund = (reversal: boolean) => ({ amountCents: 500, reason: '', at: '', lines: [], reversal }) as Props['refunds'][number];

describe('StateBadge', () => {
  it('shows Completed and Refunded side by side for a fully refunded completed order', () => {
    render(<StateBadge order={{ ...base, paymentStatus: 'refunded', refundedCents: 500, refunds: [refund(false)] }} />);
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Refunded')).toBeTruthy();
  });

  it('shows Partly refunded for a partial refund', () => {
    render(<StateBadge order={{ ...base, paymentStatus: 'partially_refunded', refundedCents: 200, refunds: [refund(false)] }} />);
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText('Partly refunded')).toBeTruthy();
  });

  it('shows Refund failed, not Refunded, when the last refund was reversed', () => {
    render(<StateBadge order={{ ...base, refunds: [refund(true)] }} />);
    expect(screen.getByText('Refund failed')).toBeTruthy();
    expect(screen.queryByText('Refunded')).toBeNull();
  });

  it('shows only the state pill for a plain paid order', () => {
    const { container } = render(<StateBadge order={base} />);
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(container.querySelectorAll('span span')).toHaveLength(1);
  });
});
