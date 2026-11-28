// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';
import i18next from 'i18next';
import en from '../../public/locales/en/common.json';
import de from '../../public/locales/de/common.json';

const tMock = vi.hoisted(() => vi.fn<(key: string, opts?: unknown) => string>((key) => key));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock, i18n: { language: 'en', exists: () => false } }),
}));
const limitQuery = vi.hoisted(() => ({ current: undefined as unknown }));
const shopOverride = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => ({
    data: {
      id: 's1',
      timezone: 'Europe/Berlin',
      currency: 'EUR',
      slug: 'shop',
      callerPermissions: ['view_reports'],
      ...shopOverride.current,
    },
  }),
  useGetGoLiveStatusQuery: () => ({
    data: { allMet: false, criteria: [{ key: 'stripe_connected', met: false, description: 'x' }] },
  }),
  useUpdateShopMutation: () => [vi.fn(), { isLoading: false }],
}));
const reportQuery = vi.hoisted(() => ({
  current: { data: undefined, isFetching: false, isError: false } as Record<string, unknown>,
}));
vi.mock('../services/reportsApi', () => ({
  useGetSalesReportQuery: () => ({ refetch: vi.fn(), ...reportQuery.current }),
}));
vi.mock('../services/subscriptionApi', () => ({
  useGetOrderLimitQuery: () => ({ data: limitQuery.current }),
}));

const REPORT = {
  from: '2026-02-01',
  to: '2026-02-10',
  currency: 'EUR',
  totals: { takingsCents: 12345, orderCount: 7, refundCents: 0, discountCents: 0, grossCents: 12345, deliveryFeeCents: 0, byRate: [] },
  days: [],
  byHour: Array(24).fill(0),
  byMode: [],
  topDishes: [],
};

afterEach(() => {
  cleanup();
  tMock.mockClear();
  limitQuery.current = undefined;
  vi.useRealTimers();
  reportQuery.current = { data: undefined, isFetching: false, isError: false };
  shopOverride.current = {};
});

function renderOnly() {
  render(
    <MemoryRouter initialEntries={['/shops/s1/dashboard']}>
      <Routes>
        <Route path="/shops/:shopId/dashboard" element={<ReportsPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderPage() {
  renderOnly();
  return { from: screen.getByLabelText('reports.from'), to: screen.getByLabelText('reports.to') };
}

describe('ReportsPage date range accessibility', () => {
  it('announces an invalid range and marks both inputs invalid', () => {
    const { from, to } = renderPage();
    fireEvent.change(from, { target: { value: '2026-02-10' } });
    fireEvent.change(to, { target: { value: '2026-02-01' } });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('reports.rangeInvalid');
    expect(alert.id).toBeTruthy();
    for (const input of [from, to]) {
      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe(alert.id);
    }
  });

  it('shows no alert and no invalid state for a valid range', () => {
    const { from, to } = renderPage();
    fireEvent.change(from, { target: { value: '2026-02-01' } });
    fireEvent.change(to, { target: { value: '2026-02-10' } });

    expect(screen.queryByRole('alert')).toBeNull();
    for (const input of [from, to]) {
      expect(input.getAttribute('aria-invalid')).not.toBe('true');
      expect(input.getAttribute('aria-describedby')).toBeNull();
    }
  });
});

describe('ReportsPage loading and error states', () => {
  it('shows an updating indicator while keeping the previous figures (dimmed)', () => {
    reportQuery.current = { data: REPORT, isFetching: true, isError: false };
    renderPage();

    const status = screen.getByRole('status');
    expect(status.textContent).toBe('reports.updating');
    const content = screen.getByTestId('reports-content');
    expect(content.className).toContain('opacity-60');
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows only the error, not the stale figures, when the request failed', () => {
    reportQuery.current = { data: REPORT, isFetching: false, isError: true };
    renderPage();

    expect(screen.getByRole('alert').textContent).toContain('reports.loadError');
    expect(screen.queryByTestId('reports-content')).toBeNull();
    expect(screen.queryByText('7')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('treats a request pending for 15s as a timeout and hides the stale figures', () => {
    vi.useFakeTimers();
    reportQuery.current = { data: REPORT, isFetching: true, isError: false };
    renderPage();
    expect(screen.getByTestId('reports-content')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(14_999);
    });
    expect(screen.queryByRole('alert')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('alert').textContent).toContain('reports.loadTimeout');
    expect(screen.queryByTestId('reports-content')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('ReportsPage keeps the last report on a range error', () => {
  it('keeps the figures and CSV button when the user picks a client-invalid range', () => {
    reportQuery.current = { data: REPORT, isFetching: false, isError: false };
    const { from, to } = renderPage();
    expect(screen.getByTestId('reports-content')).toBeTruthy();
    expect(screen.getByText('reports.downloadCsv')).toBeTruthy();

    // The query is skipped for an invalid range, so data goes away
    reportQuery.current = { data: undefined, isFetching: false, isError: false };
    fireEvent.change(from, { target: { value: '2026-02-10' } });
    fireEvent.change(to, { target: { value: '2026-02-01' } });

    expect(screen.getByRole('alert').textContent).toBe('reports.rangeInvalid');
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('reports.downloadCsv')).toBeTruthy();
    expect(screen.getByTestId('reports-content').className).toContain('opacity-60');
    expect((screen.getByRole('button', { name: /downloadCsv/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps the figures and CSV button when the server rejects the range with 400', () => {
    reportQuery.current = {
      data: REPORT,
      isFetching: false,
      isError: true,
      error: { status: 400, data: { error: 'from and to must be ...' } },
    };
    const { from, to } = renderPage();
    fireEvent.change(from, { target: { value: '2026-02-01' } });
    fireEvent.change(to, { target: { value: '2026-02-10' } });

    expect(screen.getByRole('alert').textContent).toBe('reports.rangeInvalid');
    expect(screen.queryByText('reports.loadError')).toBeNull();
    expect(screen.getByText('7')).toBeTruthy();
    expect(screen.getByText('reports.downloadCsv')).toBeTruthy();
    expect(screen.getByTestId('reports-content').className).toContain('opacity-60');
    expect((screen.getByRole('button', { name: /downloadCsv/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears the dimming and re-enables CSV once the range is valid again', () => {
    reportQuery.current = { data: REPORT, isFetching: false, isError: false };
    const { from, to } = renderPage();
    reportQuery.current = { data: undefined, isFetching: false, isError: false };
    fireEvent.change(from, { target: { value: '2026-02-10' } });
    fireEvent.change(to, { target: { value: '2026-02-01' } });
    expect(screen.getByTestId('reports-content').className).toContain('opacity-60');

    reportQuery.current = { data: REPORT, isFetching: false, isError: false };
    fireEvent.change(from, { target: { value: '2026-02-01' } });
    fireEvent.change(to, { target: { value: '2026-02-10' } });

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('reports-content').className).not.toContain('opacity-60');
    expect((screen.getByRole('button', { name: /downloadCsv/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});

describe('ReportsPage setup checklist', () => {
  it('shows the checklist for an offline shop the caller can manage', () => {
    shopOverride.current = { callerPermissions: ['view_reports', 'manage_shop'], isPaused: true };
    renderPage();
    expect(screen.getByText('reports.setupChecklist.oneLiner')).toBeTruthy();
  });

  it('hides the checklist for an online shop', () => {
    shopOverride.current = { callerPermissions: ['view_reports', 'manage_shop'], isPaused: false };
    renderPage();
    expect(screen.queryByText('reports.setupChecklist.oneLiner')).toBeNull();
  });
});

describe('ReportsPage order-limit plural', () => {
  it('drives the plural form by the limit, not the used amount', () => {
    reportQuery.current = { data: REPORT, isFetching: false, isError: false };
    limitQuery.current = { acceptedOrderCount: 1, limit: 30 };
    renderPage();
    const call = tMock.mock.calls.find(([key]) => key === 'reports.monthToDate');
    expect(call?.[1]).toEqual({ count: 30, used: 1, limit: 30 });
  });
});

describe('ReportsPage by-hour summary plurals', () => {
  async function renderWithRealT(lng: 'en' | 'de', byHour: number[]) {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng,
      resources: { en: { translation: en }, de: { translation: de } },
      interpolation: { escapeValue: false },
    });
    tMock.mockImplementation((key, opts) => i18n.t(key, opts as never) as unknown as string);
    reportQuery.current = { data: { ...REPORT, byHour }, isFetching: false, isError: false };
    renderOnly();
  }
  const hours = (entries: Record<number, number>) => {
    const arr = Array(24).fill(0);
    for (const [h, n] of Object.entries(entries)) arr[Number(h)] = n;
    return arr;
  };

  afterEach(() => tMock.mockImplementation((key) => key));

  it('uses singular for both total and peak (en)', async () => {
    await renderWithRealT('en', hours({ 3: 1 }));
    expect(screen.getByLabelText('Orders by hour: 1 order, peak 3:00 with 1 order')).toBeTruthy();
  });

  it('uses plural total and singular peak (en)', async () => {
    await renderWithRealT('en', hours({ 3: 1, 5: 1 }));
    expect(screen.getByLabelText('Orders by hour: 2 orders, peak 3:00 with 1 order')).toBeTruthy();
  });

  it('uses plural for both total and peak (en)', async () => {
    await renderWithRealT('en', hours({ 4: 2 }));
    expect(screen.getByLabelText('Orders by hour: 2 orders, peak 4:00 with 2 orders')).toBeTruthy();
  });

  it('uses singular for both total and peak (de)', async () => {
    await renderWithRealT('de', hours({ 3: 1 }));
    expect(screen.getByLabelText('Bestellungen nach Uhrzeit: 1 Bestellung, Spitze 3:00 mit 1 Bestellung')).toBeTruthy();
  });

  it('uses plural total and singular peak (de)', async () => {
    await renderWithRealT('de', hours({ 3: 1, 5: 1 }));
    expect(screen.getByLabelText('Bestellungen nach Uhrzeit: 2 Bestellungen, Spitze 3:00 mit 1 Bestellung')).toBeTruthy();
  });
});
