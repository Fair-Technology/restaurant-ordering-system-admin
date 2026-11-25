// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Sidebar } from './Sidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-redux', () => ({ useDispatch: () => vi.fn() }));
vi.mock('@azure/msal-react', () => ({ useMsal: () => ({ accounts: [], instance: {} }) }));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock('../../services/api', () => ({
  useGetMyShopsQuery: () => ({ data: undefined }),
  useGetShopByIdQuery: () => ({ data: undefined }),
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
