// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastContext } from '../../contexts/ToastContext';
import type { IntakeOrder } from '../../services/ordersApi';
import { RefundPanel } from './RefundPanel';

// Resolve keys against the real English bundle so the test also proves the i18n key exists.
const en = JSON.parse(readFileSync('public/locales/en/common.json', 'utf-8')) as Record<string, unknown>;
const lookup = (key: string): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en);
  return typeof value === 'string' ? value : key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      lookup(key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? '')),
    i18n: { language: 'en' },
  }),
}));
vi.mock('../../services/ordersApi', () => ({
  useRefundOrderMutation: () => [vi.fn(), { isLoading: false }],
}));

afterEach(cleanup);

const order = {
  id: 'o1',
  orderRef: 'A1',
  currency: 'EUR',
  subtotalCents: 1000,
  totalCents: 1000,
  refundedCents: 0,
  refunds: [],
  items: [],
} as unknown as IntakeOrder;

function openPanel(o: IntakeOrder = order) {
  render(
    <ToastContext.Provider value={{ success: () => {}, error: () => {} }}>
      <RefundPanel shopId="s1" order={o} />
    </ToastContext.Provider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Refund' }));
  return screen.getByLabelText('Reason (for your records)') as HTMLInputElement;
}

describe('RefundPanel reason field', () => {
  it('marks the reason as required and shows a visible hint', () => {
    const reason = openPanel();
    expect(reason.required).toBe(true);
    expect(reason.getAttribute('aria-required')).toBe('true');
    const hint = screen.getByText('Required');
    const describedBy = reason.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(describedBy!.split(' ')).toContain(hint.id);
  });

  it('keeps the review button disabled until a reason is typed', () => {
    const reason = openPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Enter an amount' }));
    const review = screen.getByRole('button', { name: /^Refund .*\.\.\.$/ }) as HTMLButtonElement;
    expect(review.disabled).toBe(true);
    fireEvent.change(reason, { target: { value: 'Cold food' } });
    expect(review.disabled).toBe(false);
  });
});

describe('RefundPanel items exceeding the refundable max', () => {
  it('explains why submit is disabled when ticked items exceed what is left', () => {
    // 9,50 item, 2,00 already refunded as a free amount => 7,50 left
    const partlyRefunded = {
      ...order,
      subtotalCents: 950,
      totalCents: 950,
      refundedCents: 200,
      refunds: [],
      items: [{ productName: 'Burger', unitPriceCents: 950, quantity: 1 }],
    } as unknown as IntakeOrder;
    const reason = openPanel(partlyRefunded);
    fireEvent.change(reason, { target: { value: 'Cold food' } });
    expect(screen.queryByText(/can still be refunded/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    const message = screen.getByText(
      'The ticked items total more than can still be refunded (€7.50 left). Use "Enter an amount" instead.',
    );
    expect(message.className).toContain('text-red-600');
    const review = screen.getByRole('button', { name: /^Refund .*\.\.\.$/ }) as HTMLButtonElement;
    expect(review.disabled).toBe(true);
  });
});
