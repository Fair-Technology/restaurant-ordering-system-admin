// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { SetupChecklistCard } from './SetupChecklistCard';
import type { GetGoLiveStatusApiResponse, GetShopResultDto } from '../../services/api';
import en from '../../../public/locales/en/common.json';

const updateShop = vi.hoisted(() => vi.fn());
const query = vi.hoisted(() => ({ current: {} as Record<string, unknown> }));
vi.mock('../../services/api', () => ({
  useGetGoLiveStatusQuery: () => query.current,
  useUpdateShopMutation: () => [updateShop, { isLoading: false }],
}));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});
afterEach(() => {
  cleanup();
  updateShop.mockReset();
});

const mk = (met: boolean) =>
  ({
    allMet: met,
    criteria: [
      { key: 'stripe_connected', met, description: 'x' },
      { key: 'has_products', met: true, description: 'x' },
    ],
  }) as unknown as GetGoLiveStatusApiResponse;

const shop = { id: 's1', callerPermissions: ['manage_shop'] } as unknown as GetShopResultDto;
const renderCard = (onRefetch = vi.fn()) => {
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <SetupChecklistCard shop={shop} onRefetch={onRefetch} />
      </MemoryRouter>
    </I18nextProvider>,
  );
  return onRefetch;
};
const switchBtn = () => screen.getByRole('button', { name: en.shops.goLive.switchOnline });

describe('SetupChecklistCard', () => {
  it('renders nothing while loading', () => {
    query.current = { data: undefined, isLoading: true };
    renderCard();
    expect(document.body.textContent).toBe('');
  });

  it('shows the checklist and a disabled button when criteria are unmet', () => {
    query.current = { data: mk(false) };
    renderCard();
    expect(screen.getByText(en.reports.setupChecklist.title)).toBeTruthy();
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect((switchBtn() as HTMLButtonElement).disabled).toBe(true);
  });

  it('switches online and refetches when all criteria are met', async () => {
    query.current = { data: mk(true) };
    updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    const onRefetch = renderCard();
    fireEvent.click(switchBtn());
    await waitFor(() => expect(onRefetch).toHaveBeenCalled());
    expect(updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
  });

  it('shows an error alert and stays rendered when the mutation fails', async () => {
    query.current = { data: mk(true) };
    updateShop.mockReturnValue({ unwrap: () => Promise.reject(new Error('no')) });
    const onRefetch = renderCard();
    fireEvent.click(switchBtn());
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(onRefetch).not.toHaveBeenCalled();
    expect(screen.getByText(en.reports.setupChecklist.title)).toBeTruthy();
  });
});
