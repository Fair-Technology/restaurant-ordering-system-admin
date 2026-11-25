// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { EditCategoryPage } from './EditCategoryPage';

function Where() {
  const loc = useLocation();
  return <div data-testid="where">{loc.pathname + loc.search}</div>;
}

afterEach(cleanup);

describe('EditCategoryPage (old route)', () => {
  it('redirects, replacing the entry, to the category list with the drawer open', () => {
    const router = createMemoryRouter(
      [
        { path: '/shops/:shopId/categories/:categoryId/edit', element: <EditCategoryPage /> },
        { path: '/shops/:shopId/categories', element: <Where /> },
      ],
      { initialEntries: ['/shops/s1/categories/c9/edit'] },
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('where').textContent).toBe('/shops/s1/categories?category=c9');
    // replace: the old URL is not left behind in history
    expect(router.state.historyAction).toBe('REPLACE');
    expect(router.state.location.pathname).toBe('/shops/s1/categories');
  });
});
