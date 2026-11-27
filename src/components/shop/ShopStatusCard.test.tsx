// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { ShopStatusCard } from './ShopStatusCard';
import type { GetShopResultDto } from '../../services/api';
import en from '../../../public/locales/en/common.json';

const MESSAGE = "You can't switch the shop on yet: the checklist isn't complete.";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  updateShop: vi.fn(),
  fetchGoLiveStatus: vi.fn(),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../../features/orders/useNow', () => ({ useNow: () => Date.now() }));
vi.mock('../../services/api', () => ({
  useUpdateShopMutation: () => [mocks.updateShop, { isLoading: false }],
  useLazyGetGoLiveStatusQuery: () => [mocks.fetchGoLiveStatus, { isFetching: false }],
}));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

const shop = { id: 's1', name: 'Shop', isPaused: true, callerPermissions: ['manage_shop'] } as unknown as GetShopResultDto;

const setup = (allMet: boolean) => {
  mocks.fetchGoLiveStatus.mockReturnValue({ unwrap: () => Promise.resolve({ allMet, criteria: [] }) });
  mocks.updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <ShopStatusCard shop={shop} onRefetch={() => {}} />
      </MemoryRouter>
    </I18nextProvider>,
  );
  return screen.getByRole('switch', { name: 'Shop online' });
};

describe('ShopStatusCard online switch', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.updateShop.mockReset();
    mocks.fetchGoLiveStatus.mockReset();
  });
  afterEach(cleanup);

  it('with open items shows the tooltip, no navigation and no update', async () => {
    const sw = setup(false);
    fireEvent.click(sw);
    const tip = await screen.findByRole('status');
    expect(tip.textContent).toBe(`${MESSAGE}Checklist`);
    expect(within(tip).getByRole('link', { name: 'Checklist' }).getAttribute('href')).toBe('/shops/s1/go-live');
    expect(sw.getAttribute('aria-describedby')).toBe(`shop-online-help ${tip.id}`);
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.updateShop).not.toHaveBeenCalled();
  });

  it('closes on Escape and on an outside pointerdown', async () => {
    const sw = setup(false);
    fireEvent.click(sw);
    await screen.findByRole('status');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(sw.getAttribute('aria-describedby')).toBe('shop-online-help');

    fireEvent.click(sw);
    await screen.findByRole('status');
    fireEvent.pointerDown(sw);
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('with nothing open fetches the checklist then saves isPaused: false', async () => {
    fireEvent.click(setup(true));
    await waitFor(() => expect(mocks.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } }));
    expect(mocks.fetchGoLiveStatus).toHaveBeenCalledWith({ shopId: 's1' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
