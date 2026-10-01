import { configureStore } from '@reduxjs/toolkit';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/msalConfig', () => ({
  msalInstance: { getActiveAccount: () => null, getAllAccounts: () => [] },
  apiRequest: {},
}));
vi.mock('../staff/staffSession', () => ({
  readStaffSession: () => null,
  clearStaffSession: () => {},
}));

import { api } from '../../services/api';
import { isListRefreshing } from './productListStatus';

const shopId = 'shop-1';
const dish = (id: string, isDeclared: boolean) => ({ id, shopId, name: id, isDeclared });

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('isListRefreshing', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is false on first load and when idle, true only while an on-screen list reloads', () => {
    expect(isListRefreshing({ isLoading: true, isFetching: true })).toBe(false);
    expect(isListRefreshing({ isLoading: false, isFetching: false })).toBe(false);
    expect(isListRefreshing({ isLoading: false, isFetching: true })).toBe(true);
  });

  // After a save the old rows stay on screen until the slow list refetch
  // returns; this is the window where the page must show it's updating.
  it('reports refreshing from the moment a dish is saved until the reloaded list arrives', async () => {
    let listCalls = 0;
    let releaseRefetch!: () => void;
    const refetchGate = new Promise<void>((r) => { releaseRefetch = r; });
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      if (req.method === 'PATCH') return jsonResponse(dish('p1', true));
      listCalls += 1;
      if (listCalls === 1) return jsonResponse([dish('p1', false)]);
      await refetchGate;
      return jsonResponse([dish('p1', true)]);
    }));

    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
    const listState = () => api.endpoints.getProductsByShop.select({ shopId })(store.getState());
    // Derived the way useQuery derives them: fetching = request pending,
    // loading = pending with nothing yet to show.
    const status = () => {
      const s = listState();
      const isFetching = s.status === 'pending';
      return isListRefreshing({ isFetching, isLoading: isFetching && s.data === undefined });
    };

    const sub = store.dispatch(api.endpoints.getProductsByShop.initiate({ shopId }));
    await sub;
    expect(status()).toBe(false);

    await store.dispatch(
      api.endpoints.updateProduct.initiate({ productId: 'p1', updateProductRequest: { shopId, allergenIds: [] } as never }),
    );
    await vi.waitFor(() => expect(listCalls).toBe(2));

    // Save confirmed, reload still in flight: stale row on screen, so refreshing.
    expect(listState().data?.[0].isDeclared).toBe(false);
    expect(status()).toBe(true);

    releaseRefetch();
    await vi.waitFor(() => expect(listState().data?.[0].isDeclared).toBe(true));
    expect(status()).toBe(false);
    sub.unsubscribe();
  });
});
