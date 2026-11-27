// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const shopMock = vi.hoisted(() => ({ data: undefined as unknown }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('@azure/msal-react', () => ({ useMsal: () => ({ accounts: [], instance: {} }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useGetGoLiveStatusQuery: () => ({ data: undefined }),
  useGetMyShopsQuery: () => ({ data: undefined }),
  useGetShopByIdQuery: () => ({ data: shopMock.data }),
  useUpdateShopMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('../../features/staff/staffSession', () => ({ readStaffSession: () => null, clearStaffSession: vi.fn() }));
vi.mock('../../services/ordersApi', () => ({ useGetOrderQueueQuery: () => ({ data: undefined }) }));

describe('Sidebar with no shop selected', () => {
  afterEach(cleanup);

  it('shows a Shops link and no Overview link', () => {
    render(
      <MemoryRouter initialEntries={['/shops']}>
        <Routes>
          <Route path="/shops" element={<Sidebar sidebarHidden={false} onToggleSidebar={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/shops');
    expect(hrefs).not.toContain('/');
    expect(screen.queryByText('nav.overview')).toBeNull();
  });
});

describe('Sidebar inside a shop with every permission', () => {
  afterEach(() => {
    cleanup();
    shopMock.data = undefined;
  });

  const renderShop = () => {
    shopMock.data = {
      id: 's1',
      name: 'Shop',
      callerPermissions: ['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit'],
    };
    return render(
      <MemoryRouter initialEntries={['/shops/s1']}>
        <Routes>
          <Route path="/shops/:shopId" element={<Sidebar sidebarHidden={false} onToggleSidebar={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
  };

  it('gives every nav link an icon', () => {
    const { container } = renderShop();
    const links = Array.from(container.querySelector('nav')!.querySelectorAll('a'));
    expect(links.length).toBe(13);
    expect(links.every((a) => a.querySelector('svg'))).toBe(true);
  });

  it('lists the pages in order with Settings last', () => {
    const { container } = renderShop();
    const labels = Array.from(container.querySelector('nav')!.querySelectorAll('a')).map((a) => a.textContent);
    expect(labels).toEqual([
      'nav.dashboard',
      'nav.orders',
      'nav.dishes',
      'nav.combos',
      'nav.categories',
      'nav.optionGroups',
      'nav.promotions',
      'nav.tables',
      'nav.legal',
      'nav.subscription',
      'nav.staff',
      'nav.activity',
      'nav.settings',
    ]);
  });
});

describe('Sidebar shop status switch', () => {
  afterEach(() => {
    cleanup();
    shopMock.data = undefined;
  });

  const renderOffline = (callerPermissions: string[]) => {
    shopMock.data = { id: 's1', name: 'Shop', isPaused: true, callerPermissions };
    render(
      <MemoryRouter initialEntries={['/shops/s1']}>
        <Routes>
          <Route path="/shops/:shopId" element={<Sidebar sidebarHidden={false} onToggleSidebar={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
    return screen.getByRole('switch', { name: 'shops.shopStatusTitle' }) as HTMLButtonElement;
  };

  it('shows an off, operable switch for an offline shop with manage_shop', () => {
    const sw = renderOffline(['manage_shop']);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    expect(sw.disabled).toBe(false);
  });

  it('disables the switch without manage_shop', () => {
    expect(renderOffline(['view_orders']).disabled).toBe(true);
  });
});
