import { describe, expect, it } from 'vitest';

import { countMissingTranslations } from './translations';

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
