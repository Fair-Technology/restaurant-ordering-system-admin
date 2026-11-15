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
import { promotionsApi } from './promotionsApi';
import { subscriptionApi } from './subscriptionApi';

const shopId = 's1';
const orderId = 'o1';

type Captured = { method: string; path: string; body: string };

// Regression: the generated client registers these endpoint names with OpenAPI
// body shapes; unless the hand-written modules override them, RTK keeps the
// generated definition and the request goes out with an empty body.
describe('mutation request bodies', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function capture(run: (dispatch: ReturnType<typeof makeStore>['dispatch']) => Promise<unknown>) {
    const captured: Captured[] = [];
    vi.stubGlobal('fetch', vi.fn(async (req: Request) => {
      captured.push({ method: req.method, path: new URL(req.url, 'http://api.test').pathname, body: await req.text() });
      return new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const store = makeStore();
    await run(store.dispatch);
    expect(captured).toHaveLength(1);
    return captured[0];
  }

  function makeStore() {
    return configureStore({
      reducer: { [api.reducerPath]: api.reducer },
      middleware: (gdm) => gdm().concat(api.middleware),
    });
  }

  function expectRequest(r: Captured, method: string, pathSuffix: string, body: unknown) {
    expect(r.method).toBe(method);
    expect(r.path.endsWith(pathSuffix)).toBe(true);
    expect(r.body).not.toBe('');
    expect(JSON.parse(r.body)).toEqual(body);
  }

  it('acceptOrder sends prepMinutes', async () => {
    const r = await capture((d) => d(ordersApi.endpoints.acceptOrder.initiate({ shopId, orderId, prepMinutes: 25 })));
    expectRequest(r, 'POST', `/shops/${shopId}/orders/${orderId}/accept`, { prepMinutes: 25 });
  });

  it('rejectOrder sends reason and note', async () => {
    const r = await capture((d) =>
      d(ordersApi.endpoints.rejectOrder.initiate({ shopId, orderId, reason: 'too_busy', note: 'busy' } as never)),
    );
    expectRequest(r, 'POST', `/shops/${shopId}/orders/${orderId}/reject`, { reason: 'too_busy', note: 'busy' });
  });

  it('refundOrder sends amountCents', async () => {
    const r = await capture((d) =>
      d(ordersApi.endpoints.refundOrder.initiate({ shopId, orderId, reason: 'cold', amountCents: 500 })),
    );
    expectRequest(r, 'POST', `/shops/${shopId}/orders/${orderId}/refunds`, { reason: 'cold', amountCents: 500 });
  });

  it('refundOrder sends items', async () => {
    const items = [{ orderItemId: 'i1', quantity: 1 }];
    const r = await capture((d) =>
      d(ordersApi.endpoints.refundOrder.initiate({ shopId, orderId, reason: 'cold', items } as never)),
    );
    expectRequest(r, 'POST', `/shops/${shopId}/orders/${orderId}/refunds`, { reason: 'cold', items });
  });

  it('setBusyMode sends on', async () => {
    const r = await capture((d) => d(ordersApi.endpoints.setBusyMode.initiate({ shopId, on: true })));
    expectRequest(r, 'PUT', `/shops/${shopId}/busy-mode`, { on: true });
  });

  it('setDiscountCodeActive sends active', async () => {
    const r = await capture((d) =>
      d(promotionsApi.endpoints.setDiscountCodeActive.initiate({ shopId, codeId: 'c1', active: true })),
    );
    expectRequest(r, 'PATCH', `/shops/${shopId}/discount-codes/c1`, { active: true });
  });

  it('confirmSubscriptionCheckout sends sessionId', async () => {
    const r = await capture((d) =>
      d(subscriptionApi.endpoints.confirmSubscriptionCheckout.initiate({ shopId, sessionId: 'cs_1' })),
    );
    expectRequest(r, 'POST', `/shops/${shopId}/subscription/checkout/confirm`, { sessionId: 'cs_1' });
  });
});
