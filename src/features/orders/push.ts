export type PushState = 'off' | 'enabled' | 'unavailable' | 'denied' | 'unsupported';
export interface PushSubscriptionLike {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
export interface PushEnv {
  supported: () => boolean;
  requestPermission: () => Promise<string>;
  ensureWorker: () => Promise<{ subscribe: (key: Uint8Array) => Promise<PushSubscriptionLike | null> }>;
  storedEndpoint: () => string | null;
  storeEndpoint: (endpoint: string | null) => void;
}
export interface PushDeps {
  getPublicKey: () => Promise<string | null>;
  post: (sub: PushSubscriptionLike) => Promise<'ok' | 'unavailable' | 'failed'>;
  remove: (endpoint: string) => Promise<void>;
}

/** VAPID public key (base64url) → bytes for `applicationServerKey`. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const std = base64.replace(/-/g, '+').replace(/_/g, '/');
  const padded = std + '='.repeat((4 - (std.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Runs the whole opt-in. Must be called synchronously from a click: it starts with requestPermission(). Never rejects. */
export async function enablePush(env: PushEnv, deps: PushDeps): Promise<PushState> {
  try {
    if (!env.supported()) return 'unsupported';
    // No await before this call: the browser only prompts inside the click's task.
    if ((await env.requestPermission()) !== 'granted') return 'denied';

    let key: string | null;
    try {
      key = await deps.getPublicKey();
    } catch {
      key = null;
    }
    if (!key) return 'unavailable';

    const worker = await env.ensureWorker();
    const sub = await worker.subscribe(urlBase64ToUint8Array(key));
    if (!sub) return 'unavailable';

    const result = await deps.post(sub);
    if (result === 'unavailable') return 'unavailable';
    if (result === 'failed') return 'off';

    const old = env.storedEndpoint();
    if (old && old !== sub.endpoint) {
      try {
        await deps.remove(old);
      } catch {
        // the stale endpoint expires on its own
      }
    }
    env.storeEndpoint(sub.endpoint);
    return 'enabled';
  } catch {
    return 'off';
  }
}

export async function disablePush(env: PushEnv, deps: PushDeps): Promise<void> {
  try {
    const endpoint = env.storedEndpoint();
    if (endpoint) {
      try {
        await deps.remove(endpoint);
      } catch {
        // clear locally regardless
      }
    }
    env.storeEndpoint(null);
  } catch {
    // never reject
  }
}
