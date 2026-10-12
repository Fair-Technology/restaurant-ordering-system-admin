import { Outlet, useMatch } from 'react-router-dom';
import { TopNav } from './TopNav';
import { FloatingActionButton } from './FloatingActionButton';

/**
 * Sidebar + page. The dishes and orders pages fill the whole height themselves (list on the left,
 * preview or detail column on the right), so they get no padding and, from `lg` up, exactly the
 * screen's height (their columns scroll on their own); every other page keeps the padding.
 */
export function Layout() {
  const dishes = useMatch('/shops/:shopId');
  const orders = useMatch('/shops/:shopId/orders');
  const fullBleed = !!dishes || !!orders;

  return (
    <div className={`flex min-h-screen flex-col lg:flex-row ${fullBleed ? 'lg:h-screen lg:overflow-hidden' : ''}`}>
      <TopNav />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main className={fullBleed ? 'flex min-h-0 flex-1 flex-col' : 'flex flex-1 flex-col p-6'}>
          <Outlet />
        </main>
      </div>
      {!fullBleed && <FloatingActionButton />}
    </div>
  );
}
