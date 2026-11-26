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
const updateMutate = vi.hoisted(() => vi.fn());
const product = { id: 'p1', name: 'Margherita', description: 'Tomato', price: 900, categories: [{ id: 'c1' }], images: [] } as unknown as ProductDto;

vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useGetProductByIdQuery: () => ({ data: product, isLoading: false, isError: false }),
  useGetShopByIdQuery: () => ({ data: { id: 's1', currency: 'EUR', countryCode: 'DE' } }),
  useUpdateProductMutation: () => [updateMutate, { isLoading: false }],
  useDeleteProductMutation: () => [deleteMutate, { isLoading: false }],
  useGetOptionGroupsQuery: () => ({ data: [] }),
  useCreateCategoryMutation: () => [vi.fn(), { isLoading: false }],
  useCreateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
}));

const toast = { success: vi.fn(), error: vi.fn() };
const onDeleted = vi.fn();

function setup(extra: { canManage?: boolean; onDuplicate?: () => void } = {}) {
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
        {...extra}
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

describe('DishEditor — Duplicate dish', () => {
  it('sits in the footer next to Delete and calls onDuplicate without calling the API', () => {
    const onDuplicate = vi.fn();
    setup({ canManage: true, onDuplicate });
    fireEvent.click(screen.getByRole('button', { name: /dishes\.editor\.duplicateDish/ }));
    expect(onDuplicate).toHaveBeenCalledTimes(1);
    expect(updateMutate).not.toHaveBeenCalled();
    expect(deleteBtn().previousElementSibling).toBe(screen.getByRole('button', { name: /dishes\.editor\.duplicateDish/ }));
  });

  it('is hidden without manage_menu', () => {
    setup({ canManage: false, onDuplicate: vi.fn() });
    expect(screen.queryByRole('button', { name: /dishes\.editor\.duplicateDish/ })).toBeNull();
    expect(deleteBtn()).toBeTruthy();
  });
});

describe('DishEditor — save refused by the server for a missing photo', () => {
  it('explains that the dish cannot be turned on without a photo, with the dish name', async () => {
    updateMutate.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: 'x', code: 'PRODUCT_IMAGE_REQUIRED_TO_ENABLE' } }) });
    setup();
    fireEvent.change(screen.getByLabelText(/^products\.name/), { target: { value: 'Margherita XL' } });
    fireEvent.click(screen.getByRole('button', { name: 'dishForm.save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('products.enableNeedsPhoto'));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('keeps the leave-on refusal wording for the other code', async () => {
    updateMutate.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: 'x', code: 'PRODUCT_IMAGE_REQUIRED' } }) });
    setup();
    fireEvent.change(screen.getByLabelText(/^products\.name/), { target: { value: 'Margherita XL' } });
    fireEvent.click(screen.getByRole('button', { name: 'dishForm.save' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('products.photoRequired'));
  });
});
