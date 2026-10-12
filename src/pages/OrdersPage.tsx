import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, Smartphone } from 'lucide-react';
import { useGetOrdersByShopQuery, useGetShopByIdQuery } from '../services/api';
import { useSetBusyModeMutation, type IntakeOrder, type UpcomingOrder } from '../services/ordersApi';
import { useToast } from '../contexts/ToastContext';
import { formatCountdown, slotLoadOf, upcomingByDay } from '../features/orders/intake';
import {
  ORDER_FILTERS,
  itemSummary,
  liveGroups,
  matchesOrderSearch,
  orderTiming,
  parseOrderFilter,
  type LiveGroupKey,
  type OrderFilter,
} from '../features/orders/orderView';
import { useLiveQueue } from '../features/orders/useLiveQueue';
import { nextActionLabelKey, useOrderActions } from '../features/orders/useOrderActions';
import { chargedCents } from '../features/orders/refunds';
import { formatCents } from '../utils/money';
import { MySpinner } from '../components/ui/MySpinner';
import { ModeBadge, StateBadge } from '../components/orders/OrderBadges';
import { OrderDetail, type DetailKind } from '../components/orders/OrderDetail';

const HISTORY_PAGE_SIZE = 20;
const WIDE_QUERY = '(min-width: 1280px)';

/** True from Tailwind's `xl` up, where the detail column sits next to the list. */
function useIsWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(WIDE_QUERY);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

const GROUP_DOT: Record<LiveGroupKey, string> = { new: 'bg-[#c2410c]', work: 'bg-ink', ready: 'bg-[#2f8a4c]' };

function Section({ dot, title, count, hint, children }: { dot: string; title: string; count?: number; hint?: string; children: ReactNode }) {
  return (
    <section className="mb-[18px] overflow-hidden rounded-2xl border border-line bg-white">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <span className={`h-[9px] w-[9px] rounded-full ${dot}`} aria-hidden="true" />
        <h2 className="text-[15px] font-bold">{title}</h2>
        {count !== undefined && <span className="text-[13px] text-[#8a7f77]">{count}</span>}
        {hint && <span className="ml-auto hidden text-[13px] text-muted sm:inline">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

interface RowProps {
  order: IntakeOrder;
  selected: boolean;
  onSelect: () => void;
  time: string;
  urgent?: boolean;
  money: (order: IntakeOrder) => string;
  action?: ReactNode;
}

/** One order in the list: number, guest, what they ordered, the clock, the total and one button. */
function OrderRow({ order, selected, onSelect, time, urgent = false, money, action }: RowProps) {
  const { t } = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex cursor-pointer items-center gap-3 border-b border-line-soft px-4 py-3 transition-colors last:border-b-0 hover:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
      }`}
    >
      <span className="w-16 flex-shrink-0 text-[15px] font-bold tracking-[0.02em]">#{order.orderRef}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-[15px] font-bold">{order.customerName}</span>
          <ModeBadge order={order} />
          {order.customerNotes && (
            <span className="rounded-full bg-[#fff6e0] px-[7px] py-0.5 text-[11px] font-bold text-[#8a5a00]">{t('orders.notes')}</span>
          )}
        </div>
        <span className="truncate text-[13px] text-muted">{itemSummary(order.items)}</span>
        <span className={`text-[13px] font-semibold md:hidden ${urgent ? 'text-[#b42318]' : 'text-[#4a413b]'}`}>{time}</span>
      </div>
      <span className={`hidden w-[150px] text-right text-[13px] font-semibold md:block ${urgent ? 'text-[#b42318]' : 'text-[#4a413b]'}`}>
        {time}
      </span>
      <span className="hidden w-20 text-right text-[15px] font-bold sm:block">{money(order)}</span>
      <div className="flex flex-shrink-0 justify-end gap-1.5 sm:w-[150px]">{action}</div>
    </div>
  );
}

const pill = (dark: boolean) =>
  `h-[34px] rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-50 ${
    dark ? 'bg-ink text-white' : 'border border-[#e3d9ce] bg-white text-ink hover:bg-sand'
  }`;

const chip = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
    on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
  }`;

/**
 * OrdersPage — "Bestellungen": the live queue as one list in three sections (new, in progress,
 * ready/out), with the selected order in the right column. Pre-orders and the history use the same
 * list and the same detail column.
 */
export function OrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseOrderFilter(searchParams);
  const selectedParam = searchParams.get('order');
  const [query, setQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const wide = useIsWide();

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const permissions = shop?.callerPermissions ?? [];
  const queue = useLiveQueue(shopId!);
  const { data, orders, nowMs } = queue;
  const actions = useOrderActions(shopId!, {
    onAcceptStart: queue.startAccept,
    onAcceptFailed: queue.failAccept,
    onFailed: () => void queue.refetch(),
  });
  const [setBusyMode, { isLoading: busySwitching }] = useSetBusyModeMutation();
  const history = useGetOrdersByShopQuery(
    { shopId: shopId!, page: historyPage, pageSize: HISTORY_PAGE_SIZE },
    { skip: filter !== 'history' },
  );

  const timeZone = data?.timezone ?? 'Europe/Berlin';
  const money = (order: IntakeOrder) => formatCents(chargedCents(order), order.currency, i18n.language);
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', timeZone });
  const prepFor = (order: IntakeOrder) => data?.defaultPrepMinutes[order.fulfilmentMode] ?? 20;

  const shown = useMemo(() => orders.filter((o) => matchesOrderSearch(o, query)), [orders, query]);
  const groups = liveGroups(shown, filter);
  const upcoming: UpcomingOrder[] = useMemo(
    () => (data?.upcoming ?? []).filter((o) => matchesOrderSearch(o, query)),
    [data?.upcoming, query],
  );
  const historyOrders = useMemo(
    () => ((history.data?.orders ?? []) as IntakeOrder[]).filter((o) => matchesOrderSearch(o, query)),
    [history.data, query],
  );

  // What the detail column can show for the current chip
  const kind: DetailKind = filter === 'upcoming' ? 'upcoming' : filter === 'history' ? 'history' : 'live';
  const listed: IntakeOrder[] =
    kind === 'upcoming' ? upcomingByDay(upcoming, timeZone).flatMap((d) => d.orders) : kind === 'history' ? historyOrders : groups.flatMap((g) => g.orders);
  // On a wide screen the first order is open from the start; on smaller ones only after a tap
  const selected = listed.find((o) => o.id === selectedParam) ?? (wide ? listed[0] : undefined);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    next.delete('tab');
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) next.delete(key);
      else next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };
  const pickFilter = (f: OrderFilter) => {
    if (f === 'history') setHistoryPage(1);
    update({ filter: f === 'open' ? null : f, order: null });
  };
  const select = (order: IntakeOrder) => update({ order: order.id });

  const toggleBusy = async () => {
    if (!data?.busy) return;
    try {
      await setBusyMode({ shopId: shopId!, on: !data.busy.active }).unwrap();
    } catch {
      toast.error(t('orders.busyFailed'));
    }
  };

  const counts: Record<OrderFilter, number | null> = {
    open: orders.length,
    new: liveGroups(orders, 'new')[0].orders.length,
    work: liveGroups(orders, 'work')[0].orders.length,
    ready: liveGroups(orders, 'ready')[0].orders.length,
    upcoming: data?.upcoming?.length ?? null,
    history: null,
  };

  const liveTime = (order: IntakeOrder): { text: string; urgent: boolean } => {
    const timing = orderTiming(order, nowMs);
    if (!timing) return { text: '', urgent: false };
    if (timing.kind === 'reject') return { text: t('orders.live.rejectIn', { time: formatCountdown(timing.seconds) }), urgent: timing.urgent };
    if (timing.kind === 'due') {
      if (timing.minutes < 0) return { text: t('orders.live.late', { minutes: -timing.minutes }), urgent: true };
      return { text: t(timing.delivery ? 'orders.live.deliverIn' : 'orders.live.readyIn', { minutes: timing.minutes }), urgent: timing.urgent };
    }
    if (timing.minutes === null) return { text: t(`orders.state.${order.displayState}`), urgent: false };
    return { text: t(timing.kind === 'out' ? 'orders.live.outFor' : 'orders.live.waitingFor', { minutes: timing.minutes }), urgent: false };
  };

  const rowAction = (order: IntakeOrder) => {
    const working = actions.isWorking(order.id) || queue.isPendingAccept(order);
    const stop = (fn: () => void) => (e: React.MouseEvent) => {
      e.stopPropagation();
      fn();
    };
    if (order.state === 'PLACED') {
      return (
        <button type="button" className={pill(true)} disabled={working} onClick={stop(() => void actions.accept(order, prepFor(order)))}>
          {t('orders.accept')}
        </button>
      );
    }
    const key = nextActionLabelKey(order);
    if (!key) return null;
    return (
      <button type="button" className={pill(false)} disabled={working} onClick={stop(() => void actions.advance(order))}>
        {t(key)}
      </button>
    );
  };

  const groupText: Record<LiveGroupKey, { title: string; hint: string; empty: string }> = {
    new: { title: t('orders.live.groupNew'), hint: t('orders.live.groupNewHint'), empty: t('orders.live.emptyNew') },
    work: { title: t('orders.live.groupWork'), hint: t('orders.live.groupWorkHint'), empty: t('orders.live.emptyWork') },
    ready: { title: t('orders.live.groupReady'), hint: '', empty: t('orders.live.emptyReady') },
  };

  const historyTotalPages = history.data ? Math.max(1, Math.ceil(history.data.total / HISTORY_PAGE_SIZE)) : 1;
  const selectedUpcoming = kind === 'upcoming' && selected ? (selected as UpcomingOrder) : null;

  const detail = selected ? (
    <OrderDetail
      key={`${kind}-${selected.id}`}
      shopId={shopId!}
      order={selected}
      kind={kind}
      nowMs={nowMs}
      timeZone={timeZone}
      defaultPrepMinutes={prepFor(selected)}
      permissions={permissions}
      actions={kind === 'history' ? undefined : actions}
      pendingAccept={kind === 'live' && queue.isPendingAccept(selected)}
      slotLoad={selectedUpcoming ? slotLoadOf(data?.capacity, selectedUpcoming.scheduledFor) : null}
      outsideHours={selectedUpcoming?.outsideHours}
      onClose={wide ? undefined : () => update({ order: null })}
    />
  ) : null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-[22px] pb-3.5 sm:px-7">
          <div>
            <div className="text-[13px] text-muted">{t('nav.group.service')}</div>
            <h1 className="mt-0.5 font-display text-[30px] font-semibold">
              {t('nav.orders')}{' '}
              <span className="font-sans text-[15px] font-medium text-muted">{t('orders.live.openCount', { count: orders.length })}</span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              title={t(`orders.${queue.connection}`)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold ${
                queue.connection === 'connected'
                  ? 'bg-[#e6f3ea] text-[#1d5a32]'
                  : queue.connection === 'offline'
                    ? 'bg-[#fdeceb] text-[#b42318]'
                    : 'bg-sand text-[#4a413b]'
              }`}
            >
              <span
                className={`h-[7px] w-[7px] rounded-full ${
                  queue.connection === 'connected' ? 'bg-[#2f8a4c]' : queue.connection === 'offline' ? 'bg-[#b42318]' : 'bg-[#8a7f77]'
                }`}
                aria-hidden="true"
              />
              {t(`orders.live.connection.${queue.connection}`)}
            </span>
            {queue.soundOn ? (
              <span className={chip(false)}>{t('orders.soundOn')}</span>
            ) : (
              <button type="button" className={`${chip(false)} border-[#f5c2bd] text-[#b42318]`} onClick={() => void queue.turnOn()}>
                {t('orders.live.soundOff')}
              </button>
            )}
            {data?.busy && (
              <button
                type="button"
                aria-pressed={data.busy.active}
                disabled={busySwitching}
                className={chip(data.busy.active)}
                onClick={() => void toggleBusy()}
              >
                {data.busy.active ? t('orders.live.busyOn', { minutes: data.busy.extraMinutes }) : t('orders.live.busy')}
              </button>
            )}
            <Link
              to={`/shops/${shopId}/phone`}
              className="inline-flex h-9 items-center gap-1.5 px-2 text-[13px] font-semibold text-[#4a413b] hover:text-ink"
            >
              <Smartphone size={15} aria-hidden="true" />
              {t('orders.phoneView')}
            </Link>
          </div>
        </div>

        {/* Things the kitchen must know */}
        {!queue.soundOn && (
          <div
            role="alert"
            className="mx-4 mb-3 flex flex-wrap items-center gap-2.5 rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3.5 py-2.5 text-sm font-semibold text-[#8f1c13] sm:mx-7"
          >
            <span className="h-2 w-2 rounded-full bg-[#b42318]" aria-hidden="true" />
            {t('orders.soundOff')}
            <button
              type="button"
              onClick={() => void queue.turnOn()}
              className="ml-auto h-8 rounded-full bg-[#b42318] px-3.5 text-[13px] font-bold text-white"
            >
              {t('orders.enableSound')}
            </button>
          </div>
        )}
        {queue.connection === 'offline' && (
          <div role="alert" className="mx-4 mb-3 rounded-xl border border-[#f5c2bd] bg-[#fdeceb] px-3.5 py-2.5 text-sm text-[#8f1c13] sm:mx-7">
            {t('orders.offline')}
          </div>
        )}
        {data?.busy?.active && (
          <div
            role="status"
            className="mx-4 mb-3 flex items-center gap-2.5 rounded-xl border border-[#f1dfae] bg-[#fff6e0] px-3.5 py-2.5 text-sm text-[#5c3c00] sm:mx-7"
          >
            <span className="h-2 w-2 flex-shrink-0 rounded-full bg-[#d97706]" aria-hidden="true" />
            {t('orders.busyBanner', { minutes: data.busy.extraMinutes })}
          </div>
        )}
        {queue.soundOn && queue.wakeLock === 'unsupported' && (
          <p className="mx-4 mb-3 text-[13px] text-muted sm:mx-7">{t('orders.wakeLockUnsupported')}</p>
        )}

        {/* Search and chips */}
        <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 sm:px-7">
          <label className="flex h-10 w-full items-center gap-2 rounded-[10px] border border-[#e3d9ce] bg-white px-3 sm:w-[220px]">
            <Search size={16} className="text-[#8a7f77]" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('orders.live.searchPlaceholder')}
              aria-label={t('orders.live.search')}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <div role="group" aria-label={t('orders.live.filters')} className="flex flex-wrap gap-2">
            {ORDER_FILTERS.map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} className={chip(filter === f)} onClick={() => pickFilter(f)}>
                {t(`orders.live.filter.${f}`)}
                {counts[f] !== null && <span className="text-xs opacity-70">{counts[f]}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* The list */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-7 sm:px-7">
          {kind === 'live' &&
            (queue.isLoading ? (
              <MySpinner label={t('orders.queueLoading')} />
            ) : queue.isError && !data ? (
              <p className="text-sm text-[#b42318]">{t('orders.queueLoadError')}</p>
            ) : (
              groups.map((group) => (
                <Section
                  key={group.key}
                  dot={GROUP_DOT[group.key]}
                  title={groupText[group.key].title}
                  count={group.orders.length}
                  hint={groupText[group.key].hint}
                >
                  {group.orders.length === 0 ? (
                    <p className="p-4 text-sm text-[#8a7f77]">{query ? t('orders.live.noMatch') : groupText[group.key].empty}</p>
                  ) : (
                    group.orders.map((order) => {
                      const time = liveTime(order);
                      return (
                        <OrderRow
                          key={order.id}
                          order={order}
                          selected={selected?.id === order.id}
                          onSelect={() => select(order)}
                          time={time.text}
                          urgent={time.urgent}
                          money={money}
                          action={rowAction(order)}
                        />
                      );
                    })
                  )}
                </Section>
              ))
            ))}

          {kind === 'upcoming' &&
            (upcoming.length === 0 ? (
              <Section dot="bg-[#8a7f77]" title={t('orders.live.filter.upcoming')}>
                <p className="p-4 text-sm text-[#8a7f77]">{query ? t('orders.live.noMatch') : t('orders.upcomingEmpty')}</p>
              </Section>
            ) : (
              upcomingByDay(upcoming, timeZone).map((day) => (
                <Section
                  key={day.day}
                  dot="bg-[#8a7f77]"
                  title={new Date(day.orders[0].scheduledFor!).toLocaleDateString(i18n.language, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    timeZone,
                  })}
                  count={day.orders.length}
                >
                  {day.orders.map((order) => {
                    const load = slotLoadOf(data?.capacity, order.scheduledFor);
                    return (
                      <OrderRow
                        key={order.id}
                        order={order}
                        selected={selected?.id === order.id}
                        onSelect={() => select(order)}
                        time={t('orders.live.at', { time: clock(order.scheduledFor!) })}
                        urgent={order.outsideHours || !!load?.full}
                        money={money}
                        action={<StateBadge order={order} />}
                      />
                    );
                  })}
                </Section>
              ))
            ))}

          {kind === 'history' &&
            (history.isLoading ? (
              <MySpinner label={t('orders.loading')} />
            ) : history.isError ? (
              <p className="text-sm text-[#b42318]">{t('orders.loadError')}</p>
            ) : (
              <>
                <Section dot="bg-[#8a7f77]" title={t('orders.live.filter.history')} hint={t('orders.live.historyHint')}>
                  {historyOrders.length === 0 ? (
                    <p className="p-4 text-sm text-[#8a7f77]">{query ? t('orders.live.noMatch') : t('orders.empty')}</p>
                  ) : (
                    historyOrders.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        selected={selected?.id === order.id}
                        onSelect={() => select(order)}
                        time={new Date(order.createdAt).toLocaleString(i18n.language, {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone,
                        })}
                        money={money}
                        action={<StateBadge order={order} />}
                      />
                    ))
                  )}
                </Section>
                {historyTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" className={pill(false)} disabled={historyPage === 1} onClick={() => setHistoryPage((p) => p - 1)}>
                      {t('orders.previousPage')}
                    </button>
                    <span className="text-[13px] text-muted">{t('orders.pageInfo', { page: historyPage, total: historyTotalPages })}</span>
                    <button
                      type="button"
                      className={pill(false)}
                      disabled={historyPage >= historyTotalPages}
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      {t('orders.nextPage')}
                    </button>
                  </div>
                )}
              </>
            ))}
        </div>
      </div>

      {/* Detail: a column on wide screens, a sheet over the list on smaller ones */}
      {wide ? (
        <aside aria-label={t('orders.live.detail')} className="flex w-[452px] flex-shrink-0 flex-col border-l border-line bg-[#efebe6]">
          <div className="flex items-center gap-2.5 px-[18px] py-3.5">
            <span className="text-[13px] font-bold">{t('orders.live.detail')}</span>
            <span className="text-xs text-muted">{t('orders.live.detailHint')}</span>
          </div>
          <div className="flex min-h-0 flex-1 px-[18px] pb-[18px]">
            {detail ?? (
              <p className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[#e3d9ce] p-6 text-center text-sm text-muted">
                {t('orders.live.nothingSelected')}
              </p>
            )}
          </div>
        </aside>
      ) : (
        detail && (
          <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={() => update({ order: null })}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('orders.live.detail')}
              className="flex h-full w-full max-w-[452px] flex-col bg-[#efebe6] p-3"
              onClick={(e) => e.stopPropagation()}
            >
              {detail}
            </div>
          </div>
        )
      )}
    </div>
  );
}
