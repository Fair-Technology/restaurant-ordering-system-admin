import { describe, expect, it } from 'vitest';
import type { ProductDto, ShopOptionGroupDto } from '../../services/api';
import { EMPTY_FOOD_INFO } from './foodInfo';
import {
  attachedGroupCount,
  dishFormStateFromProduct,
  groupBadge,
  groupCategories,
  listStatus,
  navStatus,
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
    expect(navStatus('basics', state(), 'en', 0)).toEqual({ key: 'complete', tone: 'ok' });
    expect(navStatus('basics', state({ descriptionTranslations: { en: '  ' } }), 'en', 0)).toEqual({
      key: 'translationMissing',
      tone: 'warn',
      language: 'en',
    });
    expect(navStatus('basics', state({ descriptionTranslations: {} }), 'en', 0).key).toBe('translationMissing');
  });

  it('basics: a one-language shop has nothing to translate', () => {
    expect(navStatus('basics', state({ descriptionTranslations: {} }), undefined, 0).key).toBe('complete');
  });

  it('food: complete only when allergens AND additives are each confirmed', () => {
    expect(navStatus('food', state(), 'en', 0)).toEqual({ key: 'complete', tone: 'ok' });
    const onlyAllergens = state({ foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: ['milk'], additiveIds: null } });
    expect(navStatus('food', onlyAllergens, 'en', 0)).toEqual({ key: 'confirmAllergens', tone: 'warn' });
    const onlyAdditives = state({ foodInfo: { ...EMPTY_FOOD_INFO, allergenIds: null, additiveIds: [] } });
    expect(navStatus('food', onlyAdditives, 'en', 0).key).toBe('confirmAllergens');
  });

  it('options: the number of attached groups, grey', () => {
    expect(navStatus('options', state(), 'en', 3)).toEqual({ key: 'groups', tone: 'muted', count: 3 });
  });

  it('availability mirrors the on-the-menu switch', () => {
    expect(navStatus('availability', state(), 'en', 0)).toEqual({ key: 'onMenu', tone: 'muted' });
    expect(navStatus('availability', state({ isAvailable: false }), 'en', 0)).toEqual({ key: 'hidden', tone: 'warn' });
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

describe('attachedGroupCount', () => {
  const lib = [{ id: 'g1' }, { id: 'g2' }] as ShopOptionGroupDto[];
  it('counts library groups that still exist plus the dish-only ones', () => {
    const s = state({ optionGroupRefs: ['g1', 'gone', 'g2'], variantGroups: [{ id: 'v', name: 'V', options: [] }] });
    expect(attachedGroupCount(s, lib)).toBe(3);
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
