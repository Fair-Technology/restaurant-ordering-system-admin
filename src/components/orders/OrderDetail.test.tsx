// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ToastContext } from '../../contexts/ToastContext';
import type { IntakeOrder } from '../../services/ordersApi';
import { OrderDetail, type DetailKind } from './OrderDetail';

// Resolve keys against the real bundles so the test also proves the i18n keys exist in both languages.
const bundles = {
  en: JSON.parse(readFileSync('public/locales/en/common.json', 'utf-8')) as Record<string, unknown>,
  de: JSON.parse(readFileSync('public/locales/de/common.json', 'utf-8')) as Record<string, unknown>,
};
let lang: 'en' | 'de' = 'en';
const lookup = (key: string): string => {
  const value = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], bundles[lang]);
  return typeof value === 'string' ? value : key;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      lookup(key).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? '')),
    i18n: { language: lang },
  }),
}));
vi.mock('../../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../services/api')>()),
  useLazyGetOrderDocumentQuery: () => [vi.fn()],
}));
vi.mock('./RefundPanel', () => ({ RefundPanel: () => null }));

afterEach(cleanup);

const baseOrder = {
  id: 'o1',
  orderRef: 'A1',
  state: 'PLACED',
  mode: 'collection',
  currency: 'EUR',
  subtotalCents: 1000,
  totalCents: 1000,
  refundedCents: 0,
  refunds: [],
  items: [],
  documents: [],
  createdAt: '2026-11-28T10:00:00.000Z',
  scheduledFor: null,
} as unknown as IntakeOrder;

function setup(kind: DetailKind, order: Partial<IntakeOrder> = {}) {
  const actions = {
    accept: vi.fn().mockResolvedValue(true),
    reject: vi.fn().mockResolvedValue(true),
    advance: vi.fn().mockResolvedValue(true),
    isWorking: () => false,
  };
  const o = { ...baseOrder, ...order } as IntakeOrder;
  render(
    <ToastContext.Provider value={{ success: () => {}, error: () => {} }}>
      <OrderDetail
        shopId="s1"
        order={o}
        kind={kind}
        nowMs={Date.parse('2026-11-28T10:05:00.000Z')}
        timeZone="UTC"
        defaultPrepMinutes={15}
        permissions={[]}
        actions={actions}
        onClose={() => {}}
      />
    </ToastContext.Provider>,
  );
  return { actions, order: o };
}

describe.each(['en', 'de'] as const)('OrderDetail decline flow (%s)', (language) => {
  const text = (key: string) => {
    lang = language;
    return lookup(key);
  };
  const decline = () => screen.queryByRole('button', { name: text('orders.reject') });
  const why = () => screen.queryByText(text('orders.live.rejectWhy'));

  const upcoming = { state: 'ACCEPTED', scheduledFor: '2026-11-29T12:00:00.000Z' } as Partial<IntakeOrder>;

  it('upcoming: shows Decline first, no reasons and no Accept', () => {
    lang = language;
    setup('upcoming', upcoming);
    expect(decline()).not.toBeNull();
    expect(why()).toBeNull();
    expect(screen.queryByRole('button', { name: /Accept|Annehmen/i })).toBeNull();
  });

  it('upcoming: Decline reveals reasons, Cancel returns and clears the reason', () => {
    lang = language;
    setup('upcoming', upcoming);
    fireEvent.click(decline()!);
    expect(why()).not.toBeNull();
    expect(decline()).toBeNull();
    const chip = screen.getByRole('button', { name: text('orders.rejectReason.too_busy') });
    fireEvent.click(chip);
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: text('orders.cancel') }));
    expect(why()).toBeNull();
    expect(decline()).not.toBeNull();
    fireEvent.click(decline()!);
    expect(screen.getByRole('button', { name: text('orders.rejectReason.too_busy') }).getAttribute('aria-pressed')).toBe('false');
  });

  it('upcoming: picking a reason and confirming calls actions.reject', () => {
    lang = language;
    const { actions, order } = setup('upcoming', upcoming);
    fireEvent.click(decline()!);
    const confirm = screen.getByRole('button', { name: text('orders.live.rejectOrder') }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: text('orders.rejectReason.closing_soon') }));
    fireEvent.click(confirm);
    expect(actions.reject).toHaveBeenCalledWith(order, 'closing_soon');
  });

  it('live waiting: Decline first, reasons after click, Cancel works', () => {
    lang = language;
    setup('live');
    expect(why()).toBeNull();
    fireEvent.click(decline()!);
    expect(why()).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: text('orders.cancel') }));
    expect(why()).toBeNull();
    expect(decline()).not.toBeNull();
  });
});
