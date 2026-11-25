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
import { failureMessage } from '../features/api/errorMessage';

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
const makeStore = () =>
  configureStore({ reducer: { [api.reducerPath]: api.reducer }, middleware: (g) => g().concat(api.middleware) });

async function rejection(p: { unwrap: () => Promise<unknown> }) {
  try { await p.unwrap(); } catch (e) { return e; }
  throw new Error('expected rejection');
}

describe('real RTK Query errors through failureMessage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the server reason for a failed save (400)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'price must be in whole cents' }, 400)));
    const store = makeStore();
    const err = await rejection(store.dispatch(api.endpoints.updateProduct.initiate({ productId: 'p1', body: { shopId: 's1', price: 1.5 } })));
    expect(failureMessage('Save failed.', err)).toBe('Save failed. price must be in whole cents');
  });

  it('shows the server reason for a failed delete (409)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'Dish is on open orders', code: 'OPEN_ORDERS' }, 409)));
    const store = makeStore();
    const err = await rejection(store.dispatch(api.endpoints.deleteProduct.initiate({ productId: 'p1', shopId: 's1' })));
    expect(failureMessage('Delete failed.', err)).toBe('Delete failed. Dish is on open orders');
  });

  it('shows the network message when offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const store = makeStore();
    const err = await rejection(store.dispatch(api.endpoints.deleteProduct.initiate({ productId: 'p1', shopId: 's1' })));
    expect(failureMessage('Delete failed.', err)).toContain("Can't reach the server");
  });
});
