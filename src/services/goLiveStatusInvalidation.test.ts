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
import './goLiveStatusInvalidation';
import { legalApi } from './legalApi';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const makeStore = () =>
  configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (g) => g().concat(api.middleware) });

const isGoLive = (url: string) => url.includes('go-live-status');
const urlOf = (input: unknown) => (input instanceof Request ? input.url : String(input));

/** Subscribes to go-live status, runs the mutation, and returns go-live GET counts before/after. */
async function goLiveFetches(run: (store: ReturnType<typeof makeStore>) => { unwrap: () => Promise<unknown> }) {
  const fetchMock = vi.fn(async (input: unknown) =>
    isGoLive(urlOf(input)) ? json({ checks: [] }) : json({ ok: true }),
  );
  vi.stubGlobal('fetch', fetchMock);
  const store = makeStore();
  const sub = store.dispatch(api.endpoints.getGoLiveStatus.initiate({ shopId: 's1' }));
  await sub;
  const count = () => fetchMock.mock.calls.filter((c) => isGoLive(urlOf(c[0]))).length;
  const before = count();
  await run(store).unwrap();
  await vi.waitFor(() => expect(count()).toBeGreaterThan(before));
  sub.unsubscribe();
  return { before, after: count() };
}

describe('go-live status refetches after mutations', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Positive control: already invalidated bare 'Shops' before this change.
  it('control: updateShop refetches', async () => {
    const r = await goLiveFetches((s) =>
      s.dispatch(api.endpoints.updateShop.initiate({ shopId: 's1', body: {} } as never)),
    );
    expect(r.after).toBe(r.before + 1);
  });

  const cases: [string, (s: ReturnType<typeof makeStore>) => { unwrap: () => Promise<unknown> }][] = [
    ['createProduct', (s) => s.dispatch(api.endpoints.createProduct.initiate({ createProductRequestDto: { shopId: 's1' } } as never))],
    ['updateProduct', (s) => s.dispatch(api.endpoints.updateProduct.initiate({ productId: 'p1', body: { shopId: 's1' } } as never))],
    ['deleteProduct', (s) => s.dispatch(api.endpoints.deleteProduct.initiate({ productId: 'p1', shopId: 's1' }))],
    ['updateProductAvailability', (s) => s.dispatch(api.endpoints.updateProductAvailability.initiate({ productId: 'p1', body: { shopId: 's1', isAvailable: true } }))],
    ['addProductImage', (s) => s.dispatch(api.endpoints.addProductImage.initiate({ shopId: 's1', productId: 'p1', body: { imageId: 'i1', url: 'https://x/y.png' } }))],
    ['createCategory', (s) => s.dispatch(api.endpoints.createCategory.initiate({ shopId: 's1', body: { name: 'Mains' } }))],
    ['deleteCategory', (s) => s.dispatch(api.endpoints.deleteCategory.initiate({ shopId: 's1', categoryId: 'c1' }))],
    ['updateShopLegal', (s) => s.dispatch(legalApi.endpoints.updateShopLegal.initiate({ shopId: 's1', body: { terms: 'x' } }))],
    ['acceptDpa', (s) => s.dispatch(legalApi.endpoints.acceptDpa.initiate({ shopId: 's1', version: 'v1' }))],
  ];

  it.each(cases)('%s refetches go-live status', async (_name, run) => {
    const r = await goLiveFetches(run);
    expect(r.after).toBeGreaterThan(r.before);
  });
});
