// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ShopLayout } from './ShopLayout';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

const q = vi.hoisted(() => ({ state: {} as Record<string, unknown> }));
vi.mock('../../services/api', () => ({ useGetShopByIdQuery: () => q.state }));
vi.mock('./OrderLimitBanner', () => ({ OrderLimitBanner: () => null }));
vi.mock('./AutoPausedBanner', () => ({ AutoPausedBanner: () => null }));

const renderLayout = () =>
  render(
    <MemoryRouter initialEntries={['/shops/s1']}>
      <Routes>
        <Route path="/shops" element={<div>shops-list</div>} />
        <Route path="/shops/:shopId" element={<ShopLayout />} />
      </Routes>
    </MemoryRouter>,
  );

const failWith = (error: unknown) => {
  q.state = { isLoading: false, isError: true, error, data: undefined };
};

describe('ShopLayout load errors', () => {
  beforeEach(() => {
    q.state = {};
  });
  afterEach(cleanup);

  it('shows not found for 404', () => {
    failWith({ status: 404, data: {} });
    renderLayout();
    expect(screen.getByText('shops.shopNotFoundTitle')).toBeTruthy();
    expect(screen.getByText('shops.shopNotFoundDescription')).toBeTruthy();
  });

  it('shows not allowed for 403', () => {
    failWith({ status: 403, data: {} });
    renderLayout();
    expect(screen.getByText('shops.shopNotAllowedTitle')).toBeTruthy();
  });

  it('shows a generic failure otherwise', () => {
    failWith({ status: 500, data: {} });
    renderLayout();
    expect(screen.getByText('shops.failedToLoadShop')).toBeTruthy();
    cleanup();
    failWith({ status: 'FETCH_ERROR', error: 'x' });
    renderLayout();
    expect(screen.getByText('shops.failedToLoadShopDescription')).toBeTruthy();
  });

  it('back button navigates to /shops', () => {
    failWith({ status: 404, data: {} });
    renderLayout();
    fireEvent.click(screen.getByText('notFound.backToShops'));
    expect(screen.getByText('shops-list')).toBeTruthy();
  });
});
