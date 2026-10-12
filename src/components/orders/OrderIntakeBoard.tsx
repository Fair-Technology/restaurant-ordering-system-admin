import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { groupQueue, PHONE_TABS, visibleColumns, type BoardVariant, type PhoneTab } from '../../features/orders/intake';
import { useLiveQueue } from '../../features/orders/useLiveQueue';
import { MySpinner } from '../ui/MySpinner';
import { MyButton } from '../ui/MyButton';
import { OrderCard } from './OrderCard';
import { UpcomingOrders } from './UpcomingOrders';
import { BusyModeButton } from './BusyModeButton';

interface Props {
  shopId: string;
  variant?: BoardVariant;
}

export function OrderIntakeBoard({ shopId, variant = 'board' }: Props) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<PhoneTab>('waiting');
  const {
    data, orders, isLoading, isError, refetch, nowMs, startAccept, failAccept, isPendingAccept, soundOn, turnOn, wakeLock, connection,
  } = useLiveQueue(shopId);

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

      {variant === 'phone' && (
        <div className="flex gap-2">
          {PHONE_TABS.map((key) => {
            const col = columns.find((c) => c.key === key)!;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 min-h-12 px-2 text-sm font-medium rounded-xl border transition-colors ${
                  tab === key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {col.title} ({col.items.length})
              </button>
            );
          })}
        </div>
      )}

      <div className={variant === 'phone' ? 'grid gap-4 items-start' : 'grid gap-4 lg:grid-cols-3 items-start'}>
        {visibleColumns(columns, variant, tab).map((col) => (
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
                  pendingAccept={isPendingAccept(order)}
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
          capacity={data.capacity ?? null}
          timeZone={data.timezone}
          onFailed={() => void refetch()}
        />
      )}
    </div>
  );
}
