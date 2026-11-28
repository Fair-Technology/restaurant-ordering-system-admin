// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import en from '../../public/locales/en/common.json';
import { formatShopDate } from '../utils/locale';
import { PromotionsPage } from './PromotionsPage';

// Real English strings, so assertions read like what the owner sees.
function translate(key: string, opts?: Record<string, unknown>): string {
  const lookup = (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], en);
  let value = lookup(key);
  if (value === undefined && typeof opts?.count === 'number') value = lookup(`${key}_${opts.count === 1 ? 'one' : 'other'}`);
  if (typeof value !== 'string') return key;
  return value.replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(opts?.[name] ?? ''));
}

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate, i18n: { language: 'en' } }),
}));
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => {} }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));

const m = vi.hoisted(() => ({
  createCode: vi.fn(),
  setActive: vi.fn(),
  switching: { current: { isLoading: false, originalArgs: undefined as unknown } },
  shop: { current: { data: undefined as unknown, isLoading: false, isError: false } },
  vouchers: { current: { data: undefined as unknown, isLoading: false, isError: false } },
  promotions: { current: { data: undefined as unknown, isLoading: false, isError: false } },
}));
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => m.shop.current,
}));
vi.mock('../services/promotionsApi', () => ({
  useGetPromotionsQuery: () => m.promotions.current,
  useGetLoyaltyVouchersQuery: () => m.vouchers.current,
  useCreateDiscountCodeMutation: () => [(...a: unknown[]) => ({ unwrap: () => m.createCode(...a) }), { isLoading: false }],
  useSetDiscountCodeActiveMutation: () => [
    (...a: unknown[]) => ({ unwrap: () => m.setActive(...a) }),
    m.switching.current,
  ],
  useUpdateLoyaltyMutation: () => [vi.fn(), { isLoading: false }],
}));

const code = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  code: name,
  kind: 'percent',
  percent: 10,
  amountCents: null,
  minSubtotalCents: 0,
  validFrom: null,
  validUntil: null,
  totalLimit: null,
  perEmailLimit: null,
  uses: 0,
  active: true,
  ...over,
});

const loyalty = { enabled: false, everyOrders: 5, rewardCents: 500, validDays: 30, since: null };

const codes = () => [
  code('k1', 'SUMMER10'),
  code('k2', 'WINTER5', { active: false }),
  code('k3', 'LATER', { validFrom: '2999-01-01' }),
  code('k4', 'OLDONE', { validUntil: '2000-01-01' }),
  code('k5', 'ONCE', { totalLimit: 1, uses: 1 }),
];

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/shops/s1/promotions']}>
      <Routes>
        <Route path="/shops/:shopId/promotions" element={<PromotionsPage />} />
      </Routes>
    </MemoryRouter>,
  );

const rowsText = () =>
  within(screen.getByRole('table'))
    .getAllByRole('row')
    .slice(1)
    .map((r) => r.textContent ?? '');

beforeEach(() => {
  m.createCode.mockReset().mockResolvedValue({});
  m.setActive.mockReset().mockResolvedValue({});
  m.switching.current = { isLoading: false, originalArgs: undefined };
  m.shop.current = {
    data: { id: 's1', currency: 'EUR', timezone: 'Europe/Berlin', callerPermissions: ['manage_shop'] },
    isLoading: false,
    isError: false,
  };
  m.promotions.current = { data: { codes: codes(), loyalty }, isLoading: false, isError: false };
  m.vouchers.current = { data: { vouchers: [], total: 0, page: 1, pageSize: 20 }, isLoading: false, isError: false };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PromotionsPage', () => {
  it('shows live filter counts and filters the table', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /^All/ }).textContent).toContain('5');
    expect(screen.getByRole('button', { name: /^Active/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: /^Not started/ }).textContent).toContain('1');
    expect(screen.getByRole('button', { name: /^Expired or used up/ }).textContent).toContain('2');
    expect(screen.getByRole('button', { name: /^Off/ }).textContent).toContain('1');
    expect(rowsText()).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: /^Expired or used up/ }));
    const rows = rowsText();
    expect(rows).toHaveLength(2);
    expect(rows.join(' ')).toContain('OLDONE');
    expect(rows.join(' ')).toContain('ONCE');
  });

  it('searches by code, case-insensitively, combined with the filter', () => {
    renderPage();
    const box = screen.getByRole('searchbox', { name: 'Search codes' });
    fireEvent.change(box, { target: { value: 'on' } });
    expect(rowsText()).toHaveLength(2);
    expect(rowsText().join(' ')).toContain('ONCE');
    expect(rowsText().join(' ')).toContain('OLDONE');
    expect(rowsText().join(' ')).not.toContain('SUMMER10');

    fireEvent.click(screen.getByRole('button', { name: /^Off/ }));
    expect(screen.getByText('No codes match this filter.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('renders a real table with column headers and the switch names', () => {
    renderPage();
    const heads = screen.getAllByRole('columnheader').map((h) => h.textContent);
    expect(heads).toEqual(['Code', 'Discount', 'Min. order', 'Valid', 'Uses', 'Per customer', 'Status', 'On']);
    expect(screen.getByRole('switch', { name: 'Switch off SUMMER10' })).toBeTruthy();
    expect(screen.getByRole('switch', { name: 'Switch on WINTER5' })).toBeTruthy();
  });

  it('opens the drawer from the page header and closes it without asking when nothing was typed', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'New code' }));
    const dialog = screen.getByRole('dialog', { name: 'New code' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
    expect(m.createCode).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'New code' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('asks before discarding typing, and keeps the drawer when declined', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New code' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getAllByRole('textbox')[0], { target: { value: 'abc' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(confirm).toHaveBeenCalledWith(en.promotions.discardCodeConfirm);
    expect(screen.getByRole('dialog')).toBeTruthy();

    confirm.mockReturnValue(true);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('submits the drawer form through createDiscountCode', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'New code' }));
    const dialog = screen.getByRole('dialog');
    const [codeBox, valueBox] = within(dialog).getAllByRole('textbox');
    fireEvent.change(codeBox, { target: { value: 'save10' } });
    fireEvent.change(valueBox, { target: { value: '10' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Create code' }));
    await waitFor(() => expect(m.createCode).toHaveBeenCalledTimes(1));
    expect(m.createCode.mock.calls[0][0]).toEqual({
      shopId: 's1',
      body: {
        code: 'SAVE10',
        kind: 'percent',
        percent: 10,
        minSubtotalCents: 0,
        validFrom: null,
        validUntil: null,
        totalLimit: null,
        perEmailLimit: 1,
      },
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('the switch calls setDiscountCodeActive', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('switch', { name: 'Switch off SUMMER10' }));
    await waitFor(() => expect(m.setActive).toHaveBeenCalledTimes(1));
    expect(m.setActive.mock.calls[0][0]).toEqual({ shopId: 's1', codeId: 'k1', active: false });
  });

  it('shows a pending switch for the code being saved', () => {
    m.switching.current = { isLoading: true, originalArgs: { shopId: 's1', codeId: 'k1', active: false } };
    renderPage();
    const pending = screen.getByRole('switch', { name: 'Switch off SUMMER10' });
    expect(pending.getAttribute('data-pending')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Switch on WINTER5' }).getAttribute('data-pending')).toBeNull();
  });

  it('at 50 codes disables New code and gives the honest reason', () => {
    m.promotions.current = {
      data: { codes: Array.from({ length: 50 }, (_, i) => code(`k${i}`, `CODE${i}`)), loyalty },
      isLoading: false,
      isError: false,
    };
    renderPage();
    expect((screen.getByRole('button', { name: 'New code' }) as HTMLButtonElement).disabled).toBe(true);
    const reason = screen.getByText(/limit of 50 codes/);
    expect(reason.textContent).toBe("You've reached the limit of 50 codes.");
    expect(document.body.textContent).not.toContain('make room');
    expect(document.body.textContent).not.toContain('Switch an old one off');
    expect(screen.queryByText('Up to 50 codes.')).toBeNull();
  });

  it('keeps the plain footer under the limit, and the empty state with its own New code button', () => {
    renderPage();
    expect(screen.getByText('Up to 50 codes.')).toBeTruthy();
    cleanup();
    m.promotions.current = { data: { codes: [], loyalty }, isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText('No codes yet.')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
    const buttons = screen.getAllByRole('button', { name: 'New code' });
    expect(buttons).toHaveLength(2);
    fireEvent.click(buttons[1]);
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('always shows the loyalty consent note, on or off', () => {
    renderPage();
    expect(screen.getByText(en.promotions.loyaltyConsentNote)).toBeTruthy();
    expect(screen.getByText(en.promotions.loyaltyOffNote)).toBeTruthy();
    cleanup();
    m.promotions.current = { data: { codes: codes(), loyalty: { ...loyalty, enabled: true } }, isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText(en.promotions.loyaltyConsentNote)).toBeTruthy();
  });

  describe('issued loyalty vouchers', () => {
    const voucher = (code: string, over: Record<string, unknown> = {}) => ({
      code,
      amountCents: 500,
      issuedAt: '2026-03-05T10:00:00.000Z',
      expiresOn: '2999-01-01',
      used: false,
      orderRef: 'AB3-K7P',
      ...over,
    });
    const setVouchers = (vouchers: unknown[], enabled: boolean) => {
      m.promotions.current = { data: { codes: codes(), loyalty: { ...loyalty, enabled } }, isLoading: false, isError: false };
      m.vouchers.current = { data: { vouchers, total: vouchers.length, page: 1, pageSize: 20 }, isLoading: false, isError: false };
    };
    const heading = () => screen.queryByRole('heading', { name: en.promotions.loyaltyVouchersTitle });
    const voucherRows = () =>
      within(document.getElementById('loyalty-vouchers') as HTMLElement)
        .getAllByRole('row')
        .slice(1)
        .map((r) => r.textContent ?? '');

    it('renders code, value, issued, valid until, status and order in server order', () => {
      setVouchers([voucher('ZZZ-1'), voucher('AAA-2', { used: true, orderRef: 'XY9-Q2W' })], true);
      renderPage();
      const sec = within(document.getElementById('loyalty-vouchers') as HTMLElement);
      expect(sec.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
        'Code', 'Value', 'Issued', 'Valid until', 'Status', 'Order',
      ]);
      const rows = voucherRows();
      expect(rows).toHaveLength(2);
      expect(rows[0]).toContain('ZZZ-1');
      expect(rows[1]).toContain('AAA-2');
      expect(rows[0]).toContain('€5.00');
      expect(rows[0]).toContain('2999-01-01');
      expect(rows[0]).toContain('AB3-K7P');
      expect(rows[0]).toContain(formatShopDate('2026-03-05T10:00:00.000Z', 'en', undefined, undefined, 'Europe/Berlin'));
      expect(rows[1]).toContain('XY9-Q2W');
    });

    it('labels used, expired and active vouchers', () => {
      setVouchers(
        [voucher('USED', { used: true }), voucher('OLD', { expiresOn: '2000-01-01' }), voucher('LIVE')],
        true,
      );
      renderPage();
      const [used, old, live] = voucherRows();
      expect(used).toContain('used');
      expect(used).not.toContain('not used');
      expect(old).toContain('expired');
      expect(live).toContain('not used');
    });

    it('shows a placeholder when the order is unknown', () => {
      setVouchers([voucher('NOORD', { orderRef: null })], true);
      renderPage();
      const row = voucherRows()[0];
      expect(row).toContain('—');
      expect(row).not.toContain('null');
    });

    it('shows the empty state when loyalty is on and nothing was issued', () => {
      setVouchers([], true);
      renderPage();
      expect(heading()).toBeTruthy();
      expect(screen.getByText(en.promotions.loyaltyVouchersEmpty)).toBeTruthy();
    });

    it('is absent when loyalty is off and there are no vouchers', () => {
      setVouchers([], false);
      renderPage();
      expect(heading()).toBeNull();
      expect(screen.queryByText(en.promotions.loyaltyVouchersEmpty)).toBeNull();
    });

    it('is present with its rows when loyalty is off but vouchers exist', () => {
      setVouchers([voucher('KEEP-1')], false);
      renderPage();
      expect(heading()).toBeTruthy();
      expect(voucherRows()[0]).toContain('KEEP-1');
    });

    it('never renders customer details, even if the response carried them', () => {
      setVouchers([voucher('LEAK-1', { email: 'diner@example.com', customerName: 'Hannah Diner' })], true);
      renderPage();
      const text = document.getElementById('loyalty-vouchers')?.textContent ?? '';
      expect(text).toContain('LEAK-1');
      expect(text).not.toContain('diner@example.com');
      expect(text).not.toContain('Hannah');
    });
  });
});
