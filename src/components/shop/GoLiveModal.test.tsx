// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GoLiveCriteriaModal } from './GoLiveModal';
import { goLiveFixLink } from '../../features/shops/goLiveFixLink';
import type { GetGoLiveStatusApiResponse } from '../../services/api';
import en from '../../../public/locales/en/common.json';

const known = vi.hoisted(() => new Set(['stripe_connected', 'has_categories']));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      exists: (key: string) => known.has(key.replace('shops.goLiveCriteria.', '')),
    },
  }),
}));

const status = {
  criteria: [
    { key: 'stripe_connected', met: false, description: 'RAW stripe' },
    { key: 'has_products', met: true, description: 'RAW products' },
    { key: 'has_categories', met: false, description: 'RAW categories' },
    { key: 'opening_hours', met: true, description: 'RAW hours' },
    { key: 'some_future_key', met: false, description: 'RAW future description' },
  ],
} as unknown as GetGoLiveStatusApiResponse;

const renderModal = () =>
  render(
    <MemoryRouter>
      <GoLiveCriteriaModal shopId="s1" status={status} onClose={vi.fn()} />
    </MemoryRouter>,
  );

afterEach(cleanup);

describe('GoLiveCriteriaModal', () => {
  it('renders one row per unmet criterion', () => {
    renderModal();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('links each row to its fix route', () => {
    renderModal();
    const rows = screen.getAllByRole('listitem');
    const keys = ['stripe_connected', 'has_categories', 'some_future_key'];
    rows.forEach((row, i) => {
      const link = row.querySelector('a');
      expect(link?.getAttribute('href')).toBe(goLiveFixLink('s1', keys[i]));
    });
  });

  it('translates known keys and falls back to the description for unknown ones', () => {
    renderModal();
    expect(screen.getByText('shops.goLiveCriteria.stripe_connected')).toBeTruthy();
    expect(screen.getByText('shops.goLiveCriteria.has_categories')).toBeTruthy();
    expect(screen.queryByText('RAW stripe')).toBeNull();
    expect(screen.getByText('RAW future description')).toBeTruthy();
  });

  it('ships a real English string for known keys', () => {
    const criteria = (en as { shops: { goLiveCriteria: Record<string, string> } }).shops.goLiveCriteria;
    expect(criteria.has_categories).toBe('Create at least one category');
  });
});
