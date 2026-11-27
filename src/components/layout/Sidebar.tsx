import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useDispatch } from 'react-redux';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';
import {
  BadgePercent,
  ChevronsUpDown,
  CircleCheck,
  CircleOff,
  CreditCard,
  History,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PanelLeftClose,
  PauseCircle,
  QrCode,
  ReceiptText,
  Scale,
  Settings,
  Store,
  Tags,
  Users,
  UtensilsCrossed,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useGetGoLiveStatusQuery, useGetMyShopsQuery, useGetShopByIdQuery, useUpdateShopMutation, type GetShopResultDto } from '../../services/api';
import { apiErrorMessage } from '../../features/api/errorMessage';
import { ClickTooltip } from '../ui/ClickTooltip';
import { useGetOrderQueueQuery } from '../../services/ordersApi';
import { baseApi } from '../../services/baseApi';
import { useNow } from '../../features/orders/useNow';
import { navGroups, navPath, sidebarBottomItems, sidebarTopItems, type ShopNavKey } from '../../features/shops/shopNav';
import { formatPauseEnd, isOfflineBySuperadminError, isOrdersPausedAt, shopLiveState, shopPauseOutOfDate, type ShopLiveState } from '../../features/shops/shopStatus';
import { clearStaffSession, readStaffSession } from '../../features/staff/staffSession';
import { useToast } from '../../contexts/ToastContext';
import { useModalA11y } from '../../hooks/useModalA11y';
import { AccountSettingsModal } from './AccountSettingsModal';
import { PauseOrdersDialog } from '../shop/PauseOrdersDialog';
import { TakeShopOfflineModal } from '../shop/GoLiveModal';
import { PendingButton } from '../ui/PendingButton';

/** Round shop logo, or its first letter when no logo is uploaded. */
function ShopBadge({ shop, size = 36 }: { shop: Pick<GetShopResultDto, 'name' | 'branding'> | undefined; size?: number }) {
  const logo = shop?.branding?.logoUrl;
  return (
    <span
      className="flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#efe7de] bg-white"
      style={{ width: size, height: size }}
    >
      {logo ? (
        <img src={logo} alt="" className="h-[80%] w-[80%] object-contain" />
      ) : (
        <span className="text-sm font-bold text-[#6b6058]">{shop?.name?.charAt(0).toUpperCase() ?? '?'}</span>
      )}
    </span>
  );
}

const STATE_STYLE: Record<ShopLiveState, { dot: string; Icon: LucideIcon; word: string; desc: string }> = {
  online: { dot: 'bg-[#2f8a4c]', Icon: CircleCheck, word: 'shops.statusMenu.online', desc: 'shops.statusMenu.onlineDesc' },
  ordersPaused: { dot: 'bg-[#d97706]', Icon: PauseCircle, word: 'shops.statusMenu.paused', desc: 'shops.statusMenu.pausedDesc' },
  offline: { dot: 'bg-[#9a8f86]', Icon: CircleOff, word: 'shops.statusMenu.offline', desc: 'shops.statusMenu.offlineDesc' },
};

/**
 * Shop status block under the switcher: one three-state control (Online / Paused / Offline) that opens
 * a menu, and a Checklist link with an open-step badge while go-live steps remain.
 */
function ShopStatusMenu({ shop, canManage }: { shop: GetShopResultDto; canManage: boolean }) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const { data: goLive } = useGetGoLiveStatusQuery({ shopId: shop.id! }, { skip: !canManage, pollingInterval: 30000 });
  const nowMs = useNow(30_000);
  const live = shopLiveState(shop, nowMs);
  const [open, setOpen] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [blockedTooltipOpen, setBlockedTooltipOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dismissTooltip = useCallback(() => setBlockedTooltipOpen(false), []);
  const openCount = goLive ? goLive.criteria.filter((c) => !c.met).length : 0;

  // There is no narrower permission than manage_shop yet; split so one can slot in later.
  const canChangeOnlineOffline = canManage;
  const canPauseOrders = canManage;

  const bySuperadmin = shop.offlineBySuperadmin === true;
  const interactive = canManage && !bySuperadmin;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const fail = (err: unknown) =>
    toast.error(isOfflineBySuperadminError(err) ? t('nav.offlineBySuperadminToast') : apiErrorMessage(err, t('shops.statusFailedToSave')));

  const blockedByChecklist = live === 'offline' && openCount > 0;
  const showBlockedTooltip = blockedTooltipOpen && interactive && blockedByChecklist;
  const allowedFrom = (from: ShopLiveState) => (from === 'offline' ? canChangeOnlineOffline : canPauseOrders);

  const chooseOnline = async () => {
    setOpen(false);
    if (live === 'online' || !allowedFrom(live)) return;
    if (blockedByChecklist) {
      setBlockedTooltipOpen(true);
      return;
    }
    try {
      await updateShop({
        shopId: shop.id!,
        body: live === 'offline' ? { isPaused: false } : { ordersPaused: false },
      }).unwrap();
    } catch (err) {
      fail(err);
    }
  };

  const choosePaused = () => {
    setOpen(false);
    if (!allowedFrom(live)) return;
    if (blockedByChecklist) {
      setBlockedTooltipOpen(true);
      return;
    }
    setPausing(true);
  };

  const chooseOffline = () => {
    setOpen(false);
    if (live === 'offline' || !canChangeOnlineOffline) return;
    setOfflineModalOpen(true);
  };

  const style = STATE_STYLE[live];
  const word = t(style.word);
  const subLine = bySuperadmin
    ? null
    : live === 'ordersPaused'
      ? shop.ordersPausedUntil && isOrdersPausedAt(shop, nowMs)
        ? t('nav.ordersPausedUntil', { time: formatPauseEnd(shop.ordersPausedUntil, shop.timezone ?? 'Europe/Berlin', i18n.language) })
        : t('nav.ordersPausedBadge')
      : null;

  const face = (
    <>
      <span id="sidebar-shop-status-label" className="text-[13px] font-bold text-[#4a413b]">
        {t('shops.shopStatusTitle')}
      </span>
      <span className="flex min-w-0 flex-col items-end text-right">
        <span className="flex items-center gap-1.5 text-[13px] font-bold text-[#4a413b]">
          <span className={`h-2 w-2 rounded-full ${style.dot}`} aria-hidden="true" />
          <style.Icon size={14} aria-hidden="true" />
          {word}
        </span>
        {subLine && <span className="text-[11px] text-[#6b6058]">{subLine}</span>}
        {bySuperadmin && <span className="text-[11px] font-semibold text-[#b42318]">{t('nav.offlineBySuperadmin')}</span>}
      </span>
    </>
  );
  const rowClass = 'flex w-full items-center justify-between gap-2 rounded-[10px] bg-[#f1ede8] px-2.5 py-2 text-left';
  const ariaLabel = `${t('shops.shopStatusTitle')}: ${word}`;

  const options: { state: ShopLiveState; blocked: boolean; onSelect: () => void }[] = [
    { state: 'online', blocked: blockedByChecklist, onSelect: () => void chooseOnline() },
    { state: 'ordersPaused', blocked: blockedByChecklist, onSelect: choosePaused },
    ...(canChangeOnlineOffline ? [{ state: 'offline' as const, blocked: false, onSelect: chooseOffline }] : []),
  ];

  return (
    <>
      <div ref={wrapRef} className="relative mt-2.5">
        {interactive ? (
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={ariaLabel}
            onClick={() => setOpen((v) => !v)}
            className={`${rowClass} hover:bg-[#ebe5df] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink`}
          >
            {face}
            <ChevronsUpDown size={14} className="flex-shrink-0 text-[#8a7f77]" aria-hidden="true" />
          </button>
        ) : (
          <div role="status" aria-label={ariaLabel} className={rowClass}>
            {face}
          </div>
        )}
        {open && interactive && (
          <div
            role="listbox"
            aria-label={t('shops.statusMenu.changeStatus')}
            className="absolute left-0 right-0 top-full z-50 mt-1.5 w-full overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_32px_rgba(31,26,23,0.14)]"
          >
            {options.map(({ state, blocked, onSelect }) => {
              const s = STATE_STYLE[state];
              return (
                <PendingButton
                  key={state}
                  type="button"
                  role="option"
                  aria-selected={live === state}
                  aria-disabled={blocked || undefined}
                  isPending={isLoading && state === 'online'}
                  onClick={onSelect}
                  className={`flex w-full items-start gap-2.5 px-3 py-2 text-left hover:bg-cream focus:outline-none focus-visible:bg-cream ${
                    blocked ? 'opacity-50' : ''
                  } ${live === state ? 'bg-[#f7f3ee]' : ''}`}
                >
                  <span className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${s.dot}`} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[13px] font-bold text-ink">{t(s.word)}</span>
                    <span className="text-xs text-[#6b6058]">{t(s.desc)}</span>
                  </span>
                </PendingButton>
              );
            })}
          </div>
        )}
        {showBlockedTooltip && (
          <ClickTooltip
            id="sidebar-blocked-tooltip"
            message={t('shops.cannotGoOnlineTooltip')}
            onDismiss={dismissTooltip}
            containerRef={wrapRef}
            linkTo={`/shops/${shop.id}/go-live`}
            linkLabel={t('nav.checklist')}
          />
        )}
      </div>

      {canManage && openCount > 0 && (
        <Link
          to={`/shops/${shop.id}/go-live`}
          className="mt-1.5 flex items-center justify-between gap-2 rounded-[10px] bg-[#f1ede8] px-2.5 py-2 text-[13px] font-bold text-[#4a413b] hover:bg-[#ebe5df]"
        >
          <span>{t('nav.checklist')}</span>
          <span
            className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b23a0c] px-1.5 text-[11px] font-bold text-white"
            aria-label={t('nav.checklistOpen', { count: openCount })}
          >
            {openCount}
          </span>
        </Link>
      )}

      {pausing && (
        <PauseOrdersDialog alsoGoOnline={live === 'offline'} shopId={shop.id!} onClose={() => setPausing(false)} onPaused={() => setPausing(false)} />
      )}
      {offlineModalOpen && (
        <TakeShopOfflineModal
          shopId={shop.id!}
          onClose={() => setOfflineModalOpen(false)}
          onSuccess={() => setOfflineModalOpen(false)}
        />
      )}
    </>
  );
}

/** Switch between the owner's shops; the list is only loaded when opened. */
function ShopSwitcher({ shop, allowSwitch }: { shop: GetShopResultDto | undefined; allowSwitch: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data } = useGetMyShopsQuery(undefined, { skip: !open });

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const face = (
    <>
      <ShopBadge shop={shop} />
      <span className="flex min-w-0 flex-1 flex-col text-left">
        <span className="truncate text-sm font-bold text-ink">{shop?.name ?? '…'}</span>
        {shop?.address?.city && <span className="truncate text-xs text-[#6b6058]">{shop.address.city}</span>}
      </span>
    </>
  );

  if (!allowSwitch) return <div className="flex items-center gap-2.5 p-2">{face}</div>;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.switchShop')}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-white p-2 hover:bg-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {face}
        <ChevronsUpDown size={14} className="flex-shrink-0 text-[#8a7f77]" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_32px_rgba(31,26,23,0.14)]">
          <ul role="listbox" aria-label={t('nav.switchShop')} className="max-h-72 overflow-y-auto py-1">
            {(data?.shops ?? []).map((s) => (
              <li key={s.id} role="option" aria-selected={s.id === shop?.id}>
                <Link
                  to={`/shops/${s.id}`}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-2.5 py-2 text-sm hover:bg-cream ${s.id === shop?.id ? 'font-bold' : ''}`}
                >
                  <ShopBadge shop={s} size={28} />
                  <span className="truncate">{s.name}</span>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/shops"
            onClick={() => setOpen(false)}
            className="block border-t border-line-soft px-3 py-2.5 text-sm font-semibold text-[#4a413b] hover:bg-cream"
          >
            {t('nav.allShops')}
          </Link>
        </div>
      )}
    </div>
  );
}

/** Mobile nav drawer as a modal dialog: Escape closes, Tab is trapped, focus returns to the hamburger. */
function NavDrawer({ label, closeLabel, onClose, children }: { label: string; closeLabel: string; onClose: () => void; children: ReactNode }) {
  const drawerRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef: drawerRef });
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} />
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-white shadow-xl outline-none lg:hidden"
      >
        <div className="flex h-12 flex-shrink-0 items-center justify-end px-2">
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#8a7f77] hover:bg-sand" aria-label={closeLabel}>
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </>
  );
}

const NAV_ICONS: Record<ShopNavKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ReceiptText,
  products: UtensilsCrossed,
  combos: Layers,
  categories: Tags,
  optionGroups: ListChecks,
  promotions: BadgePercent,
  tables: QrCode,
  legal: Scale,
  subscription: CreditCard,
  staff: Users,
  activity: History,
  settings: Settings,
};

const linkClass = (isActive: boolean) =>
  `flex h-11 items-center justify-between rounded-[9px] px-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-1 lg:h-9 ${
    isActive ? 'bg-sand font-bold text-ink' : 'font-medium text-[#4a413b] hover:bg-cream hover:text-ink'
  }`;

/**
 * The admin's sidebar (desktop) and drawer (phones and tablets).
 *
 * Inside a shop: the shop switcher, the shop's status switch, then the pages grouped as
 * Service / Speisekarte / Shop / Geschäft (only those the user may open), and the user at the bottom.
 * Outside a shop: overview and the shop list.
 */
export function Sidebar({ sidebarHidden, onToggleSidebar }: { sidebarHidden: boolean; onToggleSidebar: () => void }) {
  const { shopId } = useParams<{ shopId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const user = accounts[0];
  const staffSession = readStaffSession();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const dispatch = useDispatch();
  const { data: currentShop, fulfilledTimeStamp: shopAt } = useGetShopByIdQuery({ shopId: shopId! }, { skip: !shopId });
  const perms = currentShop?.callerPermissions ?? [];
  const topItems = sidebarTopItems(perms);
  const groups = navGroups(perms);
  const bottomItems = sidebarBottomItems(perms);
  const canSeeOrders = groups.some((g) => g.items.includes('orders'));

  // New orders waiting, for the badge (the orders page itself polls faster)
  const { data: queue, fulfilledTimeStamp: queueAt } = useGetOrderQueueQuery(
    { shopId: shopId! },
    { skip: !shopId || !canSeeOrders, pollingInterval: 30000 },
  );
  const waiting = (queue?.orders ?? []).filter((o) => o.state === 'PLACED').length;

  // The server can pause orders on its own (missed orders); the queue we already poll tells us, so refetch the shop
  useEffect(() => {
    if (shopPauseOutOfDate(queue?.ordersPause, queueAt, currentShop, shopAt, Date.now())) {
      dispatch(baseApi.util.invalidateTags([{ type: 'Shops', id: shopId! }]));
    }
  }, [queue, queueAt, currentShop, shopAt, shopId, dispatch]);

  // Close the drawer when the shop changes
  const [drawerShop, setDrawerShop] = useState(shopId);
  if (drawerShop !== shopId) {
    setDrawerShop(shopId);
    setDrawerOpen(false);
  }

  const labelOf = (key: ShopNavKey) => (key === 'products' ? t('nav.dishes') : t(`nav.${key}`));
  const pathOf = (key: ShopNavKey) => navPath(shopId!, key);

  const renderItem = (key: ShopNavKey) => {
    const Icon = NAV_ICONS[key];
    return (
    <NavLink key={key} to={pathOf(key)} end={key === 'products'} className={({ isActive }) => linkClass(isActive)}>
      <span className="flex items-center gap-2.5">
        <Icon size={17} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
        <span>{labelOf(key)}</span>
      </span>
      {key === 'orders' && waiting > 0 && (
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b23a0c] px-1.5 text-[11px] font-bold text-white"
          aria-label={t('nav.waitingOrders', { count: waiting })}
        >
          {waiting}
        </span>
      )}
    </NavLink>
    );
  };

  const navContent = shopId ? (
    <div className="flex flex-col gap-3.5">
      {topItems.length > 0 && <div className="flex flex-col gap-px">{topItems.map(renderItem)}</div>}
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-px">
          <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.07em] text-[#9a8f86]">
            {t(`nav.group.${group.key}`)}
          </div>
          {group.items.map(renderItem)}
        </div>
      ))}
      {bottomItems.length > 0 && <div className="flex flex-col gap-px">{bottomItems.map(renderItem)}</div>}
    </div>
  ) : (
    <div className="flex flex-col gap-px">
      <NavLink to="/shops" className={({ isActive }) => linkClass(isActive)}>
        <span className="flex items-center gap-2">
          <Store size={16} aria-hidden="true" />
          {t('nav.myShops')}
        </span>
      </NavLink>
    </div>
  );

  const userRow = staffSession ? (
    <div className="flex items-center gap-2.5 px-1">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
        {staffSession.username.charAt(0).toUpperCase()}
      </span>
      <span className="flex-1 truncate text-[13px] font-semibold">{staffSession.username}</span>
      <button
        onClick={() => {
          clearStaffSession();
          navigate(`/${staffSession.shopSlug}/staff`);
        }}
        aria-label={t('staffLogin.signOut')}
        className="rounded-lg p-1.5 text-[#8a7f77] hover:bg-sand hover:text-ink"
      >
        <LogOut size={14} />
      </button>
    </div>
  ) : (
    <button
      onClick={() => setAccountOpen(true)}
      className="flex w-full items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-cream"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">
        {user?.name?.charAt(0).toUpperCase() ?? '?'}
      </span>
      <span className="flex-1 truncate text-[13px] font-semibold">{user?.name}</span>
    </button>
  );

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {shopId && (
        <div className="border-b border-line-soft px-3.5 pb-3 pt-4">
          <ShopSwitcher shop={currentShop} allowSwitch={!staffSession} />
          {currentShop && <ShopStatusMenu shop={currentShop} canManage={perms.includes('manage_shop')} />}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">{navContent}</nav>
      <div className="flex items-center gap-1 border-t border-line-soft px-3 py-3">
        <div className="min-w-0 flex-1">{userRow}</div>
        {/* Only the desktop panel can be hidden; below `lg` this button stays unrendered so the drawer is unchanged. */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={t('nav.hideSidebar')}
          title={t('nav.hideSidebar')}
          className="hidden flex-shrink-0 items-center justify-center rounded-lg p-1.5 text-[#8a7f77] hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink lg:inline-flex"
        >
          <PanelLeftClose size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      {!sidebarHidden && (
        <aside className="sticky top-0 hidden h-screen w-[236px] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white lg:flex">
          {sidebarContent}
        </aside>
      )}

      {/* Phones and tablets: top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-[#4a413b] hover:bg-sand"
          aria-label={t('nav.openMenu')}
          aria-expanded={drawerOpen}
        >
          <Menu size={20} />
        </button>
        {shopId && currentShop ? (
          <span className="flex min-w-0 items-center gap-2">
            <ShopBadge shop={currentShop} size={30} />
            <span className="truncate text-sm font-bold">{currentShop.name}</span>
          </span>
        ) : (
          <span className="truncate text-sm font-bold">{t('nav.myShops')}</span>
        )}
      </header>

      {drawerOpen && (
        <NavDrawer label={t('nav.openMenu')} closeLabel={t('nav.closeMenu')} onClose={() => setDrawerOpen(false)}>
          {sidebarContent}
        </NavDrawer>
      )}

      {accountOpen && user && <AccountSettingsModal user={user} onClose={() => setAccountOpen(false)} />}
    </>
  );
}
