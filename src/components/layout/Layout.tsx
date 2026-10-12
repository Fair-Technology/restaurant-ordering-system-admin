import { Outlet, useMatch } from 'react-router-dom';
import { TopNav } from './TopNav';
import { FloatingActionButton } from './FloatingActionButton';

/**
 * Sidebar + page. The dishes, orders, combos and categories pages fill the whole height themselves (list on the left,
 * preview or detail column on the right), so they get no padding and, from `lg` up, exactly the
 * screen's height (their columns scroll on their own); every other page keeps the padding.
 */
export function Layout() {
  // Pages with a list and a column on the right (they lay themselves out with SplitPage)
  const dishes = useMatch('/shops/:shopId');
  const orders = useMatch('/shops/:shopId/orders');
  const combos = useMatch('/shops/:shopId/combos');
  const categories = useMatch('/shops/:shopId/categories');
  const fullBleed = !!dishes || !!orders || !!combos || !!categories;

  return (
    <div className={`flex min-h-screen flex-col lg:flex-row ${fullBleed ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      <TopNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className={fullBleed ? 'flex min-h-0 flex-1 flex-col [&>[role=status]]:mx-4 [&>[role=status]]:mt-4 [&>[role=status]]:mb-0 sm:[&>[role=status]]:mx-7' : 'flex flex-1 flex-col px-4 pt-[22px] pb-7 sm:px-7'}>
          <Outlet />
        </main>
      </div>
      {!fullBleed && <FloatingActionButton />}
    </div>
  );
}
