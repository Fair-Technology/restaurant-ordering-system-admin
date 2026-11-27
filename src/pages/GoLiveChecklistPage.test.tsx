// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { GoLiveChecklistPage } from './GoLiveChecklistPage';
import en from '../../public/locales/en/common.json';

const updateShop = vi.hoisted(() => vi.fn());
const toastSuccess = vi.hoisted(() => vi.fn());
const state = vi.hoisted(() => ({ shop: {} as Record<string, unknown>, status: {} as Record<string, unknown> }));

vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => ({ data: state.shop }),
  useGetGoLiveStatusQuery: () => ({ data: state.status }),
  useUpdateShopMutation: () => [updateShop, { isLoading: false }],
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: toastSuccess, error: vi.fn() }) }));
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => undefined }));

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
  toastSuccess.mockReset();
});

const setup = (met: boolean, permissions = ['manage_shop']) => {
  state.shop = { id: 's1', callerPermissions: permissions };
  state.status = {
    allMet: met,
    criteria: [
      { key: 'stripe_connected', met, description: 'x' },
      { key: 'has_products', met: true, description: 'x' },
    ],
  };
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/shops/s1/go-live']}>
        <Routes>
          <Route path="/shops/:shopId/go-live" element={<GoLiveChecklistPage />} />
          <Route path="/shops/:shopId/dashboard" element={<p>DASHBOARD</p>} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
};
const switchBtn = () => screen.getByRole('button', { name: en.shops.goLive.switchOnline }) as HTMLButtonElement;

describe('GoLiveChecklistPage', () => {
  it('renders the shared checklist with its progress bar and a disabled switch while steps are open', () => {
    setup(false);
    expect(screen.getByRole('progressbar')).toBeTruthy();
    expect(switchBtn().disabled).toBe(true);
  });

  it('enables the switch once everything is met', () => {
    setup(true);
    expect(switchBtn().disabled).toBe(false);
  });

  it('shows access denied without manage_shop', () => {
    setup(true, ['view_orders']);
    expect(screen.getByText(en.shops.membersAccessDenied)).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('switches online, toasts and goes to the dashboard', async () => {
    updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    setup(true);
    fireEvent.click(switchBtn());
    await waitFor(() => expect(screen.getByText('DASHBOARD')).toBeTruthy());
    expect(updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
    expect(toastSuccess).toHaveBeenCalledWith(en.shops.statusSaved);
  });

  it('stays on the page with an error when the switch fails', async () => {
    updateShop.mockReturnValue({ unwrap: () => Promise.reject(new Error('no')) });
    setup(true);
    fireEvent.click(switchBtn());
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('DASHBOARD')).toBeNull();
  });
});
