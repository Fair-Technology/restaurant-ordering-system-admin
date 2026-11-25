// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ShopSettingsPage } from './ShopSettingsPage';
import en from '../../public/locales/en/common.json';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], en);
      return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k])) : key;
    },
    i18n: { language: 'en' },
  }),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('../features/menu/useShopReferenceLists', () => ({ useShopReferenceLists: () => ({ refs: undefined }) }));
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => undefined }));
vi.mock('qrcode.react', () => ({ QRCodeCanvas: () => <canvas data-testid="qr" /> }));

const shop = {
  id: 's1',
  name: 'Pasta Place',
  slug: 'pasta',
  isPaused: false,
  callerRole: 'owner',
  callerPermissions: ['manage_shop'],
  openingHours: { mon: [{ open: '09:00', close: '17:00' }], tue: [{ open: '09:00', close: '17:00' }] },
};
vi.mock('../services/api', () => {
  const mut = () => [vi.fn(), { isLoading: false }];
  return {
    useGetShopByIdQuery: () => ({ data: shop, isLoading: false, isError: false, refetch: vi.fn() }),
    useGenerateShopLogoUploadUrlMutation: mut,
    useSetShopLogoMutation: mut,
    useRemoveShopLogoMutation: mut,
    useGenerateShopCoverImageUploadUrlMutation: mut,
    useSetShopCoverImageMutation: mut,
    useRemoveShopCoverImageMutation: mut,
    useUpdateShopMutation: mut,
    useRequestShopNameChangeMutation: mut,
    useRejectShopNameChangeMutation: mut,
    useDeleteShopMutation: mut,
  };
});

// The cards have their own tests and API hooks; here they only mark where they render.
vi.mock('../components/shop/ShopStatusCard', () => ({ ShopStatusCard: () => <section data-testid="card-status" /> }));
vi.mock('../components/shop/PaymentsCard', () => ({ PaymentsCard: () => <section data-testid="card-payments" /> }));
vi.mock('../components/shop/OrderAlertsCard', () => ({ OrderAlertsCard: () => <section data-testid="card-alerts" /> }));
vi.mock('../components/shop/AutoAcceptCard', () => ({ AutoAcceptCard: () => <section data-testid="card-autoaccept" /> }));
vi.mock('../components/shop/KitchenTimingCard', () => ({ KitchenTimingCard: () => <section data-testid="card-kitchen" /> }));
vi.mock('../components/shop/DeliveryCard', () => ({ DeliveryCard: () => <section data-testid="card-delivery" /> }));
vi.mock('../components/shop/ClosuresCard', () => ({ ClosuresCard: () => <section data-testid="card-closures" /> }));
vi.mock('../components/shop/ScheduledOrdersCard', () => ({ ScheduledOrdersCard: () => <section data-testid="card-scheduled" /> }));
vi.mock('../components/shop/DineInCard', () => ({ DineInCard: () => <section data-testid="card-dinein" /> }));

function Where() {
  const loc = useLocation();
  return <output data-testid="where">{loc.search}</output>;
}
const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/shops/:shopId/settings" element={<><ShopSettingsPage /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );
const nav = () => within(screen.getByRole('navigation', { name: en.shops.settingsPage.navLabel }));

afterEach(cleanup);

describe('ShopSettingsPage sections', () => {
  it('renders seven nav items with status lines and marks the active one', () => {
    renderAt('/shops/s1/settings');
    expect(nav().getAllByRole('button')).toHaveLength(7);
    expect(nav().getByRole('button', { name: /Shop status/ }).getAttribute('aria-current')).toBe('page');
    expect(nav().getByText('2 of 7 days open')).toBeTruthy();
    expect(nav().getByText('Pasta Place · /pasta')).toBeTruthy();
  });

  it('shows only the selected section and writes it to the URL', () => {
    renderAt('/shops/s1/settings');
    expect(screen.getByTestId('card-status')).toBeTruthy();
    expect(screen.queryByTestId('card-alerts')).toBeNull();
    fireEvent.click(nav().getByRole('button', { name: /^Orders/ }));
    expect(screen.queryByTestId('card-status')).toBeNull();
    expect(screen.getByTestId('card-alerts')).toBeTruthy();
    expect(screen.getByTestId('where').textContent).toBe('?section=orders');
  });

  it('restores the section from the URL, and ignores an unknown one', () => {
    renderAt('/shops/s1/settings?section=hours');
    expect(screen.getByTestId('card-closures')).toBeTruthy();
    expect(screen.queryByTestId('card-status')).toBeNull();
    cleanup();
    renderAt('/shops/s1/settings?section=bogus');
    expect(screen.getByTestId('card-status')).toBeTruthy();
  });

  it('keeps every card reachable across the sections', () => {
    const seen: Record<string, string[]> = {
      status: ['card-status'],
      details: ['qr'],
      hours: ['card-closures'],
      orders: ['card-alerts', 'card-autoaccept', 'card-kitchen', 'card-scheduled', 'card-delivery', 'card-dinein'],
      pay: ['card-payments'],
    };
    for (const [key, ids] of Object.entries(seen)) {
      renderAt(`/shops/s1/settings?section=${key}`);
      for (const id of ids) expect(screen.getByTestId(id), `${key}/${id}`).toBeTruthy();
      cleanup();
    }
    const headings = (key: string, titles: string[]) => {
      renderAt(`/shops/s1/settings?section=${key}`);
      const h = screen.getAllByRole('heading', { level: 2 }).map((e) => e.textContent);
      for (const title of titles) expect(h, `${key}/${title}`).toContain(title);
      cleanup();
    };
    headings('status', [en.shops.settingsPage.storefrontLink]);
    headings('details', [en.shops.detailsTitle, en.shops.addressTitle, 'QR Code']);
    headings('look', [en.shops.logo, en.shops.coverImage, en.shops.accentTitle, en.shops.menuLanguagesTitle]);
    headings('hours', [en.shops.openingHours]);
    headings('pay', [en.shops.taxClassesTitle]);
  });

  it('delete confirm in the danger zone needs the exact shop name', () => {
    renderAt('/shops/s1/settings?section=danger');
    fireEvent.click(screen.getByRole('button', { name: en.shops.deleteShop.open }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: en.shops.deleteShop.confirm }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    const input = dialog.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'pasta place' } });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'Pasta Place' } });
    expect(confirm.disabled).toBe(false);
  });
});
