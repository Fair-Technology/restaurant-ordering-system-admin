// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ProductDto } from '../../services/api';
import { ToastContext } from '../../contexts/ToastContext';
import { DishEditor } from './DishEditor';

// Keys resolve to themselves; the real bundles are checked by DishForm.test.tsx
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));
vi.mock('react-router-dom', () => ({ useBlocker: () => ({ state: 'unblocked' }) }));
vi.mock('../../features/menu/useUploadProductImage', () => ({ useUploadProductImage: () => vi.fn() }));
vi.mock('../../features/menu/useShopReferenceLists', () => ({ useShopReferenceLists: () => ({ refs: undefined, isError: false }) }));

const deleteMutate = vi.fn();
const product = { id: 'p1', name: 'Margherita', description: 'Tomato', price: 900, categories: [{ id: 'c1' }], images: [] } as unknown as ProductDto;

vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useGetProductByIdQuery: () => ({ data: product, isLoading: false, isError: false }),
  useGetShopByIdQuery: () => ({ data: { id: 's1', currency: 'EUR', countryCode: 'DE' } }),
  useUpdateProductMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteProductMutation: () => [deleteMutate, { isLoading: false }],
  useGetOptionGroupsQuery: () => ({ data: [] }),
  useCreateCategoryMutation: () => [vi.fn(), { isLoading: false }],
  useCreateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
}));

const toast = { success: vi.fn(), error: vi.fn() };
const onDeleted = vi.fn();

function setup() {
  render(
    <ToastContext.Provider value={toast}>
      <DishEditor
        productId="p1"
        shopId="s1"
        currencySymbol="€"
        categoriesList={[{ id: 'c1', name: 'Pasta' }]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        onDeleted={onDeleted}
      />
    </ToastContext.Provider>,
  );
}
const deleteBtn = () => screen.getByRole('button', { name: /dishes\.editor\.deleteDish/ });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

describe('DishEditor — Delete dish', () => {
  it('is reachable on mount, without leaving the default Basics section', () => {
    setup();
    expect(deleteBtn()).toBeTruthy();
  });

  it('deletes after confirming, toasts, and leaves via onDeleted', async () => {
    deleteMutate.mockReturnValue({ unwrap: () => Promise.resolve() });
    setup();
    fireEvent.click(deleteBtn());
    expect(deleteMutate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'products.confirmDelete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteMutate).toHaveBeenCalledWith({ productId: 'p1', shopId: 's1' });
    expect(toast.success).toHaveBeenCalledWith('products.deleted');
  });

  it('does nothing when cancelled', () => {
    setup();
    fireEvent.click(deleteBtn());
    fireEvent.click(screen.getByRole('button', { name: 'products.cancel' }));
    expect(deleteMutate).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
    expect(deleteBtn()).toBeTruthy();
  });

  it('shows the exact server reason on failure and stays open', async () => {
    deleteMutate.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { message: 'Dish is in an open order' } }) });
    setup();
    fireEvent.click(deleteBtn());
    fireEvent.click(screen.getByRole('button', { name: 'products.confirmDelete' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(toast.error.mock.calls[0][0]).toContain('products.failedToDelete');
    expect(toast.error.mock.calls[0][0]).toContain('Dish is in an open order');
    expect(onDeleted).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
