import { describe, expect, it } from 'vitest';
import type { ShopOptionGroupDto } from '../../services/api';
import {
  emptyGroupForm,
  groupFormFromLibrary,
  libraryGroupsForPicker,
  optionGroupBodyFromForm,
  validateGroupForm,
  withToggledRef,
  type OptionGroupForm,
} from './optionGroupLibrary';

const group = (over: Partial<ShopOptionGroupDto> = {}): ShopOptionGroupDto => ({
  id: 'g1',
  shopId: 's1',
  kind: 'addon',
  name: 'Drinks',
  nameTranslations: { de: 'Getränke' },
  minSelectable: 0,
  maxSelectable: 2,
  options: [
    { id: 'o1', name: 'Coke', priceDelta: 150, isAvailable: true, nameTranslations: { de: 'Cola' }, allergenIds: ['a1'], additiveIds: ['x1'] },
    { id: 'o2', name: 'Water', priceDelta: 0, isAvailable: false },
  ],
  createdAt: '',
  updatedAt: '',
  ...over,
});

const valid = (): OptionGroupForm => ({
  ...emptyGroupForm('addon'),
  name: 'Extras',
  options: [{ key: 'k', name: 'Cheese', priceDelta: 100, isAvailable: true }],
});

describe('optionGroupBodyFromForm', () => {
  it('drops min/max for variants and keeps them for addons', () => {
    const f = { ...valid(), kind: 'variant' as const };
    const body = optionGroupBodyFromForm(f);
    expect(body).not.toHaveProperty('minSelectable');
    expect(body).not.toHaveProperty('maxSelectable');
    expect(optionGroupBodyFromForm(valid())).toMatchObject({ minSelectable: 0, maxSelectable: 1 });
  });

  it('keeps ids, translations, allergens and additives and trims names', () => {
    const form = groupFormFromLibrary(group());
    form.name = '  Drinks  ';
    form.options[0].name = ' Coke ';
    const body = optionGroupBodyFromForm(form);
    expect(body.name).toBe('Drinks');
    expect(body.options[0]).toEqual({
      id: 'o1', name: 'Coke', priceDelta: 150, isAvailable: true,
      nameTranslations: { de: 'Cola' }, allergenIds: ['a1'], additiveIds: ['x1'],
    });
    expect(body.options[1]).toEqual({ id: 'o2', name: 'Water', priceDelta: 0, isAvailable: false });
  });

  it('omits id for new rows and defaults isAvailable to true', () => {
    const f = valid();
    const o = { ...f.options[0], isAvailable: undefined } as unknown as OptionGroupForm['options'][number];
    const body = optionGroupBodyFromForm({ ...f, options: [o] });
    expect(body.options[0]).toEqual({ name: 'Cheese', priceDelta: 100, isAvailable: true });
  });
});

describe('validateGroupForm', () => {
  it('accepts a valid form', () => expect(validateGroupForm(valid())).toEqual([]));
  it('requires a name', () => expect(validateGroupForm({ ...valid(), name: '  ' })).toContain('nameRequired'));
  it('requires an option', () => expect(validateGroupForm({ ...valid(), options: [] })).toContain('optionRequired'));
  it('requires option names', () => {
    const f = valid();
    f.options[0].name = ' ';
    expect(validateGroupForm(f)).toContain('optionNameRequired');
  });
  it('checks max >= min for addons only', () => {
    expect(validateGroupForm({ ...valid(), minSelectable: 3, maxSelectable: 1 })).toContain('rangeInvalid');
    expect(validateGroupForm({ ...valid(), kind: 'variant', minSelectable: 3, maxSelectable: 1 })).toEqual([]);
  });
  it('requires price deltas to be non-negative integer cents', () => {
    for (const bad of [-1, 1.5]) {
      const f = valid();
      f.options[0].priceDelta = bad;
      expect(validateGroupForm(f)).toContain('priceInvalid');
    }
  });
});

describe('withToggledRef', () => {
  it('adds a missing id and removes a present one without mutating', () => {
    const refs = ['a'];
    expect(withToggledRef(refs, 'b')).toEqual(['a', 'b']);
    expect(withToggledRef(refs, 'a')).toEqual([]);
    expect(refs).toEqual(['a']);
  });
});

describe('groupFormFromLibrary', () => {
  it('round-trips a group through the form', () => {
    const g = group();
    const body = optionGroupBodyFromForm(groupFormFromLibrary(g));
    expect(body.minSelectable).toBe(0);
    expect(body.maxSelectable).toBe(2);
    expect(body.options.map((o) => o.id)).toEqual(['o1', 'o2']);
    expect(groupFormFromLibrary(g).options.map((o) => o.key)).toHaveLength(2);
  });

  // The backend reads a missing map as "no translations", so an edit that dropped it
  // would quietly erase the group's translated names.
  it('sends the group name translations back on an edit', () => {
    const body = optionGroupBodyFromForm(groupFormFromLibrary(group()));
    expect(body.nameTranslations).toEqual({ de: 'Getränke' });
  });
});

describe('libraryGroupsForPicker', () => {
  it('orders variants first, then addons, then by name', () => {
    const out = libraryGroupsForPicker([
      group({ id: '1', kind: 'addon', name: 'Sauces' }),
      group({ id: '2', kind: 'variant', name: 'Size' }),
      group({ id: '3', kind: 'addon', name: 'Drinks' }),
    ]);
    expect(out.map((g) => g.id)).toEqual(['2', '3', '1']);
    expect(out[0].optionCount).toBe(2);
  });
});
