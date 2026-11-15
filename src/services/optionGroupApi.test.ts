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

describe('setOptionAvailability', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('PATCHes the option with the new availability', async () => {
    const seen: { method: string; path: string; body: unknown }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      seen.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.clone().json() });
      return new Response(JSON.stringify({ id: 'g1' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
    await store.dispatch(
      api.endpoints.setOptionAvailability.initiate({ shopId: 's1', groupId: 'g1', optionId: 'o1', body: { isAvailable: false } }),
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe('PATCH');
    expect(seen[0].path.endsWith('/shops/s1/option-groups/g1/options/o1')).toBe(true);
    expect(seen[0].body).toEqual({ isAvailable: false });
  });
});
