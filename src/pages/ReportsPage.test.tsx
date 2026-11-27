// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en', exists: () => false } }),
}));
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
  useGetOrderLimitQuery: () => ({ data: undefined }),
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
  vi.useRealTimers();
  reportQuery.current = { data: undefined, isFetching: false, isError: false };
  shopOverride.current = {};
});

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/shops/s1/dashboard']}>
      <Routes>
        <Route path="/shops/:shopId/dashboard" element={<ReportsPage />} />
      </Routes>
    </MemoryRouter>,
  );
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
