// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from './DashboardPage';

const tMock = vi.hoisted(() => vi.fn<(key: string, opts?: unknown) => string>((key) => key));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock, i18n: { language: 'en', exists: () => false } }),
}));
vi.mock('@azure/msal-react', () => ({ useMsal: () => ({ accounts: [] }) }));
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => undefined }));
vi.mock('../services/api', () => ({ useGetMyShopsQuery: () => ({ data: { shops: [] } }) }));
vi.mock('../services/reportsApi', () => ({
  useGetOwnerOverviewQuery: () => ({
    data: {
      truncated: false,
      combinedToday: null,
      shops: [
        {
          shopId: 's1',
          name: 'Shop',
          currency: 'EUR',
          isPaused: false,
          today: { takingsCents: 0, orderCount: 0 },
          waitingCount: 0,
          orderLimit: { acceptedOrderCount: 1, limit: 30, limitReached: false },
        },
      ],
    },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  tMock.mockClear();
});

describe('DashboardPage order-limit plural', () => {
  it('drives the plural form by the limit, not the used amount', () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );
    const call = tMock.mock.calls.find(([key]) => key === 'overview.limit');
    expect(call?.[1]).toEqual({ count: 30, used: 1, limit: 30 });
  });
});
