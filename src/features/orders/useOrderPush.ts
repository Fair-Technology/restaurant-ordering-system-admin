import { useCallback, useMemo, useState } from 'react';
import { store } from '../../store';
import { ordersApi } from '../../services/ordersApi';
import { disablePush, enablePush, type PushDeps, type PushEnv, type PushState, type PushSubscriptionLike } from './push';

function errorField(e: unknown, field: 'status' | 'data'): unknown {
  return typeof e === 'object' && e !== null ? (e as Record<string, unknown>)[field] : undefined;
}

function isNotConfigured(e: unknown): boolean {
  if (errorField(e, 'status') === 503) return true;
  const data = errorField(e, 'data');
  if (typeof data !== 'object' || data === null) return false;
  const { code, error } = data as { code?: unknown; error?: unknown };
  return code === 'NOT_CONFIGURED' || error === 'NOT_CONFIGURED';
}

function buildEnv(shopId: string): PushEnv {
  const storageKey = `orders.push.endpoint.${shopId}`;
  return {
    supported: () =>
      typeof navigator !== 'undefined' &&
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window,
    requestPermission: () => Notification.requestPermission(),
    ensureWorker: async () => {
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      return {
        subscribe: async (key) => {
          const s = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: key as BufferSource,
          });
          return s.toJSON() as PushSubscriptionLike;
        },
      };
    },
    storedEndpoint: () => {
      try {
        return localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    storeEndpoint: (endpoint) => {
      try {
        if (endpoint === null) localStorage.removeItem(storageKey);
        else localStorage.setItem(storageKey, endpoint);
      } catch {
        // private mode: the endpoint just isn't remembered
      }
    },
  };
}

function buildDeps(shopId: string): PushDeps {
  return {
    getPublicKey: async () => {
      try {
        const data = await store
          .dispatch(ordersApi.endpoints.getPushPublicKey.initiate({ shopId }, { forceRefetch: true, subscribe: false }))
          .unwrap();
        return data.publicKey ?? null;
      } catch {
        return null;
      }
    },
    post: async (sub) => {
      try {
        await store.dispatch(ordersApi.endpoints.subscribePush.initiate({ shopId, ...sub })).unwrap();
        return 'ok';
      } catch (e) {
        return isNotConfigured(e) ? 'unavailable' : 'failed';
      }
    },
    remove: async (endpoint) => {
      try {
        await store.dispatch(ordersApi.endpoints.unsubscribePush.initiate({ shopId, endpoint })).unwrap();
      } catch {
        // best effort
      }
    },
  };
}

/** Web Push opt-in for a shop. `enable` must be called from a click handler, synchronously. */
export function useOrderPush(shopId: string): { pushState: PushState; enable: () => Promise<void>; disable: () => Promise<void> } {
  const [pushState, setPushState] = useState<PushState>('off');
  const env = useMemo(() => buildEnv(shopId), [shopId]);
  const deps = useMemo(() => buildDeps(shopId), [shopId]);

  const enable = useCallback(async () => {
    const state = await enablePush(env, deps);
    setPushState(state);
    if (state === 'enabled') {
      try {
        navigator.serviceWorker.controller?.postMessage({ type: 'orders-path', path: window.location.pathname });
      } catch {
        // the worker falls back to '/'
      }
    }
  }, [env, deps]);

  const disable = useCallback(async () => {
    await disablePush(env, deps);
    setPushState('off');
  }, [env, deps]);

  return { pushState, enable, disable };
}
