import { describe, expect, it } from 'vitest';

import { effectiveTaxClassId, formatRate, isFoodInfoDeclared, foodInfoFromProduct, labelFor, taxClassOptionLabel, toggleId, toggleMode } from './foodInfo';

describe('toggleId', () => {
  it('adds to a null list', () => {
    expect(toggleId(null, 'milk')).toEqual(['milk']);
  });

  it('removing the last id returns to undeclared, not an empty list', () => {
    expect(toggleId(['milk'], 'milk')).toBeNull();
  });

  it('adds to an existing list', () => {
    expect(toggleId(['milk'], 'eggs')).toEqual(['milk', 'eggs']);
  });
});

describe('isFoodInfoDeclared', () => {
  it('empty lists count as declared', () => {
    expect(isFoodInfoDeclared({ allergenIds: [], additiveIds: [] })).toBe(true);
  });

  it('null is undeclared', () => {
    expect(isFoodInfoDeclared({ allergenIds: null, additiveIds: [] })).toBe(false);
  });
});

describe('effectiveTaxClassId', () => {
  const categories = [
    { id: 'c1', taxClassId: 'food' },
    { id: 'c2', taxClassId: 'beverage' },
  ];

  it('takes the first selected category with a class', () => {
    expect(effectiveTaxClassId(['c2', 'c1'], categories, null)).toBe('beverage');
  });

  it('an override wins over the category', () => {
    expect(effectiveTaxClassId(['c2', 'c1'], categories, 'food')).toBe('food');
  });

  it('no categories and no override is null', () => {
    expect(effectiveTaxClassId([], [], null)).toBeNull();
  });
});

describe('labelFor', () => {
  const labels = { de: 'Milch', en: 'Milk' };

  it('a German locale picks the German label', () => {
    expect(labelFor(labels, 'de-DE')).toBe('Milch');
  });

  it('any other locale picks the English label', () => {
    expect(labelFor(labels, 'en')).toBe('Milk');
  });
});

describe('formatRate', () => {
  it('formats basis points as a percentage', () => {
    expect(formatRate(700)).toBe('7%');
  });

  it('handles fractional percentages', () => {
    expect(formatRate(1950)).toBe('19.5%');
  });

  it('an unset rate is a dash', () => {
    expect(formatRate(null)).toBe('—');
  });
});

describe('taxClassOptionLabel', () => {
  const refs = {
    taxRatesUniformAcrossModes: true,
    currentTaxRates: [
      { taxClassId: 'food', rates: { collection: 700, delivery: 700, dine_in: 700 } },
      { taxClassId: 'beverage', rates: { collection: 1900, delivery: 1900, dine_in: 1900 } },
      { taxClassId: 'unset', rates: { collection: null, delivery: null, dine_in: null } },
    ],
  };

  it('German food shows 7 %', () => {
    expect(taxClassOptionLabel('Speisen', 'food', refs, 'de')).toBe('Speisen — 7 %');
  });

  it('English beverage shows 19%', () => {
    expect(taxClassOptionLabel('Beverages', 'beverage', refs, 'en')).toBe('Beverages — 19%');
  });

  it('non-uniform rates show the name only', () => {
    expect(taxClassOptionLabel('Speisen', 'food', { ...refs, taxRatesUniformAcrossModes: false }, 'de')).toBe('Speisen');
  });

  it('missing rate shows the name only', () => {
    expect(taxClassOptionLabel('Other', 'unset', refs, 'en')).toBe('Other');
    expect(taxClassOptionLabel('Other', 'nope', refs, 'en')).toBe('Other');
    expect(taxClassOptionLabel('Other', 'food', undefined, 'en')).toBe('Other');
  });
});

describe('toggleMode', () => {
  it('toggles the modes a dish is not offered for', () => {
    expect(toggleMode([], 'delivery')).toEqual(['delivery']);
    expect(toggleMode(['delivery'], 'collection')).toEqual(['collection', 'delivery']);
    expect(toggleMode(['collection', 'delivery'], 'delivery')).toEqual(['collection']);
    expect(foodInfoFromProduct({}).unavailableModes).toEqual([]);
    expect(foodInfoFromProduct({ unavailableModes: ['dine_in'] }).unavailableModes).toEqual(['dine_in']);
  });
});
