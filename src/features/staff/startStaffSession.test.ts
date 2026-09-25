import { configureStore } from '@reduxjs/toolkit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../config/msalConfig', () => ({
  msalInstance: { getActiveAccount: () => null, getAllAccounts: () => [] },
  apiRequest: {},
}));

import { baseApi } from '../../services/baseApi';
import { STAFF_SESSION_KEY } from './staffSession';
import { startStaffSession } from './startStaffSession';

const probeApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    probeShop: build.query<{ callerPermissions: string[] }, { shopId: string }>({
      query: ({ shopId }) => `/shops/${shopId}`,
    }),
  }),
  overrideExisting: true,
});

const managerSession = {
  token: 'manager-token',
  expiresAt: '2099-01-01T00:00:00.000Z',
  shopId: 'shop-1',
  shopSlug: 'pizzeria-kreuzberg',
  staffId: 'st-2',
  username: 'manager',
  role: 'manager' as const,
};

describe('startStaffSession', () => {
  const store: Record<string, string> = {};
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("drops the previous staff member's cached shop so the new member's permissions are fetched", async () => {
    const appStore = configureStore({
      reducer: { [baseApi.reducerPath]: baseApi.reducer },
      middleware: (gdm) => gdm().concat(baseApi.middleware),
    });

    // The kitchen account's shop response is sitting in the cache.
    await appStore.dispatch(
      probeApi.util.upsertQueryData('probeShop', { shopId: 'shop-1' }, { callerPermissions: ['view_orders'] }),
    );
    expect(probeApi.endpoints.probeShop.select({ shopId: 'shop-1' })(appStore.getState()).data).toEqual({
      callerPermissions: ['view_orders'],
    });

    startStaffSession(appStore.dispatch, managerSession);

    expect(probeApi.endpoints.probeShop.select({ shopId: 'shop-1' })(appStore.getState()).data).toBeUndefined();
    expect(JSON.parse(store[STAFF_SESSION_KEY])).toEqual(managerSession);
  });
});
