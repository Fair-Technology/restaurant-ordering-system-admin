// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { GetReferenceListsApiResponse, ProductDto, ShopOptionGroupDto } from '../../services/api';
import { AddDishPanel } from './AddDishPanel';

// Resolve keys against the real bundles so the test also proves the i18n keys exist (and in both languages).
const bundle = (l: string) => JSON.parse(readFileSync(`public/locales/${l}/common.json`, 'utf-8')) as Record<string, unknown>;
const bundles = { en: bundle('en'), de: bundle('de') };
const lookup = (key: string, count?: number): string => {
  const find = (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], bundles.en);
  const plural = count === undefined ? undefined : find(`${key}_${count === 1 ? 'one' : 'other'}`);
  const value = typeof plural === 'string' ? plural : find(key);
  return typeof value === 'string' ? value : key;
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      lookup(key, typeof vars?.count === 'number' ? vars.count : undefined).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? '')),
    i18n: { language: 'en' },
  }),
}));

const { toastError, toastSuccess, createProduct, updateProduct, updateAvailability, uploadImage } = vi.hoisted(() => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  updateAvailability: vi.fn(),
  uploadImage: vi.fn(),
}));
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ success: toastSuccess, error: toastError }) }));
vi.mock('../../features/menu/useUploadProductImage', () => ({ useUploadProductImage: () => uploadImage }));

const library = [
  { id: 'g1', kind: 'variant', name: 'Your pasta', minSelectable: 1, maxSelectable: 1, nameTranslations: {}, options: [] },
] as unknown as ShopOptionGroupDto[];

const refs = {
  countryCode: 'DE',
  allergens: [
    { id: 'gluten', labels: { de: 'Gluten', en: 'Gluten' }, isActive: true },
    { id: 'milk', labels: { de: 'Milch', en: 'Milk' }, isActive: true },
  ],
  additives: [{ id: 'a1', code: 1, labels: { de: 'mit Farbstoff', en: 'with colouring' }, isActive: true }],
  taxClasses: [
    { id: 'food', labels: { de: 'Speisen', en: 'Food' }, isActive: true },
    { id: 'drink', labels: { de: 'Getränke', en: 'Drinks' }, isActive: true },
  ],
  defaultTaxClassId: 'food',
  taxRates: [],
  currentTaxRates: [{ taxClassId: 'food', rates: { collection: 700, delivery: 700, dine_in: 700 } }],
  taxRatesUniformAcrossModes: true,
  dietaryTags: [],
  spiceLevels: [],
  updatedAt: null,
} as unknown as GetReferenceListsApiResponse;

const carbonara = {
  id: 'p1', name: 'Carbonara', description: 'x', price: 1200, isDeleted: false,
  categories: [{ id: 'c1', name: 'Pasta', sortOrder: 0 }],
  taxClassId: 'food', allergenIds: ['milk'], additiveIds: ['a1'], dietaryTagIds: [], spiceLevel: null,
  optionGroupRefs: ['g1'], variantGroups: [], addonGroups: [], images: [],
} as unknown as ProductDto;

vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useGetShopByIdQuery: () => ({ data: { id: 's1', currency: 'EUR', countryCode: 'DE', menuLanguages: ['de', 'en'] } }),
  useGetProductsByShopQuery: () => ({ data: [carbonara] }),
  useGetOptionGroupsQuery: () => ({ data: library }),
  useCreateCategoryMutation: () => [vi.fn(), { isLoading: false }],
  useCreateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
  useCreateProductMutation: () => [createProduct, { isLoading: false }],
  useUpdateProductMutation: () => [updateProduct, { isLoading: false }],
  useUpdateProductAvailabilityMutation: () => [updateAvailability, { isLoading: false }],
}));
vi.mock('../../features/menu/useShopReferenceLists', () => ({ useShopReferenceLists: () => ({ refs }) }));
// The real picker opens a crop dialog; a stand-in that "picks" a photo keeps these tests about the form
vi.mock('./DishPhotoField', () => ({
  DishPhotoField: ({ setImageFile, imageFile, photoError, errorText }: { setImageFile: (f: File) => void; imageFile: File | null; photoError?: boolean; errorText?: string }) => (
    <div>
      <span>{imageFile ? 'has photo' : 'no photo'}</span>
      <button type="button" onClick={() => setImageFile(new File(['x'], 'dish.jpg', { type: 'image/jpeg' }))}>pick photo</button>
      {photoError && <p role="alert">{errorText}</p>}
    </div>
  ),
}));

const categories = [{ id: 'c1', name: 'Pasta', taxClassId: 'food' }, { id: 'c2', name: 'Pizza', taxClassId: null }];

const onClose = vi.fn();
const onAdded = vi.fn();
const renderDuplicate = (source: ProductDto) =>
  render(<AddDishPanel shopId="s1" currencySymbol="€" categoriesList={categories} onClose={onClose} onAdded={onAdded} duplicateFrom={source} />);
const renderPanel = () =>
  render(<AddDishPanel shopId="s1" currencySymbol="€" categoriesList={categories} onClose={onClose} onAdded={onAdded} />);

const nav = (name: string) => within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(`^${name}`) });
const primary = (label: RegExp | string) => screen.getByRole('button', { name: label }) as HTMLButtonElement;
const draftBtn = () => screen.getByRole('button', { name: 'Save as draft' }) as HTMLButtonElement;
const typeName = (v: string) => fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: v } });
const typePrice = (digits: string) => {
  const price = screen.getByRole('textbox', { name: /^Price/ });
  for (const d of digits) fireEvent.keyDown(price, { key: d });
};
const pickCategory = (name: string) => {
  fireEvent.click(screen.getByRole('button', { name: lookup('dishForm.addCategory') }));
  fireEvent.click(screen.getByRole('button', { name }));
};
const confirmFoodInfo = () => {
  fireEvent.click(nav('Food info'));
  fireEvent.click(screen.getByRole('checkbox', { name: /Contains none of the/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: /Contains no declarable additives/ }));
};
const fillBasics = (withPhoto = true) => {
  typeName('Spaghetti');
  if (withPhoto) fireEvent.click(screen.getByRole('button', { name: 'pick photo' }));
  typePrice('950');
  pickCategory('Pasta');
};

beforeEach(() => {
  createProduct.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({ id: 'new1' }) });
  updateProduct.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
  updateAvailability.mockReset().mockReturnValue({ unwrap: () => Promise.resolve({}) });
  uploadImage.mockReset().mockResolvedValue({ id: 'img1', url: 'https://img/1.jpg' });
  toastError.mockReset();
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('AddDishPanel required list', () => {
  it('an empty form says "5 required left"; clicking it jumps to Basics and shows the three inline errors', () => {
    renderPanel();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('New dish');
    expect(screen.getByText('Add dish · not on the menu yet')).toBeTruthy();
    expect(screen.queryByRole('switch', { name: 'On the menu' })).toBeNull();
    expect(nav('Basics').textContent).toContain('3 required left');
    expect(nav('Food info').textContent).toContain('Confirm allergens and additives');
    expect(primary('5 required left').disabled).toBe(false);
    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(nav('Availability')); // somewhere else, so the jump is visible
    fireEvent.click(primary('5 required left'));
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeTruthy();
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(['Enter a German name.', 'Enter a price above €0.00.', 'Choose at least one category.']);
    expect(screen.queryByText(lookup('dishes.editor.descriptionRequired'))).toBeNull(); // description is optional when adding
    expect(createProduct).not.toHaveBeenCalled();
  });

  it('lists five checklist rows that name their state and jump to their section', () => {
    renderPanel();
    expect(screen.getByText('Before you add it')).toBeTruthy();
    const rows = ['German name', 'Price', 'Category', 'Allergens confirmed', 'Additives confirmed'];
    for (const r of rows) expect(within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(`^${r} — not done yet`) })).toBeTruthy();
    fireEvent.click(within(screen.getByRole('navigation')).getByRole('button', { name: /^Allergens confirmed — not done yet, go to Food info/ }));
    expect(screen.getByRole('heading', { level: 2, name: 'Food info' })).toBeTruthy();
  });

  it('name + price + category still leaves "2 required left" until allergens and additives are confirmed', () => {
    renderPanel();
    fillBasics();
    expect(nav('Basics').textContent).toContain('Complete');
    expect(primary('2 required left')).toBeTruthy();
    expect(screen.getByText(/Customers pay .*9\.50\. That includes .*0\.62 VAT; net .*8\.88\./)).toBeTruthy();

    fireEvent.click(primary('2 required left')); // jumps to the first open item: Food info
    expect(screen.getByRole('heading', { level: 2, name: 'Food info' })).toBeTruthy();
    expect(screen.getAllByText('Not confirmed')).toHaveLength(2);

    fireEvent.click(screen.getByRole('checkbox', { name: /Contains none of the/ })); // "none" counts as confirmed
    expect(primary('1 required left')).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: /Contains no declarable additives/ }));
    expect(primary('Add to menu')).toBeTruthy();
    expect(nav('Food info').textContent).toContain('Complete');
  });

  it('shows the add-mode Availability copy', () => {
    renderPanel();
    fireEvent.click(nav('Availability'));
    expect(screen.getByText(/New dishes are available everywhere/)).toBeTruthy();
    expect(nav('Availability').textContent).toContain('Available everywhere');
    fireEvent.click(screen.getByRole('switch', { name: 'Delivery' }));
    expect(nav('Availability').textContent).toContain('Customised');
  });
});

describe('AddDishPanel save as draft', () => {
  it('is disabled until a German name is typed, and never for anything else', () => {
    renderPanel();
    expect(draftBtn().disabled).toBe(true);
    typeName('   ');
    expect(draftBtn().disabled).toBe(true);
    typeName('Spaghetti');
    expect(draftBtn().disabled).toBe(false); // no photo, price, category … still enabled
  });

  it('creates the dish with only a name, keeps it off the menu, and says "Draft saved"', async () => {
    renderPanel();
    typeName('Spaghetti');
    fireEvent.click(draftBtn());
    await waitFor(() => expect(screen.getByText('Draft saved')).toBeTruthy());
    expect(createProduct).toHaveBeenCalledTimes(1);
    const body = createProduct.mock.calls[0][0].createProductRequestDto;
    expect(body).toMatchObject({ shopId: 's1', name: 'Spaghetti', description: '', price: 0, categoryIds: [], isAvailable: false, allergenIds: null, additiveIds: null });
    expect(uploadImage).not.toHaveBeenCalled();
    expect(updateAvailability).not.toHaveBeenCalled();
    expect(onAdded).not.toHaveBeenCalled();
    expect(screen.queryByText(/was added to the menu/)).toBeNull();
    // the draft's own errors for the other fields show up now (it was a "try")
    expect(screen.getByText('Enter a price above €0.00.')).toBeTruthy();
  });

  it('a later save updates the same draft instead of creating a second dish', async () => {
    renderPanel();
    typeName('Spaghetti');
    fireEvent.click(draftBtn());
    await waitFor(() => expect(screen.getByText('Draft saved')).toBeTruthy());
    typeName('Spaghetti Aglio');
    expect(screen.getByText('Draft · not on the menu yet')).toBeTruthy(); // edited since: not saved any more
    fireEvent.click(draftBtn());
    await waitFor(() => expect(updateProduct).toHaveBeenCalledTimes(1));
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(updateProduct.mock.calls[0][0]).toMatchObject({ productId: 'new1', body: { name: 'Spaghetti Aglio', isAvailable: false } });
  });

  it('shows the server error when creating fails', async () => {
    createProduct.mockReturnValue({ unwrap: () => Promise.reject({ status: 400, data: { error: 'Description is required' } }) });
    renderPanel();
    typeName('Spaghetti');
    fireEvent.click(draftBtn());
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByText('Draft saved')).toBeNull();
  });
});

describe('AddDishPanel add to menu', () => {
  it('without a photo it does not add: nothing is created, the owner is told why, and the panel stays open', () => {
    renderPanel();
    fillBasics(false);
    confirmFoodInfo();
    expect(primary('Add to menu')).toBeTruthy();
    fireEvent.click(primary('Add to menu'));
    expect(createProduct).not.toHaveBeenCalled();
    expect(updateProduct).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledWith("Spaghetti can't be turned on without a photo.");
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeTruthy();
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(["Can't be turned on without a photo. Add a photo first, then turn it on."]);
    expect(screen.queryByText(/was added to the menu/)).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('the server refusing to turn it on (no photo) is explained with the dish name', async () => {
    createProduct.mockReturnValue({ unwrap: () => Promise.reject({ status: 409, data: { code: 'PRODUCT_IMAGE_REQUIRED_TO_ENABLE' } }) });
    renderPanel();
    fillBasics();
    confirmFoodInfo();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Spaghetti can't be turned on without a photo."));
  });

  const addComplete = async () => {
    renderPanel();
    fillBasics();
    confirmFoodInfo();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(screen.getByText('Spaghetti was added to the menu.')).toBeTruthy());
  };

  it('creates the dish and its photo for real, then shows the banner and the two footer buttons', async () => {
    await addComplete();
    expect(createProduct).toHaveBeenCalledTimes(1);
    const body = createProduct.mock.calls[0][0].createProductRequestDto;
    expect(body).toMatchObject({
      shopId: 's1', name: 'Spaghetti', price: 950, categoryIds: ['c1'], allergenIds: [], additiveIds: [],
      taxClassId: 'food', isAvailable: false,
    });
    expect(uploadImage).toHaveBeenCalledWith('s1', 'new1', expect.any(File));
    expect(updateAvailability).toHaveBeenCalledWith({ productId: 'new1', body: { shopId: 's1', isAvailable: true } });
    expect(uploadImage.mock.invocationCallOrder[0]).toBeLessThan(updateAvailability.mock.invocationCallOrder[0]);
    expect(onAdded).toHaveBeenCalledWith('new1');
    expect(screen.getByText('Spaghetti was added to the menu.').closest('[role="status"]')).toBeTruthy();
    expect(screen.getByText('On the menu')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View in menu' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Add another dish' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save as draft' })).toBeNull();
  });

  it('"View in menu" closes the panel', async () => {
    await addComplete();
    fireEvent.click(screen.getByRole('button', { name: 'View in menu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('"Add another dish" resets everything and goes back to Basics', async () => {
    await addComplete();
    fireEvent.click(nav('Food info'));
    fireEvent.click(screen.getByRole('button', { name: 'Add another dish' }));
    expect(screen.queryByText(/was added to the menu/)).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Basics' })).toBeTruthy();
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('');
    expect(screen.getByText('no photo')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('New dish');
    expect(primary('5 required left')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Draft · not on the menu yet')).toBeTruthy();
  });

  it('a failed photo upload keeps the dish id: the next press retries only the photo', async () => {
    uploadImage.mockRejectedValueOnce(new Error('boom'));
    renderPanel();
    fillBasics();
    confirmFoodInfo();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(updateAvailability).not.toHaveBeenCalled();
    expect(screen.queryByText(/was added to the menu/)).toBeNull();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(screen.getByText('Spaghetti was added to the menu.')).toBeTruthy());
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(uploadImage).toHaveBeenCalledTimes(2);
  });

  it('the dish stays created and off, and the panel stays open, when switching it on fails after the photo uploads', async () => {
    updateAvailability.mockReturnValueOnce({ unwrap: () => Promise.reject({ status: 409, data: { code: 'PRODUCT_IMAGE_REQUIRED_TO_ENABLE' } }) });
    renderPanel();
    fillBasics();
    confirmFoodInfo();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Spaghetti can't be turned on without a photo."));
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/was added to the menu/)).toBeNull();
    expect(onAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(primary('Add to menu'));
    await waitFor(() => expect(screen.getByText('Spaghetti was added to the menu.')).toBeTruthy());
    expect(createProduct).toHaveBeenCalledTimes(1);
    expect(updateAvailability).toHaveBeenCalledTimes(2);
  });
});

describe('AddDishPanel start from a similar dish', () => {
  it('copies category, tax class and option groups, but leaves allergens and additives unconfirmed', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('Start from a similar dish'), { target: { value: 'p1' } });
    expect(screen.getByText(/^Copied category, tax class and option groups from Carbonara\. Allergens and additives are not copied/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Remove Pasta' })).toBeTruthy();
    expect((screen.getByLabelText('Tax class') as HTMLSelectElement).value).toBe('food');
    expect(nav('Options and extras').textContent).toContain('1 variant · 0 extras');
    expect(nav('Food info').textContent).toContain('Confirm allergens and additives');
    expect(primary('4 required left')).toBeTruthy(); // category is copied; name, price, allergens, additives are not
  });

  it('keeps allergens as "Not confirmed" on the Food info section', () => {
    renderPanel();
    fireEvent.change(screen.getByLabelText('Start from a similar dish'), { target: { value: 'p1' } });
    fireEvent.click(nav('Food info'));
    expect(screen.getAllByText('Not confirmed')).toHaveLength(2);
    expect(screen.getByRole('checkbox', { name: /Contains none of the/ }).getAttribute('aria-checked')).toBe('false');
  });
});

describe('AddDishPanel duplicate mode', () => {
  const source = {
    ...carbonara,
    description: 'Creamy', price: 1200, prepMinutes: 15, ageRestricted: false, isAvailable: true,
    schedule: { startDate: '2026-01-01', offerPrice: 900, offerLabel: 'Deal' },
    images: [],
  } as unknown as ProductDto;
  const originalFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('prefills from the source, focuses and selects the name, and leaves allergens unconfirmed', () => {
    renderDuplicate(source);
    const name = screen.getByLabelText(/^Name/) as HTMLInputElement;
    expect(name.value).toBe('Carbonara (copy)');
    expect(document.activeElement).toBe(name);
    expect(name.selectionStart).toBe(0);
    expect(name.selectionEnd).toBe('Carbonara (copy)'.length);
    expect(screen.getByText(lookup('dishForm.duplicate.notCopied'))).toBeTruthy();
    expect(nav('Food info').textContent).toContain('Confirm allergens and additives');
    expect(primary('2 required left')).toBeTruthy(); // name, price, category are copied
  });

  it('a plain Add does not focus the name or show the note', () => {
    renderPanel();
    expect(document.activeElement).not.toBe(screen.getByLabelText(/^Name/));
    expect(screen.queryByText(lookup('dishForm.duplicate.notCopied'))).toBeNull();
  });

  it('opening saves nothing; Save as draft creates an OFF dish carrying the schedule and copied fields', async () => {
    renderDuplicate(source);
    expect(createProduct).not.toHaveBeenCalled();
    fireEvent.click(draftBtn());
    await waitFor(() => expect(createProduct).toHaveBeenCalledTimes(1));
    const body = createProduct.mock.calls[0][0].createProductRequestDto;
    expect(body).toMatchObject({
      name: 'Carbonara (copy)', description: 'Creamy', price: 1200, categoryIds: ['c1'], prepMinutes: 15,
      optionGroupRefs: ['g1'], isAvailable: false, allergenIds: null, additiveIds: null,
      schedule: { startDate: '2026-01-01', offerPrice: 900, offerLabel: 'Deal' },
    });
  });

  it('a plain Add sends no schedule', async () => {
    renderPanel();
    typeName('Spaghetti');
    fireEvent.click(draftBtn());
    await waitFor(() => expect(createProduct).toHaveBeenCalled());
    expect(createProduct.mock.calls[0][0].createProductRequestDto).not.toHaveProperty('schedule');
  });

  it('copies the photo as a new file that is uploaded through the normal path', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, blob: () => Promise.resolve(new Blob(['img'], { type: 'image/png' })) });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    renderDuplicate({ ...source, images: [{ id: 'i1', url: 'https://img/orig.png' }] } as unknown as ProductDto);
    await waitFor(() => expect(screen.getByText('has photo')).toBeTruthy());
    expect(fetchMock).toHaveBeenCalledWith('https://img/orig.png');
    expect(toastError).not.toHaveBeenCalled();
    fireEvent.click(draftBtn());
    await waitFor(() => expect(uploadImage).toHaveBeenCalledTimes(1));
    const file = uploadImage.mock.calls[0][2] as File;
    expect(file).toBeInstanceOf(File);
    expect(file.type).toBe('image/png');
    expect(uploadImage.mock.calls[0][1]).toBe('new1'); // the new dish, not the source
  });

  it('when the photo cannot be fetched, starts without a photo, highlights the field and toasts', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch (CORS)')) as unknown as typeof fetch;
    renderDuplicate({ ...source, images: [{ id: 'i1', url: 'https://img/orig.png' }] } as unknown as ProductDto);
    await waitFor(() => expect(toastError).toHaveBeenCalledWith(lookup('dishForm.duplicate.photoCopyFailed')));
    expect(screen.getByText('no photo')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe(lookup('dishForm.duplicate.photoCopyFailed'));
    fireEvent.click(screen.getByRole('button', { name: 'pick photo' })); // choosing one clears the highlight
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
