import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { showsUnwatchedWarning, startHeartbeat, type HeartbeatEnv } from './ordersScreen';

describe('startHeartbeat', () => {
  let doc: HeartbeatEnv['doc'] & EventTarget;
  let win: HeartbeatEnv['win'] & EventTarget;
  let send: Mock<() => void>;
  beforeEach(() => {
    vi.useFakeTimers();
    doc = Object.assign(new EventTarget(), { visibilityState: 'hidden' as DocumentVisibilityState }) as unknown as HeartbeatEnv['doc'] & EventTarget;
    win = new EventTarget() as unknown as HeartbeatEnv['win'] & EventTarget;
    send = vi.fn<() => void>();
  });
  afterEach(() => vi.useRealTimers());

  it('sends one heartbeat at once and one every 60 seconds', () => {
    startHeartbeat(send, { doc, win });
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(59_999);
    expect(send).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(send).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(60_000);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('sends again when the tab becomes visible, not while it is hidden', () => {
    startHeartbeat(send, { doc, win });
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(send).toHaveBeenCalledTimes(1);
    (doc as unknown as { visibilityState: string }).visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('sends again when the connection comes back', () => {
    startHeartbeat(send, { doc, win });
    win.dispatchEvent(new Event('online'));
    expect(send).toHaveBeenCalledTimes(2);
  });

  it('stopping it ends the interval and the listeners', () => {
    const stop = startHeartbeat(send, { doc, win });
    stop();
    vi.advanceTimersByTime(120_000);
    (doc as unknown as { visibilityState: string }).visibilityState = 'visible';
    doc.dispatchEvent(new Event('visibilitychange'));
    win.dispatchEvent(new Event('online'));
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('showsUnwatchedWarning', () => {
  const on = { lastSeenAt: null, watched: false, autoAcceptOn: true };
  it('no data or an older backend: no warning', () => {
    expect(showsUnwatchedWarning(undefined, false)).toBe(false);
    expect(showsUnwatchedWarning({}, false)).toBe(false);
  });
  it('auto-accept on and no board seen: warning', () => {
    expect(showsUnwatchedWarning({ ordersScreen: on }, false)).toBe(true);
  });
  it('a board is open: no warning', () => {
    expect(showsUnwatchedWarning({ ordersScreen: { ...on, watched: true } }, false)).toBe(false);
  });
  it('auto-accept off: no warning', () => {
    expect(showsUnwatchedWarning({ ordersScreen: { ...on, autoAcceptOn: false } }, false)).toBe(false);
  });
  it('never on the orders page itself', () => {
    expect(showsUnwatchedWarning({ ordersScreen: on }, true)).toBe(false);
  });
});
