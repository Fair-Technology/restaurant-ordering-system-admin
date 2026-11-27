// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ShopsPage } from './ShopsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));
const h = vi.hoisted(() => ({
  toastError: vi.fn(),
  updateShop: vi.fn(),
  fetchGoLive: vi.fn(),
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: h.toastError }) }));
vi.mock('../services/legalApi', () => ({ useGetDpaDocumentQuery: () => ({ data: undefined, isError: false }) }));
vi.mock('../services/api', () => ({
  useGetMyShopsQuery: () => ({ data: { shops: [{ id: 's1', name: 'Pizza', isPaused: true }] } }),
  useGetShopByIdQuery: () => ({}),
  useGetShopSubscriptionQuery: () => ({}),
  useUpdateShopMutation: () => [h.updateShop, { isLoading: false }],
  useLazyGetGoLiveStatusQuery: () => [h.fetchGoLive, { isFetching: false }],
  useCreateShopMutation: () => [vi.fn(), {}],
  useLazyCheckSlugAvailabilityQuery: () => [vi.fn()],
}));

const resolves = (v: unknown) => ({ unwrap: () => Promise.resolve(v) });
const rejects = (e: unknown) => ({ unwrap: () => Promise.reject(e) });
const toggle = () => screen.getByRole('switch');
const clickOn = () => act(async () => { fireEvent.click(toggle()); });

beforeEach(() => {
  h.toastError.mockReset();
  h.updateShop.mockReset();
  h.fetchGoLive.mockReset();
  render(
    <MemoryRouter initialEntries={['/shops']}>
      <Routes>
        <Route path="/shops" element={<ShopsPage />} />
        <Route path="/shops/:id/go-live" element={<p>checklist page</p>} />
        <Route path="/shops/:id" element={<p>shop page</p>} />
      </Routes>
    </MemoryRouter>,
  );
});
afterEach(cleanup);

describe('My Shops online toggle', () => {
  it('blocks with a tooltip, sends no update and stays offline when the checklist is open', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: false }));
    await clickOn();
    expect(h.fetchGoLive).toHaveBeenCalledWith({ shopId: 's1' });
    expect(h.updateShop).not.toHaveBeenCalled();
    expect(screen.getByRole('status').textContent).toContain('shops.cannotGoOnlineTooltip');
    expect(toggle().getAttribute('aria-checked')).toBe('false');
    expect(toggle().getAttribute('aria-describedby')).toBe(screen.getByRole('status').id);
  });

  it('links the tooltip to the shop checklist without triggering the row navigation', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: false }));
    await clickOn();
    const link = screen.getByRole('link', { name: 'nav.checklist' });
    expect(link.getAttribute('href')).toBe('/shops/s1/go-live');
    await act(async () => { fireEvent.click(link); });
    expect(screen.getByText('checklist page')).toBeTruthy();
  });

  it('dismisses the tooltip on Escape', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: false }));
    await clickOn();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('switches online when the checklist is complete', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: true }));
    h.updateShop.mockReturnValue(resolves({}));
    await clickOn();
    expect(h.updateShop).toHaveBeenCalledWith({ shopId: 's1', body: { isPaused: false } });
    expect(screen.queryByRole('status')).toBeNull();
    expect(toggle().getAttribute('aria-checked')).toBe('true');
  });

  it('shows the generic toast when the checklist status cannot be fetched', async () => {
    h.fetchGoLive.mockReturnValue(rejects({ status: 'FETCH_ERROR' }));
    await clickOn();
    expect(h.updateShop).not.toHaveBeenCalled();
    expect(h.toastError).toHaveBeenCalledWith('shops.statusFailedToSave');
  });

  it('surfaces a server-provided refusal reason and rolls back', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: true }));
    h.updateShop.mockReturnValue(rejects({ status: 400, data: { error: 'Payment method missing' } }));
    await clickOn();
    expect(h.toastError).toHaveBeenCalledWith('Payment method missing');
    expect(toggle().getAttribute('aria-checked')).toBe('false');
  });

  it('keeps the generic text when the server gives no usable reason', async () => {
    h.fetchGoLive.mockReturnValue(resolves({ allMet: true }));
    h.updateShop.mockReturnValue(rejects({ status: 400, data: { error: '<b>x</b>' } }));
    await clickOn();
    expect(h.toastError).toHaveBeenCalledWith('shops.statusFailedToSave');
  });
});
