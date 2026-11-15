import { describe, expect, it, vi } from 'vitest';
import { disablePush, enablePush, urlBase64ToUint8Array } from './push';
import type { PushDeps, PushEnv, PushSubscriptionLike } from './push';

const sub: PushSubscriptionLike = { endpoint: 'https://push/new', keys: { p256dh: 'p', auth: 'a' } };

function make(over: { env?: Partial<PushEnv>; deps?: Partial<PushDeps> } = {}) {
  let stored: string | null = null;
  const subscribe = vi.fn(() => Promise.resolve<PushSubscriptionLike | null>(sub));
  const env: PushEnv = {
    supported: () => true,
    requestPermission: vi.fn(() => Promise.resolve('granted')),
    ensureWorker: vi.fn(() => Promise.resolve({ subscribe })),
    storedEndpoint: () => stored,
    storeEndpoint: vi.fn((e: string | null) => {
      stored = e;
    }),
    ...over.env,
  };
  const deps: PushDeps = {
    getPublicKey: vi.fn(() => Promise.resolve('BAAA')),
    post: vi.fn(() => Promise.resolve<'ok' | 'unavailable' | 'failed'>('ok')),
    remove: vi.fn(() => Promise.resolve()),
    ...over.deps,
  };
  return { env, deps, subscribe, setStored: (v: string | null) => (stored = v), getStored: () => stored };
}

describe('urlBase64ToUint8Array', () => {
  it('decodes a 65-byte VAPID key with - and _ and no padding', () => {
    const bytes = new Uint8Array(65).map((_, i) => (i === 0 ? 4 : 250 - i));
    const b64url = Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    expect(b64url).toMatch(/[-_]/);
    const out = urlBase64ToUint8Array(b64url);
    expect(out).toHaveLength(65);
    expect([...out]).toEqual([...bytes]);
  });
});

describe('enablePush', () => {
  it('is unsupported without touching anything', async () => {
    const m = make({ env: { supported: () => false } });
    expect(await enablePush(m.env, m.deps)).toBe('unsupported');
    expect(m.env.requestPermission).not.toHaveBeenCalled();
  });
  it('is denied without subscribing', async () => {
    const m = make({ env: { requestPermission: () => Promise.resolve('denied') } });
    expect(await enablePush(m.env, m.deps)).toBe('denied');
    expect(m.deps.post).not.toHaveBeenCalled();
    expect(m.env.ensureWorker).not.toHaveBeenCalled();
  });
  it('is unavailable when the public key is null or throws', async () => {
    const a = make({ deps: { getPublicKey: () => Promise.resolve(null) } });
    expect(await enablePush(a.env, a.deps)).toBe('unavailable');
    expect(a.env.ensureWorker).not.toHaveBeenCalled();
    const b = make({ deps: { getPublicKey: () => Promise.reject(new Error('x')) } });
    expect(await enablePush(b.env, b.deps)).toBe('unavailable');
  });
  it('is unavailable when the browser gives no subscription', async () => {
    const m = make();
    m.subscribe.mockResolvedValueOnce(null);
    expect(await enablePush(m.env, m.deps)).toBe('unavailable');
  });
  it('treats a 503-style post as unavailable and stores nothing', async () => {
    const m = make({ deps: { post: () => Promise.resolve('unavailable') } });
    await expect(enablePush(m.env, m.deps)).resolves.toBe('unavailable');
    expect(m.env.storeEndpoint).not.toHaveBeenCalled();
  });
  it('enables and stores the endpoint', async () => {
    const m = make();
    expect(await enablePush(m.env, m.deps)).toBe('enabled');
    expect(m.getStored()).toBe(sub.endpoint);
    expect(m.deps.remove).not.toHaveBeenCalled();
  });
  it('removes a rotated endpoint before storing the new one', async () => {
    const m = make();
    m.setStored('https://push/old');
    expect(await enablePush(m.env, m.deps)).toBe('enabled');
    expect(m.deps.remove).toHaveBeenCalledWith('https://push/old');
    expect(m.getStored()).toBe(sub.endpoint);
  });
  it('ignores a failing remove of the old endpoint', async () => {
    const m = make({ deps: { remove: () => Promise.reject(new Error('x')) } });
    m.setStored('https://push/old');
    expect(await enablePush(m.env, m.deps)).toBe('enabled');
    expect(m.getStored()).toBe(sub.endpoint);
  });
  it('maps a throwing post to off instead of rejecting', async () => {
    const m = make({ deps: { post: () => Promise.reject(new Error('x')) } });
    await expect(enablePush(m.env, m.deps)).resolves.toBe('off');
  });
  it('maps a failed post to off', async () => {
    const m = make({ deps: { post: () => Promise.resolve('failed') } });
    expect(await enablePush(m.env, m.deps)).toBe('off');
  });
});

describe('disablePush', () => {
  it('removes and clears the stored endpoint', async () => {
    const m = make();
    m.setStored('https://push/old');
    await disablePush(m.env, m.deps);
    expect(m.deps.remove).toHaveBeenCalledWith('https://push/old');
    expect(m.getStored()).toBeNull();
  });
  it('still clears when remove throws', async () => {
    const m = make({ deps: { remove: () => Promise.reject(new Error('x')) } });
    m.setStored('https://push/old');
    await expect(disablePush(m.env, m.deps)).resolves.toBeUndefined();
    expect(m.getStored()).toBeNull();
  });
});
