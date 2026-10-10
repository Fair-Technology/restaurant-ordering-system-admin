import { describe, expect, it } from 'vitest';

import { countMissingTranslations, menuLanguagesOf } from './translations';

describe('countMissingTranslations', () => {
  it('counts every missing name, description, group and option, skipping empty originals', () => {
    const products = [
      {
        name: 'Pizza',
        description: 'Lecker',
        nameTranslations: { en: 'Pizza' },
        variantGroups: [
          {
            name: 'Größe',
            options: [
              { name: 'Klein', nameTranslations: { en: 'Small' } },
              { name: 'Groß' },
            ],
          },
        ],
      },
    ];
    const categories = [{ name: 'Pizzen' }, { name: '', nameTranslations: {} }];

    expect(countMissingTranslations(products, categories, 'en')).toBe(4);
  });

  it('nothing to translate is zero', () => {
    expect(countMissingTranslations([], [], 'en')).toBe(0);
  });
});

describe('menuLanguagesOf', () => {
  it('uses the saved languages when there are any', () => {
    expect(menuLanguagesOf({ menuLanguages: ['en', 'de'], countryCode: 'DE' })).toEqual(['en', 'de']);
  });

  it('with none saved, falls back by country like the backend', () => {
    expect(menuLanguagesOf({ countryCode: 'DE' })).toEqual(['de']);
    expect(menuLanguagesOf({ menuLanguages: [], countryCode: 'at' })).toEqual(['de']);
    expect(menuLanguagesOf({ countryCode: 'AU' })).toEqual(['en']);
    expect(menuLanguagesOf({})).toEqual(['en']);
  });
});
