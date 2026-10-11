import { parseAmountToCents } from '../orders/refunds';
import type { TranslationMap } from '../../services/api';
import type { ComboBody, ComboDto } from '../../services/combosApi';

export interface ComboGroupForm {
  id?: string;
  name: string;
  nameTranslations: TranslationMap;
  productIds: string[];
}

export interface ComboForm {
  name: string;
  nameTranslations: TranslationMap;
  description: string;
  descriptionTranslations: TranslationMap;
  price: string;
  categoryId: string;
  bmfDrinkShare: boolean;
  isAvailable: boolean;
  groups: ComboGroupForm[];
}

export type ComboFormError = 'name' | 'price' | 'category' | 'groups' | 'translation';

export const EMPTY_COMBO_FORM: ComboForm = {
  name: '',
  nameTranslations: {},
  description: '',
  descriptionTranslations: {},
  price: '',
  categoryId: '',
  bmfDrinkShare: false,
  isAvailable: true,
  groups: [
    { name: '', nameTranslations: {}, productIds: [] },
    { name: '', nameTranslations: {}, productIds: [] },
  ],
};

export const MAX_NAME_TRANSLATION = 120;
export const MAX_DESCRIPTION_TRANSLATION = 2000;
export const MAX_GROUP_NAME_TRANSLATION = 60;

/** Trims every text and drops empty ones (the server stores nothing for them); null when a text is over the limit. */
export function cleanTranslations(map: TranslationMap, max: number): TranslationMap | null {
  const out: TranslationMap = {};
  for (const [lang, text] of Object.entries(map) as Array<[keyof TranslationMap, string | undefined]>) {
    const v = (text ?? '').trim();
    if (v === '') continue;
    if (v.length > max) return null;
    out[lang] = v;
  }
  return out;
}

/** A combo, like a dish, can only be saved with a photo: one it already has, or a freshly cropped one. */
export function comboPhotoMissing(pickedFile: Blob | null, existingImageUrl: string | null | undefined): boolean {
  return !pickedFile && !existingImageUrl;
}

export function comboFormToBody(f: ComboForm): ComboBody | { error: ComboFormError } {
  const name = f.name.trim();
  if (name === '' || name.length > 120) return { error: 'name' };
  const priceCents = parseAmountToCents(f.price);
  if (priceCents === null || priceCents < 1 || priceCents > 100000) return { error: 'price' };
  if (f.categoryId === '') return { error: 'category' };
  if (
    f.groups.length < 1 ||
    f.groups.length > 5 ||
    f.groups.some(
      (g) =>
        g.name.trim() === '' || g.name.trim().length > 60 || g.productIds.length < 1 || g.productIds.length > 50,
    )
  ) {
    return { error: 'groups' };
  }
  const nameTranslations = cleanTranslations(f.nameTranslations, MAX_NAME_TRANSLATION);
  const descriptionTranslations = cleanTranslations(f.descriptionTranslations, MAX_DESCRIPTION_TRANSLATION);
  const groupTranslations = f.groups.map((g) => cleanTranslations(g.nameTranslations, MAX_GROUP_NAME_TRANSLATION));
  if (!nameTranslations || !descriptionTranslations || groupTranslations.some((m) => m === null)) {
    return { error: 'translation' };
  }
  return {
    name,
    nameTranslations,
    description: f.description.trim(),
    descriptionTranslations,
    priceCents,
    categoryId: f.categoryId,
    bmfDrinkShare: f.bmfDrinkShare,
    isAvailable: f.isAvailable,
    groups: f.groups.map((g, i) => ({
      ...(g.id ? { id: g.id } : {}),
      name: g.name.trim(),
      nameTranslations: groupTranslations[i] as TranslationMap,
      productIds: g.productIds,
    })),
  };
}

// dishes that were deleted since the combo was saved drop out of the form
export function formFromCombo(c: ComboDto, dishIds: ReadonlySet<string>): ComboForm {
  return {
    name: c.name,
    nameTranslations: c.nameTranslations ?? {},
    description: c.description,
    descriptionTranslations: c.descriptionTranslations ?? {},
    price: (c.priceCents / 100).toFixed(2),
    categoryId: c.categoryId ?? '',
    bmfDrinkShare: c.bmfDrinkShare,
    isAvailable: c.isAvailable,
    groups: c.groups.map((g) => ({
      id: g.id,
      name: g.name,
      nameTranslations: g.nameTranslations ?? {},
      productIds: g.productIds.filter((id) => dishIds.has(id)),
    })),
  };
}

/** The combo's photo URL as the dish wizard picks it: the last added one. */
export function comboPhotoUrl(c: Pick<ComboDto, 'images'>): string | null {
  return c.images?.length ? c.images[c.images.length - 1].url : null;
}
