// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CombosPage } from './CombosPage';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { name?: string; count?: number }) => (opts?.name ? `${key}:${opts.name}` : key),
    i18n: { language: 'en' },
  }),
}));
const { toastSuccess, setComboOrderMock, dragEvent } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  setComboOrderMock: vi.fn(),
  dragEvent: { current: null as unknown },
}));
vi.mock('../services/comboOrderApi', () => ({
  useSetCategoryComboOrderMutation: () => [(...args: unknown[]) => ({ unwrap: () => setComboOrderMock(...args) }), {}],
}));
// Real pointer drag physics are impractical in jsdom: DndContext becomes a pass-through with a hidden
// trigger that feeds the queued drag event to that group's onDragEnd. useSortable/SortableContext stay real.
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
vi.mock('../features/layout/usePageTitle', () => ({ usePageTitle: () => {} }));
vi.mock('../contexts/ToastContext', () => ({ useToast: () => ({ success: toastSuccess, error: vi.fn() }) }));
vi.mock('../components/combos/ComboEditor', () => ({
  ComboEditor: ({ combo }: { combo: { name: string } | null }) => <div data-testid="editor">{combo ? combo.name : 'new'}</div>,
}));

const m = vi.hoisted(() => ({
  updateCombo: vi.fn(),
  deleteProduct: vi.fn(),
  shop: { current: { data: undefined as unknown, isLoading: false, isError: false } },
  combos: { current: { data: undefined as unknown, isLoading: false, isError: false } },
}));
vi.mock('../services/api', () => ({
  useGetShopByIdQuery: () => m.shop.current,
  useGetProductsByShopQuery: () => ({ data: [{ id: 'd1' }, { id: 'd2' }], isLoading: false }),
  useGetCategoriesByShopQuery: () => ({
    data: [
      { id: 'c1', name: 'Lunch', sortOrder: 1 },
      { id: 'c2', name: 'Dinner', sortOrder: 2 },
    ],
    isLoading: false,
  }),
  useDeleteProductMutation: () => [(...a: unknown[]) => ({ unwrap: () => m.deleteProduct(...a) }), { isLoading: false }],
}));
vi.mock('../services/combosApi', () => ({
  useGetCombosQuery: () => m.combos.current,
  useUpdateComboMutation: () => [(...a: unknown[]) => ({ unwrap: () => m.updateCombo(...a) }), { isLoading: false }],
}));

const combo = (id: string, name: string, categoryId: string, isAvailable = true) => ({
  id,
  name,
  nameTranslations: {},
  description: '',
  descriptionTranslations: {},
  images: [],
  priceCents: 1200,
  categoryId,
  isAvailable,
  bmfDrinkShare: false,
  groups: [{ id: 'g1', name: 'Pasta', nameTranslations: {}, productIds: ['d1', 'd2'] }],
  createdAt: '',
  updatedAt: '',
});

const renderPage = (url = '/shops/s1/combos') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/shops/:shopId/combos" element={<CombosPage />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  toastSuccess.mockReset();
  setComboOrderMock.mockReset();
  m.updateCombo.mockReset().mockResolvedValue({});
  m.deleteProduct.mockReset().mockResolvedValue({});
  m.shop.current = { data: { id: 's1', currency: 'EUR', callerPermissions: ['manage_menu'] }, isLoading: false, isError: false };
  m.combos.current = {
    data: [combo('k1', 'Pasta Deal', 'c1'), combo('k2', 'Steak Night', 'c2', false), combo('k3', 'Pizza Pair', 'c1')],
    isLoading: false,
    isError: false,
  };
});
afterEach(cleanup);

describe('CombosPage', () => {
  it('groups combos by category', () => {
    renderPage();
    const lunch = screen.getByRole('heading', { name: 'Lunch' }).closest('section')!;
    expect(within(lunch).getByText('Pasta Deal')).toBeTruthy();
    expect(within(lunch).getByText('Pizza Pair')).toBeTruthy();
    const dinner = screen.getByRole('heading', { name: 'Dinner' }).closest('section')!;
    expect(within(dinner).getByText('Steak Night')).toBeTruthy();
  });

  it('shows live filter counts and filters the list', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /combos\.filter\.all/ }).textContent).toContain('3');
    expect(screen.getByRole('button', { name: /combos\.filter\.onMenu/ }).textContent).toContain('2');
    expect(screen.getByRole('button', { name: /combos\.filter\.off/ }).textContent).toContain('1');
    fireEvent.click(screen.getByRole('button', { name: /combos\.filter\.off/ }));
    expect(screen.getByText('Steak Night')).toBeTruthy();
    expect(screen.queryByText('Pasta Deal')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /combos\.filter\.onMenu/ }));
    expect(screen.queryByText('Steak Night')).toBeNull();
    expect(screen.getByText('Pasta Deal')).toBeTruthy();
  });

  it('narrows by name, case-insensitively, and shows a no-match note', () => {
    renderPage();
    const box = screen.getByRole('searchbox', { name: 'combos.search' });
    fireEvent.change(box, { target: { value: 'PIZZA' } });
    expect(screen.getByText('Pizza Pair')).toBeTruthy();
    expect(screen.queryByText('Pasta Deal')).toBeNull();
    fireEvent.change(box, { target: { value: 'zzz' } });
    expect(screen.getByText('combos.noMatch')).toBeTruthy();
  });

  it('shows the empty state when there are no combos', () => {
    m.combos.current = { data: [], isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText('combos.none')).toBeTruthy();
    expect(screen.queryByRole('searchbox')).toBeNull();
  });

  it('shows a loading state', () => {
    m.combos.current = { data: undefined, isLoading: true, isError: false };
    renderPage();
    expect(screen.queryByText('Pasta Deal')).toBeNull();
    expect(screen.queryByText('combos.saveFailed')).toBeNull();
  });

  it('shows an error state', () => {
    m.combos.current = { data: undefined, isLoading: false, isError: true };
    renderPage();
    expect(screen.getByText('combos.saveFailed')).toBeTruthy();
  });

  it('the availability switch calls updateCombo without opening the editor', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('switch', { name: 'dishes.availableFor:Pasta Deal' }));
    await waitFor(() => expect(m.updateCombo).toHaveBeenCalledTimes(1));
    expect(m.updateCombo.mock.calls[0][0]).toMatchObject({ shopId: 's1', comboId: 'k1', body: { isAvailable: false } });
    expect(screen.queryByTestId('editor')).toBeNull();
  });

  it('rows have no delete button: deleting lives in the editor', () => {
    renderPage();
    expect(screen.queryByRole('button', { name: 'combos.delete' })).toBeNull();
    expect(m.deleteProduct).not.toHaveBeenCalled();
  });

  it('filters to combos without a photo, and counts them', () => {
    m.combos.current = {
      data: [
        { ...combo('k1', 'Pasta Deal', 'c1'), images: [{ id: 'i', url: 'https://img/1.jpg' }] },
        combo('k2', 'Steak Night', 'c2', false),
      ],
      isLoading: false,
      isError: false,
    };
    renderPage();
    expect(screen.getByRole('button', { name: /combos\.filter\.photoMissing/ }).textContent).toContain('1');
    fireEvent.click(screen.getByRole('button', { name: /combos\.filter\.photoMissing/ }));
    expect(screen.getByText('Steak Night')).toBeTruthy();
    expect(screen.queryByText('Pasta Deal')).toBeNull();
  });

  it('shows the photo-missing badge inline with the other badges', () => {
    renderPage();
    const row = screen.getByText('Pasta Deal').parentElement!;
    expect(within(row).getByText('combos.missingPhoto')).toBeTruthy();
  });

  it('each category header shows the count and the Price / On menu column labels', () => {
    renderPage();
    const lunch = screen.getByRole('heading', { name: 'Lunch' }).closest('section')!;
    expect(within(lunch).getByText('2')).toBeTruthy();
    expect(within(lunch).getByText('combos.columnPrice')).toBeTruthy();
    expect(within(lunch).getByText('combos.columnOnMenu')).toBeTruthy();
  });

  it('the editor opens in a slide-over dialog; the New combo button opens it empty', () => {
    renderPage();
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /combos\.new/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByTestId('editor').textContent).toBe('new');
  });

  it('clicking a row opens its editor; ?combo= opens it on load', () => {
    const first = renderPage();
    fireEvent.click(screen.getByText('Steak Night'));
    expect(within(screen.getByRole('dialog')).getByTestId('editor').textContent).toBe('Steak Night');
    first.unmount();
    renderPage('/shops/s1/combos?combo=k3');
    expect(screen.getByTestId('editor').textContent).toBe('Pizza Pair');
  });
});

describe('CombosPage combo reordering', () => {
  const row = (name: string) => screen.getByText(name).closest('[role="button"]') as HTMLElement;
  const handle = (name: string) => within(row(name)).getByLabelText('combos.dragHandle');
  const order = (section: HTMLElement) =>
    within(section)
      .getAllByRole('button', { name: /Deal|Pair|Extra/ })
      .filter((el) => el.getAttribute('role') === 'button' && el.tagName === 'DIV')
      .map((el) => el.textContent!.match(/Pasta Deal|Pizza Pair|Extra Combo/)![0]);
  const lunch = () => screen.getByRole('heading', { name: 'Lunch' }).closest('section') as HTMLElement;
  const drag = async (activeId: string, overId: string, section = lunch()) => {
    dragEvent.current = { active: { id: activeId }, over: { id: overId } };
    await act(async () => { fireEvent.click(within(section).getByTestId('dnd-trigger')); });
  };
  const withExtra = () => {
    m.combos.current = {
      data: [
        { ...combo('k1', 'Pasta Deal', 'c1') },
        { ...combo('k3', 'Pizza Pair', 'c1'), categoryOrder: { c1: 0 } },
        { ...combo('k4', 'Extra Combo', 'c1'), categoryOrder: { c1: 1 } },
        combo('k2', 'Steak Night', 'c2', false),
        combo('k5', 'Orphan Menu', 'gone'),
      ],
      isLoading: false,
      isError: false,
    };
  };

  it('lists saved positions first, then the rest by name', () => {
    withExtra();
    renderPage();
    expect(order(lunch())).toEqual(['Pizza Pair', 'Extra Combo', 'Pasta Deal']);
  });

  it('reorders optimistically, saves the full category id list and toasts', async () => {
    withExtra();
    setComboOrderMock.mockResolvedValueOnce({});
    renderPage();
    await drag('k3', 'k1');
    await waitFor(() => expect(order(lunch())).toEqual(['Extra Combo', 'Pasta Deal', 'Pizza Pair']));
    expect(setComboOrderMock).toHaveBeenCalledWith({
      shopId: 's1',
      categoryId: 'c1',
      body: { productIds: ['k4', 'k1', 'k3'] },
    });
    expect(toastSuccess).toHaveBeenCalledWith('combos.reordered');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('reverts and shows an alert when the save fails', async () => {
    withExtra();
    setComboOrderMock.mockRejectedValueOnce(new Error('boom'));
    renderPage();
    await drag('k3', 'k1');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('combos.failedToReorder'));
    expect(order(lunch())).toEqual(['Pizza Pair', 'Extra Combo', 'Pasta Deal']);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps handles inert under a search or filter, and none on uncategorized combos', () => {
    withExtra();
    renderPage();
    expect(handle('Pasta Deal').getAttribute('aria-disabled')).toBeNull();
    expect(within(row('Orphan Menu')).queryByLabelText('combos.dragHandle')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /combos\.filter\.onMenu/ }));
    expect(handle('Pasta Deal').getAttribute('aria-disabled')).toBe('true');
    expect(handle('Pasta Deal').getAttribute('title')).toBe('combos.reorderDisabledHint');
    expect(within(row('Orphan Menu')).queryByLabelText('combos.dragHandle')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /combos\.filter\.all/ }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'combos.search' }), { target: { value: 'pasta' } });
    expect(handle('Pasta Deal').getAttribute('aria-disabled')).toBe('true');
    expect(handle('Pasta Deal').getAttribute('title')).toBe('combos.reorderDisabledHint');
  });

  it('clicking a handle does not open the editor, a row click does', () => {
    withExtra();
    renderPage();
    fireEvent.click(handle('Pasta Deal'));
    expect(screen.queryByTestId('editor')).toBeNull();
    fireEvent.click(row('Pasta Deal'));
    expect(screen.getByTestId('editor').textContent).toBe('Pasta Deal');
  });
});
