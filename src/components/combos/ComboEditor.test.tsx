// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CategoryDto, GetShopResultDto, ProductDto } from '../../services/api';
import type { ComboDto } from '../../services/combosApi';
import { ToastContext } from '../../contexts/ToastContext';
import { ComboEditor } from './ComboEditor';

// Keys resolve to themselves (with the name appended where one is passed)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: { name?: string }) => (vars?.name ? `${key}:${vars.name}` : key),
    i18n: { language: 'en' },
  }),
}));
// The real picker opens a crop dialog; a stand-in that "picks" a photo keeps these tests about the combo form
vi.mock('../menu/DishPhotoField', () => ({
  DishPhotoField: ({ imageFile, setImageFile, photoError, errorText }: { imageFile: File | null; setImageFile: (f: File) => void; photoError?: boolean; errorText?: string }) => (
    <div>
      <span>{imageFile ? 'has photo' : 'no photo'}</span>
      <button type="button" onClick={() => setImageFile(new File(['x'], 'combo.jpg', { type: 'image/jpeg' }))}>pick photo</button>
      {photoError && <p role="alert">{errorText}</p>}
    </div>
  ),
}));

const createCombo = vi.hoisted(() => vi.fn());
const updateCombo = vi.hoisted(() => vi.fn());
const uploadImage = vi.hoisted(() => vi.fn());
vi.mock('../../services/combosApi', async (orig) => ({
  ...(await orig<typeof import('../../services/combosApi')>()),
  useCreateComboMutation: () => [createCombo, { isLoading: false }],
  useUpdateComboMutation: () => [updateCombo, { isLoading: false }],
}));
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useUpdateProductMutation: () => [vi.fn(), { isLoading: false }],
}));
vi.mock('../../features/menu/useUploadProductImage', () => ({ useUploadProductImage: () => uploadImage }));

const toast = { success: vi.fn(), error: vi.fn() };
const onDone = vi.fn();
const shop = { id: 's1', currency: 'EUR', countryCode: 'AT' } as unknown as GetShopResultDto;
const products = [{ id: 'd1', name: 'Pasta', price: 900, categories: [{ id: 'c1', name: 'Mains' }] }] as unknown as ProductDto[];
const categories = [{ id: 'c1', name: 'Combos' }] as unknown as CategoryDto[];
const combo = (over: Partial<ComboDto> = {}): ComboDto => ({
  id: 'k1', name: 'Lunch', nameTranslations: {}, description: '', descriptionTranslations: {}, images: [],
  priceCents: 1200, categoryId: 'c1', isAvailable: false, bmfDrinkShare: false,
  groups: [{ id: 'g1', name: 'Main', nameTranslations: {}, productIds: ['d1'] }],
  createdAt: '', updatedAt: '', ...over,
} as ComboDto);

function setup(existing: ComboDto | null) {
  render(
    <ToastContext.Provider value={toast}>
      <ComboEditor shop={shop} shopId="s1" combo={existing} products={products} categories={categories} onDone={onDone} />
    </ToastContext.Provider>,
  );
}
const availableBox = () => screen.getByRole('checkbox', { name: 'combos.available' }) as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole('button', { name: 'combos.save' }));

/** Fills the blank create form so it passes validation (available is still ticked: the default). */
function fillNewCombo() {
  fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Lunch' } });
  fireEvent.change(screen.getByLabelText('combos.price'), { target: { value: '12,00' } });
  fireEvent.change(screen.getByLabelText('combos.category'), { target: { value: 'c1' } });
  const groupNames = screen.getAllByLabelText('combos.groupName');
  groupNames.forEach((g, i) => fireEvent.change(g, { target: { value: `Group ${i + 1}` } }));
  screen.getAllByRole('checkbox', { name: /Pasta/ }).forEach((box) => fireEvent.click(box));
}

beforeEach(() => {
  createCombo.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'new1' }) });
  updateCombo.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
  uploadImage.mockReset().mockResolvedValue({ id: 'img1', url: 'https://img/1.jpg' });
  toast.success.mockReset();
  toast.error.mockReset();
  onDone.mockReset();
});
afterEach(cleanup);

describe('ComboEditor — photo is optional, turning on needs one', () => {
  it('creates a combo with no photo when it stays off: no upload, saved off', async () => {
    setup(null);
    fillNewCombo();
    fireEvent.click(availableBox()); // it starts ticked; without a photo it is untouched by the gate when turning OFF
    expect(availableBox().checked).toBe(false);
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(createCombo).toHaveBeenCalledTimes(1);
    expect(createCombo.mock.calls[0][0].body.isAvailable).toBe(false);
    expect(uploadImage).not.toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith('combos.saved');
  });

  it('refuses to create an ON combo without a photo: nothing is sent, the owner is told why', () => {
    setup(null);
    fillNewCombo();
    save();
    expect(createCombo).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('combos.enableNeedsPhoto:Lunch');
    expect(onDone).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('combos.enableNeedsPhotoInline');
  });

  it('creates an ON combo with a photo and uploads it', async () => {
    setup(null);
    fillNewCombo();
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(createCombo.mock.calls[0][0].body.isAvailable).toBe(true);
    expect(uploadImage).toHaveBeenCalledWith('s1', 'new1', expect.any(File));
  });

  it('ticking "available" without a photo does not tick it and shows the inline message; a photo clears it', () => {
    setup(combo());
    expect(availableBox().checked).toBe(false);
    fireEvent.click(availableBox());
    expect(availableBox().checked).toBe(false);
    expect(screen.getByRole('alert').textContent).toBe('combos.enableNeedsPhotoInline');
    expect(toast.error).toHaveBeenCalledWith('combos.enableNeedsPhoto:Lunch');
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(availableBox());
    expect(availableBox().checked).toBe(true);
  });

  it('saves a photo-less combo that stays off', async () => {
    setup(combo());
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(updateCombo.mock.calls[0][0].body.isAvailable).toBe(false);
  });

  it('explains the server refusal COMBO_IMAGE_REQUIRED_TO_ENABLE with the combo name', async () => {
    updateCombo.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: 'x', code: 'COMBO_IMAGE_REQUIRED_TO_ENABLE' } }) });
    setup(combo({ isAvailable: true, images: [{ id: 'i1', url: 'https://img/old.jpg' } as ComboDto['images'][number]] }));
    save();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('combos.enableNeedsPhoto:Lunch'));
    expect(onDone).not.toHaveBeenCalled();
  });
});
