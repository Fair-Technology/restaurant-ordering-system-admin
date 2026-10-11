import { describe, expect, it } from 'vitest';

import { cleanTranslations, comboFormToBody, comboPhotoMissing, comboPhotoUrl, formFromCombo, type ComboForm } from './combos';

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
    { name: 'Hauptgericht', nameTranslations: {}, productIds: ['p1', 'p3'] },
    { id: 'g-drink', name: 'Getränk ', nameTranslations: { en: ' Drink ' }, productIds: ['p2'] },
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
    const one = { name: 'A', nameTranslations: {}, productIds: ['p1'] };
    const cases: Array<[Partial<ComboForm>, string]> = [
      [{ name: '  ' }, 'name'],
      [{ price: '0' }, 'price'],
      [{ price: 'abc' }, 'price'],
      [{ price: '1000,01' }, 'price'],
      [{ categoryId: '' }, 'category'],
      [{ groups: [] }, 'groups'],
      [{ groups: [{ name: '', nameTranslations: {}, productIds: ['p1'] }] }, 'groups'],
      [{ groups: [{ name: 'A', nameTranslations: {}, productIds: [] }] }, 'groups'],
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
      groups: [{ id: 'g1', name: 'A', nameTranslations: { en: 'Pick' }, productIds: ['p1'] }],
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
