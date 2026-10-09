import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { useGetOrderQueueQuery } from '../../services/ordersApi';
import {
  connectionState,
  groupQueue,
  hasWaitingOrders,
  newlyAutoAcceptedIds,
  pruneSettledAccepts,
  withoutPendingAccept,
  withPendingAccepts,
  type PendingAccept,
} from '../../features/orders/intake';
import { useOrderAlarm } from '../../features/orders/useOrderAlarm';
import { useWakeLock } from '../../features/orders/useWakeLock';
import { useNow } from '../../features/orders/useNow';
import { MySpinner } from '../ui/MySpinner';
import { MyButton } from '../ui/MyButton';
import { OrderCard } from './OrderCard';
import { UpcomingOrders } from './UpcomingOrders';
import { BusyModeButton } from './BusyModeButton';
import type { IntakeOrder } from '../../services/ordersApi';

interface Props {
  shopId: string;
}

const NO_ORDERS: IntakeOrder[] = [];

export function OrderIntakeBoard({ shopId }: Props) {
  const { t } = useTranslation();
  const { data, isLoading, isError, fulfilledTimeStamp, refetch } = useGetOrderQueueQuery(
    { shopId },
    { pollingInterval: 10000, refetchOnReconnect: true },
  );
  const nowMs = useNow(1000);
  // Orders staff just accepted, shown as in progress while the server is still taking the payment
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

  if (isLoading) return <MySpinner label={t('orders.queueLoading')} />;
  if (isError && !data) return <p className="text-red-500">{t('orders.queueLoadError')}</p>;

  const { waiting, inProgress, ready } = groupQueue(orders);
  const columns = [
    { key: 'waiting', title: t('orders.columnWaiting'), items: waiting },
    { key: 'inProgress', title: t('orders.columnInProgress'), items: inProgress },
    { key: 'ready', title: t('orders.columnReady'), items: ready },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-white border border-gray-200 rounded-2xl px-4 py-3">
        <BusyModeButton shopId={shopId} busy={data?.busy} />
        <span
          className={`inline-flex items-center gap-2 text-sm font-medium ${
            connection === 'offline' ? 'text-red-600' : connection === 'connected' ? 'text-green-700' : 'text-gray-500'
          }`}
        >
          {connection === 'offline' ? <WifiOff size={18} /> : <Wifi size={18} />}
          {t(`orders.${connection}`)}
        </span>
        {soundOn ? (
          <span className="inline-flex items-center gap-2 text-sm text-gray-700">
            <Volume2 size={18} />
            {t('orders.soundOn')}
          </span>
        ) : (
          <MyButton size="lg" variant="secondary" onClick={() => void turnOn()} className="min-h-12 gap-2">
            <VolumeX size={18} />
            {t('orders.enableSound')}
          </MyButton>
        )}
        {soundOn && (
          <span className="text-xs text-gray-500">
            {wakeLock === 'on' ? t('orders.wakeLockOn') : wakeLock === 'unsupported' ? t('orders.wakeLockUnsupported') : null}
          </span>
        )}
      </div>

      {data?.busy?.active && (
        <div
          role="status"
          className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-4 py-3 text-sm"
        >
          {t('orders.busyBanner', { minutes: data.busy.extraMinutes })}
        </div>
      )}

      {!soundOn && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <Bell size={18} />
          {t('orders.soundOff')}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3 items-start">
        {columns.map((col) => (
          <section key={col.key} className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-700">
              {col.title} ({col.items.length})
            </h2>
            {col.items.length === 0 ? (
              <p className="text-sm text-gray-400">{t('orders.emptyColumn')}</p>
            ) : (
              col.items.map((order) => (
                <OrderCard
                  key={order.id}
                  shopId={shopId}
                  order={order}
                  nowMs={nowMs}
                  defaultPrepMinutes={data?.defaultPrepMinutes[order.fulfilmentMode] ?? 20}
                  timeZone={data?.timezone ?? 'Europe/Berlin'}
                  pendingAccept={livePending.has(order.id) && order.state === 'ACCEPTED'}
                  onAcceptStart={startAccept}
                  onAcceptFailed={failAccept}
                  onFailed={() => void refetch()}
                />
              ))
            )}
          </section>
        ))}
      </div>

      {data?.upcoming !== undefined && (
        <UpcomingOrders
          shopId={shopId}
          orders={data.upcoming}
          timeZone={data.timezone}
          onFailed={() => void refetch()}
        />
      )}
    </div>
  );
}
