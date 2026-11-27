// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OrderLimitBanner } from './OrderLimitBanner';

const tMock = vi.hoisted(() => vi.fn<(key: string, opts?: unknown) => string>((key) => key));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: tMock, i18n: { language: 'en', exists: () => false } }),
}));
vi.mock('../../services/subscriptionApi', () => ({
  useGetOrderLimitQuery: () => ({
    data: {
      acceptedOrderCount: 1,
      limit: 30,
      warningLevel: 80,
      limitReached: false,
      payment: { inGrace: false, graceEndsAt: null, droppedForNonPayment: false },
    },
  }),
}));

afterEach(() => {
  cleanup();
  tMock.mockClear();
});

describe('OrderLimitBanner plural', () => {
  it('drives the plural form by the limit, not the used amount', () => {
    render(
      <MemoryRouter>
        <OrderLimitBanner shopId="s1" canManageBilling />
      </MemoryRouter>,
    );
    const call = tMock.mock.calls.find(([key]) => key === 'orderLimit.bannerWarning');
    expect(call?.[1]).toEqual({ count: 30, used: 1, limit: 30, percent: 80 });
  });
});
