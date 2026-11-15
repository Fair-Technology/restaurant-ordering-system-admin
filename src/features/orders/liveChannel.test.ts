import { describe, expect, it, vi } from 'vitest';
import { backoffDelayMs, createLiveChannel, joinGroupMessage, parseLiveSignal, pollingIntervalFor } from './liveChannel';
import type { LiveStatus, SocketLike } from './liveChannel';

class FakeSocket implements SocketLike {
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;
  readonly url: string;
  constructor(url: string) {
    this.url = url;
  }
  send(d: string) {
    this.sent.push(d);
  }
  close() {
    this.closed = true;
  }
}

const flush = () => new Promise((r) => setTimeout(r, 0));

function setup(negotiate?: () => Promise<{ url: string | null; accessToken: string | null }>) {
  const sockets: FakeSocket[] = [];
  const timers: { fn: () => void; ms: number; id: number }[] = [];
  const statuses: LiveStatus[] = [];
  const onSignal = vi.fn();
  let nextId = 1;
  const channel = createLiveChannel({
    shopId: 'shop-1',
    negotiate: negotiate ?? (() => Promise.resolve({ url: 'wss://x/client?access_token=t', accessToken: 't' })),
    openSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    onSignal,
    onStatus: (s) => statuses.push(s),
    setTimer: (fn, ms) => {
      const id = nextId++;
      timers.push({ fn, ms, id });
      return id;
    },
    clearTimer: (id) => {
      const i = timers.findIndex((t) => t.id === id);
      if (i !== -1) timers.splice(i, 1);
    },
  });
  return { channel, sockets, timers, statuses, onSignal };
}

describe('live channel helpers', () => {
  it('backs off 1s..16s then caps at 30s', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 50].map(backoffDelayMs)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  });
  it('builds the join message', () => {
    expect(JSON.parse(joinGroupMessage('s1'))).toEqual({ type: 'joinGroup', group: 's1' });
  });
  it('polls only when not connected', () => {
    expect(pollingIntervalFor('connected')).toBe(0);
    expect(pollingIntervalFor('disabled')).toBe(10000);
    expect(pollingIntervalFor('offline')).toBe(10000);
    expect(pollingIntervalFor('connecting')).toBe(10000);
  });
  it('parses objects and strings, rejects the rest', () => {
    expect(parseLiveSignal({ type: 'new-order', orderId: 'o1' })).toEqual({ type: 'new-order', orderId: 'o1' });
    expect(parseLiveSignal('{"type":"new-order","orderId":"o1"}')).toEqual({ type: 'new-order', orderId: 'o1' });
    for (const bad of ['{}', 'not json', '{"type":"other"}', null, undefined, 5]) expect(parseLiveSignal(bad)).toBeNull();
  });
});

describe('createLiveChannel', () => {
  it('joins the shop group on open and signals on new-order only', async () => {
    const t = setup();
    t.channel.start();
    await flush();
    const s = t.sockets[0];
    expect(s.url).toBe('wss://x/client?access_token=t');
    s.onopen!();
    expect(t.channel.status()).toBe('connected');
    expect(JSON.parse(s.sent[0])).toEqual({ type: 'joinGroup', group: 'shop-1' });
    s.onmessage!({ data: '{"type":"new-order","orderId":"o1"}' });
    expect(t.onSignal).toHaveBeenCalledTimes(1);
    s.onmessage!({ data: { type: 'new-order', orderId: 'o2' } });
    expect(t.onSignal).toHaveBeenCalledTimes(2);
    for (const junk of ['{}', 'not json', '{"type":"other"}', null]) s.onmessage!({ data: junk });
    expect(t.onSignal).toHaveBeenCalledTimes(2);
  });

  it('is disabled with no socket when negotiate returns null, and retries once on a timer', async () => {
    const t = setup(() => Promise.resolve({ url: null, accessToken: null }));
    t.channel.start();
    await flush();
    expect(t.channel.status()).toBe('disabled');
    expect(t.sockets).toHaveLength(0);
    expect(t.timers.map((x) => x.ms)).toEqual([backoffDelayMs(1)]);
  });

  it('is disabled when negotiate rejects, without an unhandled rejection', async () => {
    const t = setup(() => Promise.reject(new Error('boom')));
    t.channel.start();
    await flush();
    expect(t.channel.status()).toBe('disabled');
    expect(t.timers).toHaveLength(1);
    expect(pollingIntervalFor(t.channel.status())).toBe(10000);
  });

  it('reconnects after a close with a fresh negotiate and socket', async () => {
    const negotiate = vi.fn(() => Promise.resolve({ url: 'wss://x', accessToken: 't' }));
    const t = setup(negotiate);
    t.channel.start();
    await flush();
    t.sockets[0].onopen!();
    t.sockets[0].onclose!();
    expect(t.channel.status()).toBe('offline');
    expect(t.timers.map((x) => x.ms)).toEqual([backoffDelayMs(1)]);
    t.sockets[0].onerror?.();
    expect(t.timers).toHaveLength(1);
    t.timers[0].fn();
    await flush();
    expect(negotiate).toHaveBeenCalledTimes(2);
    expect(t.sockets).toHaveLength(2);
  });

  it('stop() closes the socket and silences later messages', async () => {
    const t = setup();
    t.channel.start();
    await flush();
    const s = t.sockets[0];
    s.onopen!();
    const handler = s.onmessage!;
    t.channel.stop();
    expect(s.closed).toBe(true);
    handler({ data: '{"type":"new-order","orderId":"o1"}' });
    expect(t.onSignal).not.toHaveBeenCalled();
  });

  it('a negotiate resolving after stop() opens no socket', async () => {
    let resolve!: (v: { url: string; accessToken: string }) => void;
    const t = setup(() => new Promise((r) => (resolve = r)));
    t.channel.start();
    t.channel.stop();
    resolve({ url: 'wss://x', accessToken: 't' });
    await flush();
    expect(t.sockets).toHaveLength(0);
  });
});
