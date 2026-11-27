// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SetupChecklistCard } from './SetupChecklistCard';
import type { GetGoLiveStatusApiResponse, GetShopResultDto } from '../../services/api';
import en from '../../../public/locales/en/common.json';

const query = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../services/api', () => ({
  useGetGoLiveStatusQuery: () => query.current,
}));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
afterEach(cleanup);

const mk = (open: number) =>
  ({
    allMet: open === 0,
    criteria: [
      { key: 'stripe_connected', met: open < 1, description: 'x' },
      { key: 'has_products', met: open < 2, description: 'x' },
    ],
  }) as unknown as GetGoLiveStatusApiResponse;

const shop = { id: 's1', callerPermissions: ['manage_shop'] } as unknown as GetShopResultDto;
const renderCard = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <SetupChecklistCard shop={shop} />
      </MemoryRouter>
    </I18nextProvider>,
  );

describe('SetupChecklistCard', () => {
  it('renders nothing while loading', () => {
    query.current = { data: undefined, isLoading: true };
    renderCard();
    expect(document.body.textContent).toBe('');
  });

  it('is one link to the go-live page with the open count', () => {
    query.current = { data: mk(2) };
    renderCard();
    const link = screen.getByRole('link', { name: '2 steps left before you can go live' });
    expect(link.getAttribute('href')).toBe('/shops/s1/go-live');
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('uses singular copy for one open step', () => {
    query.current = { data: mk(1) };
    renderCard();
    expect(screen.getByText('1 step left before you can go live')).toBeTruthy();
  });

  it('says the shop is ready when nothing is open', () => {
    query.current = { data: mk(0) };
    renderCard();
    expect(screen.getByText(en.reports.setupChecklist.ready)).toBeTruthy();
  });
});
