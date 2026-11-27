// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import type { GetReferenceListsApiResponse, ShopOptionGroupDto } from '../../services/api';
import { DishForm, type DishFormProps } from './DishForm';
import { EMPTY_FOOD_INFO } from '../../features/menu/foodInfo';
import type { DishFormState } from '../../features/menu/dishForm';

// Resolve keys against the real bundles so the test also proves the i18n keys exist (and in both languages).
const bundle = (l: string) => JSON.parse(readFileSync(`public/locales/${l}/common.json`, 'utf-8')) as Record<string, unknown>;
const bundles = { en: bundle('en'), de: bundle('de') };
let language: 'en' | 'de' = 'en';
const lookup = (key: string, count?: number): string => {
  const find = (k: string) => k.split('.').reduce<unknown>((o, p) => (o as Record<string, unknown> | undefined)?.[p], bundles[language]);
  const plural = count === undefined ? undefined : find(`${key}_${count === 1 ? 'one' : 'other'}`);
  const value = typeof plural === 'string' ? plural : find(key);
  return typeof value === 'string' ? value : key;
};
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      lookup(key, typeof vars?.count === 'number' ? vars.count : undefined).replace(/\{\{(\w+)\}\}/g, (_m, name: string) => String(vars?.[name] ?? '')),
    i18n: { language },
  }),
}));

const toastError = vi.hoisted(() => vi.fn());
vi.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ success: vi.fn(), error: toastError }) }));

const library = [
  {
    id: 'g1', kind: 'variant', name: 'Your pasta', minSelectable: 1, maxSelectable: 1, nameTranslations: {},
    options: [{ id: 'o1', name: 'Spaghetti', priceDelta: 0, isAvailable: true }, { id: 'o2', name: 'Gnocchi', priceDelta: 100, isAvailable: true }],
  },
  {
    id: 'g2', kind: 'addon', name: 'Extras', minSelectable: 0, maxSelectable: 4, nameTranslations: {},
    options: [{ id: 'o3', name: 'Mozzarella', priceDelta: 250, isAvailable: true, category: 'Cheese' }],
  },
  { id: 'g3', kind: 'addon', name: 'Sauces', minSelectable: 0, maxSelectable: 2, nameTranslations: {}, options: [] },
] as unknown as ShopOptionGroupDto[];

vi.mock('../../services/api', async (orig) => ({
  ...(await orig<typeof import('../../services/api')>()),
  useGetOptionGroupsQuery: () => ({ data: library }),
  useCreateCategoryMutation: () => [vi.fn(), { isLoading: false }],
  useCreateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
  useUpdateOptionGroupMutation: () => [vi.fn(), { isLoading: false }],
}));

// Reference data: 3 allergens, 2 additives, one inactive of each, so counts must come from the data
const refs = {
  countryCode: 'DE',
  allergens: [
    { id: 'gluten', labels: { de: 'Gluten', en: 'Gluten' }, isActive: true },
    { id: 'milk', labels: { de: 'Milch', en: 'Milk' }, isActive: true },
    { id: 'eggs', labels: { de: 'Eier', en: 'Eggs' }, isActive: true },
    { id: 'old', labels: { de: 'Alt', en: 'Old' }, isActive: false },
  ],
  additives: [
    { id: 'a1', code: 1, labels: { de: 'mit Farbstoff', en: 'with colouring' }, isActive: true },
    { id: 'a2', code: 2, labels: { de: 'mit Konservierungsstoff', en: 'with preservative' }, isActive: true },
  ],
  taxClasses: [
    { id: 'food', labels: { de: 'Speisen', en: 'Food' }, isActive: true },
    { id: 'drink', labels: { de: 'Getränke', en: 'Drinks' }, isActive: true },
    { id: 'delivery', labels: { de: 'Lieferung', en: 'Delivery' }, isActive: true },
  ],
  defaultTaxClassId: 'food',
  taxRates: [],
  currentTaxRates: [
    { taxClassId: 'food', rates: { collection: 700, delivery: 700, dine_in: 700 } },
    { taxClassId: 'drink', rates: { collection: 1900, delivery: 1900, dine_in: 1900 } },
  ],
  taxRatesUniformAcrossModes: true,
  dietaryTags: [{ id: 'vegan', labels: { de: 'Vegan', en: 'Vegan' } }],
  spiceLevels: [
    { id: 'mild', labels: { de: 'Mild', en: 'Mild' } },
    { id: 'hot', labels: { de: 'Scharf', en: 'Hot' } },
  ],
  updatedAt: null,
} as unknown as GetReferenceListsApiResponse;

const initial = (over: Partial<DishFormState> = {}): DishFormState => ({
  form: { name: 'Peperoncino', description: 'Chili, Tomaten und Knoblauch', price: 1150 },
  nameTranslations: {},
  descriptionTranslations: {},
  categoryIds: ['c1'],
  foodInfo: { ...EMPTY_FOOD_INFO, taxClassId: 'food' },
  variantGroups: [],
  addonGroups: [],
  optionGroupRefs: ['g1', 'g2'],
  isAvailable: true,
  ...over,
});

const categories = [{ id: 'c1', name: 'Pasta', taxClassId: 'food' }, { id: 'c2', name: 'Pizza', taxClassId: null }];

/** Holds the form state the way DishEditor does, so Discard / dirty behave for real. */
function Harness({ start, props, onSave }: { start: DishFormState; props?: Partial<DishFormProps>; onSave?: (v: DishFormState) => void }) {
  const [saved, setSaved] = useState(start);
  const [value, setValue] = useState(start);
  const dirty = JSON.stringify(value) !== JSON.stringify(saved);
  return (
    <DishForm
      mode="edit"
      shopId="s1"
      value={value}
      setValue={setValue}
      imageFile={null}
      setImageFile={() => {}}
      existingImageUrl="https://img/x.jpg"
      categoriesList={categories}
      refs={refs}
      languages={['de', 'en']}
      currency="EUR"
      currencySymbol="€"
      dirty={dirty}
      isSaving={false}
      saveLabel={lookup('dishForm.save')}
      onSave={() => {
        onSave?.(value);
        setSaved(value);
      }}
      onDiscard={() => setValue(saved)}
      onClose={() => {}}
      {...props}
    />
  );
}

const nav = (name: string) => within(screen.getByRole('navigation')).getByRole('button', { name: new RegExp(`^${name}`) });
const go = (section: 'basics' | 'food' | 'options' | 'availability') => fireEvent.click(nav(lookup(`dishForm.sectionNames.${section}`)));
const saveBtn = () => screen.getByRole('button', { name: lookup('dishForm.save') }) as HTMLButtonElement;
const discardBtn = () => screen.getByRole('button', { name: lookup('dishes.editor.discard') }) as HTMLButtonElement;

afterEach(() => {
  cleanup();
  toastError.mockClear();
  language = 'en';
});

describe('DishForm footer', () => {
  it('Save and Discard are really disabled until something changes, then Discard reverts', () => {
    render(<Harness start={initial()} />);
    expect(saveBtn().disabled).toBe(true);
    expect(discardBtn().disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toBe('All changes saved');

    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Peperoncino XL' } });
    expect(saveBtn().disabled).toBe(false);
    expect(discardBtn().disabled).toBe(false);
    expect(screen.getByRole('status').textContent).toBe('Unsaved changes');

    fireEvent.click(discardBtn());
    expect((screen.getByLabelText(/^Name/) as HTMLInputElement).value).toBe('Peperoncino');
    expect(saveBtn().disabled).toBe(true);
  });

  it('Save hands the edited state to onSave, then reads as saved', () => {
    const onSave = vi.fn();
    render(<Harness start={initial()} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'New name' } });
    fireEvent.click(saveBtn());
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0].form.name).toBe('New name');
    expect(saveBtn().disabled).toBe(true);
  });

  it('does not call onSave while the basics are invalid, and shows why', () => {
    const onSave = vi.fn();
    render(<Harness start={initial({ form: { name: '', description: 'x', price: 100 } })} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/^Description/), { target: { value: 'changed' } });
    fireEvent.click(saveBtn());
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(lookup('dishes.editor.nameRequired'))).toBeTruthy();
  });
});

describe('DishForm header and nav', () => {
  it('shows the German name, "Edit dish · categories", and the on-the-menu switch drives isAvailable and the nav', () => {
    render(<Harness start={initial()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Peperoncino');
    expect(screen.getByText('Edit dish · Pasta')).toBeTruthy();
    const sw = screen.getByRole('switch', { name: 'On the menu' });
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(nav('Availability').textContent).toContain('On the menu');
    fireEvent.click(sw);
    expect(screen.getByRole('switch', { name: 'Hidden' }).getAttribute('aria-checked')).toBe('false');
    expect(nav('Availability').textContent).toContain('Hidden from the menu');
  });

  it('refuses to turn the dish on without a photo: stays off, toasts, and shows the hint in Basics; turning on with a photo works', () => {
    const { unmount } = render(<Harness start={initial({ isAvailable: false })} props={{ existingImageUrl: null }} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Hidden' }));
    expect(screen.getByRole('switch', { name: 'Hidden' }).getAttribute('aria-checked')).toBe('false');
    expect(toastError).toHaveBeenCalledWith("Peperoncino can't be turned on without a photo.");
    expect(screen.getByRole('alert').textContent).toBe("Can't be turned on without a photo. Add a photo first, then turn it on.");
    unmount();
    toastError.mockClear();
    render(<Harness start={initial({ isAvailable: false })} />);
    fireEvent.click(screen.getByRole('switch', { name: 'Hidden' }));
    expect(screen.getByRole('switch', { name: 'On the menu' }).getAttribute('aria-checked')).toBe('true');
    expect(toastError).not.toHaveBeenCalled();
  });

  it('saves a photo-less dish that stays off', () => {
    const onSave = vi.fn();
    render(<Harness start={initial({ isAvailable: false })} props={{ existingImageUrl: null }} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'Other' } });
    fireEvent.click(saveBtn());
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('says "No category" with none selected', () => {
    render(<Harness start={initial({ categoryIds: [] })} />);
    expect(screen.getByText('Edit dish · No category')).toBeTruthy();
  });

  it('flags the missing English description on the nav, the English button, and the field', () => {
    render(<Harness start={initial()} />);
    expect(nav('Basics').textContent).toContain('English description missing');
    const en = screen.getByRole('button', { name: /^English/ });
    expect(within(en).getByLabelText('Translation missing')).toBeTruthy();

    fireEvent.click(en);
    const desc = screen.getByLabelText(/^Description \(English\)/) as HTMLTextAreaElement;
    expect(desc.value).toBe(''); // never silently copies the German text in
    expect(desc.placeholder).toBe('Chili, Tomaten und Knoblauch'); // but shows it as the fallback
    expect(screen.getByText('Missing translation')).toBeTruthy();
    expect(screen.getByText('0 / 160')).toBeTruthy();

    fireEvent.change(desc, { target: { value: 'Chilli' } });
    expect(nav('Basics').textContent).toContain('Complete');
    expect(within(screen.getByRole('button', { name: /^English/ })).queryByLabelText('Translation missing')).toBeNull();
    expect(screen.queryByText('Missing translation')).toBeNull();
  });

  it('"Use the German text" copies the German name and description into the English fields (edit)', () => {
    render(<Harness start={initial({ nameTranslations: {}, descriptionTranslations: {} })} />);
    expect(screen.queryByRole('button', { name: 'Use the German text' })).toBeNull(); // only on the English tab
    fireEvent.click(screen.getByRole('button', { name: /^English/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Use the German text' }));
    expect((screen.getByLabelText(/^Name \(English\)/) as HTMLInputElement).value).toBe('Peperoncino');
    expect((screen.getByLabelText(/^Description \(English\)/) as HTMLTextAreaElement).value).toBe('Chili, Tomaten und Knoblauch');
    expect(screen.queryByRole('button', { name: 'Use the German text' })).toBeNull(); // description is filled now
    // the German side is untouched
    fireEvent.click(screen.getByRole('button', { name: /^German/ }));
    expect((screen.getByLabelText(/^Name \(German\)/) as HTMLInputElement).value).toBe('Peperoncino');
  });

  it('the English labels carry no required/optional badges in edit mode', () => {
    render(<Harness start={initial()} />);
    expect(screen.getByLabelText('Name (German)')).toBeTruthy();
    expect(screen.getByLabelText('Description (German)')).toBeTruthy();
  });

  it('caps the description at 160 characters and counts live', () => {
    render(<Harness start={initial()} />);
    const desc = screen.getByLabelText(/^Description/) as HTMLTextAreaElement;
    expect(desc.maxLength).toBe(160);
    expect(screen.getByText('28 / 160')).toBeTruthy();
  });

  it('hides the language toggle and translation flags for a one-language shop', () => {
    render(<Harness start={initial()} props={{ languages: ['de'] }} />);
    expect(screen.queryByRole('group', { name: 'Language' })).toBeNull();
    expect(nav('Basics').textContent).toContain('Complete');
  });
});

describe('DishForm basics', () => {
  it('breaks the gross price into VAT and net using the effective tax class (category-inherited too)', () => {
    render(<Harness start={initial({ foodInfo: { ...EMPTY_FOOD_INFO, taxClassId: null } })} />);
    // no override: the category's class (food, 7%) applies
    expect(screen.getByText(/^Customers pay .*11\.50. That includes .*0\.75 VAT; net .*10\.75\.$/)).toBeTruthy();
    const tax = screen.getByLabelText('Tax class') as HTMLSelectElement;
    expect(tax.value).toBe('food');
    expect(within(tax).queryByText(/Delivery/)).toBeNull(); // the fee-only class is never offered for dishes
    fireEvent.change(tax, { target: { value: 'drink' } });
    expect(screen.getByText(/That includes .*1\.84 VAT; net .*9\.66\./)).toBeTruthy();
  });

  it('removes and adds categories', () => {
    render(<Harness start={initial()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Pasta' }));
    expect(screen.getByText('Edit dish · No category')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: lookup('dishForm.addCategory') }));
    fireEvent.click(screen.getByRole('button', { name: 'Pizza' }));
    expect(screen.getByText('Edit dish · Pizza')).toBeTruthy();
  });

  it('renders the Add-only slot in add mode and not in edit mode', () => {
    const slot = <div data-testid="similar">Start from a similar dish</div>;
    const { unmount } = render(<Harness start={initial()} props={{ mode: 'add', startFromSimilarDish: slot }} />);
    expect(screen.getByTestId('similar')).toBeTruthy();
    expect(screen.getByText('Add dish · not on the menu yet')).toBeTruthy();
    unmount();
    render(<Harness start={initial()} props={{ startFromSimilarDish: slot }} />);
    expect(screen.queryByTestId('similar')).toBeNull();
  });
});

describe('DishForm add mode', () => {
  const addProps = (over: Partial<DishFormProps> = {}): Partial<DishFormProps> => ({
    mode: 'add',
    addRequiredLeft: 1,
    addStatus: { text: 'Draft · not on the menu yet', tone: 'muted' },
    onSaveDraft: vi.fn(),
    onAddToMenu: vi.fn(),
    onCancel: vi.fn(),
    requiredChecklist: [{ id: 'name', label: 'Name', done: false, section: 'basics' }],
    ...over,
  });
  const blank = () => initial({ form: { name: '', description: '', price: 0 }, categoryIds: [] });

  it('puts "Required"/"optional" badges on the labels and word-for-word errors after a try', () => {
    render(<Harness start={blank()} props={addProps()} />);
    expect(screen.getByLabelText('Name (German) · Required')).toBeTruthy();
    expect(screen.getByLabelText('Description (German) · optional')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /^Price/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '1 required left' }));
    expect(screen.getByText('Enter a name.').getAttribute('role')).toBe('alert');
    expect(screen.getByText('Choose at least one category.').getAttribute('role')).toBe('alert');
    fireEvent.click(screen.getByRole('button', { name: /^English/ }));
    expect(screen.getByLabelText('Name (English) · optional')).toBeTruthy();
  });

  it('calls onAddToMenu only when nothing is left, and the primary button is never disabled', () => {
    const onAddToMenu = vi.fn();
    const { unmount } = render(<Harness start={initial()} props={addProps({ onAddToMenu })} />);
    const left = screen.getByRole('button', { name: '1 required left' }) as HTMLButtonElement;
    expect(left.disabled).toBe(false);
    fireEvent.click(left);
    expect(onAddToMenu).not.toHaveBeenCalled();
    unmount();
    render(<Harness start={initial()} props={addProps({ onAddToMenu, addRequiredLeft: 0 })} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add to menu' }));
    expect(onAddToMenu).toHaveBeenCalledTimes(1);
  });

  it('without a photo the primary button reads "Save dish" and still saves (no toast, no block)', () => {
    const onAddToMenu = vi.fn();
    render(<Harness start={initial()} props={addProps({ onAddToMenu, addRequiredLeft: 0, existingImageUrl: null })} />);
    expect(screen.queryByRole('button', { name: 'Add to menu' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save dish' }));
    expect(onAddToMenu).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('Save as draft is disabled only by an empty name', () => {
    const onSaveDraft = vi.fn();
    const { unmount } = render(<Harness start={blank()} props={addProps({ onSaveDraft })} />);
    expect((screen.getByRole('button', { name: 'Save as draft' }) as HTMLButtonElement).disabled).toBe(true);
    unmount();
    render(<Harness start={initial({ categoryIds: [], form: { name: 'X', description: '', price: 0 } })} props={addProps({ onSaveDraft, addRequiredLeft: 5 })} />);
    const draft = screen.getByRole('button', { name: 'Save as draft' }) as HTMLButtonElement;
    expect(draft.disabled).toBe(false);
    fireEvent.click(draft);
    expect(onSaveDraft).toHaveBeenCalledTimes(1);
  });

  it('has no on-the-menu switch, and uses the Add footer (no Discard / Save changes)', () => {
    render(<Harness start={blank()} props={addProps()} />);
    expect(screen.queryByRole('switch', { name: /On the menu|Hidden/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
  });

  it('after adding, swaps the footer buttons and shows the success banner at the top', () => {
    const onViewInMenu = vi.fn();
    const onAddAnother = vi.fn();
    render(
      <Harness
        start={initial()}
        props={addProps({
          isAdded: true, addRequiredLeft: 0, onViewInMenu, onAddAnother,
          addStatus: { text: 'On the menu', tone: 'ok' },
          successBanner: <div role="status">Peperoncino was added to the menu.</div>,
        })}
      />,
    );
    expect(screen.getByText('Peperoncino was added to the menu.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save as draft' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'View in menu' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add another dish' }));
    expect(onViewInMenu).toHaveBeenCalledTimes(1);
    expect(onAddAnother).toHaveBeenCalledTimes(1);
  });
});

describe('DishForm food info', () => {
  it('allergens: not confirmed → chips → none checkbox, with the count read from the reference list', () => {
    render(<Harness start={initial()} />);
    go('food');
    expect(nav('Food info').textContent).toContain('Confirm allergens');
    const allergenHeading = screen.getByRole('heading', { name: 'Allergens' });
    expect(within(allergenHeading.parentElement!).getByText('Not confirmed')).toBeTruthy();
    // 3 active allergens in the data (the inactive one is neither shown nor counted)
    const none = screen.getByRole('checkbox', { name: 'Contains none of the 3 allergens' });
    expect(none.getAttribute('aria-checked')).toBe('false');
    expect(screen.queryByRole('button', { name: 'Old' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Milk' }));
    expect(within(allergenHeading.parentElement!).getByText('1 selected')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Eggs' }));
    expect(within(allergenHeading.parentElement!).getByText('2 selected')).toBeTruthy();

    fireEvent.click(none); // ticking "none" clears every chip
    expect(screen.getByRole('button', { name: 'Milk' }).getAttribute('aria-pressed')).toBe('false');
    expect(none.getAttribute('aria-checked')).toBe('true');
    expect(within(allergenHeading.parentElement!).getByText('None')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Milk' })); // picking a chip clears the checkbox
    expect(none.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: 'Milk' })); // removing the last chip: back to not confirmed
    expect(within(allergenHeading.parentElement!).getByText('Not confirmed')).toBeTruthy();
  });

  it('food info is complete only once allergens AND additives are confirmed', () => {
    render(<Harness start={initial()} />);
    go('food');
    fireEvent.click(screen.getByRole('checkbox', { name: /Contains none of the/ }));
    expect(nav('Food info').textContent).toContain('Confirm allergens');
    fireEvent.click(screen.getByRole('button', { name: '1 with colouring' }));
    expect(nav('Food info').textContent).toContain('Complete');
    const additiveHeading = screen.getByRole('heading', { name: 'Additives' });
    expect(within(additiveHeading.parentElement!).getByText('1 selected')).toBeTruthy();
  });

  it('spiciness: "Not spicy" is the unset state, plus one segment per level in the data', () => {
    render(<Harness start={initial()} />);
    go('food');
    const group = screen.getByRole('group', { name: 'Spiciness' });
    const labels = within(group).getAllByRole('button').map((b) => b.textContent);
    expect(labels).toEqual(['Not spicy', 'Mild', 'Hot']);
    expect(within(group).getByRole('button', { name: 'Not spicy' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(within(group).getByRole('button', { name: 'Hot' }));
    expect(within(group).getByRole('button', { name: 'Hot' }).getAttribute('aria-pressed')).toBe('true');
    expect(within(group).getByRole('button', { name: 'Not spicy' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('labels come from the reference data in German too', () => {
    language = 'de';
    render(<Harness start={initial()} />);
    fireEvent.click(nav(lookup('dishForm.sectionNames.food')));
    expect(screen.getByRole('button', { name: 'Milch' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Enthält keines der 3 Allergene' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Scharf' })).toBeTruthy();
  });
});

describe('DishForm plural forms', () => {
  const navText = () => nav(lookup('dishForm.sectionNames.options')).textContent ?? '';
  const addProps = (n: number): Partial<DishFormProps> => ({
    mode: 'add', addRequiredLeft: n, addStatus: { text: 'Draft', tone: 'muted' },
    onSaveDraft: vi.fn(), onAddToMenu: vi.fn(), onCancel: vi.fn(),
    requiredChecklist: [{ id: 'name', label: 'Name', done: false, section: 'basics' }],
  });
  const blank = () => initial({ form: { name: '', description: '', price: 0 }, categoryIds: [] });

  it.each([
    ['de', [], '0 Varianten · 0 Extras'],
    ['de', ['g1', 'g2'], '1 Variante · 1 Extra'],
    ['en', [], '0 variants · 0 extras'],
    ['en', ['g1', 'g2'], '1 variant · 1 extra'],
  ] as const)('%s nav status for refs %j reads "%s"', (lang, refs, text) => {
    language = lang;
    render(<Harness start={initial({ optionGroupRefs: [...refs] })} />);
    expect(navText()).toContain(text);
  });

  it.each([
    ['de', 2, '2 Pflichtangaben offen'],
    ['de', 1, '1 Pflichtangabe offen'],
    ['en', 2, '2 required left'],
    ['en', 1, '1 required left'],
  ] as const)('%s footer with %i missing reads "%s"', (lang, n, text) => {
    language = lang;
    render(<Harness start={blank()} props={addProps(n)} />);
    expect(screen.getByRole('button', { name: text })).toBeTruthy();
  });
});

describe('DishForm options and extras', () => {
  const extraOf = (id: string, name: string) =>
    ({ id, kind: 'addon', name, minSelectable: 0, maxSelectable: 2, nameTranslations: {}, options: [] }) as unknown as ShopOptionGroupDto;
  const variantOf = (id: string, name: string) =>
    ({ id, kind: 'variant', name, minSelectable: 1, maxSelectable: 1, nameTranslations: {}, options: [] }) as unknown as ShopOptionGroupDto;

  it('splits Variant and Extras, each with its own heading, in extras order with real badges and price deltas', () => {
    render(<Harness start={initial({ optionGroupRefs: ['g3', 'g1', 'g2'] })} />);
    expect(nav('Options and extras').textContent).toContain('1 variant · 2 extras');
    go('options');
    const heads = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(heads).toEqual(['Variant', 'Your pasta', 'Extras', 'Sauces', 'Extras']);
    expect(screen.getByText('Customers pick exactly one.')).toBeTruthy();
    expect(screen.getByText('Drag to set the order customers see.')).toBeTruthy();
    expect(screen.getByText('Optional · up to 4')).toBeTruthy();
    expect(screen.getByText('Required · choose 1')).toBeTruthy();
    expect(screen.getByText('Grouped on the storefront as Cheese')).toBeTruthy();
    expect(screen.getByText(/\+ .*1\.00/)).toBeTruthy(); // Gnocchi
  });

  it('the variant card never has a drag handle; extras only get one when there are two or more', () => {
    const { unmount } = render(<Harness start={initial()} />); // one variant, one extra
    go('options');
    expect(screen.queryAllByRole('button', { name: 'Drag to reorder' })).toHaveLength(0);
    expect(screen.queryByText('Drag to set the order customers see.')).toBeNull();
    unmount();
    render(<Harness start={initial({ optionGroupRefs: ['g1', 'g2', 'g3'] })} />);
    go('options');
    const handles = screen.getAllByRole('button', { name: 'Drag to reorder' });
    expect(handles).toHaveLength(2);
    // keyboard sensor is wired: dnd-kit gives each handle role/tabindex and its instructions
    for (const h of handles) {
      expect(h.getAttribute('aria-roledescription')).toBe('sortable');
      expect(h.getAttribute('tabindex')).toBe('0');
      expect(within(screen.getByRole('heading', { name: 'Your pasta' }).closest('li')!).queryByRole('button', { name: 'Drag to reorder' })).toBeNull();
    }
  });

  it('remove-from-dish detaches the variant and shows the two empty-state buttons; choosing offers only variant groups', () => {
    render(<Harness start={initial()} />);
    go('options');
    expect(screen.queryByRole('button', { name: 'Choose variant group' })).toBeNull();
    const card = screen.getByRole('heading', { name: 'Your pasta' }).closest('li')!;
    fireEvent.click(within(card).getByRole('button', { name: /^Remove from dish/ }));
    expect(screen.queryByRole('heading', { name: 'Your pasta' })).toBeNull();
    expect(nav('Options and extras').textContent).toContain('0 variant · 1 extras');
    expect(saveBtn().disabled).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Choose variant group' }));
    const picker = screen.getByRole('group', { name: 'Choose variant group' });
    expect(within(picker).getAllByRole('button').map((b) => b.textContent?.split(/\d/)[0].trim())).toEqual(['Your pasta']);
    fireEvent.click(within(picker).getByRole('button', { name: /Your pasta/ }));
    expect(screen.getByRole('heading', { name: 'Your pasta' })).toBeTruthy();
    // Now filled: Replace instead of the empty-state buttons
    expect(screen.queryByRole('button', { name: 'Choose variant group' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Replace' })).toBeTruthy();
  });

  it('with a variant attached, Replace swaps it; the extras picker never offers variant groups', () => {
    library.push(variantOf('g4', 'Size'), extraOf('g5', 'Dips'));
    try {
      render(<Harness start={initial()} />);
      go('options');
      expect(screen.queryByRole('button', { name: 'Create new group', hidden: false })).not.toBeNull(); // extras' own create button
      expect(screen.getAllByRole('button', { name: 'Create new group' })).toHaveLength(1);
      fireEvent.click(screen.getByRole('button', { name: 'Replace' }));
      const picker = screen.getByRole('group', { name: 'Replace' });
      expect(within(picker).getAllByRole('button').map((b) => b.textContent?.split(/\d/)[0].trim())).toEqual(['Size']);
      fireEvent.click(within(picker).getByRole('button', { name: /Size/ }));
      expect(screen.queryByRole('heading', { name: 'Your pasta' })).toBeNull();
      expect(screen.getByRole('heading', { name: 'Size' })).toBeTruthy();
      expect(nav('Options and extras').textContent).toContain('1 variant · 1 extras');

      fireEvent.click(screen.getByRole('button', { name: /Attach existing group/ }));
      const extras = screen.getByRole('group', { name: /Attach existing group/ });
      expect(within(extras).getAllByRole('button').map((b) => b.textContent?.split(/\d/)[0].trim())).toEqual(['Sauces', 'Dips']);
    } finally {
      library.splice(3, 2);
    }
  });

  it('a legacy dish with two variant groups marks the second "Not shown to customers" and Remove drops only it', () => {
    library.push(variantOf('g4', 'Size'));
    try {
      render(<Harness start={initial({ optionGroupRefs: ['g1', 'g4', 'g2'] })} />);
      go('options');
      expect(screen.getAllByText('Not shown to customers')).toHaveLength(1);
      const legacy = screen.getByText('Not shown to customers').closest('li')!;
      expect(within(legacy).getByText('Not shown to customers')).toBeTruthy();
      expect(nav('Options and extras').textContent).toContain('1 variant · 1 extras');
      fireEvent.click(within(legacy).getByRole('button', { name: /^Remove from dish/ }));
      expect(screen.queryByText('Not shown to customers')).toBeNull();
      expect(screen.getByRole('heading', { name: 'Your pasta' })).toBeTruthy();
    } finally {
      library.splice(3, 1);
    }
  });
});

describe('DishForm availability', () => {
  it('a mode switch is ON when the mode is not in unavailableModes, and toggling hides/unhides it', () => {
    const onSave = vi.fn();
    render(<Harness start={initial({ foodInfo: { ...EMPTY_FOOD_INFO, unavailableModes: ['delivery'] } })} onSave={onSave} />);
    go('availability');
    expect(screen.getByRole('switch', { name: 'Collection' }).getAttribute('aria-checked')).toBe('true');
    expect(screen.getByRole('switch', { name: 'Delivery' }).getAttribute('aria-checked')).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: 'Dine in' }));
    fireEvent.click(screen.getByRole('switch', { name: 'Delivery' }));
    fireEvent.click(saveBtn());
    expect(onSave.mock.calls[0][0].foodInfo.unavailableModes).toEqual(['dine_in']);
  });

  it('age restriction and preparation time edit the dish; there is no sold-out control', () => {
    const onSave = vi.fn();
    render(<Harness start={initial()} onSave={onSave} />);
    go('availability');
    fireEvent.click(screen.getByRole('switch', { name: 'Age-restricted (18+)' }));
    fireEvent.change(screen.getByLabelText('Preparation time'), { target: { value: '15' } });
    expect(screen.queryByText(/sold out/i)).toBeNull();
    fireEvent.click(saveBtn());
    expect(onSave.mock.calls[0][0].foodInfo).toMatchObject({ ageRestricted: true, prepMinutes: 15 });
  });

  it('every switch is a real button with role=switch and aria-checked', () => {
    render(<Harness start={initial()} />);
    go('availability');
    const switches = screen.getAllByRole('switch');
    expect(switches.length).toBe(5); // on the menu + 3 modes + age restriction
    for (const s of switches) {
      expect(s.tagName).toBe('BUTTON');
      expect(['true', 'false']).toContain(s.getAttribute('aria-checked'));
    }
  });
});
