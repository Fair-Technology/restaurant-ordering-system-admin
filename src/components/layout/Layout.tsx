import { useState } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PanelLeft } from 'lucide-react';
import { SkipLink } from './SkipLink';
import { Sidebar } from './Sidebar';
import { FloatingActionButton } from './FloatingActionButton';
import { readSidebarHidden, writeSidebarHidden } from '../../features/layout/sidebarPreference';

/**
 * Sidebar + page. The dishes, orders, combos and categories pages fill the whole height themselves (list on the left,
 * preview or detail column on the right), so they get no padding and, from `lg` up, exactly the
 * screen's height (their columns scroll on their own); every other page keeps the padding.
 */
export function Layout() {
  // Pages with a list and a column on the right (they lay themselves out with SplitPage)
  const dishes = useMatch('/shops/:shopId/products');
  const orders = useMatch('/shops/:shopId/orders');
  const combos = useMatch('/shops/:shopId/combos');
  const categories = useMatch('/shops/:shopId/categories');
  const fullBleed = !!dishes || !!orders || !!combos || !!categories;

  const { t } = useTranslation();

  // Read in the initialiser, not in an effect: the very first render already knows, so a reload
  // never paints the sidebar for a frame before hiding it. Below `lg` the sidebar is a drawer, so
  // this only ever affects `lg` and up.
  const [sidebarHidden, setSidebarHidden] = useState(readSidebarHidden);
  const toggleSidebar = () =>
    setSidebarHidden((hidden) => {
      writeSidebarHidden(!hidden);
      return !hidden;
    });

  return (
    <div className={`flex min-h-screen flex-col lg:flex-row ${fullBleed ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      <SkipLink />
      <Sidebar sidebarHidden={sidebarHidden} onToggleSidebar={toggleSidebar} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {sidebarHidden && (
          <div className="hidden flex-shrink-0 px-4 pt-3 sm:px-7 lg:block">
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={t('nav.showSidebar')}
              title={t('nav.showSidebar')}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-[#6b6058] hover:bg-sand hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            >
              <PanelLeft size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <main id="main" className={fullBleed ? 'flex min-h-0 flex-1 flex-col [&>[role=status]]:mx-4 [&>[role=status]]:mt-4 [&>[role=status]]:mb-0 sm:[&>[role=status]]:mx-7' : 'flex flex-1 flex-col px-4 pt-[22px] pb-28 sm:px-7 lg:pb-7'}>
          <Outlet />
        </main>
      </div>
      {!fullBleed && <FloatingActionButton />}
    </div>
  );
}
