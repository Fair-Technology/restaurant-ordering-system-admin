import { useState, useEffect } from 'react';
import { NavLink, useParams, useNavigate } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Menu, X,
  Package, ClipboardList, Tag, CreditCard, Settings, Store,
  Users, History, LogOut, Languages, Scale,
  Circle, QrCode, Percent, ChartColumn, LayoutDashboard,
} from 'lucide-react';
import {
  useGetShopByIdQuery,
  useLazyGetGoLiveStatusQuery,
  useUpdateShopMutation,
} from '../../services/api';
import { shopNavItems } from '../../features/shops/shopNav';
import { clearStaffSession, readStaffSession } from '../../features/staff/staffSession';
import { AccountSettingsModal } from './AccountSettingsModal';
import { GoLiveCriteriaModal, PauseShopModal } from '../shop/GoLiveModal';

export function TopNav() {
  const { shopId } = useParams<{ shopId?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { accounts } = useMsal();
  const user = accounts[0];
  const staffSession = readStaffSession();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [goLiveModal, setGoLiveModal] = useState<'criteria' | 'pause' | null>(null);
  const [fetchGoLiveStatus, { data: goLiveStatus, isFetching: goLiveChecking }] =
    useLazyGetGoLiveStatusQuery();
  const [updateShop, { isLoading: goingOnline }] = useUpdateShopMutation();

  const { data: currentShop } = useGetShopByIdQuery(
    { shopId: shopId! },
    { skip: !shopId },
  );

  const perms = currentShop?.callerPermissions ?? [];
  const nav = shopNavItems(perms);

  // Close drawer on navigation
  useEffect(() => {
    setDrawerOpen(false);
  }, [shopId]);

  const navItemClass = (isActive: boolean) =>
    isActive
      ? 'flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-medium'
      : 'flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-gray-900 text-sm font-medium transition-colors';

  const divider = <hr className="border-t border-gray-100 my-0.5" />;

  const shopNavContent = shopId ? (
    <>
      {!staffSession && (
        <NavLink to="/shops" end className={({ isActive }) => navItemClass(isActive)}>
          <ArrowLeft size={16} className="flex-shrink-0" />
          {t('nav.myShops')}
        </NavLink>
      )}
      {nav.includes('orders') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/orders`} className={({ isActive }) => navItemClass(isActive)}>
            <ClipboardList size={16} className="flex-shrink-0" />
            {t('nav.orders')}
          </NavLink>
        </>
      )}
      {nav.includes('reports') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/reports`} className={({ isActive }) => navItemClass(isActive)}>
            <ChartColumn size={16} className="flex-shrink-0" />
            {t('nav.reports')}
          </NavLink>
        </>
      )}
      {nav.includes('products') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}`} end className={({ isActive }) => navItemClass(isActive)}>
            <Package size={16} className="flex-shrink-0" />
            {t('nav.products')}
          </NavLink>
        </>
      )}
      {nav.includes('categories') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/categories`} className={({ isActive }) => navItemClass(isActive)}>
            <Tag size={16} className="flex-shrink-0" />
            {t('nav.categories')}
          </NavLink>
        </>
      )}
      {nav.includes('translations') && (currentShop?.menuLanguages?.length ?? 1) > 1 && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/translations`} className={({ isActive }) => navItemClass(isActive)}>
            <Languages size={16} className="flex-shrink-0" />
            {t('nav.translations')}
          </NavLink>
        </>
      )}
      {nav.includes('tables') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/tables`} className={({ isActive }) => navItemClass(isActive)}>
            <QrCode size={16} className="flex-shrink-0" />
            {t('nav.tables')}
          </NavLink>
        </>
      )}
      {nav.includes('promotions') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/promotions`} className={({ isActive }) => navItemClass(isActive)}>
            <Percent size={16} className="flex-shrink-0" />
            {t('nav.promotions')}
          </NavLink>
        </>
      )}
      {nav.includes('subscription') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/subscription`} className={({ isActive }) => navItemClass(isActive)}>
            <CreditCard size={16} className="flex-shrink-0" />
            {t('nav.subscription')}
          </NavLink>
        </>
      )}
      {nav.includes('staff') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/staff`} className={({ isActive }) => navItemClass(isActive)}>
            <Users size={16} className="flex-shrink-0" />
            {t('nav.staff')}
          </NavLink>
        </>
      )}
      {nav.includes('activity') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/activity`} className={({ isActive }) => navItemClass(isActive)}>
            <History size={16} className="flex-shrink-0" />
            {t('nav.activity')}
          </NavLink>
        </>
      )}
      {nav.includes('settings') && (
        <>
          {divider}
          <NavLink to={`/shops/${shopId}/settings`} className={({ isActive }) => navItemClass(isActive)}>
            <Settings size={16} className="flex-shrink-0" />
            {t('nav.settings')}
          </NavLink>
          {nav.includes('legal') && (
            <>
              {divider}
              <NavLink to={`/shops/${shopId}/legal`} className={({ isActive }) => navItemClass(isActive)}>
                <Scale size={16} className="flex-shrink-0" />
                {t('nav.legal')}
              </NavLink>
            </>
          )}
          {divider}
          <button
            type="button"
            disabled={goLiveChecking || goingOnline}
            onClick={async () => {
              if (currentShop?.isPaused === false) {
                setGoLiveModal('pause');
              } else {
                const result = await fetchGoLiveStatus({ shopId: shopId! }).unwrap();
                if (result.allMet) {
                  await updateShop({
                    shopId: shopId!,
                    updateShopRequest: { isPaused: false },
                  });
                } else {
                  setGoLiveModal('criteria');
                }
              }
            }}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors w-full
              disabled:opacity-50
              text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            <Circle
              size={10}
              className={`shrink-0 fill-current ${currentShop?.isPaused === false ? 'text-emerald-500' : 'text-red-400'}`}
            />
            {currentShop?.isPaused === false ? t('nav.shopOnline') : t('nav.shopOffline')}
          </button>
        </>
      )}
    </>
  ) : (
    <>
      <NavLink to="/" end className={({ isActive }) => navItemClass(isActive)}>
        <LayoutDashboard size={16} className="flex-shrink-0" />
        {t('nav.overview')}
      </NavLink>
      <NavLink to="/shops" className={({ isActive }) => navItemClass(isActive)}>
        <Store size={16} className="flex-shrink-0" />
        {t('nav.myShops')}
      </NavLink>
    </>
  );

  // ── User row (shared) ─────────────────────────────────────────────────────
  const userRow = staffSession ? (
    <div className="w-full flex items-center gap-2.5 px-1 py-1">
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {staffSession.username.charAt(0).toUpperCase()}
          </span>
        </div>
      </div>
      <span className="flex-1 text-xs text-gray-600 truncate">{staffSession.username}</span>
      <button
        onClick={() => {
          clearStaffSession();
          navigate(`/${staffSession.shopSlug}/staff`);
        }}
        aria-label={t('staffLogin.signOut')}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
      >
        <LogOut size={14} />
      </button>
    </div>
  ) : (
    <button
      onClick={() => setAccountOpen(true)}
      className="w-full flex items-center gap-2.5 px-1 py-1 rounded-xl hover:bg-gray-100 transition-colors text-left"
    >
      <div className="relative w-8 h-8 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gray-900 flex items-center justify-center">
          <span className="text-xs font-semibold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>
      </div>
      <span className="flex-1 text-xs text-gray-600 truncate">{user?.name}</span>
    </button>
  );

  const shopLogo = shopId && currentShop ? (
    <div className="px-4 pt-4 pb-2 border-b border-gray-100 flex justify-center">
      {currentShop.branding?.logoUrl ? (
        <img
          src={currentShop.branding?.logoUrl}
          alt={currentShop.name}
          className="w-11 h-11 rounded-lg object-cover"
        />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center">
          <span className="text-base font-semibold text-gray-500">
            {currentShop.name?.charAt(0).toUpperCase() ?? '?'}
          </span>
        </div>
      )}
    </div>
  ) : null;

  // ── Sidebar content (shared between desktop sidebar and mobile drawer) ────────
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {shopLogo}
      {/* Nav items */}
      <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto">
        {shopNavContent}
      </nav>

      {/* Bottom: user row */}
      <div className="px-3 py-4 border-t border-gray-100">
        {userRow}
      </div>
    </div>
  );

  // ── Mobile drawer content ───────────────────────────────────────────────────
  const drawerContent = (
    <div className="flex flex-col h-full">
      {/* Nav items */}
      <nav className="flex-1 px-3 pt-2 pb-4 overflow-y-auto">
        {shopNavContent}
      </nav>

      {/* Bottom: user row */}
      <div className="px-3 py-4 border-t border-gray-100">
        {userRow}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-white border-r border-gray-200 sticky top-0 h-screen overflow-hidden">
        {sidebarContent}
      </aside>

      {/* ── Mobile top bar ──────────────────────────────────────────────── */}
      <header className="lg:hidden bg-white border-b border-gray-200 sticky top-0 z-30 flex items-center h-14 px-4 gap-3">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        {shopId && currentShop ? (
          currentShop.branding?.logoUrl ? (
            <img
              src={currentShop.branding?.logoUrl}
              alt={currentShop.name}
              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-gray-500">
                {currentShop.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
          )
        ) : (
          <span className="flex-1 text-sm font-semibold text-gray-900 truncate">
            {t('nav.myShops')}
          </span>
        )}
      </header>

      {/* ── Mobile drawer ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setDrawerOpen(false)}
          />
          {/* Drawer panel */}
          <div className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white z-50 shadow-xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 h-14 border-b border-gray-200 flex-shrink-0">
              {shopId && currentShop ? (
                currentShop.branding?.logoUrl ? (
                  <img
                    src={currentShop.branding?.logoUrl}
                    alt={currentShop.name}
                    className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-gray-500">
                      {currentShop.name?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  </div>
                )
              ) : (
                <span className="text-sm font-semibold text-gray-900 truncate">{t('nav.myShops')}</span>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {drawerContent}
            </div>
          </div>
        </>
      )}

      {/* ── Account settings modal ───────────────────────────────────────── */}
      {accountOpen && user && (
        <AccountSettingsModal user={user} onClose={() => setAccountOpen(false)} />
      )}

      {/* ── Go-live modals ───────────────────────────────────────────────── */}
      {goLiveModal === 'criteria' && goLiveStatus && shopId && (
        <GoLiveCriteriaModal
          shopId={shopId}
          status={goLiveStatus}
          onClose={() => setGoLiveModal(null)}
        />
      )}
      {goLiveModal === 'pause' && shopId && (
        <PauseShopModal
          shopId={shopId}
          onClose={() => setGoLiveModal(null)}
          onSuccess={() => setGoLiveModal(null)}
        />
      )}
    </>
  );
}
