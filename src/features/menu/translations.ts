import type { MenuLanguage, TranslationMap } from '../../services/api';

export interface TranslatableGroup {
  id?: string;
  name?: string;
  nameTranslations?: TranslationMap;
  options?: Array<{ id?: string; name?: string; nameTranslations?: TranslationMap }>;
}

export interface TranslatableProduct {
  id?: string;
  name?: string;
  description?: string;
  nameTranslations?: TranslationMap;
  descriptionTranslations?: TranslationMap;
  variantGroups?: TranslatableGroup[];
  addonGroups?: TranslatableGroup[];
}

function isMissing(original: string | undefined, translations: TranslationMap | undefined, lang: MenuLanguage): boolean {
  if (!original || !original.trim()) return false;
  return !(translations?.[lang] ?? '').trim();
}

/** Counts every name/description across categories, products and their option groups whose translation into `lang` is missing. */
export function countMissingTranslations(
  products: readonly TranslatableProduct[],
  categories: ReadonlyArray<{ name?: string; nameTranslations?: TranslationMap }>,
  lang: MenuLanguage,
): number {
  let count = 0;

  for (const category of categories) {
    if (isMissing(category.name, category.nameTranslations, lang)) count++;
  }

  for (const product of products) {
    if (isMissing(product.name, product.nameTranslations, lang)) count++;
    if (isMissing(product.description, product.descriptionTranslations, lang)) count++;
    for (const group of [...(product.variantGroups ?? []), ...(product.addonGroups ?? [])]) {
      if (isMissing(group.name, group.nameTranslations, lang)) count++;
      for (const option of group.options ?? []) {
        if (isMissing(option.name, option.nameTranslations, lang)) count++;
      }
    }
  }

  return count;
}
