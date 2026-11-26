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

describe('updateShop min order body', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('PATCHes a minOrderAmountCents of 0 without dropping it', async () => {
    const captured: { method: string; path: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      captured.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.text() });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
    await store.dispatch(api.endpoints.updateShop.initiate({ shopId: 's1', body: { minOrderAmountCents: 0 } }));
    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe('PATCH');
    expect(captured[0].path.endsWith('/shops/s1')).toBe(true);
    expect(JSON.parse(captured[0].body)).toEqual({ minOrderAmountCents: 0 });
  });
});
