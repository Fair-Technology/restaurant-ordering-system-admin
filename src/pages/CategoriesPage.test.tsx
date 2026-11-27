// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RouterProvider, createMemoryRouter, useLocation } from 'react-router-dom';
import { CategoriesPage } from './CategoriesPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string; defaultValue?: string }) => (opts?.name ? `${key}:${opts.name}` : (opts?.defaultValue ?? key)),
    i18n: { language: 'en' },
  }),
}));
const { toastSuccess, toastError, updateCategoryMock, createCategoryMock, refsMock, dragEvent } = vi.hoisted(() => ({
  createCategoryMock: vi.fn(),
  refsMock: { current: { taxClasses: [] } as Record<string, unknown> },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  updateCategoryMock: vi.fn(),
  dragEvent: { current: null as unknown },
}));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: toastSuccess, error: toastError }) }));
// Real pointer drag physics are impractical in jsdom: DndContext becomes a pass-through with a hidden
// trigger that feeds the queued drag event to onDragEnd. useSortable and SortableContext stay real.
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
vi.mock('../features/menu/useShopReferenceLists', () => ({ useShopReferenceLists: () => ({ refs: refsMock.current }) }));
vi.mock('../components/ui/IconPicker', () => ({ IconPickerInline: () => <span /> }));

const categories = [
  { id: 'c1', name: 'Pizza', isAvailable: true, sortOrder: 0 },
  { id: 'c2', name: 'Drinks', isAvailable: true, sortOrder: 1 },
];
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => ({ data: { id: 's1', name: 'Shop' } }),
  useGetCategoriesByShopQuery: () => ({ data: categories, isLoading: false, isError: false }),
  useUpdateCategoryMutation: () => [
    (...args: unknown[]) => ({ unwrap: () => updateCategoryMock(...args) }),
    { isLoading: false },
  ],
  useCreateCategoryMutation: () => [
    (...args: unknown[]) => ({ unwrap: () => createCategoryMock(...args) }),
    { isLoading: false },
  ],
}));

vi.mock('../components/categories/CategoryEditor', () => ({
  CategoryEditor: ({ categoryId, onCancel }: { categoryId: string; onCancel: () => void }) => (
    <div data-testid="editor" data-category={categoryId}>
      <button type="button" aria-label="editor-cancel" onClick={onCancel} />
    </div>
  ),
}));

function Probe() {
  const loc = useLocation();
  return <div data-testid="search">{loc.search}</div>;
}

function renderAt(url: string) {
  const router = createMemoryRouter(
    [{ path: '/shops/:shopId/categories', element: (<><CategoriesPage /><Probe /></>) }],
    { initialEntries: [url] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
const search = () => screen.getByTestId('search').textContent;
// The drawer title repeats the name, so find rows by their name element id
const ids: Record<string, string> = { Pizza: 'c1', Drinks: 'c2' };
const row = (name: string) => document.getElementById(`category-name-${ids[name]}`)!.closest('[role="button"]') as HTMLElement;

beforeEach(() => {
  toastSuccess.mockReset();
  toastError.mockReset();
  updateCategoryMock.mockReset();
  createCategoryMock.mockReset();
  refsMock.current = { taxClasses: [] };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('CategoriesPage drawer', () => {
  it('shows no dialog and no select hint on mount', () => {
    renderAt('/shops/s1/categories');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('categories.selectHint')).toBeNull();
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(screen.getByText('Pizza')).toBeTruthy();
  });

  it('opens from a row click, with the name in the dialog label, over the still-rendered list', () => {
    renderAt('/shops/s1/categories');
    fireEvent.click(row('Pizza'));
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBe('categories.editTitle: Pizza');
    expect(dialog.className).toContain('sm:w-[560px]');
    expect(screen.getByTestId('editor').getAttribute('data-category')).toBe('c1');
    expect(screen.getByText('Drinks')).toBeTruthy();
    expect(search()).toBe('?category=c1');
  });

  it('opens from the Edit pencil without following the link', () => {
    renderAt('/shops/s1/categories');
    fireEvent.click(within(row('Drinks')).getByLabelText('categories.edit'));
    expect(screen.getByTestId('editor').getAttribute('data-category')).toBe('c2');
    expect(search()).toBe('?category=c2');
  });

  it('opens on mount from ?category=<id> and locks body scroll until closed', () => {
    renderAt('/shops/s1/categories?category=c2');
    expect(screen.getByTestId('editor').getAttribute('data-category')).toBe('c2');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByLabelText('categories.close'));
    expect(document.body.style.overflow).toBe('');
  });

  const closers: Array<[string, () => void]> = [
    ['X', () => fireEvent.click(screen.getByLabelText('categories.close'))],
    ['Escape', () => fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })],
    ['backdrop', () => fireEvent.click(screen.getByRole('dialog').parentElement!)],
    ['editor cancel', () => fireEvent.click(screen.getByLabelText('editor-cancel'))],
  ];
  it.each(closers)('closes via %s and clears the param', (_n, close) => {
    renderAt('/shops/s1/categories?category=c1');
    close();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(search()).toBe('');
    expect(screen.getByText('Pizza')).toBeTruthy();
  });

  it('does not close on clicks inside the panel', () => {
    renderAt('/shops/s1/categories?category=c1');
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('highlights the opened row while the drawer is open', () => {
    renderAt('/shops/s1/categories');
    expect(row('Pizza').getAttribute('aria-current')).toBeNull();
    fireEvent.click(row('Pizza'));
    expect(row('Pizza').getAttribute('aria-current')).toBe('true');
    expect(row('Drinks').getAttribute('aria-current')).toBeNull();
  });

  it('switches the editor when another row is clicked while open', () => {
    renderAt('/shops/s1/categories?category=c1');
    fireEvent.click(row('Drinks'));
    expect(screen.getByTestId('editor').getAttribute('data-category')).toBe('c2');
  });

  it('browser back closes the drawer', async () => {
    const router = renderAt('/shops/s1/categories');
    fireEvent.click(row('Pizza'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    await act(async () => { await router.navigate(-1); });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('CategoriesPage reordering', () => {
  const names = () => ['Pizza', 'Drinks'].sort((a, b) => (row(a).compareDocumentPosition(row(b)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
  const dragPizzaPastDrinks = async () => {
    dragEvent.current = { active: { id: 'c1' }, over: { id: 'c2' } };
    await act(async () => { fireEvent.click(screen.getByTestId('dnd-trigger')); });
  };

  it.each([['closed', '/shops/s1/categories'], ['open', '/shops/s1/categories?category=c1']])(
    'saves the new order with the drawer %s',
    async (_n, url) => {
      updateCategoryMock.mockResolvedValue({});
      renderAt(url);
      expect(names()).toEqual(['Pizza', 'Drinks']);
      await dragPizzaPastDrinks();
      await waitFor(() => expect(names()).toEqual(['Drinks', 'Pizza']));
      expect(updateCategoryMock).toHaveBeenCalledWith({ shopId: 's1', categoryId: 'c2', body: { sortOrder: 0 } });
      expect(updateCategoryMock).toHaveBeenCalledWith({ shopId: 's1', categoryId: 'c1', body: { sortOrder: 1 } });
      expect(toastSuccess).toHaveBeenCalledWith('categories.reordered');
    },
  );

  it('reverts and shows an error when the save fails', async () => {
    updateCategoryMock.mockRejectedValue(new Error('boom'));
    renderAt('/shops/s1/categories');
    await dragPizzaPastDrinks();
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('categories.failedToReorder'));
    expect(names()).toEqual(['Pizza', 'Drinks']);
  });

  it('clicking a handle does not open the editor', () => {
    renderAt('/shops/s1/categories');
    fireEvent.click(within(row('Pizza')).getByLabelText('categories.dragHandle'));
    expect(search()).toBe('');
  });
});

describe('CategoriesPage create dialog tax class', () => {
  const taxClass = (id: string, en: string) => ({ id, isActive: true, labels: { en, de: en }, rates: [] });
  beforeEach(() => {
    refsMock.current = {
      defaultTaxClassId: 'speisen',
      taxClasses: [taxClass('speisen', 'Speisen'), taxClass('getraenke', 'Getränke')],
    };
    createCategoryMock.mockResolvedValue({});
  });
  const openDialog = () => {
    renderAt('/shops/s1/categories?addCategory=1');
    return screen.getByLabelText('categories.taxClass') as HTMLSelectElement;
  };

  it('preselects no tax class, even though the platform default exists', () => {
    const select = openDialog();
    expect(select.value).toBe('');
    expect(select.selectedOptions[0].textContent).toBe('categories.taxClassChoose');
    expect(select.selectedOptions[0].disabled).toBe(true);
  });

  it('blocks submit without a tax class and shows the validation error', () => {
    const select = openDialog();
    fireEvent.change(screen.getByLabelText('categories.name'), { target: { value: 'Getränke' } });
    fireEvent.submit(select.closest('form')!);
    expect(screen.getByRole('alert').textContent).toBe('categories.taxClassRequired');
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(select.getAttribute('aria-describedby')).toBe(screen.getByRole('alert').id);
    expect(createCategoryMock).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'getraenke' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sends the explicitly chosen tax class, not the platform default', async () => {
    const select = openDialog();
    fireEvent.change(screen.getByLabelText('categories.name'), { target: { value: 'Getränke' } });
    fireEvent.change(select, { target: { value: 'getraenke' } });
    fireEvent.submit(select.closest('form')!);
    await waitFor(() => expect(createCategoryMock).toHaveBeenCalledTimes(1));
    expect(createCategoryMock.mock.calls[0][0].body.taxClassId).toBe('getraenke');
  });
});
