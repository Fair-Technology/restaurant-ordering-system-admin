// @vitest-environment jsdom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { Sidebar } from './Sidebar';
import en from '../../../public/locales/en/common.json';

const MESSAGE = "You can't switch the shop on yet: the checklist isn't complete.";

const mocks = vi.hoisted(() => ({
  shop: undefined as unknown,
  goLive: undefined as unknown,
  navigate: vi.fn(),
  updateShop: vi.fn(),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useNavigate: () => mocks.navigate,
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('@azure/msal-react', () => ({ useMsal: () => ({ accounts: [], instance: {} }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), error: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useGetGoLiveStatusQuery: () => ({ data: mocks.goLive }),
  useGetMyShopsQuery: () => ({ data: undefined }),
  useGetShopByIdQuery: () => ({ data: mocks.shop }),
  useUpdateShopMutation: () => [mocks.updateShop, { isLoading: false }],
}));
vi.mock('../../features/staff/staffSession', () => ({ readStaffSession: () => null, clearStaffSession: vi.fn() }));
vi.mock('../../services/ordersApi', () => ({ useGetOrderQueueQuery: () => ({ data: undefined }) }));

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
});

const setup = (open: number, perms = ['manage_shop'], isPaused = true) => {
  mocks.shop = { id: 's1', name: 'Shop', isPaused, callerPermissions: perms };
  mocks.goLive = {
    allMet: open === 0,
    criteria: [
      { key: 'a', met: open < 1 },
      { key: 'b', met: open < 2 },
    ],
  };
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={['/shops/s1']}>
        <Routes>
          <Route path="/shops/:shopId" element={<Sidebar sidebarHidden={false} onToggleSidebar={() => {}} />} />
        </Routes>
      </MemoryRouter>
    </I18nextProvider>,
  );
  return screen.getByRole('switch', { name: 'Shop status' });
};

describe('Sidebar shop status switch with open checklist items', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.updateShop.mockReset();
    mocks.updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });
  afterEach(cleanup);

  it('shows a status tooltip, without navigating or updating', () => {
    const sw = setup(1);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(sw);
    const tip = screen.getByRole('status');
    expect(tip.textContent).toBe(`${MESSAGE}Checklist`);
    expect(within(tip).getByRole('link', { name: 'Checklist' }).getAttribute('href')).toBe('/shops/s1/go-live');
    expect(sw.getAttribute('aria-describedby')).toBe(tip.id);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.updateShop).not.toHaveBeenCalled();
  });

  it('closes on Escape', () => {
    const sw = setup(1);
    fireEvent.click(sw);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    expect(sw.hasAttribute('aria-describedby')).toBe(false);
  });

  it('closes on an outside pointerdown but not on the switch itself', () => {
    const sw = setup(1);
    fireEvent.click(sw);
    fireEvent.pointerDown(sw);
    expect(screen.getByRole('status')).toBeTruthy();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('keeps the Checklist link pointing at the go-live page', () => {
    setup(1);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/shops/s1/go-live');
  });

  it('shows no tooltip when the switch is disabled', () => {
    const sw = setup(1, ['view_orders']) as HTMLButtonElement;
    expect(sw.disabled).toBe(true);
    fireEvent.click(sw);
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('Sidebar shop status switch with the checklist complete', () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.updateShop.mockReset();
    mocks.updateShop.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });
  afterEach(cleanup);

  it('switches the shop on, with no tooltip and no navigation', () => {
    fireEvent.click(setup(0));
    expect(mocks.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
    expect(screen.queryByRole('status')).toBeNull();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
