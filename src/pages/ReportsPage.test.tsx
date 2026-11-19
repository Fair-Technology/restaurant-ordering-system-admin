// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ReportsPage } from './ReportsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => ({
    data: { timezone: 'Europe/Berlin', currency: 'EUR', slug: 'shop', callerPermissions: ['view_reports'] },
  }),
}));
vi.mock('../services/reportsApi', () => ({
  useGetSalesReportQuery: () => ({ data: undefined, isFetching: false, isError: false }),
}));
vi.mock('../services/subscriptionApi', () => ({
  useGetOrderLimitQuery: () => ({ data: undefined }),
}));

afterEach(cleanup);

function renderPage() {
  render(
    <MemoryRouter initialEntries={['/shops/s1/reports']}>
      <Routes>
        <Route path="/shops/:shopId/reports" element={<ReportsPage />} />
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
