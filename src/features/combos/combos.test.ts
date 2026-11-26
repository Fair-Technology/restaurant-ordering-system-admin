import { describe, expect, it } from 'vitest';

import { cleanTranslations, emptyComboForm, comboFormToBody, comboPhotoMissing, comboPhotoUrl, formFromCombo, isComboImageRequiredToEnableError, type ComboForm } from './combos';

const form: ComboForm = {
  name: ' Pasta-Menü ',
  nameTranslations: {},
  description: '',
  descriptionTranslations: {},
  price: '12,00',
  categoryId: 'c1',
  bmfDrinkShare: false,
  isAvailable: true,
  groups: [
    { key: 'k1', name: 'Hauptgericht', nameTranslations: {}, productIds: ['p1', 'p3'] },
    { key: 'g-drink', id: 'g-drink', name: 'Getränk ', nameTranslations: { en: ' Drink ' }, productIds: ['p2'] },
  ],
};

describe('combo form', () => {
  it('turns the form into a request', () => {
    expect(comboFormToBody(form)).toEqual({
      name: 'Pasta-Menü',
      nameTranslations: {},
      description: '',
      descriptionTranslations: {},
      priceCents: 1200,
      categoryId: 'c1',
      bmfDrinkShare: false,
      isAvailable: true,
      groups: [
        { name: 'Hauptgericht', nameTranslations: {}, productIds: ['p1', 'p3'] },
        { id: 'g-drink', name: 'Getränk', nameTranslations: { en: 'Drink' }, productIds: ['p2'] },
      ],
    });
  });

  it('refuses a bad form', () => {
    const one = { key: 'k', name: 'A', nameTranslations: {}, productIds: ['p1'] };
    const cases: Array<[Partial<ComboForm>, string]> = [
      [{ name: '  ' }, 'name'],
      [{ price: '0' }, 'price'],
      [{ price: 'abc' }, 'price'],
      [{ price: '1000,01' }, 'price'],
      [{ categoryId: '' }, 'category'],
      [{ groups: [] }, 'groups'],
      [{ groups: [{ key: 'k', name: '', nameTranslations: {}, productIds: ['p1'] }] }, 'groups'],
      [{ groups: [{ key: 'k', name: 'A', nameTranslations: {}, productIds: [] }] }, 'groups'],
      [{ groups: [one, one, one, one, one, one] }, 'groups'],
      [{ nameTranslations: { en: 'x'.repeat(121) } }, 'translation'],
      [{ descriptionTranslations: { en: 'x'.repeat(2001) } }, 'translation'],
      [{ groups: [{ ...one, nameTranslations: { en: 'x'.repeat(61) } }] }, 'translation'],
    ];
    for (const [change, error] of cases) {
      expect(comboFormToBody({ ...form, ...change })).toEqual({ error });
    }
  });

  it('reads a saved combo back, without dishes that are gone', () => {
    expect(
      formFromCombo(
        {
          id: 'm1',
          name: 'Pasta-Menü',
          nameTranslations: { en: 'Pasta menu' },
          description: 'x',
          descriptionTranslations: {},
          images: [],
          priceCents: 1200,
          categoryId: 'c1',
          isAvailable: false,
          bmfDrinkShare: true,
          groups: [{ id: 'g1', name: 'A', nameTranslations: { en: 'Pick' }, productIds: ['p1', 'gone'] }],
          createdAt: 'x',
          updatedAt: 'x',
        },
        new Set(['p1']),
      ),
    ).toEqual({
      name: 'Pasta-Menü',
      nameTranslations: { en: 'Pasta menu' },
      description: 'x',
      descriptionTranslations: {},
      price: '12.00',
      categoryId: 'c1',
      bmfDrinkShare: true,
      isAvailable: false,
      groups: [{ key: 'g1', id: 'g1', name: 'A', nameTranslations: { en: 'Pick' }, productIds: ['p1'] }],
    });
  });

  it('sends translations trimmed and without empty entries (empty map clears them on the server)', () => {
    const body = comboFormToBody({
      ...form,
      nameTranslations: { en: ' Pasta menu ' },
      descriptionTranslations: { en: '   ' },
    });
    expect(body).toMatchObject({ nameTranslations: { en: 'Pasta menu' }, descriptionTranslations: {} });
    expect(cleanTranslations({ en: 'x'.repeat(61) }, 60)).toBeNull();
  });

  it('needs a photo: a picked file or one the combo already has', () => {
    const file = new Blob(['x']);
    expect(comboPhotoMissing(null, null)).toBe(true);
    expect(comboPhotoMissing(null, undefined)).toBe(true);
    expect(comboPhotoMissing(file, null)).toBe(false);
    expect(comboPhotoMissing(null, 'https://x/y.jpg')).toBe(false);
  });

  it('shows the last added photo', () => {
    expect(comboPhotoUrl({ images: [] })).toBeNull();
    expect(
      comboPhotoUrl({ images: [{ id: 'a', url: 'u1' }, { id: 'b', url: 'u2' }] }),
    ).toBe('u2');
  });
});

describe('client-side choice keys', () => {
  it('give every new choice its own key, and a saved one its server id', () => {
    const a = emptyComboForm();
    const b = emptyComboForm();
    expect(a.groups).toHaveLength(1);
    expect(a.groups[0].key).not.toBe(b.groups[0].key);
    expect(a.groups[0].id).toBeUndefined();
  });

  it('does not send the key, but keeps sending the server id', () => {
    const body = comboFormToBody(form) as { groups: Array<Record<string, unknown>> };
    expect(body.groups.every((g) => !('key' in g))).toBe(true);
    expect(body.groups[1].id).toBe('g-drink');
    expect('id' in body.groups[0]).toBe(false);
  });
});

describe('isComboImageRequiredToEnableError', () => {
  it('recognises the combo refusal code, and nothing else', () => {
    expect(isComboImageRequiredToEnableError({ status: 409, data: { error: 'x', code: 'COMBO_IMAGE_REQUIRED_TO_ENABLE' } })).toBe(true);
    expect(isComboImageRequiredToEnableError({ status: 409, data: { error: 'x', code: 'PRODUCT_IMAGE_REQUIRED' } })).toBe(false);
    expect(isComboImageRequiredToEnableError({ status: 409, data: { error: 'x', code: 'PRODUCT_IMAGE_REQUIRED_TO_ENABLE' } })).toBe(false);
    expect(isComboImageRequiredToEnableError({ status: 500 })).toBe(false);
    expect(isComboImageRequiredToEnableError(undefined)).toBe(false);
  });
});
