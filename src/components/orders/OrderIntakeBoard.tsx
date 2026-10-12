import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { groupQueue, PHONE_TABS, visibleColumns, type BoardVariant, type PhoneTab } from '../../features/orders/intake';
import { useLiveQueue } from '../../features/orders/useLiveQueue';
import { MySpinner } from '../ui/MySpinner';
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
  if (isError && !data) return <p className="text-sm text-[#b42318]">{t('orders.queueLoadError')}</p>;

  const { waiting, inProgress, ready } = groupQueue(orders);
  const columns = [
    { key: 'waiting', title: t('orders.columnWaiting'), items: waiting, dot: 'bg-[#c2410c]' },
    { key: 'inProgress', title: t('orders.columnInProgress'), items: inProgress, dot: 'bg-ink' },
    { key: 'ready', title: t('orders.columnReady'), items: ready, dot: 'bg-[#2f8a4c]' },
  ];

  return (
    <div className="space-y-3.5">
      {/* Status pills, like the header of "Bestellungen" */}
      <div className="flex flex-wrap items-center gap-2">
        <span
          title={t(`orders.${connection}`)}
          className={`inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${
            connection === 'connected'
              ? 'bg-[#e6f3ea] text-[#1d5a32]'
              : connection === 'offline'
                ? 'bg-[#fdeceb] text-[#b42318]'
                : 'bg-sand text-[#4a413b]'
          }`}
        >
          {connection === 'offline' ? <WifiOff size={15} aria-hidden="true" /> : <Wifi size={15} aria-hidden="true" />}
          {t(`orders.live.connection.${connection}`)}
        </span>
        {soundOn ? (
          <span className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[#e3d9ce] bg-white px-3.5 text-[13px] font-semibold text-[#4a413b]">
            <Volume2 size={15} aria-hidden="true" />
            {t('orders.soundOn')}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => void turnOn()}
            className="inline-flex min-h-12 items-center gap-1.5 rounded-full border border-[#f5c2bd] bg-white px-4 text-[13px] font-bold text-[#b42318] hover:bg-[#fdeceb]"
          >
            <VolumeX size={16} aria-hidden="true" />
            {t('orders.enableSound')}
          </button>
        )}
        <BusyModeButton shopId={shopId} busy={data?.busy} />
      </div>

      {/* Things the kitchen must know */}
      {!soundOn && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3.5 py-2.5 text-sm font-semibold text-[#8f1c13]"
        >
          <Bell size={16} className="flex-shrink-0" aria-hidden="true" />
          {t('orders.soundOff')}
        </div>
      )}
      {connection === 'offline' && (
        <div role="alert" className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3.5 py-2.5 text-sm text-[#8f1c13]">
          {t('orders.offline')}
        </div>
      )}
      {data?.busy?.active && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-[#f1dfae] bg-[#fff6e0] px-3.5 py-2.5 text-sm text-[#5c3c00]"
        >
          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#d97706]" aria-hidden="true" />
          {t('orders.busyBanner', { minutes: data.busy.extraMinutes })}
        </div>
      )}
      {soundOn && (wakeLock === 'on' || wakeLock === 'unsupported') && (
        <p className="text-[13px] text-muted">
          {wakeLock === 'on' ? t('orders.wakeLockOn') : t('orders.wakeLockUnsupported')}
        </p>
      )}

      {variant === 'phone' && (
        <div role="group" aria-label={t('orders.live.filters')} className="flex gap-2">
          {PHONE_TABS.map((key) => {
            const col = columns.find((c) => c.key === key)!;
            const on = tab === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setTab(key)}
                className={`flex min-h-12 flex-1 flex-col items-center justify-center rounded-full border px-2 py-1 text-[13px] leading-tight font-semibold transition-colors ${
                  on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
                }`}
              >
                <span>{col.title}</span>
                <span className="text-xs opacity-70">{col.items.length}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className={variant === 'phone' ? 'grid items-start gap-4' : 'grid items-start gap-[18px] lg:grid-cols-3'}>
        {visibleColumns(columns, variant, tab).map((col) => (
          <section key={col.key} className="space-y-3">
            <div className="flex items-center gap-2.5 px-1">
              <span className={`h-[9px] w-[9px] rounded-full ${col.dot}`} aria-hidden="true" />
              <h2 className="text-[15px] font-bold">{col.title}</h2>
              <span className="text-[13px] text-[#8a7f77]">{col.items.length}</span>
            </div>
            {col.items.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-[#e3d9ce] p-4 text-sm text-[#8a7f77]">{t('orders.emptyColumn')}</p>
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
