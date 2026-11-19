// @vitest-environment jsdom
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInstance } from 'i18next';
import { cleanup, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePageTitle } from './usePageTitle';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(fs.readFileSync(path.resolve(dirname, '../../../public/locales/en/common.json'), 'utf-8'));

const i18n = createInstance();
beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    resources: { en: { common: en } },
    interpolation: { escapeValue: false },
  });
});

const queryMock = vi.hoisted(() => vi.fn());
vi.mock('../../services/api', () => ({ useGetShopByIdQuery: queryMock }));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => i18n.t(key) }),
}));

function Host({ pageKey }: { pageKey: string }) {
  usePageTitle(pageKey);
  return null;
}

function renderAt(url: string, pageKey: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/shops/:shopId/*" element={<Host pageKey={pageKey} />} />
        <Route path="*" element={<Host pageKey={pageKey} />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  document.title = 'initial';
  queryMock.mockImplementation((_arg: unknown, opts?: { skip?: boolean }) => ({
    data: opts?.skip ? undefined : { name: 'Golden Wok' },
  }));
});
afterEach(cleanup);

describe('usePageTitle', () => {
  it('uses "<Page> · Admin" without a shop in context', () => {
    renderAt('/shops', 'nav.myShops');
    expect(document.title).toBe('My shops · Admin');
  });

  it('includes the shop name for shop-scoped pages, differing per page', () => {
    const titles = ['nav.orders', 'nav.dishes', 'nav.tables'].map((key) => {
      const { unmount } = renderAt('/shops/s1/page', key);
      const title = document.title;
      unmount();
      return title;
    });
    expect(titles).toEqual([
      'Orders · Golden Wok · Admin',
      'Dishes · Golden Wok · Admin',
      'Tables & QR codes · Golden Wok · Admin',
    ]);
    expect(new Set(titles).size).toBe(3);
  });

  it('restores the previous title on unmount', () => {
    const { unmount } = renderAt('/shops/s1/page', 'nav.orders');
    expect(document.title).not.toBe('initial');
    unmount();
    expect(document.title).toBe('initial');
  });
});
