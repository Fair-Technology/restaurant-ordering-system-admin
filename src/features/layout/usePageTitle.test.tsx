// @vitest-environment jsdom
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { usePageTitle } from './usePageTitle';

const en = JSON.parse(
  fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../public/locales/en/common.json'),
    'utf-8',
  ),
) as Record<string, unknown>;

const lookup = (key: string) =>
  key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], en) as string;

vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => lookup(key) }) }));

const shopQuery = vi.fn();
vi.mock('../../services/api', () => ({
  useGetShopByIdQuery: (...args: unknown[]) => shopQuery(...args),
}));

function Page({ titleKey }: { titleKey: string }) {
  usePageTitle(titleKey);
  return null;
}

function renderAt(url: string, titleKey: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/" element={<Page titleKey={titleKey} />} />
        <Route path="/shops/:shopId/*" element={<Page titleKey={titleKey} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  document.title = 'initial';
  shopQuery.mockImplementation((_arg: { shopId: string }, opts?: { skip?: boolean }) => ({
    data: opts?.skip ? undefined : { name: 'Ma Pasta' },
  }));
});
afterEach(cleanup);

describe('usePageTitle', () => {
  it('uses "<Page> · Admin" when there is no shop in the route', () => {
    renderAt('/', 'nav.overview');
    expect(document.title).toBe('Overview · Admin');
    expect(shopQuery.mock.calls[0][1]).toEqual({ skip: true });
  });

  it('gives different shop-scoped routes different titles that contain the shop name', () => {
    const titles = (
      [
        ['/shops/s1/orders', 'nav.orders'],
        ['/shops/s1/categories', 'nav.categories'],
        ['/shops/s1/tables', 'nav.tables'],
      ] as const
    ).map(([url, key]) => {
      const { unmount } = renderAt(url, key);
      const title = document.title;
      unmount();
      return title;
    });
    expect(titles).toEqual([
      'Orders · Ma Pasta · Admin',
      'Categories · Ma Pasta · Admin',
      'Tables & QR codes · Ma Pasta · Admin',
    ]);
    expect(new Set(titles).size).toBe(3);
  });

  it('falls back to "<Page> · Admin" while the shop is still loading', () => {
    shopQuery.mockReturnValue({ data: undefined });
    renderAt('/shops/s1/orders', 'nav.orders');
    expect(document.title).toBe('Orders · Admin');
  });

  it('restores the previous title on unmount', () => {
    const { unmount } = renderAt('/shops/s1/orders', 'nav.orders');
    unmount();
    expect(document.title).toBe('initial');
  });
});
