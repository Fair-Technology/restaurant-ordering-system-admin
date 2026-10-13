import type { OrderQueueDto } from '../../services/ordersApi';

export const HEARTBEAT_INTERVAL_MS = 60_000;

export interface HeartbeatEnv {
  doc: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  win: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/**
 * Tells the server this orders board is open: at once, every minute, when the tab becomes visible
 * again and when the connection returns. Returns a function that stops all of it.
 */
export function startHeartbeat(send: () => void, env: HeartbeatEnv, intervalMs = HEARTBEAT_INTERVAL_MS): () => void {
  send();
  const timer = setInterval(send, intervalMs);
  const onVisible = () => {
    if (env.doc.visibilityState === 'visible') send();
  };
  env.doc.addEventListener('visibilitychange', onVisible);
  env.win.addEventListener('online', send);
  return () => {
    clearInterval(timer);
    env.doc.removeEventListener('visibilitychange', onVisible);
    env.win.removeEventListener('online', send);
  };
}

/** Warn only when auto-accept is on and no board is open, and never on the Orders page itself. */
export function showsUnwatchedWarning(
  queue: Pick<OrderQueueDto, 'ordersScreen'> | undefined,
  onOrdersPage: boolean,
): boolean {
  const s = queue?.ordersScreen;
  return !onOrdersPage && !!s && s.autoAcceptOn && !s.watched;
}
