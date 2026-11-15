export type LiveStatus = 'connecting' | 'connected' | 'offline' | 'disabled';
export interface LiveSignal {
  type: 'new-order';
  orderId: string;
}

/** Reads a Web PubSub message (JSON string or already-parsed object); anything else is null. */
export function parseLiveSignal(raw: unknown): LiveSignal | null {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;
  const { type, orderId } = value as { type?: unknown; orderId?: unknown };
  if (type !== 'new-order' || typeof orderId !== 'string') return null;
  return { type: 'new-order', orderId };
}

/** 1-based retry number → 1 s, 2 s, 4 s, 8 s, 16 s, then 30 s. Attempt 0 is treated as the first retry. */
export function backoffDelayMs(attempt: number): number {
  const n = Math.max(1, Math.floor(attempt));
  return Math.min(30000, 1000 * 2 ** (n - 1));
}

export function joinGroupMessage(shopId: string): string {
  return JSON.stringify({ type: 'joinGroup', group: shopId });
}

/** The 10 s poll is only the fallback: it stops while the live channel is connected. */
export function pollingIntervalFor(status: LiveStatus): number {
  return status === 'connected' ? 0 : 10000;
}

export interface SocketLike {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
  send(data: string): void;
  close(): void;
}
export interface LiveChannelDeps {
  shopId: string;
  negotiate: () => Promise<{ url: string | null; accessToken: string | null }>;
  openSocket: (url: string) => SocketLike;
  onSignal: () => void;
  onStatus: (status: LiveStatus) => void;
  setTimer?: (fn: () => void, ms: number) => number;
  clearTimer?: (id: number) => void;
}
export interface LiveChannel {
  start(): void;
  stop(): void;
  status(): LiveStatus;
}

export function createLiveChannel(deps: LiveChannelDeps): LiveChannel {
  const setTimer = deps.setTimer ?? ((fn, ms) => window.setTimeout(fn, ms));
  const clearTimer = deps.clearTimer ?? ((id) => window.clearTimeout(id));

  let current: LiveStatus = 'connecting';
  let epoch = 0;
  let running = false;
  let attempt = 0;
  let timer: number | null = null;
  let socket: SocketLike | null = null;

  function setStatus(next: LiveStatus): void {
    current = next;
    try {
      deps.onStatus(next);
    } catch {
      // a listener failure must not break the channel
    }
  }

  function dropSocket(): void {
    const s = socket;
    socket = null;
    if (!s) return;
    s.onopen = s.onmessage = s.onclose = s.onerror = null;
    try {
      s.close();
    } catch {
      // already closed
    }
  }

  function scheduleRetry(myEpoch: number): void {
    if (timer !== null) clearTimer(timer);
    attempt += 1;
    timer = setTimer(() => {
      timer = null;
      if (myEpoch === epoch && running) void connect();
    }, backoffDelayMs(attempt));
  }

  async function connect(): Promise<void> {
    const myEpoch = ++epoch;
    setStatus('connecting');
    let url: string | null;
    try {
      url = (await deps.negotiate()).url;
    } catch {
      if (myEpoch !== epoch) return;
      setStatus('disabled');
      scheduleRetry(myEpoch);
      return;
    }
    if (myEpoch !== epoch) return;
    if (!url) {
      setStatus('disabled');
      scheduleRetry(myEpoch);
      return;
    }
    let s: SocketLike;
    try {
      s = deps.openSocket(url);
    } catch {
      setStatus('disabled');
      scheduleRetry(myEpoch);
      return;
    }
    socket = s;
    const lost = (): void => {
      if (myEpoch !== epoch || socket !== s) return;
      dropSocket();
      setStatus('offline');
      scheduleRetry(myEpoch);
    };
    s.onopen = () => {
      if (myEpoch !== epoch || socket !== s) return;
      attempt = 0;
      setStatus('connected');
      try {
        s.send(joinGroupMessage(deps.shopId));
      } catch {
        lost();
      }
    };
    s.onmessage = (ev) => {
      if (myEpoch !== epoch || socket !== s) return;
      if (parseLiveSignal(ev.data)) deps.onSignal();
    };
    s.onclose = lost;
    s.onerror = lost;
  }

  return {
    start() {
      if (running) return;
      running = true;
      attempt = 0;
      void connect();
    },
    stop() {
      running = false;
      epoch += 1;
      if (timer !== null) clearTimer(timer);
      timer = null;
      dropSocket();
    },
    status: () => current,
  };
}
