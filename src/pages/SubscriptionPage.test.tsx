// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { OrdersRefundNote, PlanCard } from './SubscriptionPage';
import type { Plan } from '../services/api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { plan?: string }) => (opts?.plan ? `${key}:${opts.plan}` : key),
    i18n: { language: 'en' },
  }),
}));

const pricing = vi.hoisted(() => ({ data: [] as unknown[] }));
vi.mock('../services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/api')>()),
  useGetPlanPricingQuery: () => ({ data: pricing.data }),
}));

const plan = {
  id: 'p1',
  name: 'Pro',
  internalKey: 'pro',
  isDefault: false,
  isVisible: true,
  sortOrder: 2,
  limits: [],
  createdAt: '',
  updatedAt: '',
} as Plan;

const renderCard = () =>
  render(
    <PlanCard
      plan={plan}
      index={1}
      currency="EUR"
      countryCode="DE"
      interval="monthly"
      isCurrentPlan={false}
      action="upgrade"
      isCancelPending={false}
      isOwner
      onChoose={vi.fn()}
      isBusy={false}
    />,
  );

afterEach(cleanup);

describe('PlanCard CTA', () => {
  it('shows a not-available message and no button when no price matches the currency', () => {
    pricing.data = [{ currency: 'USD', monthlyAmountCents: 1000, yearlyAmountCents: 10000 }];
    renderCard();
    expect(screen.getByText('subscription.notAvailableInCurrency')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows no button when the matched price amount is 0', () => {
    pricing.data = [{ currency: 'EUR', monthlyAmountCents: 0, yearlyAmountCents: 0 }];
    renderCard();
    expect(screen.getByText('subscription.notAvailableInCurrency')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('still renders the clickable upgrade button when a price exists', () => {
    pricing.data = [{ currency: 'EUR', monthlyAmountCents: 1000, yearlyAmountCents: 10000 }];
    renderCard();
    expect(screen.getByRole('button', { name: 'subscription.upgradeTo:Pro' })).toBeTruthy();
    expect(screen.queryByText('subscription.notAvailableInCurrency')).toBeNull();
  });
});

describe('OrdersRefundNote', () => {
  it('renders the refund note text', () => {
    render(<OrdersRefundNote text="Accepted orders count, even if they are refunded later." />);
    expect(screen.getByText('Accepted orders count, even if they are refunded later.')).toBeTruthy();
  });
});
