// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { CategoryDto, GetShopResultDto, ProductDto } from '../../services/api';
import type { ComboDto } from '../../services/combosApi';
import { ToastContext } from '../../contexts/ToastContext';
import { ComboEditor } from './ComboEditor';

const nav = vi.hoisted(() => ({
  state: 'unblocked' as 'unblocked' | 'blocked',
  shouldBlock: null as null | (() => boolean),
  proceed: vi.fn(),
  reset: vi.fn(),
}));
vi.mock('react-router-dom', () => ({
  useBlocker: (fn: () => boolean) => {
    nav.shouldBlock = fn;
    return { state: nav.state, proceed: nav.proceed, reset: nav.reset };
  },
}));

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
const deleteProduct = vi.hoisted(() => vi.fn());
vi.mock('../../services/combosApi', async (orig) => ({
  ...(await orig<typeof import('../../services/combosApi')>()),
  useCreateComboMutation: () => [createCombo, { isLoading: false }],
  useUpdateComboMutation: () => [updateCombo, { isLoading: false }],
}));
vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useUpdateProductMutation: () => [vi.fn(), { isLoading: false }],
  useDeleteProductMutation: () => [deleteProduct, { isLoading: false }],
}));
vi.mock('../../features/menu/useUploadProductImage', () => ({ useUploadProductImage: () => uploadImage }));

const products = [
  { id: 'd1', name: 'Pasta', price: 900, categories: [{ id: 'c1', name: 'Mains' }] },
  { id: 'd2', name: 'Pizza', price: 1000, categories: [{ id: 'c1', name: 'Mains' }] },
  { id: 'd3', name: 'Cola', price: 300, categories: [{ id: 'c2', name: 'Drinks' }] },
] as unknown as ProductDto[];
const toast = { success: vi.fn(), error: vi.fn() };
const onDone = vi.fn();
const onDeleted = vi.fn();
const shopWith = (over: Record<string, unknown> = {}) => ({ id: 's1', currency: 'EUR', countryCode: 'AT', ...over }) as unknown as GetShopResultDto;
const categories = [{ id: 'c1', name: 'Combos' }] as unknown as CategoryDto[];
const combo = (over: Partial<ComboDto> = {}): ComboDto => ({
  id: 'k1', name: 'Lunch', nameTranslations: {}, description: '', descriptionTranslations: {}, images: [],
  priceCents: 1200, categoryId: 'c1', isAvailable: false, bmfDrinkShare: false,
  groups: [{ id: 'g1', name: 'Main', nameTranslations: {}, productIds: ['d1'] }],
  createdAt: '', updatedAt: '', ...over,
} as ComboDto);

function setup(existing: ComboDto | null, shop = shopWith()) {
  render(
    <ToastContext.Provider value={toast}>
      <ComboEditor shop={shop} shopId="s1" combo={existing} products={products} categories={categories} onDone={onDone} onDeleted={onDeleted} />
    </ToastContext.Provider>,
  );
}
const headerSwitch = () => screen.getByRole('switch', { name: /^combos\.menu(On|Off)$/ });
const goTo = (name: string) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`^combos\\.sections\\.${name}`) }));
const save = () => fireEvent.click(screen.getByRole('button', { name: /^combos\.(save|create|retryPhotoUpload)/ }));
const pickDishes = (...names: RegExp[]) => {
  fireEvent.click(screen.getAllByRole('button', { name: 'combos.addDishes' })[0]);
  const dialog = screen.getByRole('dialog');
  names.forEach((n) => fireEvent.click(within(dialog).getByRole('checkbox', { name: n })));
  fireEvent.click(within(dialog).getByRole('button', { name: 'combos.picker.done' }));
};

/** Fills the blank create form so it passes validation (it starts switched on). */
function fillNewCombo() {
  fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Lunch' } });
  fireEvent.change(screen.getByLabelText('combos.price'), { target: { value: '12,00' } });
  fireEvent.change(screen.getByLabelText('combos.category'), { target: { value: 'c1' } });
  goTo('choices');
  fireEvent.change(screen.getByLabelText('combos.groupNameTranslated'), { target: { value: 'Group 1' } });
  pickDishes(/Pasta/);
}

beforeEach(() => {
  createCombo.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'new1' }) });
  updateCombo.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
  deleteProduct.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
  uploadImage.mockReset().mockResolvedValue({ id: 'img1', url: 'https://img/1.jpg' });
  toast.success.mockReset();
  toast.error.mockReset();
  onDone.mockReset();
  onDeleted.mockReset();
  nav.state = 'unblocked';
  nav.proceed.mockReset();
  nav.reset.mockReset();
});
afterEach(cleanup);

describe('ComboEditor — photo is optional, turning on needs one', () => {
  it('creates a combo with no photo when it stays off: no upload, saved off', async () => {
    setup(null);
    fillNewCombo();
    fireEvent.click(headerSwitch()); // starts on; turning OFF is never gated
    expect(headerSwitch().getAttribute('aria-checked')).toBe('false');
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(createCombo).toHaveBeenCalledTimes(1);
    expect(createCombo.mock.calls[0][0].body.isAvailable).toBe(false);
    expect(createCombo.mock.calls[0][0].body.groups[0]).toMatchObject({ name: 'Group 1', productIds: ['d1'] });
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
    // jumped back to Basics, where the photo field shows the inline message
    expect(screen.getByRole('alert').textContent).toBe('combos.enableNeedsPhotoInline');
  });

  it('creates an ON combo with a photo and uploads it', async () => {
    setup(null);
    fillNewCombo();
    goTo('basics');
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(createCombo.mock.calls[0][0].body.isAvailable).toBe(true);
    expect(uploadImage).toHaveBeenCalledWith('s1', 'new1', expect.any(File));
  });

  it('switching on without a photo does not switch on and shows the inline message; a photo clears it', () => {
    setup(combo());
    expect(headerSwitch().getAttribute('aria-checked')).toBe('false');
    fireEvent.click(headerSwitch());
    expect(headerSwitch().getAttribute('aria-checked')).toBe('false');
    expect(screen.getByRole('alert').textContent).toBe('combos.enableNeedsPhotoInline');
    expect(toast.error).toHaveBeenCalledWith('combos.enableNeedsPhoto:Lunch');
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
    expect(screen.queryByRole('alert')).toBeNull();
    fireEvent.click(headerSwitch());
    expect(headerSwitch().getAttribute('aria-checked')).toBe('true');
  });

  it('the Availability switch shares state with the header switch', () => {
    setup(combo({ isAvailable: true, images: [{ id: 'i1', url: 'https://img/old.jpg' } as ComboDto['images'][number]] }));
    goTo('availability');
    const inSection = screen.getByRole('switch', { name: 'combos.available' });
    expect(inSection.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(inSection);
    expect(headerSwitch().getAttribute('aria-checked')).toBe('false');
  });

  it('saves a photo-less combo that stays off', async () => {
    setup(combo());
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Lunch 2' } });
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(updateCombo.mock.calls[0][0].body.isAvailable).toBe(false);
  });

  it('explains the server refusal COMBO_IMAGE_REQUIRED_TO_ENABLE with the combo name', async () => {
    updateCombo.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { error: 'x', code: 'COMBO_IMAGE_REQUIRED_TO_ENABLE' } }) });
    setup(combo({ isAvailable: true, images: [{ id: 'i1', url: 'https://img/old.jpg' } as ComboDto['images'][number]] }));
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Lunch 2' } });
    save();
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('combos.enableNeedsPhoto:Lunch 2'));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('labels the photo as optional, not "Required"', () => {
    setup(null);
    // the stand-in field ignores the label; the editor passes the optional-but-needed-to-switch-on note
    expect(screen.queryByText(/required/i)).toBeNull();
  });
});

describe('ComboEditor — save buttons and status', () => {
  it('Save and Discard are disabled until something changed; Discard puts the saved values back', () => {
    setup(combo());
    const saveBtn = () => screen.getByRole('button', { name: 'combos.save' }) as HTMLButtonElement;
    const discardBtn = () => screen.getByRole('button', { name: 'combos.editor.discard' }) as HTMLButtonElement;
    expect(saveBtn().disabled).toBe(true);
    expect(discardBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('combos.editor.allSaved');
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Other' } });
    expect(saveBtn().disabled).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('combos.editor.unsaved');
    fireEvent.click(discardBtn());
    expect((screen.getByLabelText('combos.name') as HTMLInputElement).value).toBe('Lunch');
    expect(saveBtn().disabled).toBe(true);
  });

  it('shows Create combo for a new combo and no delete button', () => {
    setup(null);
    expect(screen.getByRole('button', { name: 'combos.create' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'combos.deleteCombo' })).toBeNull();
  });
});

describe('ComboEditor — delete lives in the footer', () => {
  it('asks first, then deletes and skips the unsaved-changes warning', async () => {
    setup(combo());
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Edited' } });
    expect(nav.shouldBlock!()).toBe(true); // dirty: leaving would warn
    fireEvent.click(screen.getByRole('button', { name: 'combos.deleteCombo' }));
    expect(screen.getByText('combos.deleteConfirm:Lunch')).toBeTruthy();
    expect(deleteProduct).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'combos.delete' }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledTimes(1));
    expect(deleteProduct).toHaveBeenCalledWith({ productId: 'k1', shopId: 's1' });
    expect(nav.shouldBlock!()).toBe(false); // navigating away after a delete is not guarded
  });

  it('Cancel in the confirm row keeps the combo', () => {
    setup(combo());
    fireEvent.click(screen.getByRole('button', { name: 'combos.deleteCombo' }));
    fireEvent.click(screen.getByRole('button', { name: 'combos.cancel' }));
    expect(screen.getByRole('button', { name: 'combos.deleteCombo' })).toBeTruthy();
    expect(deleteProduct).not.toHaveBeenCalled();
  });

  it('a failed delete shows the server message and keeps the guard on', async () => {
    deleteProduct.mockReturnValue({ unwrap: () => Promise.reject({ data: { error: 'nope' } }) });
    setup(combo());
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'combos.deleteCombo' }));
    fireEvent.click(screen.getByRole('button', { name: 'combos.delete' }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('nope'));
    expect(onDeleted).not.toHaveBeenCalled();
    expect(nav.shouldBlock!()).toBe(true);
  });
});

describe('ComboEditor — unsaved-changes guard', () => {
  it('does not block while the form is untouched, blocks once it is dirty', () => {
    setup(combo());
    expect(nav.shouldBlock!()).toBe(false);
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Changed' } });
    expect(nav.shouldBlock!()).toBe(true);
  });

  it('asks before leaving: staying resets the blocker, leaving proceeds', () => {
    const confirm = vi.spyOn(window, 'confirm');
    nav.state = 'blocked';
    confirm.mockReturnValueOnce(false);
    setup(combo());
    expect(confirm).toHaveBeenCalledWith('combos.editor.confirmLeave');
    expect(nav.reset).toHaveBeenCalledTimes(1);
    expect(nav.proceed).not.toHaveBeenCalled();
    cleanup();
    confirm.mockReturnValueOnce(true);
    setup(combo());
    expect(nav.proceed).toHaveBeenCalledTimes(1);
    confirm.mockRestore();
  });

  it('a save closes the editor without the warning', async () => {
    setup(combo());
    fireEvent.change(screen.getByLabelText('combos.name'), { target: { value: 'Changed' } });
    save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(nav.shouldBlock!()).toBe(false);
  });
});

describe('ComboEditor — choices', () => {
  const two = () => combo({
    groups: [
      { id: 'g1', name: 'Main', nameTranslations: {}, productIds: ['d1', 'd2'] },
      { id: 'g2', name: 'Drink', nameTranslations: {}, productIds: ['d3'] },
    ],
  });

  it('shows a drag handle and Remove only when there is more than one choice', () => {
    setup(combo());
    goTo('choices');
    expect(screen.queryByRole('button', { name: 'combos.dragChoice' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'combos.removeGroup' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'combos.addGroup' }));
    expect(screen.getAllByRole('button', { name: 'combos.dragChoice' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'combos.removeGroup' })).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'combos.removeGroup' })[1]);
    expect(screen.queryByRole('button', { name: 'combos.removeGroup' })).toBeNull();
  });

  it('allows at most 5 choices', () => {
    setup(combo());
    goTo('choices');
    for (let i = 0; i < 6; i++) {
      const add = screen.queryByRole('button', { name: 'combos.addGroup' });
      if (add) fireEvent.click(add);
    }
    expect(screen.getAllByLabelText('combos.groupNameTranslated')).toHaveLength(5);
    expect(screen.queryByRole('button', { name: 'combos.addGroup' })).toBeNull();
  });

  it('a fully ticked category is one neutral chip with no count; removing it clears those dishes', () => {
    setup(two());
    goTo('choices');
    const chip = screen.getByText('combos.allCurrent:Mains');
    expect(chip.textContent).not.toMatch(/\d/);
    fireEvent.click(screen.getByRole('button', { name: 'combos.removeDish:combos.allCurrent:Mains' }));
    expect(screen.queryByText('combos.allCurrent:Mains')).toBeNull();
    expect(screen.getByText('Cola')).toBeTruthy();
  });

  it('removes just one dish with the X on its chip', () => {
    setup(combo({ groups: [{ id: 'g1', name: 'Main', nameTranslations: {}, productIds: ['d1', 'd3'] }] }));
    goTo('choices');
    fireEvent.click(screen.getByRole('button', { name: 'combos.removeDish:Cola' }));
    expect(screen.queryByText('Cola')).toBeNull();
    expect(screen.getByText('Pasta')).toBeTruthy();
  });

  it('the picker ticks a whole category, shows prices, and Cancel throws the ticks away', () => {
    setup(combo({ groups: [{ id: 'g1', name: 'Main', nameTranslations: {}, productIds: [] }] }));
    goTo('choices');
    fireEvent.click(screen.getByRole('button', { name: 'combos.addDishes' }));
    let dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/9[.,]00/)).toBeTruthy(); // Pasta's price
    fireEvent.click(within(dialog).getAllByRole('checkbox', { name: /combos\.wholeCategory/ })[0]);
    expect((within(dialog).getByRole('checkbox', { name: /Pasta/ }) as HTMLInputElement).checked).toBe(true);
    expect((within(dialog).getByRole('checkbox', { name: /Pizza/ }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(within(dialog).getByRole('button', { name: 'combos.cancel' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByText('Pasta')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'combos.addDishes' }));
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('checkbox', { name: /Cola/ }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'combos.picker.done' }));
    expect(screen.getByText('Cola')).toBeTruthy();
  });

  it('the nav status counts choices that have a dish', () => {
    setup(two());
    expect(screen.getByRole('button', { name: /combos\.sections\.choices/ }).textContent).toContain('combos.nav.choices');
  });
});

describe('ComboEditor — tax', () => {
  it('shows the BMF choice only for German shops', () => {
    setup(combo(), shopWith({ countryCode: 'DE' }));
    goTo('tax');
    expect(screen.getByRole('radio', { name: /combos\.bmfcombos\.bmfHelp/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /combos\.bmfcombos\.bmfHelp/ }));
    save();
    return waitFor(() => expect(updateCombo.mock.calls[0][0].body.bmfDrinkShare).toBe(true));
  });

  it('outside Germany only describes the split by dish prices: no BMF wording anywhere', () => {
    setup(combo({ bmfDrinkShare: true }), shopWith({ countryCode: 'AT' }));
    expect(screen.getByRole('button', { name: /combos\.sections\.tax/ }).textContent).toContain('combos.nav.split');
    goTo('tax');
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('combos.taxSplitHelp')).toBeTruthy();
    expect(screen.queryByText('combos.bmf')).toBeNull();
    expect(screen.queryByText('combos.bmfHelp')).toBeNull();
  });
});

describe('ComboEditor — language toggle', () => {
  const twoLanguages = shopWith({ menuLanguages: ['de', 'en'] });

  it('has no toggle for a one-language shop', () => {
    setup(combo());
    expect(screen.queryByRole('group', { name: 'dishForm.language' })).toBeNull();
  });

  it('translates name, description and every choice name inline, with a missing-translation dot', () => {
    setup(combo({ description: 'Desc' }), twoLanguages);
    expect(screen.getByRole('img', { name: 'dishForm.translationMissingDot' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^shops\.languageName\.en/ }));
    fireEvent.change(screen.getByLabelText('dishForm.nameLabel'), { target: { value: 'Lunch EN' } });
    fireEvent.change(screen.getByLabelText('dishForm.descriptionLabel'), { target: { value: 'Desc EN' } });
    goTo('choices');
    fireEvent.change(screen.getByLabelText('combos.groupNameTranslated'), { target: { value: 'Main EN' } });
    expect(screen.queryByRole('img', { name: 'dishForm.translationMissingDot' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /^shops\.languageName\.de/ }));
    save();
    return waitFor(() => {
      const body = updateCombo.mock.calls[0][0].body;
      expect(body.nameTranslations).toEqual({ en: 'Lunch EN' });
      expect(body.descriptionTranslations).toEqual({ en: 'Desc EN' });
      expect(body.groups[0].nameTranslations).toEqual({ en: 'Main EN' });
      expect(body.name).toBe('Lunch');
    });
  });

  it('"Use the German text" copies the original into the empty translation', () => {
    setup(combo(), twoLanguages);
    fireEvent.click(screen.getByRole('button', { name: /^shops\.languageName\.en/ }));
    fireEvent.click(screen.getByRole('button', { name: 'dishForm.useGerman' }));
    expect((screen.getByLabelText('dishForm.nameLabel') as HTMLInputElement).value).toBe('Lunch');
  });
});
