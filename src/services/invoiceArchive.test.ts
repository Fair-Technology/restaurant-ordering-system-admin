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
import { ordersApi } from './ordersApi';

// The backend's archive endpoint takes the month as a required YYYY-MM query parameter and
// returns the same base64 envelope as the single-document download.
describe('invoice archive request', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('requests one month of receipts from the shop archive endpoint', async () => {
    const captured: Array<{ method: string; path: string; search: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (req: Request) => {
        const url = new URL(req.url, 'http://api.test');
        captured.push({ method: req.method, path: url.pathname, search: url.search });
        return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
      }),
    );
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });

    await store.dispatch(ordersApi.endpoints.getInvoiceArchive.initiate({ shopId: 's1', month: '2026-10' }));

    expect(captured).toHaveLength(1);
    expect(captured[0].method).toBe('GET');
    expect(captured[0].path).toBe('/shops/s1/invoices/archive');
    expect(captured[0].search).toBe('?month=2026-10');
  });
});
