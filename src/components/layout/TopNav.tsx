import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useParams } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';
import { ChevronsUpDown, LayoutDashboard, LogOut, Menu, Store, X } from 'lucide-react';
import { useGetMyShopsQuery, useGetShopByIdQuery, useUpdateShopMutation, type ShopResponse } from '../../services/api';
import { useGetOrderQueueQuery } from '../../services/ordersApi';
import { navGroups } from '../../features/shops/shopNav';
import { isOfflineBySuperadminError, shopLiveState } from '../../features/shops/shopStatus';
import { clearStaffSession, readStaffSession } from '../../features/staff/staffSession';
import { useToast } from '../../contexts/ToastContext';
import { AccountSettingsModal } from './AccountSettingsModal';

/** Round shop logo, or its first letter when no logo is uploaded. */
function ShopBadge({ shop, size = 36 }: { shop: Pick<ShopResponse, 'name' | 'branding'> | undefined; size?: number }) {
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

/**
 * The shop's state as one line under the switcher: taking orders (switch), orders paused (switch),
 * or offline (link to the settings, where going online runs the go-live checklist).
 */
function ShopStatusSwitch({ shop, canManage }: { shop: ShopResponse; canManage: boolean }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const live = shopLiveState(shop);

  if (live === 'offline') {
    return (
      <Link
        to={`/shops/${shop.id}/settings#shop-status`}
        className="mt-2.5 flex items-center gap-2 rounded-[10px] bg-[#f1ede8] px-2.5 py-2 text-[13px] font-bold text-[#4a413b] hover:bg-[#ebe5df]"
      >
        <span className="h-2 w-2 rounded-full bg-[#9a8f86]" aria-hidden="true" />
        {t('nav.offlineShort')}
      </Link>
    );
  }

  const taking = live === 'online';
  const toggle = async () => {
    try {
      await updateShop({ shopId: shop.id!, updateShopRequest: { ordersPaused: taking } }).unwrap();
    } catch (err) {
      toast.error(isOfflineBySuperadminError(err) ? t('nav.offlineBySuperadminToast') : t('shops.statusFailedToSave'));
    }
  };

  return (
    <div
      className={`mt-2.5 flex items-center justify-between gap-2 rounded-[10px] px-2.5 py-2 ${
        taking ? 'bg-[#e6f3ea]' : 'bg-[#fff6e0]'
      }`}
    >
      <span
        id="sidebar-status-label"
        className={`flex items-center gap-2 text-[13px] font-bold ${taking ? 'text-[#1d5a32]' : 'text-[#5c3c00]'}`}
      >
        <span className={`h-2 w-2 rounded-full ${taking ? 'bg-[#2f8a4c]' : 'bg-[#d97706]'}`} aria-hidden="true" />
        {taking ? t('nav.acceptingOrders') : t('nav.ordersPausedBadge')}
      </span>
      {canManage && (
        <button
          type="button"
          role="switch"
          aria-checked={taking}
          aria-labelledby="sidebar-status-label"
          disabled={isLoading}
          onClick={() => void toggle()}
          className={`relative h-5 w-[34px] flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
            taking ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${taking ? 'right-0.5' : 'left-0.5'}`}
          />
        </button>
      )}
    </div>
  );
}

/** Switch between the owner's shops; the list is only loaded when opened. */
function ShopSwitcher({ shop, allowSwitch }: { shop: ShopResponse | undefined; allowSwitch: boolean }) {
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

const linkClass = (isActive: boolean) =>
  `flex h-9 items-center justify-between rounded-[9px] px-2.5 text-sm transition-colors ${
    isActive ? 'bg-sand font-bold text-ink' : 'font-medium text-[#4a413b] hover:bg-cream hover:text-ink'
  }`;

/**
 * The admin's sidebar (desktop) and drawer (phones and tablets).
 *
 * Inside a shop: the shop switcher, the shop's status switch, then the pages grouped as
 * Service / Speisekarte / Shop / Geschäft (only those the user may open), and the user at the bottom.
 * Outside a shop: overview and the shop list.
 */
export function TopNav() {
  const { shopId } = useParams<{ shopId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const user = accounts[0];
  const staffSession = readStaffSession();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);

  const { data: currentShop } = useGetShopByIdQuery({ shopId: shopId! }, { skip: !shopId });
  const perms = currentShop?.callerPermissions ?? [];
  const groups = navGroups(perms);
  const canSeeOrders = groups.some((g) => g.items.includes('orders'));

  // New orders waiting, for the badge (the orders page itself polls faster)
  const { data: queue } = useGetOrderQueueQuery(
    { shopId: shopId! },
    { skip: !shopId || !canSeeOrders, pollingInterval: 30000 },
  );
  const waiting = (queue?.orders ?? []).filter((o) => o.state === 'PLACED').length;

  // Close the drawer when the shop changes
  const [drawerShop, setDrawerShop] = useState(shopId);
  if (drawerShop !== shopId) {
    setDrawerShop(shopId);
    setDrawerOpen(false);
  }

  const labelOf = (key: string) => (key === 'products' ? t('nav.dishes') : t(`nav.${key}`));
  const pathOf = (key: string) => (key === 'products' ? `/shops/${shopId}` : `/shops/${shopId}/${key}`);

  const navContent = shopId ? (
    <div className="flex flex-col gap-3.5">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col gap-px">
          <div className="px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.07em] text-[#9a8f86]">
            {t(`nav.group.${group.key}`)}
          </div>
          {group.items.map((key) => (
            <NavLink key={key} to={pathOf(key)} end={key === 'products'} className={({ isActive }) => linkClass(isActive)}>
              <span>{labelOf(key)}</span>
              {key === 'orders' && waiting > 0 && (
                <span
                  className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b23a0c] px-1.5 text-[11px] font-bold text-white"
                  aria-label={t('nav.waitingOrders', { count: waiting })}
                >
                  {waiting}
                </span>
              )}
            </NavLink>
          ))}
        </div>
      ))}
    </div>
  ) : (
    <div className="flex flex-col gap-px">
      <NavLink to="/" end className={({ isActive }) => linkClass(isActive)}>
        <span className="flex items-center gap-2">
          <LayoutDashboard size={16} aria-hidden="true" />
          {t('nav.overview')}
        </span>
      </NavLink>
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
          {currentShop && <ShopStatusSwitch shop={currentShop} canManage={perms.includes('manage_shop')} />}
        </div>
      )}
      <nav className="flex-1 overflow-y-auto px-2.5 pb-4 pt-2.5">{navContent}</nav>
      <div className="border-t border-line-soft px-3 py-3">{userRow}</div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[236px] flex-shrink-0 flex-col overflow-hidden border-r border-line bg-white lg:flex">
        {sidebarContent}
      </aside>

      {/* Phones and tablets: top bar + drawer */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-white px-4 lg:hidden">
        <button
          onClick={() => setDrawerOpen(true)}
          className="rounded-lg p-2 text-[#4a413b] hover:bg-sand"
          aria-label={t('nav.openMenu')}
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
        <>
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setDrawerOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-white shadow-xl lg:hidden">
            <div className="flex h-12 flex-shrink-0 items-center justify-end px-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-1.5 text-[#8a7f77] hover:bg-sand"
                aria-label={t('nav.closeMenu')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="min-h-0 flex-1">{sidebarContent}</div>
          </div>
        </>
      )}

      {accountOpen && user && <AccountSettingsModal user={user} onClose={() => setAccountOpen(false)} />}
    </>
  );
}
