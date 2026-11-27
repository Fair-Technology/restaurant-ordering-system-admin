// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';

const shopMock = vi.hoisted(() => ({ data: undefined as unknown, openCount: 0, updateShop: vi.fn() }));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('@azure/msal-react', () => ({ useMsal: () => ({ accounts: [], instance: {} }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn(), error: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useGetGoLiveStatusQuery: () => ({
    data: shopMock.openCount ? { criteria: Array.from({ length: shopMock.openCount }, () => ({ met: false })) } : undefined,
  }),
  useGetMyShopsQuery: () => ({ data: undefined }),
  useGetShopByIdQuery: () => ({ data: shopMock.data }),
  useUpdateShopMutation: () => [shopMock.updateShop, { isLoading: false }],
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

describe('Sidebar shop status menu', () => {
  afterEach(() => {
    cleanup();
    shopMock.data = undefined;
    shopMock.openCount = 0;
    shopMock.updateShop.mockClear();
  });

  const renderShop = (shop: Record<string, unknown>, callerPermissions: string[]) => {
    shopMock.data = { id: 's1', name: 'Shop', isPaused: false, callerPermissions, ...shop };
    render(
      <MemoryRouter initialEntries={['/shops/s1']}>
        <Routes>
          <Route path="/shops/:shopId" element={<Sidebar sidebarHidden={false} onToggleSidebar={() => {}} />} />
        </Routes>
      </MemoryRouter>,
    );
  };
  const trigger = () => screen.getByRole('button', { name: 'shops.shopStatusTitle: shops.statusMenu.online' });

  it('is a listbox button with three options for a manager, current one selected', () => {
    renderShop({}, ['manage_shop']);
    expect(trigger().getAttribute('aria-haspopup')).toBe('listbox');
    fireEvent.click(trigger());
    const opts = screen.getAllByRole('option');
    expect(opts.map((o) => o.getAttribute('aria-selected'))).toEqual(['true', 'false', 'false']);
    expect(opts[0].textContent).toContain('shops.statusMenu.online');
    expect(opts[1].textContent).toContain('shops.statusMenu.paused');
    expect(opts[2].textContent).toContain('shops.statusMenu.offline');
  });

  it('closes on Escape and returns focus to the trigger', () => {
    renderShop({}, ['manage_shop']);
    fireEvent.click(trigger());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  it('is read-only without manage_shop', () => {
    renderShop({}, ['view_orders']);
    expect(screen.queryByRole('listbox')).toBeNull();
    const status = screen.getByRole('status', { name: 'shops.shopStatusTitle: shops.statusMenu.online' });
    expect(status.tagName).toBe('DIV');
    expect(screen.queryByRole('button', { name: /shopStatusTitle/ })).toBeNull();
  });

  it('is not interactive when the platform took the shop offline', () => {
    renderShop({ isPaused: true, offlineBySuperadmin: true }, ['manage_shop']);
    expect(screen.getByText('nav.offlineBySuperadmin')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /shopStatusTitle/ })).toBeNull();
  });

  it('shows the pause sub-line for an auto-paused shop', () => {
    renderShop({ ordersPaused: true }, ['manage_shop']);
    expect(screen.getByText('nav.ordersPausedBadge')).toBeTruthy();
  });

  it('gates Online and Paused behind the checklist when offline, showing the existing tooltip', () => {
    shopMock.openCount = 2;
    renderShop({ isPaused: true }, ['manage_shop']);
    fireEvent.click(screen.getByRole('button', { name: 'shops.shopStatusTitle: shops.statusMenu.offline' }));
    const [online, paused, offline] = screen.getAllByRole('option');
    expect(online.getAttribute('aria-disabled')).toBe('true');
    expect(paused.getAttribute('aria-disabled')).toBe('true');
    expect(offline.getAttribute('aria-disabled')).toBeNull();
    fireEvent.click(online);
    expect(screen.getByText('shops.cannotGoOnlineTooltip')).toBeTruthy();
    expect(shopMock.updateShop).not.toHaveBeenCalled();
  });

  it('resumes a paused shop with ordersPaused:false', () => {
    renderShop({ ordersPaused: true }, ['manage_shop']);
    fireEvent.click(screen.getByRole('button', { name: 'shops.shopStatusTitle: shops.statusMenu.paused' }));
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(shopMock.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { ordersPaused: false } });
  });

  it('switches an offline shop on with isPaused:false when nothing blocks it', () => {
    renderShop({ isPaused: true }, ['manage_shop']);
    fireEvent.click(screen.getByRole('button', { name: 'shops.shopStatusTitle: shops.statusMenu.offline' }));
    fireEvent.click(screen.getAllByRole('option')[0]);
    expect(shopMock.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
  });

  it('opens the pause dialog from Paused', () => {
    renderShop({}, ['manage_shop']);
    fireEvent.click(trigger());
    fireEvent.click(screen.getAllByRole('option')[1]);
    expect(screen.getByText('shops.pauseOrdersTitle')).toBeTruthy();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('opens the offline confirmation from Offline', () => {
    renderShop({}, ['manage_shop']);
    fireEvent.click(trigger());
    fireEvent.click(screen.getAllByRole('option')[2]);
    expect(screen.getByText('shops.offlineConfirmText')).toBeTruthy();
  });
});
