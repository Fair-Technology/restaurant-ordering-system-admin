import { describe, expect, it } from 'vitest';
import type { ProductDto, ShopOptionGroupDto } from '../../services/api';
import { EMPTY_FOOD_INFO } from './foodInfo';
import {
  addNavStatus,
  addRequiredChecklist,
  addRequiredLeftCount,
  applySimilarDishCopy,
  extraGroupCount,
  copyFromSimilarDish,
  emptyDishFormState,
  firstIncompleteAddSection,
  dishFormStateFromProduct,
  groupBadge,
  groupCategories,
  listStatus,
  navStatus,
  variantSlotFilled,
  translationMissing,
  vatBreakdown,
  type DishFormState,
} from './dishForm';

const state = (over: Partial<DishFormState> = {}): DishFormState => ({
  form: { name: 'Peperoncino', description: 'Chili', price: 1150 },
  nameTranslations: {},
  descriptionTranslations: { en: 'Chilli' },
  categoryIds: [],
  foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: [], additiveIds: [] },
  variantGroups: [],
  addonGroups: [],
  optionGroupRefs: [],
  isAvailable: true,
  ...over,
});

describe('navStatus', () => {
  it('basics: complete, or the extra language is missing when its description is empty', () => {
    expect(navStatus('basics', state(), 'en', 0, 0)).toEqual({ key: 'complete', tone: 'ok' });
    expect(navStatus('basics', state({ descriptionTranslations: { en: '  ' } }), 'en', 0, 0)).toEqual({
      key: 'translationMissing',
      tone: 'warn',
      language: 'en',
    });
    expect(navStatus('basics', state({ descriptionTranslations: {} }), 'en', 0, 0).key).toBe('translationMissing');
  });

  it('basics: a one-language shop has nothing to translate', () => {
    expect(navStatus('basics', state({ descriptionTranslations: {} }), undefined, 0, 0).key).toBe('complete');
  });

  it('food: complete only when allergens AND additives are each confirmed', () => {
    expect(navStatus('food', state(), 'en', 0, 0)).toEqual({ key: 'complete', tone: 'ok' });
    const onlyAllergens = state({ foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: ['milk'], additiveIds: null } });
    expect(navStatus('food', onlyAllergens, 'en', 0, 0)).toEqual({ key: 'confirmAllergens', tone: 'warn' });
    const onlyAdditives = state({ foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: null, additiveIds: [] } });
    expect(navStatus('food', onlyAdditives, 'en', 0, 0).key).toBe('confirmAllergens');
  });

  it('options: variant slot and extras counts, grey', () => {
    expect(navStatus('options', state(), 'en', 1, 3)).toEqual({ key: 'variantExtras', tone: 'muted', variantCount: 1, extraCount: 3 });
  });

  it('availability mirrors the on-the-menu switch', () => {
    expect(navStatus('availability', state(), 'en', 0, 0)).toEqual({ key: 'onMenu', tone: 'muted' });
    expect(navStatus('availability', state({ isAvailable: false }), 'en', 0, 0)).toEqual({ key: 'hidden', tone: 'warn' });
  });
});

describe('translationMissing', () => {
  it('is false without an extra language', () => {
    expect(translationMissing({ descriptionTranslations: {} }, undefined)).toBe(false);
  });
});

describe('listStatus', () => {
  it('tells not-confirmed (null) from confirmed-none ([]) from a count', () => {
    expect(listStatus(null)).toEqual({ kind: 'unconfirmed' });
    expect(listStatus([])).toEqual({ kind: 'none' });
    expect(listStatus(['milk', 'eggs'])).toEqual({ kind: 'selected', count: 2 });
  });
});

describe('vatBreakdown', () => {
  it('splits a gross price at the given rate and always adds back up', () => {
    expect(vatBreakdown(1150, 700)).toEqual({ net: 1075, vat: 75 });
    expect(vatBreakdown(1190, 1900)).toEqual({ net: 1000, vat: 190 });
    const { net, vat } = vatBreakdown(999, 1900);
    expect(net + vat).toBe(999);
  });

  it('a zero rate has no VAT', () => {
    expect(vatBreakdown(500, 0)).toEqual({ net: 500, vat: 0 });
  });
});

describe('groupBadge', () => {
  it('variants are always required, choose one', () => {
    expect(groupBadge({ kind: 'variant', minSelectable: 0, maxSelectable: 0 })).toEqual({ required: true, min: 1, max: 1 });
  });
  it('extras use the group min and max', () => {
    expect(groupBadge({ kind: 'addon', minSelectable: 0, maxSelectable: 5 })).toEqual({ required: false, min: 0, max: 5 });
    expect(groupBadge({ kind: 'addon', minSelectable: 1, maxSelectable: 3 })).toEqual({ required: true, min: 1, max: 3 });
  });
});

describe('groupCategories', () => {
  it('lists distinct non-empty option categories in order', () => {
    const opt = (category?: string) => ({ id: Math.random().toString(), name: 'x', priceDelta: 0, isAvailable: true, category });
    expect(groupCategories({ options: [opt('Cheese'), opt(), opt(' Protein '), opt('Cheese')] })).toEqual(['Cheese', 'Protein']);
  });
});

describe('variantSlotFilled / extraGroupCount', () => {
  const lib = [{ id: 'v1', kind: 'variant' }, { id: 'v2', kind: 'variant' }, { id: 'a1', kind: 'addon' }, { id: 'a2', kind: 'addon' }] as ShopOptionGroupDto[];
  const dishOnly = { id: 'x', name: 'X', options: [] };
  it('the slot is 0 or 1 whatever the number of variant groups', () => {
    expect(variantSlotFilled(state({ optionGroupRefs: ['a1'] }), lib)).toBe(0);
    expect(variantSlotFilled(state({ optionGroupRefs: ['v1', 'v2'] }), lib)).toBe(1);
    expect(variantSlotFilled(state({ optionGroupRefs: ['gone'] }), lib)).toBe(0);
    expect(variantSlotFilled(state({ variantGroups: [dishOnly] }), lib)).toBe(1);
  });
  it('counts addon refs that still exist plus dish-only extras', () => {
    const s = state({ optionGroupRefs: ['a1', 'gone', 'v1', 'a2'], addonGroups: [{ ...dishOnly, minSelectable: 0, maxSelectable: 1 }] });
    expect(extraGroupCount(s, lib)).toBe(3);
  });
});

describe('dishFormStateFromProduct', () => {
  it('keeps confirmed-none allergens ([]) distinct from not confirmed (null)', () => {
    const product = { name: 'A', description: 'd', price: 100, allergenIds: [], additiveIds: null, categories: [], optionGroupRefs: ['g1'] } as unknown as ProductDto;
    const s = dishFormStateFromProduct(product);
    expect(s.foodInfo.allergenIds).toEqual([]);
    expect(s.foodInfo.additiveIds).toBeNull();
    expect(s.optionGroupRefs).toEqual(['g1']);
    expect(s.isAvailable).toBe(true);
  });
});

describe('emptyDishFormState', () => {
  it('is a blank, unconfirmed, available-everywhere dish, with fresh arrays each call', () => {
    const e = emptyDishFormState();
    expect(e.form).toEqual({ name: '', description: '', price: 0 });
    expect(e.foodInfo.allergenIds).toBeNull();
    expect(e.foodInfo.additiveIds).toBeNull();
    expect(e.foodInfo.unavailableModes).toEqual([]);
    expect(e.isAvailable).toBe(true);
    for (const k of ['categoryIds', 'optionGroupRefs', 'variantGroups', 'addonGroups'] as const) expect(e[k]).toEqual([]);
    expect(emptyDishFormState().categoryIds).not.toBe(e.categoryIds);
    expect(emptyDishFormState().foodInfo.unavailableModes).not.toBe(e.foodInfo.unavailableModes);
  });
});

describe('add required checklist', () => {
  const full = (): DishFormState =>
    state({ form: { name: 'Pasta', description: '', price: 100 }, categoryIds: ['c1'], foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: [], additiveIds: [] } });

  it('an empty form has all six items open, Basics before Food', () => {
    const items = addRequiredChecklist(emptyDishFormState(), true);
    expect(items.map((i) => i.id)).toEqual(['photo', 'name', 'price', 'category', 'allergens', 'additives']);
    expect(items.map((i) => i.section)).toEqual(['basics', 'basics', 'basics', 'basics', 'food', 'food']);
    expect(addRequiredLeftCount(items)).toBe(6);
    expect(firstIncompleteAddSection(items)).toBe('basics');
  });

  it('counts every item on its own', () => {
    const base = full();
    expect(addRequiredLeftCount(addRequiredChecklist(base, false))).toBe(0);
    expect(addRequiredLeftCount(addRequiredChecklist(base, true))).toBe(1);
    expect(addRequiredLeftCount(addRequiredChecklist({ ...base, form: { ...base.form, name: '   ' } }, false))).toBe(1);
    expect(addRequiredLeftCount(addRequiredChecklist({ ...base, form: { ...base.form, price: 0 } }, false))).toBe(1);
    expect(addRequiredLeftCount(addRequiredChecklist({ ...base, categoryIds: [] }, false))).toBe(1);
    expect(addRequiredLeftCount(addRequiredChecklist({ ...base, foodInfo: { ...base.foodInfo, allergenIds: null } }, false))).toBe(1);
    expect(addRequiredLeftCount(addRequiredChecklist({ ...base, foodInfo: { ...base.foodInfo, additiveIds: null } }, false))).toBe(1);
  });

  it('name + photo + price + category still leaves allergens and additives; "none" ([]) counts as confirmed', () => {
    const basicsOnly = { ...full(), foodInfo: { ...EMPTY_FOOD_INFO } };
    const items = addRequiredChecklist(basicsOnly, false);
    expect(addRequiredLeftCount(items)).toBe(2);
    expect(firstIncompleteAddSection(items)).toBe('food');
    const picked = { ...basicsOnly, foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: ['milk'], additiveIds: [] } };
    expect(addRequiredLeftCount(addRequiredChecklist(picked, false))).toBe(0);
    expect(firstIncompleteAddSection(addRequiredChecklist(picked, false))).toBeNull();
  });

  it('jumps to Basics whenever any Basics item is open, even if Food is open too', () => {
    const items = addRequiredChecklist({ ...emptyDishFormState(), categoryIds: ['c1'] }, false);
    expect(firstIncompleteAddSection(items)).toBe('basics');
  });

  it('the nav lines: required left / complete, confirm food, optional or groups, everywhere or customised', () => {
    const empty = emptyDishFormState();
    const items = addRequiredChecklist(empty, true);
    expect(addNavStatus('basics', empty, items, 0, 0, false)).toEqual({ key: 'requiredLeft', tone: 'muted', count: 4 });
    expect(addNavStatus('basics', empty, items, 0, 0, true)).toEqual({ key: 'requiredLeft', tone: 'warn', count: 4 });
    expect(addNavStatus('food', empty, items, 0, 0, true)).toEqual({ key: 'confirmFood', tone: 'warn' });
    expect(addNavStatus('options', empty, items, 0, 0, false)).toEqual({ key: 'variantExtras', tone: 'muted', variantCount: 0, extraCount: 0 });
    expect(addNavStatus('options', empty, items, 1, 2, false)).toEqual({ key: 'variantExtras', tone: 'muted', variantCount: 1, extraCount: 2 });
    expect(addNavStatus('availability', empty, items, 0, 0, false).key).toBe('everywhere');
    const custom = { ...empty, foodInfo: { ...empty.foodInfo, unavailableModes: ['delivery' as const] } };
    expect(addNavStatus('availability', custom, items, 0, 0, false).key).toBe('customised');
    expect(addNavStatus('availability', { ...empty, foodInfo: { ...empty.foodInfo, ageRestricted: true } }, items, 0, 0, false).key).toBe('customised');
    const done = full2();
    expect(addNavStatus('basics', done, addRequiredChecklist(done, false), 0, 0, false)).toEqual({ key: 'complete', tone: 'ok' });
    expect(addNavStatus('food', done, addRequiredChecklist(done, false), 0, 0, false)).toEqual({ key: 'complete', tone: 'ok' });
  });
});

function full2(): DishFormState {
  return state({ form: { name: 'Pasta', description: '', price: 100 }, categoryIds: ['c1'] });
}

describe('copyFromSimilarDish', () => {
  const source = {
    name: 'Carbonara', description: 'x', price: 1200,
    categories: [{ id: 'c1', name: 'Pasta', sortOrder: 0 }],
    taxClassId: null,
    allergenIds: ['milk'], additiveIds: ['a1'], dietaryTagIds: ['vegan'], spiceLevel: 'hot',
    optionGroupRefs: ['g1', 'g2'],
    variantGroups: [{ id: 'vg', name: 'Size', options: [{ id: 'vo', name: 'Large', priceDelta: 100, isAvailable: true }] }],
    addonGroups: [{ id: 'ag', name: 'Extras', minSelectable: 0, maxSelectable: 2, options: [{ id: 'ao', name: 'Cheese', priceDelta: 50, isAvailable: true }] }],
  } as unknown as ProductDto;
  const categoriesList = [{ id: 'c1', taxClassId: 'food' }];

  it('copies category, effective tax class, option groups and dish-only groups (with new ids)', () => {
    const c = copyFromSimilarDish(source, categoriesList);
    expect(c.categoryIds).toEqual(['c1']);
    expect(c.foodInfo).toEqual({ taxClassId: 'food' });
    expect(c.optionGroupRefs).toEqual(['g1', 'g2']);
    expect(c.variantGroups[0].name).toBe('Size');
    expect(c.variantGroups[0].id).not.toBe('vg');
    expect(c.variantGroups[0].options[0]).toMatchObject({ name: 'Large', priceDelta: 100 });
    expect(c.variantGroups[0].options[0].id).not.toBe('vo');
    expect(c.addonGroups[0]).toMatchObject({ name: 'Extras', minSelectable: 0, maxSelectable: 2 });
    expect(c.addonGroups[0].id).not.toBe('ag');
  });

  it("the dish's own tax class wins over its category's suggestion", () => {
    expect(copyFromSimilarDish({ ...source, taxClassId: 'drink' } as ProductDto, categoriesList).foodInfo.taxClassId).toBe('drink');
  });

  it('never carries allergens, additives, dietary tags or spice level', () => {
    const c = copyFromSimilarDish(source, categoriesList);
    expect(Object.keys(c.foodInfo)).toEqual(['taxClassId']);
    const target = { ...emptyDishFormState(), form: { name: 'New', description: '', price: 900 } };
    const applied = applySimilarDishCopy(target, c);
    expect(applied.foodInfo.allergenIds).toBeNull();
    expect(applied.foodInfo.additiveIds).toBeNull();
    expect(applied.foodInfo.dietaryTagIds).toEqual([]);
    expect(applied.foodInfo.spiceLevel).toBeNull();
    expect(applied.foodInfo.taxClassId).toBe('food');
    expect(applied.categoryIds).toEqual(['c1']);
    expect(applied.form).toEqual({ name: 'New', description: '', price: 900 });
  });

  it('leaves what the owner already confirmed alone', () => {
    const target = { ...emptyDishFormState(), foodInfo: { ...emptyDishFormState().foodInfo, allergenIds: ['eggs'], additiveIds: [] } };
    const applied = applySimilarDishCopy(target, copyFromSimilarDish(source, categoriesList));
    expect(applied.foodInfo.allergenIds).toEqual(['eggs']);
    expect(applied.foodInfo.additiveIds).toEqual([]);
  });
});
