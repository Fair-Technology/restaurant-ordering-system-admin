import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/msalConfig', () => ({
  msalInstance: { getActiveAccount: () => null, getAllAccounts: () => [] },
  apiRequest: {},
}));
vi.mock('../features/staff/staffSession', () => ({
  readStaffSession: () => null,
  clearStaffSession: () => {},
}));

import { api } from './api';

const shopId = 'shop-1';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('deleteProduct', () => {
  afterEach(() => vi.unstubAllGlobals());

  // The detail drawer is still open (still subscribed to the dish) when the
  // delete lands, so invalidating that dish re-requested a dish that no
  // longer exists. Only the shop's list needs reloading.
  it("reloads the shop's product list but not the deleted dish", async () => {
    const requests: string[] = [];
    let deleted = false;
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      const url = new URL(req.url, 'http://api.test');
      requests.push(`${req.method} ${url.pathname.replace(/^.*?\/products/, '/products')}`);
      if (req.method === 'DELETE') { deleted = true; return jsonResponse({}); }
      if (url.pathname.endsWith('/products/p1')) {
        return deleted ? jsonResponse({ error: 'Product not found' }, 404) : jsonResponse({ id: 'p1', shopId, name: 'p1' });
      }
      return jsonResponse(deleted ? [] : [{ id: 'p1', shopId, name: 'p1' }]);
    }));

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
    const list = store.dispatch(api.endpoints.getProductsByShop.initiate({ shopId }));
    const detail = store.dispatch(api.endpoints.getProductById.initiate({ productId: 'p1', shopId }));
    await Promise.all([list, detail]);
    requests.length = 0;

    await store.dispatch(api.endpoints.deleteProduct.initiate({ productId: 'p1', shopId })).unwrap();
    await vi.waitFor(() =>
      expect(api.endpoints.getProductsByShop.select({ shopId })(store.getState()).data).toEqual([]),
    );

    expect(requests.filter((r) => r.startsWith('GET'))).toEqual(['GET /products']);
    // The open drawer keeps the dish it was showing rather than erroring.
    expect(api.endpoints.getProductById.select({ productId: 'p1', shopId })(store.getState()).data).toEqual({
      id: 'p1', shopId, name: 'p1',
    });

    list.unsubscribe();
    detail.unsubscribe();
  });
});
