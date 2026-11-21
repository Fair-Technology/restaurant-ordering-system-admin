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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeStore() {
  return configureStore({
    reducer: { [api.reducerPath]: api.reducer },
    middleware: (gdm) => gdm().concat(api.middleware),
  });
}

describe('per-account language writes', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('owner: PATCH /users/me/language with the chosen language', async () => {
    const calls: { method: string; path: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      calls.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.text() });
      return jsonResponse({ language: 'de' });
    }));

    await makeStore().dispatch(
      api.endpoints.updateMyLanguage.initiate({ updateMyLanguageRequestDto: { language: 'de' } }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].path).toMatch(/\/users\/me\/language$/);
    expect(calls[0].body).toBe('{"language":"de"}');
  });

  it('staff: PATCH /staff/me/language with the chosen language', async () => {
    const calls: { method: string; path: string; body: string }[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      calls.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.text() });
      return jsonResponse({ language: 'en' });
    }));

    await makeStore().dispatch(
      api.endpoints.updateMyStaffLanguage.initiate({ updateMyStaffLanguageRequestDto: { language: 'en' } }),
    );

    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe('PATCH');
    expect(calls[0].path).toMatch(/\/staff\/me\/language$/);
    expect(calls[0].body).toBe('{"language":"en"}');
  });
});
