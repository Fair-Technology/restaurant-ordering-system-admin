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
import { buildSchedulePayload } from '../features/menu/scheduleOffer';

afterEach(() => vi.unstubAllGlobals());

describe('PATCH /products/{id} schedule body', () => {
  it('sends offerLabelTranslations on the wire', async () => {
    const seen: { method: string; path: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      seen.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.text() });
      return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
    }));
    const store = configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
    const schedule = buildSchedulePayload({
      enabled: true, startDate: '2026-01-01', endDate: '', startTime: '', endTime: '', daysOfWeek: [1],
      timeWindowEnabled: false, noEndDate: true, offerEnabled: true, offerPrice: 500, offerLabel: 'Happy Hour',
      extraLanguage: 'en', offerLabelTranslations: { en: 'Happy Hour' },
    })!;
    await store.dispatch(api.endpoints.updateProduct.initiate({ productId: 'p1', body: { shopId: 's1', schedule } }));

    expect(seen).toHaveLength(1);
    expect(seen[0].method).toBe('PATCH');
    expect(seen[0].path).toMatch(/\/products\/p1$/);
    expect(JSON.parse(seen[0].body)).toEqual({
      shopId: 's1',
      schedule: {
        startDate: '2026-01-01', endDate: null, startTime: null, endTime: null, daysOfWeek: [1],
        offerPrice: 500, offerLabel: 'Happy Hour', offerLabelTranslations: { en: 'Happy Hour' },
      },
    });
  });
});
