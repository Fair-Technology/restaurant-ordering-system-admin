import { describe, expect, it } from 'vitest';

import { comboFormToBody, formFromCombo, type ComboForm } from './combos';

const form: ComboForm = {
  name: ' Pasta-Menü ',
  description: '',
  price: '12,00',
  categoryId: 'c1',
  bmfDrinkShare: false,
  isAvailable: true,
  groups: [
    { name: 'Hauptgericht', productIds: ['p1', 'p3'] },
    { id: 'g-drink', name: 'Getränk ', productIds: ['p2'] },
  ],
};

describe('combo form', () => {
  it('turns the form into a request', () => {
    expect(comboFormToBody(form)).toEqual({
      name: 'Pasta-Menü',
      description: '',
      priceCents: 1200,
      categoryId: 'c1',
      bmfDrinkShare: false,
      isAvailable: true,
      groups: [
        { name: 'Hauptgericht', productIds: ['p1', 'p3'] },
        { id: 'g-drink', name: 'Getränk', productIds: ['p2'] },
      ],
    });
  });

  it('refuses a bad form', () => {
    const one = { name: 'A', productIds: ['p1'] };
    const cases: Array<[Partial<ComboForm>, string]> = [
      [{ name: '  ' }, 'name'],
      [{ price: '0' }, 'price'],
      [{ price: 'abc' }, 'price'],
      [{ price: '1000,01' }, 'price'],
      [{ categoryId: '' }, 'category'],
      [{ groups: [] }, 'groups'],
      [{ groups: [{ name: '', productIds: ['p1'] }] }, 'groups'],
      [{ groups: [{ name: 'A', productIds: [] }] }, 'groups'],
      [{ groups: [one, one, one, one, one, one] }, 'groups'],
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
          description: 'x',
          priceCents: 1200,
          categoryId: 'c1',
          isAvailable: false,
          bmfDrinkShare: true,
          groups: [{ id: 'g1', name: 'A', productIds: ['p1', 'gone'] }],
          createdAt: 'x',
          updatedAt: 'x',
        },
        new Set(['p1']),
      ),
    ).toEqual({
      name: 'Pasta-Menü',
      description: 'x',
      price: '12.00',
      categoryId: 'c1',
      bmfDrinkShare: true,
      isAvailable: false,
      groups: [{ id: 'g1', name: 'A', productIds: ['p1'] }],
    });
  });
});
