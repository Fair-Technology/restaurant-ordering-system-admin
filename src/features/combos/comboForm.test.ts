import { describe, expect, it } from 'vitest';
import type { ProductDto } from '../../services/api';
import type { ComboDto } from '../../services/combosApi';
import { emptyComboForm, type ComboForm, type ComboGroupForm } from './combos';
import {
  choiceChips,
  comboFormDirty,
  comboMatchesFilter,
  comboNavStatus,
  comboTranslationMissing,
  dishesByCategory,
  reorderGroups,
  toggleDishIds,
} from './comboForm';

const g = (key: string, productIds: string[] = [], name = key): ComboGroupForm => ({ key, name, nameTranslations: {}, productIds });
const dish = (id: string, cat: string) => ({ id, name: `Dish ${id}`, price: 100, categories: [{ id: cat, name: cat }] }) as unknown as ProductDto;
const base = (over: Partial<ComboForm> = {}): ComboForm => ({ ...emptyComboForm(), name: 'A', price: '5', categoryId: 'c', ...over });

describe('reorderGroups', () => {
  it('moves a choice to the place of another, by client key', () => {
    const groups = [g('a'), g('b'), g('c')];
    expect(reorderGroups(groups, 'a', 'c').map((x) => x.key)).toEqual(['b', 'c', 'a']);
    expect(reorderGroups(groups, 'c', 'a').map((x) => x.key)).toEqual(['c', 'a', 'b']);
  });
  it('works for never-saved choices (no server id) and changes nothing for unknown keys', () => {
    const groups = [g('a'), g('b')];
    expect(reorderGroups(groups, 'b', 'a').map((x) => x.key)).toEqual(['b', 'a']);
    expect(reorderGroups(groups, 'x', 'a')).toBe(groups);
    expect(reorderGroups(groups, 'a', 'a')).toBe(groups);
  });
});

describe('choiceChips', () => {
  const cats = dishesByCategory([dish('1', 'Pasta'), dish('2', 'Pasta'), dish('3', 'Drinks')]);
  it('collapses a fully ticked category into one chip and lists other dishes singly', () => {
    const chips = choiceChips(['1', '2', '3'], cats);
    expect(chips).toEqual([
      { kind: 'category', name: 'Pasta', ids: ['1', '2'] },
      { kind: 'dish', id: '3', name: 'Dish 3' },
    ]);
  });
  it('shows single chips when the category is only partly ticked', () => {
    expect(choiceChips(['1'], cats)).toEqual([{ kind: 'dish', id: '1', name: 'Dish 1' }]);
  });
  it('a dish added to the category later is not in the choice: the chip goes back to single dishes', () => {
    const grown = dishesByCategory([dish('1', 'Pasta'), dish('2', 'Pasta'), dish('9', 'Pasta')]);
    expect(choiceChips(['1', '2'], grown).every((c) => c.kind === 'dish')).toBe(true);
  });
});

describe('toggleDishIds', () => {
  it('ticks and unticks ids without duplicates', () => {
    expect(toggleDishIds(['1'], ['1', '2'], true)).toEqual(['1', '2']);
    expect(toggleDishIds(['1', '2'], ['2'], false)).toEqual(['1']);
  });
});

describe('comboNavStatus', () => {
  const opts = { photoMissing: false, isGermany: true };
  it('basics: photo missing warns first', () => {
    expect(comboNavStatus('basics', base(), { ...opts, photoMissing: true })).toMatchObject({ key: 'photoMissing', tone: 'warn' });
    expect(comboNavStatus('basics', base(), opts).key).toBe('complete');
    expect(comboNavStatus('basics', base({ name: '' }), opts).key).toBe('notFinished');
  });
  it('choices: counts choices with a dish, or asks to add one', () => {
    expect(comboNavStatus('choices', base({ groups: [g('a', ['1']), g('b')] }), opts)).toMatchObject({ key: 'choices', count: 1 });
    expect(comboNavStatus('choices', base(), opts)).toMatchObject({ key: 'addChoice', tone: 'warn' });
  });
  it('tax: BMF wording only in Germany', () => {
    expect(comboNavStatus('tax', base({ bmfDrinkShare: true }), opts).key).toBe('bmf');
    expect(comboNavStatus('tax', base({ bmfDrinkShare: true }), { ...opts, isGermany: false }).key).toBe('split');
    expect(comboNavStatus('tax', base(), opts).key).toBe('split');
  });
  it('availability', () => {
    expect(comboNavStatus('availability', base({ isAvailable: true }), opts).key).toBe('onMenu');
    expect(comboNavStatus('availability', base({ isAvailable: false }), opts).key).toBe('off');
  });
});

describe('comboFormDirty / comboTranslationMissing / filters', () => {
  it('is dirty on a changed form or a waiting photo', () => {
    const saved = base();
    expect(comboFormDirty(saved, { ...saved }, null)).toBe(false);
    expect(comboFormDirty(saved, { ...saved, name: 'B' }, null)).toBe(true);
    expect(comboFormDirty(saved, { ...saved }, new File(['x'], 'a.jpg'))).toBe(true);
  });
  it('flags any original text without an extra-language text', () => {
    expect(comboTranslationMissing(base(), undefined)).toBe(false);
    expect(comboTranslationMissing(base({ name: '', groups: [g('a', [], '')] }), 'en')).toBe(false);
    expect(comboTranslationMissing(base({ nameTranslations: { en: 'A' }, groups: [{ ...g('a', [], 'G'), nameTranslations: {} }] }), 'en')).toBe(true);
    expect(comboTranslationMissing(base({ nameTranslations: { en: 'A' }, groups: [{ ...g('a', [], 'G'), nameTranslations: { en: 'g' } }] }), 'en')).toBe(false);
  });
  it('photo-missing filter matches combos without an image', () => {
    const withPhoto = { isAvailable: true, images: [{ id: 'i', url: 'u' }] } as unknown as ComboDto;
    const without = { isAvailable: true, images: [] } as unknown as ComboDto;
    expect(comboMatchesFilter(withPhoto, 'photoMissing')).toBe(false);
    expect(comboMatchesFilter(without, 'photoMissing')).toBe(true);
    expect(comboMatchesFilter(without, 'all')).toBe(true);
  });
});
