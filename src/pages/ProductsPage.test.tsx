// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useBlocker, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { ProductsPage } from './ProductsPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string; defaultValue?: string }) => (opts?.name ? `${key}:${opts.name}` : (opts?.defaultValue ?? key)),
    i18n: { language: 'en' },
  }),
}));
const { toastSuccess, toastError, setCategoryDishOrderMock, dragEvent } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  setCategoryDishOrderMock: vi.fn(),
  dragEvent: { current: null as unknown },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: toastSuccess, error: toastError }) }));
vi.mock('../services/dishOrderApi', () => ({
  useSetCategoryDishOrderMutation: () => [
    (...args: unknown[]) => ({ unwrap: () => setCategoryDishOrderMock(...args) }),
    {},
  ],
}));
// Real pointer/touch drag physics are impractical in jsdom: DndContext becomes a pass-through with a
// hidden trigger that feeds the queued drag event to that group's own onDragEnd. useSortable and
// SortableContext stay real.
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (e: unknown) => void }) => (
      <div>
        {children}
        <button type="button" data-testid="dnd-trigger" hidden onClick={() => onDragEnd(dragEvent.current)} />
      </div>
    ),
  };
});
vi.mock('../features/menu/useSoldOutToday', () => ({
  useSoldOutToday: () => ({ markSoldOutToday: vi.fn(), clearSoldOut: vi.fn(), setAvailable: vi.fn(), isPending: () => false }),
}));
vi.mock('../features/menu/useUploadProductImage', () => ({ useUploadProductImage: () => vi.fn() }));
vi.mock('../features/menu/useShopReferenceLists', () => ({ useShopReferenceLists: () => ({ refs: {} }) }));

const products = [
  { id: 'p1', name: 'Margherita', categories: [{ id: 'c1', name: 'Pizza', sortOrder: 1 }], isAvailable: true },
  { id: 'p2', name: 'Tiramisu', categories: [{ id: 'c1', name: 'Pizza', sortOrder: 1 }], isAvailable: true },
  { id: 'p3', name: 'Cola', categories: [], isAvailable: true },
];
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => ({ data: { id: 's1', currency: 'EUR', timezone: 'UTC', callerPermissions: ['manage_menu'] } }),
  useGetProductsByShopQuery: () => ({ data: products, isLoading: false, isFetching: false, isError: false }),
  useGetCategoriesByShopQuery: () => ({ data: [] }),
  useCreateProductMutation: () => [vi.fn(), {}],
}));

// The real DishEditor needs a large API surface. Stand in for it with the same unsaved-changes
// contract (useBlocker + window.confirm) so we test the drawer/page wiring against the real router.
vi.mock('../components/menu/DishEditor', () => ({
  DishEditor: ({ productId, onClose }: { productId: string; onClose: () => void }) => {
    const [dirty, setDirty] = useState(false);
    const blocker = useBlocker(() => dirty);
    if (blocker.state === 'blocked') {
      if (window.confirm('confirmLeave')) blocker.proceed();
      else blocker.reset();
    }
    return (
      <div data-testid="editor" data-product={productId}>
        <button type="button" aria-label="dishes.editor.closeEditor" onClick={onClose} />
        <button type="button" onClick={() => setDirty(true)}>make-dirty</button>
      </div>
    );
  },
}));

function Probe() {
  const loc = useLocation();
  return <div data-testid="search">{loc.search}</div>;
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [{ path: '/shops/:shopId/dishes', element: (<><ProductsPage /><Probe /></>) }],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
const search = () => screen.getByTestId('search').textContent;
const row = (name: string) => screen.getByText(name).closest('[role="button"]') as HTMLElement;

let confirmSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  setCategoryDishOrderMock.mockReset();
  confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ProductsPage dish drawer', () => {
  it('opens the editor in a drawer over the still-rendered list', () => {
    renderAt('/shops/s1/dishes');
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(row('Margherita'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('dishes.editor.dialogLabel:Margherita');
    expect(screen.getByTestId('editor').getAttribute('data-product')).toBe('p1');
    expect(screen.getByText('Tiramisu')).toBeTruthy();
    expect(search()).toBe('?dish=p1');
  });

  it('opens on mount from ?dish=<id> and locks body scroll until closed', () => {
    renderAt('/shops/s1/dishes?dish=p2');
    expect(screen.getByTestId('editor').getAttribute('data-product')).toBe('p2');
    expect(screen.getByText('Margherita')).toBeTruthy();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByLabelText('dishes.editor.closeEditor'));
    expect(document.body.style.overflow).toBe('');
  });

  it('closes immediately via X when there are no unsaved changes', () => {
    renderAt('/shops/s1/dishes?dish=p1');
    fireEvent.click(screen.getByLabelText('dishes.editor.closeEditor'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(search()).toBe('');
    expect(confirmSpy).not.toHaveBeenCalled();
  });

  it('closes on Escape and backdrop click when clean', () => {
    renderAt('/shops/s1/dishes?dish=p1');
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(row('Tiramisu'));
    fireEvent.click(screen.getByRole('dialog').parentElement!);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('does not close on clicks inside the panel', () => {
    renderAt('/shops/s1/dishes?dish=p1');
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  const closers: Array<[string, () => void]> = [
    ['X', () => fireEvent.click(screen.getByLabelText('dishes.editor.closeEditor'))],
    ['Escape', () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })],
    ['backdrop', () => fireEvent.click(screen.getByRole('dialog').parentElement!)],
  ];
  it.each(closers)('with unsaved changes, %s prompts and stays open on cancel, closes on confirm', (_n, close) => {
    renderAt('/shops/s1/dishes?dish=p1');
    fireEvent.click(screen.getByText('make-dirty'));

    confirmSpy.mockReturnValue(false);
    close();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(search()).toBe('?dish=p1');

    confirmSpy.mockReturnValue(true);
    close();
    expect(confirmSpy).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(search()).toBe('');
  });

  it('switches the editor when another dish row is clicked while open', () => {
    renderAt('/shops/s1/dishes?dish=p1');
    fireEvent.click(row('Tiramisu'));
    expect(screen.getByTestId('editor').getAttribute('data-product')).toBe('p2');
    expect(search()).toBe('?dish=p2');
  });

  it('browser back closes the drawer', async () => {
    const router = renderAt('/shops/s1/dishes');
    fireEvent.click(row('Margherita'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { await router.navigate(-1); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ProductsPage dish reordering', () => {
  const names = () => ['Margherita', 'Tiramisu'].sort((a, b) => (row(a).compareDocumentPosition(row(b)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const dragMargheritaPastTiramisu = async () => {
    dragEvent.current = { active: { id: 'p1' }, over: { id: 'p2' } };
    const section = row('Margherita').closest('section') as HTMLElement;
    await act(async () => { fireEvent.click(within(section).getByTestId('dnd-trigger')); });
  };

  it('sorts dishes by name by default and flips them after a successful save', async () => {
    setCategoryDishOrderMock.mockResolvedValueOnce({ categoryId: 'c1', products: [] });
    renderAt('/shops/s1/dishes');
    expect(names()).toEqual(['Margherita', 'Tiramisu']);
    await dragMargheritaPastTiramisu();
    await waitFor(() => expect(names()).toEqual(['Tiramisu', 'Margherita']));
    expect(setCategoryDishOrderMock).toHaveBeenCalledWith({ shopId: 's1', categoryId: 'c1', body: { productIds: ['p2', 'p1'] } });
    expect(toastSuccess).toHaveBeenCalledWith('dishes.reordered');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reverts the order and shows an error when the save fails', async () => {
    setCategoryDishOrderMock.mockRejectedValueOnce(new Error('boom'));
    renderAt('/shops/s1/dishes');
    await dragMargheritaPastTiramisu();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('dishes.failedToReorder'));
    expect(names()).toEqual(['Margherita', 'Tiramisu']);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('clicking a handle does not open the dish, a row click still does', () => {
    renderAt('/shops/s1/dishes');
    fireEvent.click(within(row('Margherita')).getByLabelText('dishes.dragHandle'));
    expect(search()).toBe('');
    fireEvent.click(row('Margherita'));
    expect(search()).toBe('?dish=p1');
  });

  it('greys out the handles while a filter or search is active; uncategorized dishes never get one', () => {
    renderAt('/shops/s1/dishes');
    const handle = () => within(row('Margherita')).getByLabelText('dishes.dragHandle');
    expect(handle().getAttribute('aria-disabled')).toBeNull();
    expect(handle().getAttribute('title')).toBeNull();
    expect(within(row('Cola')).queryByLabelText('dishes.dragHandle')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /dishes\.filter\.onMenu/ }));
    expect(handle().getAttribute('aria-disabled')).toBe('true');
    expect(handle().getAttribute('title')).toBe('dishes.reorderDisabledHint');
    expect(handle().className).toContain('cursor-not-allowed');
    expect(within(row('Cola')).queryByLabelText('dishes.dragHandle')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /dishes\.filter\.all/ }));
    fireEvent.change(screen.getByLabelText('dishes.search'), { target: { value: 'marg' } });
    expect(handle().getAttribute('aria-disabled')).toBe('true');
  });
});
