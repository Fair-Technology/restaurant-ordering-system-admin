import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGetOrderQueueQuery, type IntakeOrder } from '../../services/ordersApi';
import {
  connectionState,
  hasWaitingOrders,
  newlyAutoAcceptedIds,
  pruneSettledAccepts,
  withoutPendingAccept,
  withPendingAccepts,
  type PendingAccept,
} from './intake';
import { useOrderAlarm } from './useOrderAlarm';
import { useWakeLock } from './useWakeLock';
import { useNow } from './useNow';

const NO_ORDERS: IntakeOrder[] = [];

/**
 * The live order queue, shared by the orders page and the phone view: polls every 10 s, shows an
 * order as accepted from the first tap (while the server takes the payment), rings while orders
 * wait, chimes once for each auto-accepted order and keeps the screen on while the sound is on.
 */
export function useLiveQueue(shopId: string) {
  const { data, isLoading, isError, fulfilledTimeStamp, refetch } = useGetOrderQueueQuery(
    { shopId },
    { pollingInterval: 10000, refetchOnReconnect: true },
  );
  const nowMs = useNow(1000);

  const [pending, setPending] = useState<ReadonlyMap<string, PendingAccept>>(() => new Map());
  const livePending = useMemo(
    () => (data ? pruneSettledAccepts(pending, data.orders, Date.parse(data.serverTime)) : pending),
    [data, pending],
  );
  const orders = useMemo(() => withPendingAccepts(data?.orders ?? NO_ORDERS, livePending), [data, livePending]);
  const startAccept = useCallback(
    (id: string, prepMinutes: number) => setPending((m) => new Map(m).set(id, { prepMinutes, atMs: Date.now() })),
    [],
  );
  const failAccept = useCallback((id: string) => setPending((m) => withoutPendingAccept(m, id)), []);
  const isPendingAccept = useCallback(
    (order: IntakeOrder) => livePending.has(order.id) && order.state === 'ACCEPTED',
    [livePending],
  );

  const { soundOn, turnOn, chime } = useOrderAlarm(hasWaitingOrders(orders));
  // Ids of auto-accepted orders already shown; null until the first data arrives, which only seeds it.
  const seenRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!data) return;
    const fresh = newlyAutoAcceptedIds(data.orders, seenRef.current ?? new Set());
    const isFirstData = seenRef.current === null;
    seenRef.current ??= new Set();
    for (const id of fresh) seenRef.current.add(id);
    if (!isFirstData && fresh.length > 0) chime();
  }, [data, chime]);
  const wakeLock = useWakeLock(soundOn);
  const connection = connectionState({ lastSuccessAt: fulfilledTimeStamp, isError, nowMs });

  return {
    data,
    orders,
    isLoading,
    isError,
    refetch,
    nowMs,
    startAccept,
    failAccept,
    isPendingAccept,
    soundOn,
    turnOn,
    wakeLock,
    connection,
  };
}
