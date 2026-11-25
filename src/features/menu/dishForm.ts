import type { MenuLanguage, ProductDto, ShopOptionGroupDto, TranslationMap } from '../../services/api';
import type { AddonGroup, VariantGroup } from '../../pages/ProductWizardSteps';
import { EMPTY_FOOD_INFO, effectiveTaxClassId, foodInfoFromProduct, isFoodInfoDeclared, type FoodInfo } from './foodInfo';
import { optionGroupsFromProduct } from './optionFoodInfo';

export const DESCRIPTION_LIMIT = 160;

/** Everything the dish form edits, as plain values (the photo file lives beside it, not in it). */
export interface DishFormState {
  form: { name: string; description: string; price: number };
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  categoryIds: string[];
  foodInfo: FoodInfo;
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
  optionGroupRefs: string[];
  isAvailable: boolean;
}

export function dishFormStateFromProduct(product: ProductDto): DishFormState {
  return {
    form: { name: product.name ?? '', description: product.description ?? '', price: product.price ?? 0 },
    nameTranslations: product.nameTranslations ?? {},
    descriptionTranslations: product.descriptionTranslations ?? {},
    categoryIds: product.categories?.map((c) => c.id!).filter(Boolean) ?? [],
    foodInfo: foodInfoFromProduct(product),
    isAvailable: product.isAvailable !== false,
    optionGroupRefs: product.optionGroupRefs ?? [],
    ...optionGroupsFromProduct(product),
  };
}

export type DishSection = 'basics' | 'food' | 'options' | 'availability';
export const DISH_SECTIONS: readonly DishSection[] = ['basics', 'food', 'options', 'availability'];

export type NavTone = 'ok' | 'warn' | 'muted';

/** The translation of the dish's description into the shop's extra language is empty. False when the shop has one language. */
export function translationMissing(state: Pick<DishFormState, 'descriptionTranslations'>, extraLanguage: MenuLanguage | undefined): boolean {
  return extraLanguage !== undefined && (state.descriptionTranslations[extraLanguage] ?? '').trim() === '';
}

/** Which list-status pill an allergen/additive list shows: a count, an affirmed "none", or not confirmed yet. */
export type ListStatus = { kind: 'selected'; count: number } | { kind: 'none' } | { kind: 'unconfirmed' };

export function listStatus(ids: readonly string[] | null): ListStatus {
  if (ids === null) return { kind: 'unconfirmed' };
  return ids.length > 0 ? { kind: 'selected', count: ids.length } : { kind: 'none' };
}

/** Food info is complete when allergens AND additives are each confirmed (something picked, or "none" ticked). */
export function foodInfoComplete(f: Pick<FoodInfo, 'allergenIds' | 'additiveIds'>): boolean {
  return isFoodInfoDeclared(f);
}

export interface NavStatus {
  /** i18n key suffix under `dishForm.nav.` */
  key:
    | 'complete' | 'translationMissing' | 'confirmAllergens' | 'groups' | 'onMenu' | 'hidden'
    // Add mode only
    | 'requiredLeft' | 'confirmFood' | 'optional' | 'everywhere' | 'customised';
  tone: NavTone;
  /** Count for `groups` and `requiredLeft`; the language for `translationMissing`. */
  count?: number;
  language?: MenuLanguage;
}

/** The status line under each section label in the left nav. */
export function navStatus(
  section: DishSection,
  state: DishFormState,
  extraLanguage: MenuLanguage | undefined,
  attachedGroupCount: number,
): NavStatus {
  switch (section) {
    case 'basics':
      return translationMissing(state, extraLanguage)
        ? { key: 'translationMissing', tone: 'warn', language: extraLanguage }
        : { key: 'complete', tone: 'ok' };
    case 'food':
      return foodInfoComplete(state.foodInfo) ? { key: 'complete', tone: 'ok' } : { key: 'confirmAllergens', tone: 'warn' };
    case 'options':
      return { key: 'groups', tone: 'muted', count: attachedGroupCount };
    case 'availability':
      return state.isAvailable ? { key: 'onMenu', tone: 'muted' } : { key: 'hidden', tone: 'warn' };
  }
}

/** Groups attached to the dish: library groups by reference (dish order), plus the dish-only ones it still carries. */
export function attachedGroupCount(state: Pick<DishFormState, 'optionGroupRefs' | 'variantGroups' | 'addonGroups'>, library: readonly ShopOptionGroupDto[]): number {
  const known = state.optionGroupRefs.filter((id) => library.some((g) => g.id === id)).length;
  return known + state.variantGroups.length + state.addonGroups.length;
}

/** Splits a gross price (cents) into VAT and net for a rate in basis points. Net is rounded, VAT is the remainder, so they always add up. */
export function vatBreakdown(grossCents: number, rateBasisPoints: number): { vat: number; net: number } {
  const net = Math.round((grossCents * 10000) / (10000 + rateBasisPoints));
  return { net, vat: grossCents - net };
}

export interface GroupBadge {
  required: boolean;
  /** Smallest and largest number of options a customer can pick. */
  min: number;
  max: number;
}

/** Variants always make the customer choose exactly one; extras follow the group's own min/max. */
export function groupBadge(g: Pick<ShopOptionGroupDto, 'kind' | 'minSelectable' | 'maxSelectable'>): GroupBadge {
  if (g.kind === 'variant') return { required: true, min: 1, max: 1 };
  return { required: g.minSelectable > 0, min: g.minSelectable, max: g.maxSelectable };
}

/** Distinct, non-empty option categories of an extras group, in first-seen order ("Cheese, Protein"). */
export function groupCategories(g: Pick<ShopOptionGroupDto, 'options'>): string[] {
  return [...new Set(g.options.map((o) => o.category?.trim()).filter((c): c is string => !!c))];
}


// ── Add dish ───────────────────────────────────────────────────────────────────

/** A blank starting point for a new dish: allergens and additives unconfirmed (`null`), available everywhere. */
export function emptyDishFormState(): DishFormState {
  return {
    form: { name: '', description: '', price: 0 },
    nameTranslations: {},
    descriptionTranslations: {},
    categoryIds: [],
    foodInfo: { ...EMPTY_FOOD_INFO, dietaryTagIds: [], unavailableModes: [] },
    variantGroups: [],
    addonGroups: [],
    optionGroupRefs: [],
    isAvailable: true,
  };
}

export type AddRequiredId = 'photo' | 'name' | 'price' | 'category' | 'allergens' | 'additives';

export interface AddRequiredItem {
  id: AddRequiredId;
  done: boolean;
  /** The section where the item is fixed. */
  section: DishSection;
}

/** What a new dish needs before it can go on the menu, Basics first, then Food info (the order errors are shown in). */
export function addRequiredChecklist(
  value: Pick<DishFormState, 'form' | 'categoryIds' | 'foodInfo'>,
  photoMissing: boolean,
): AddRequiredItem[] {
  return [
    { id: 'photo', done: !photoMissing, section: 'basics' },
    { id: 'name', done: value.form.name.trim() !== '', section: 'basics' },
    { id: 'price', done: value.form.price > 0, section: 'basics' },
    { id: 'category', done: value.categoryIds.length > 0, section: 'basics' },
    { id: 'allergens', done: Array.isArray(value.foodInfo.allergenIds), section: 'food' },
    { id: 'additives', done: Array.isArray(value.foodInfo.additiveIds), section: 'food' },
  ];
}

export function addRequiredLeftCount(items: readonly Pick<AddRequiredItem, 'done'>[]): number {
  return items.filter((i) => !i.done).length;
}

/** The section of the first unfinished item, or null when everything is done. */
export function firstIncompleteAddSection(items: readonly Pick<AddRequiredItem, 'done' | 'section'>[]): DishSection | null {
  return items.find((i) => !i.done)?.section ?? null;
}

/** The status line under each section label in Add mode. */
export function addNavStatus(
  section: DishSection,
  state: DishFormState,
  items: readonly AddRequiredItem[],
  attachedGroupCount: number,
  tried: boolean,
): NavStatus {
  const warnOrMuted: NavTone = tried ? 'warn' : 'muted';
  switch (section) {
    case 'basics': {
      const left = addRequiredLeftCount(items.filter((i) => i.section === 'basics'));
      return left > 0 ? { key: 'requiredLeft', tone: warnOrMuted, count: left } : { key: 'complete', tone: 'ok' };
    }
    case 'food':
      return foodInfoComplete(state.foodInfo) ? { key: 'complete', tone: 'ok' } : { key: 'confirmFood', tone: warnOrMuted };
    case 'options':
      return attachedGroupCount > 0 ? { key: 'groups', tone: 'muted', count: attachedGroupCount } : { key: 'optional', tone: 'muted' };
    case 'availability': {
      const customised = state.foodInfo.unavailableModes.length > 0 || state.foodInfo.ageRestricted;
      return { key: customised ? 'customised' : 'everywhere', tone: 'muted' };
    }
  }
}

/** What "Start from a similar dish" copies: category, tax class and option groups; never allergens, additives, tags or spice. */
export type SimilarDishCopy = Pick<DishFormState, 'categoryIds' | 'optionGroupRefs' | 'variantGroups' | 'addonGroups'> & {
  foodInfo: Pick<FoodInfo, 'taxClassId'>;
};

export function copyFromSimilarDish(
  source: ProductDto,
  categoriesList: ReadonlyArray<{ id?: string; taxClassId?: string | null }>,
): SimilarDishCopy {
  const categoryIds = source.categories?.map((c) => c.id).filter(Boolean) ?? [];
  const groups = optionGroupsFromProduct(source);
  // Dish-only groups get fresh ids so the new dish does not share ids with the one it was copied from.
  const fresh = <O extends { id: string }>(options: O[]): O[] => options.map((o) => ({ ...o, id: crypto.randomUUID() }));
  return {
    categoryIds,
    optionGroupRefs: [...(source.optionGroupRefs ?? [])],
    variantGroups: groups.variantGroups.map((g) => ({ ...g, id: crypto.randomUUID(), options: fresh(g.options) })),
    addonGroups: groups.addonGroups.map((g) => ({ ...g, id: crypto.randomUUID(), options: fresh(g.options) })),
    foodInfo: { taxClassId: effectiveTaxClassId(categoryIds, categoriesList, source.taxClassId ?? null) },
  };
}

/** Lays a similar dish's copy over the form, leaving every other field (allergens, additives, name, price …) as it was. */
export function applySimilarDishCopy(state: DishFormState, copy: SimilarDishCopy): DishFormState {
  const { foodInfo, ...rest } = copy;
  return { ...state, ...rest, foodInfo: { ...state.foodInfo, taxClassId: foodInfo.taxClassId } };
}
