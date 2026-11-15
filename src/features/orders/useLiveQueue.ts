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
import { useLiveChannel } from './useLiveChannel';
import { useOrderPush } from './useOrderPush';
import { pollingIntervalFor } from './liveChannel';

const NO_ORDERS: IntakeOrder[] = [];

/**
 * The live order queue, shared by the orders page and the phone view: listens on the live channel (polling every 10 s whenever it is not connected), shows an
 * order as accepted from the first tap (while the server takes the payment), rings while orders
 * wait, chimes once for each auto-accepted order and keeps the screen on while the sound is on.
 */
export function useLiveQueue(shopId: string) {
  // Declared first so the channel's onSignal can refetch; the poll interval depends on the channel status.
  const refetchRef = useRef<() => unknown>(() => undefined);
  const channel = useLiveChannel({ shopId, onSignal: () => void refetchRef.current() });
  const { data, isLoading, isError, fulfilledTimeStamp, refetch } = useGetOrderQueueQuery(
    { shopId },
    { pollingInterval: pollingIntervalFor(channel.status), refetchOnReconnect: true },
  );
  useEffect(() => {
    refetchRef.current = refetch;
  });
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

  const { soundOn, turnOn: turnOnAlarm, chime } = useOrderAlarm(hasWaitingOrders(orders));
  const push = useOrderPush(shopId);
  const enablePush = push.enable;
  const turnOn = useCallback(async () => {
    const pushAttempt = enablePush(); // must be called synchronously: it starts with requestPermission()
    await turnOnAlarm();
    await pushAttempt;
  }, [enablePush, turnOnAlarm]);
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
  const connection = connectionState({ lastSuccessAt: fulfilledTimeStamp, isError, nowMs, liveChannel: channel.status });

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
    pushState: push.pushState,
  };
}
