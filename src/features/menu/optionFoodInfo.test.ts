import { describe, expect, it } from 'vitest';
import { optionDeclarationCount, optionFromApi, optionGroupsFromProduct, toggleOptionId } from './optionFoodInfo';

describe('optionFoodInfo', () => {
  it("optionGroupsFromProduct keeps each option's allergens and additives", () => {
    const result = optionGroupsFromProduct({
      variantGroups: [{ id: 'g1', name: 'Größe', options: [{ id: 'o1', name: 'Groß', priceDelta: 300, isAvailable: true, allergenIds: ['milk'], additiveIds: ['preservative'] }] }],
      addonGroups: [{ id: 'a1', name: 'Extras', minSelectable: 0, maxSelectable: 2, options: [{ id: 'x1', name: 'Thunfisch', priceDelta: 150, isAvailable: true, allergenIds: ['fish'], additiveIds: [] }] }],
    });
    expect(result).toEqual({
      variantGroups: [{ id: 'g1', name: 'Größe', nameTranslations: {}, options: [{ id: 'o1', name: 'Groß', nameTranslations: {}, priceDelta: 300, isAvailable: true, allergenIds: ['milk'], additiveIds: ['preservative'] }] }],
      addonGroups: [{ id: 'a1', name: 'Extras', nameTranslations: {}, minSelectable: 0, maxSelectable: 2, options: [{ id: 'x1', name: 'Thunfisch', nameTranslations: {}, priceDelta: 150, isAvailable: true, allergenIds: ['fish'], additiveIds: [] }] }],
    });
  });

  it('an option saved before option allergens existed reads as none', () => {
    const old = optionFromApi({ id: 'o1', name: 'Klein', priceDelta: 0, isAvailable: true });
    expect(old.allergenIds).toEqual([]);
    expect(old.additiveIds).toEqual([]);
    const nulls = optionFromApi({ id: 'o2', allergenIds: null, additiveIds: null });
    expect(nulls.allergenIds).toEqual([]);
    expect(nulls.additiveIds).toEqual([]);
  });

  it('toggleOptionId never returns to undeclared', () => {
    expect(toggleOptionId([], 'fish')).toEqual(['fish']);
    expect(toggleOptionId(['fish'], 'fish')).toEqual([]);
    expect(toggleOptionId(['fish'], 'eggs')).toEqual(['fish', 'eggs']);
  });

  it('optionDeclarationCount adds both lists', () => {
    expect(optionDeclarationCount({ allergenIds: ['fish'], additiveIds: ['preservative', 'colouring'] })).toBe(3);
    expect(optionDeclarationCount({})).toBe(0);
  });
});
