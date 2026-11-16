import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Search, Volume2, VolumeX } from 'lucide-react';
import { useGetShopByIdQuery } from '../services/api';
import { useGetOrdersByShopQuery, useSetBusyModeMutation, type IntakeOrder, type UpcomingOrder } from '../services/ordersApi';
import { useToast } from '../contexts/ToastContext';
import { formatCountdown, slotLoadOf, upcomingByDay } from '../features/orders/intake';
import {
  ORDER_SCOPE_FILTERS,
  ORDER_STATE_FILTERS,
  itemSummary,
  boardColumns,
  liveGroups,
  matchesOrderSearch,
  orderTiming,
  parseOrderFilter,
  type LiveGroupKey,
  type OrderFilter,
} from '../features/orders/orderView';
import { dayRange, clampDayRange, parseDaySearch, MAX_RANGE_MONTHS, type DaySelection } from '../features/orders/dayRange';
import { useMediaQuery } from '../features/orders/mediaQuery';
import { useLiveQueue } from '../features/orders/useLiveQueue';
import { nextActionLabelKey, useOrderActions } from '../features/orders/useOrderActions';
import { chargedCents } from '../features/orders/refunds';
import { formatCents } from '../utils/money';
import { MySpinner } from '../components/ui/MySpinner';
import { PendingButton } from '../components/ui/PendingButton';
import { ModeBadge, StateBadge } from '../components/orders/OrderBadges';
import { OrderBoard } from '../components/orders/OrderBoard';
import { OrderDetail, type DetailKind } from '../components/orders/OrderDetail';
import { ReceiptsArchiveButton } from '../components/orders/ReceiptsArchiveButton';

const DAY_PAGE_SIZE = 100;

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

function DayPicker({
  label,
  selection,
  rangeCapped,
  onPick,
}: {
  label: string;
  selection: DaySelection;
  rangeCapped: boolean;
  onPick: (day: string | null) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  const rangeSel = typeof selection === 'object' && 'from' in selection ? selection : null;
  const [rangeFrom, setRangeFrom] = useState(rangeSel?.from ?? '');
  const [rangeTo, setRangeTo] = useState(rangeSel?.to ?? '');
  const choose = (day: string | null) => {
    if (day === null || !day.includes('..')) {
      setRangeFrom('');
      setRangeTo('');
    }
    onPick(day);
    // An over-cap range keeps the menu open so the message under the inputs is seen.
    const parts = typeof day === 'string' && day.includes('..') ? day.split('..') : null;
    const cappedPick = parts !== null && clampDayRange(parts[0], parts[1]).capped;
    if (!cappedPick) setOpen(false);
  };
  /** Emits `YYYY-MM-DD..YYYY-MM-DD` once BOTH ends are set; the pair is sorted so a reversed pick still applies. */
  const applyRange = (from: string, to: string) => {
    setRangeFrom(from);
    setRangeTo(to);
    if (!from || !to) return;
    const [a, b] = from <= to ? [from, to] : [to, from];
    choose(`${a}..${b}`);
  };
  const option = (key: string, day: string | null, active: boolean) => (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => choose(day)}
      className={`flex h-9 w-full items-center rounded-lg px-3 text-left text-sm hover:bg-sand ${active ? 'font-bold' : ''}`}
    >
      {t(`orders.dayPicker.${key}`)}
    </button>
  );
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm whitespace-nowrap hover:bg-sand"
      >
        <CalendarDays size={16} className="text-[#8a7f77]" aria-hidden="true" />
        {label}
      </button>
      {open && (
        <div className="absolute left-0 z-30 mt-1.5 w-[220px] rounded-xl border border-[#e3d9ce] bg-white p-1.5 shadow-lg">
          {option('today', null, selection === 'today')}
          {option('yesterday', 'yesterday', selection === 'yesterday')}
          {option('last7', 'last7', selection === 'last7')}
          {option('thisWeek', 'thisWeek', selection === 'thisWeek')}
          {option('lastWeek', 'lastWeek', selection === 'lastWeek')}
          {option('thisMonth', 'thisMonth', selection === 'thisMonth')}
          {option('lastMonth', 'lastMonth', selection === 'lastMonth')}
          <label className="mt-1 flex flex-col gap-1 border-t border-line-soft px-3 pt-2 pb-1.5 text-[13px] text-muted">
            {t('orders.dayPicker.pickDate')}
            <input
              type="date"
              aria-label={t('orders.dayPicker.pickDate')}
              value={typeof selection === 'object' && 'date' in selection ? selection.date : ''}
              onChange={(e) => e.target.value && choose(e.target.value)}
              className="h-9 rounded-lg border border-[#e3d9ce] px-2 text-sm text-ink"
            />
          </label>
          <label className="mt-1 flex flex-col gap-1 border-t border-line-soft px-3 pt-2 pb-1.5 text-[13px] text-muted">
            {t('orders.dayPicker.customRange')}
            <input
              type="date"
              aria-label={t('orders.dayPicker.rangeStart')}
              value={rangeFrom}
              onChange={(e) => applyRange(e.target.value, rangeTo)}
              className="h-9 rounded-lg border border-[#e3d9ce] px-2 text-sm text-ink"
            />
            <input
              type="date"
              aria-label={t('orders.dayPicker.rangeEnd')}
              value={rangeTo}
              onChange={(e) => applyRange(rangeFrom, e.target.value)}
              className="h-9 rounded-lg border border-[#e3d9ce] px-2 text-sm text-ink"
            />
            {rangeCapped && (
              <p role="status" className="mt-1 text-[12px] font-semibold text-[#8a5a00]">
                {t('orders.dayPicker.rangeCapped', { months: MAX_RANGE_MONTHS })}
              </p>
            )}
          </label>
        </div>
      )}
    </div>
  );
}

const pill = (dark: boolean) =>
  `h-[34px] rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-50 ${
    dark ? 'bg-ink text-white' : 'border border-[#e3d9ce] bg-white text-ink hover:bg-sand'
  }`;

const chip = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
    on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
  }`;

const scopeTab = (on: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold underline-offset-4 transition-colors ${
    on ? 'text-ink underline decoration-2' : 'text-[#6b625c] hover:bg-sand hover:text-ink'
  }`;

/**
 * OrdersPage — "Bestellungen": the live queue as a three-column board (new, in progress, ready/out)
 * from `lg` up, with a Board | List toggle, and as one list in three sections below that. The
 * selected order opens in a floating panel at every width; nothing is selected until one is clicked.
 * Pre-orders and past days always use the list and the same panel.
 */
export function OrdersPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = parseOrderFilter(searchParams);
  const selectedParam = searchParams.get('order');
  const [query, setQuery] = useState('');
  const [dayPage, setDayPage] = useState(1);
  const board = useMediaQuery('(min-width: 1024px)');
  const [boardView, setBoardView] = useState<'board' | 'list'>('board');

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const permissions = shop?.callerPermissions ?? [];
  const queue = useLiveQueue(shopId!);
  const { data, orders, nowMs } = queue;
  const actions = useOrderActions(shopId!, {
    onAcceptStart: queue.startAccept,
    onAcceptFailed: queue.failAccept,
    onFailed: () => void queue.refetch(),
    onSucceeded: () => queue.refetch(),
  });
  const [setBusyMode, { isLoading: busySwitching }] = useSetBusyModeMutation();
  // History is gone. An old `?filter=history` / `?tab=history` link lands on the last 7 days: the day
  // the page shows is derived from the legacy param, so the FIRST render is already the dated list (no
  // blank frame), and the effect below then rewrites the address to `?day=last7`.
  const legacyHistoryLink = searchParams.get('filter') === 'history' || searchParams.get('tab') === 'history';
  const { selection: daySelection, rangeCapped } = parseDaySearch(
    searchParams.get('day') ?? (legacyHistoryLink ? 'last7' : null),
  );
  useEffect(() => {
    if (!legacyHistoryLink) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('filter');
        next.delete('tab');
        if (!next.get('day')) next.set('day', 'last7');
        return next;
      },
      { replace: true },
    );
  }, [legacyHistoryLink, setSearchParams]);
  const isToday = daySelection === 'today';

  const timeZone = data?.timezone ?? 'Europe/Berlin';
  // Computed once per selection: a ticking `now` would change the query arg and refetch constantly
  const range = useMemo(
    () => (isToday ? null : dayRange(daySelection, timeZone, new Date())),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, JSON.stringify(daySelection), timeZone],
  );
  const dayQuery = useGetOrdersByShopQuery(
    {
      shopId: shopId!,
      page: dayPage,
      pageSize: DAY_PAGE_SIZE,
      from: range?.fromIso,
      to: range?.toIso,
    },
    { skip: isToday },
  );
  // A new window starts on its first page, however it was reached (picker, preset, hand-edited URL).
  const dayKey = JSON.stringify(daySelection);
  useEffect(() => {
    setDayPage(1);
  }, [dayKey]);
  const money = (order: IntakeOrder) => formatCents(chargedCents(order), order.currency, i18n.language);
  const clock = (iso: string) => new Date(iso).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', timeZone });
  const prepFor = (order: IntakeOrder) => data?.defaultPrepMinutes[order.fulfilmentMode] ?? 20;

  // What the detail column can show for the current chip
  const kind: DetailKind = !isToday ? 'history' : filter === 'upcoming' ? 'upcoming' : 'live';
  const showBoard = board && boardView === 'board' && isToday && kind === 'live';
  // On the board the columns ARE the stages, so the stage filter is ignored there: a stale
  // `?filter=new|work|ready` link must not leave the board drawn from one stage only (the pills that
  // would clear it are not rendered while the board shows), and a card in any column must still open.
  const stageFilter: OrderFilter = showBoard ? 'open' : filter;
  const shown = useMemo(() => orders.filter((o) => matchesOrderSearch(o, query)), [orders, query]);
  const groups = liveGroups(shown, stageFilter);
  const upcoming: UpcomingOrder[] = useMemo(
    () => (data?.upcoming ?? []).filter((o) => matchesOrderSearch(o, query)),
    [data?.upcoming, query],
  );
  const dayOrders = useMemo(
    () => ((dayQuery.data?.orders ?? []) as IntakeOrder[]).filter((o) => matchesOrderSearch(o, query)),
    [dayQuery.data, query],
  );
  const dayTitle = (() => {
    if (!range) return '';
    const fmt = (ms: number) =>
      new Date(ms).toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long', timeZone });
    const half = 12 * 3600_000;
    const firstMs = Date.parse(range.fromIso) + half; // midday on the first local day
    const lastMs = Date.parse(range.toIso) - half; // midday on the last local day (`to` is exclusive)
    if (
      daySelection === 'last7' ||
      daySelection === 'thisWeek' ||
      daySelection === 'lastWeek' ||
      daySelection === 'thisMonth' ||
      daySelection === 'lastMonth'
    ) {
      return t(`orders.dayPicker.${daySelection}`);
    }
    if (typeof daySelection === 'object' && 'from' in daySelection) {
      const a = fmt(firstMs);
      const b = fmt(lastMs);
      return a === b ? a : `${a} – ${b}`;
    }
    return fmt(firstMs); // yesterday and a single picked date — unchanged formatting
  })();
  const dayLabel = isToday
    ? t('orders.dayPicker.label')
    : daySelection === 'yesterday'
      ? t('orders.dayPicker.yesterday')
      : typeof daySelection === 'string'
        ? t(`orders.dayPicker.${daySelection}`) // last7 + the four new presets
        : dayTitle; // custom range span, or a single picked date
  const plainTitle =
    daySelection === 'last7' ||
    daySelection === 'thisWeek' ||
    daySelection === 'lastWeek' ||
    daySelection === 'thisMonth' ||
    daySelection === 'lastMonth' ||
    (typeof daySelection === 'object' && 'from' in daySelection);

  const listed: IntakeOrder[] =
    kind === 'upcoming'
      ? upcomingByDay(upcoming, timeZone).flatMap((d) => d.orders)
      : kind === 'history'
        ? dayOrders
        : groups.flatMap((g) => g.orders);
  // Nothing is open until an order is clicked
  const selected = listed.find((o) => o.id === selectedParam);
  const columns = boardColumns(shown);

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

  const turnSoundOn = async () => {
    // A blocked audio unlock is a real outcome, not a no-op: say so instead of doing nothing.
    if (!(await queue.turnOn())) toast.error(t('orders.soundUnavailable'));
  };

  const counts: Record<OrderFilter, number | null> = {
    open: orders.length,
    new: liveGroups(orders, 'new')[0].orders.length,
    work: liveGroups(orders, 'work')[0].orders.length,
    ready: liveGroups(orders, 'ready')[0].orders.length,
    upcoming: data?.upcoming?.length ?? null,
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
        <PendingButton isPending={working} className={pill(true)} onClick={stop(() => void actions.accept(order, prepFor(order)))}>
          {t('orders.accept')}
        </PendingButton>
      );
    }
    const key = nextActionLabelKey(order);
    if (!key) return null;
    return (
      <PendingButton isPending={working} className={pill(false)} onClick={stop(() => void actions.advance(order))}>
        {t(key)}
      </PendingButton>
    );
  };

  const groupText: Record<LiveGroupKey, { title: string; hint: string; empty: string }> = {
    new: { title: t('orders.live.groupNew'), hint: t('orders.live.groupNewHint'), empty: t('orders.live.emptyNew') },
    work: { title: t('orders.live.groupWork'), hint: t('orders.live.groupWorkHint'), empty: t('orders.live.emptyWork') },
    ready: { title: t('orders.live.groupReady'), hint: '', empty: t('orders.live.emptyReady') },
  };

  const dayTotal = dayQuery.data?.total ?? dayOrders.length;
  const dayTotalPages = Math.max(1, Math.ceil(dayTotal / DAY_PAGE_SIZE));
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
      onClose={() => update({ order: null })}
    />
  ) : null;

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 px-4 pt-[22px] pb-3.5 sm:px-7">
          <div>
            <div className="text-[13px] text-muted">{t('nav.group.service')}</div>
            <h1 className="mt-0.5 flex items-center gap-2.5 font-display text-[30px] font-semibold">
              {t('nav.orders')}
              <span
                title={t(`orders.live.connection.${queue.connection}`)}
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  queue.connection === 'connected' ? 'bg-[#2f8a4c]' : queue.connection === 'offline' ? 'bg-[#b42318]' : 'bg-[#8a7f77]'
                }`}
              >
                <span className="sr-only">{t(`orders.live.connection.${queue.connection}`)}</span>
              </span>
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {queue.soundOn ? (
              <span className={chip(false)}>
                <Volume2 size={15} aria-hidden="true" />
                {t('orders.soundOn')}
              </span>
            ) : (
              <PendingButton
                isPending={queue.soundEnabling}
                className={`${chip(false)} border-[#f5c2bd] text-[#b42318]`}
                onClick={() => void turnSoundOn()}
              >
                <VolumeX size={15} aria-hidden="true" />
                {t('orders.live.soundOff')}
              </PendingButton>
            )}
            {data?.busy && (
              <PendingButton
                isPending={busySwitching}
                aria-pressed={data.busy.active}
                className={chip(data.busy.active)}
                onClick={() => void toggleBusy()}
              >
                {data.busy.active ? t('orders.live.busyOn', { minutes: data.busy.extraMinutes }) : t('orders.live.busy')}
              </PendingButton>
            )}
          </div>
        </div>

        {/* Things the kitchen must know */}
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
          <DayPicker label={dayLabel} selection={daySelection} rangeCapped={rangeCapped} onPick={(day) => update({ day, order: null })} />
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
          {isToday && (
            <>
              <div role="group" aria-label={t('orders.live.filters')} className="flex flex-wrap gap-2">
                <button type="button" aria-pressed={stageFilter === 'open'} className={chip(stageFilter === 'open')} onClick={() => pickFilter('open')}>
                  {t('orders.live.filter.open')}
                </button>
                {!showBoard &&
                  ORDER_STATE_FILTERS.map((f) => (
                    <button key={f} type="button" aria-pressed={filter === f} className={chip(filter === f)} onClick={() => pickFilter(f)}>
                      {t(`orders.live.filter.${f}`)}
                      {counts[f] !== null && <span className="text-xs opacity-70">{counts[f]}</span>}
                    </button>
                  ))}
              </div>
              <span className="h-6 w-px bg-[#e3d9ce]" aria-hidden="true" />
              <div role="group" aria-label={t('orders.live.views')} className="flex items-center gap-1">
                {ORDER_SCOPE_FILTERS.map((f) => (
                  <button key={f} type="button" aria-pressed={filter === f} className={scopeTab(filter === f)} onClick={() => pickFilter(f)}>
                    {t(`orders.live.filter.${f}`)}
                    {counts[f] !== null && <span className="text-xs opacity-70">{counts[f]}</span>}
                  </button>
                ))}
              </div>
            </>
          )}
          {board && isToday && kind === 'live' && (
            <div
              role="group"
              aria-label={t('orders.live.viewLabel')}
              className="ml-auto hidden items-center gap-0.5 rounded-full border border-[#e3d9ce] bg-white p-0.5 lg:inline-flex"
            >
              {(['board', 'list'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={boardView === v}
                  onClick={() => setBoardView(v)}
                  className={`h-8 rounded-full px-3 text-[13px] font-bold ${boardView === v ? 'bg-ink text-white' : 'text-[#4a413b] hover:bg-sand'}`}
                >
                  {t(`orders.live.view.${v}`)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* The list, or the board for the live view at lg+ */}
        {showBoard ? (
          <div className="flex min-h-0 flex-1 px-4 pb-4 sm:px-7">
            {queue.isLoading ? (
              <MySpinner label={t('orders.queueLoading')} />
            ) : queue.isError && !data ? (
              <p className="text-sm text-[#b42318]">{t('orders.queueLoadError')}</p>
            ) : (
              <OrderBoard
                columns={columns.map((c) => ({ ...c, title: groupText[c.key].title, empty: query ? t('orders.live.noMatch') : groupText[c.key].empty }))}
                selectedId={selected?.id}
                onSelect={select}
                timeOf={liveTime}
                moneyOf={money}
                actionFor={rowAction}
              />
            )}
          </div>
        ) : (
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-7 sm:px-7">
          {!isToday &&
            (dayQuery.isLoading ? (
              <MySpinner label={t('orders.loading')} />
            ) : dayQuery.isError ? (
              <p className="text-sm text-[#b42318]">{t('orders.loadError')}</p>
            ) : (
              <>
                <ReceiptsArchiveButton
                  shopId={shopId!}
                  timeZone={shop?.timezone ?? 'Europe/Berlin'}
                  callerRole={shop?.callerRole}
                />
                <Section
                  dot="bg-[#8a7f77]"
                  title={plainTitle ? dayTitle : t('orders.dayPicker.title', { date: dayTitle })}
                  count={dayOrders.length}
                >
                  {dayOrders.length === 0 ? (
                    <p className="p-4 text-sm text-[#8a7f77]">{query ? t('orders.live.noMatch') : t('orders.empty')}</p>
                  ) : (
                    dayOrders.map((order) => (
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
                {dayTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3">
                    <button type="button" className={pill(false)} disabled={dayPage === 1} onClick={() => setDayPage((p) => p - 1)}>
                      {t('orders.previousPage')}
                    </button>
                    <span className="text-[13px] text-muted">{t('orders.pageInfo', { page: dayPage, total: dayTotalPages })}</span>
                    <button
                      type="button"
                      className={pill(false)}
                      disabled={dayPage >= dayTotalPages}
                      onClick={() => setDayPage((p) => p + 1)}
                    >
                      {t('orders.nextPage')}
                    </button>
                  </div>
                )}
              </>
            ))}

          {isToday &&
            kind === 'live' &&
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

          {isToday &&
            kind === 'upcoming' &&
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
                        time={t('orders.live.at', {
                          time: clock(order.scheduledFor!),
                        })}
                        urgent={order.outsideHours || !!load?.full}
                        money={money}
                        action={<StateBadge order={order} />}
                      />
                    );
                  })}
                </Section>
              ))
            ))}
        </div>
        )}
      </div>

      {/* Detail: a floating panel over the page at every width, opened by clicking an order */}
      {detail && (
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
      )}
    </div>
  );
}
