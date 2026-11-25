import type {
  ShopOptionGroupDto,
  ShopOptionGroupOptionInputDto,
  TranslationMap,
} from '../../services/api';

export type OptionGroupKind = 'variant' | 'addon';

export interface OptionGroupFormOption {
  /** UI row id, so rows can be reordered or removed safely */
  key: string;
  /** Persisted option id; present only for options that already exist */
  id?: string;
  name: string;
  /** Cents */
  priceDelta: number;
  isAvailable: boolean;
  nameTranslations?: TranslationMap;
  allergenIds?: string[];
  additiveIds?: string[];
  category?: string;
}

export interface OptionGroupForm {
  kind: OptionGroupKind;
  name: string;
  /** Kept only so an edit round-trips the translated names it already has. */
  nameTranslations?: TranslationMap;
  minSelectable: number;
  maxSelectable: number;
  options: OptionGroupFormOption[];
}

const blankOption = (): OptionGroupFormOption => ({
  key: crypto.randomUUID(),
  name: '',
  priceDelta: 0,
  isAvailable: true,
});

export function emptyGroupForm(kind: OptionGroupKind = 'addon'): OptionGroupForm {
  return { kind, name: '', minSelectable: 0, maxSelectable: 1, options: [blankOption()] };
}

export function newOptionRow(): OptionGroupFormOption {
  return blankOption();
}

export function groupFormFromLibrary(g: ShopOptionGroupDto): OptionGroupForm {
  return {
    kind: g.kind,
    name: g.name,
    ...(Object.keys(g.nameTranslations ?? {}).length > 0 ? { nameTranslations: g.nameTranslations } : {}),
    minSelectable: g.minSelectable,
    maxSelectable: g.maxSelectable,
    options: g.options.map((o) => ({
      key: crypto.randomUUID(),
      id: o.id,
      name: o.name,
      priceDelta: o.priceDelta,
      isAvailable: o.isAvailable,
      ...(o.nameTranslations ? { nameTranslations: o.nameTranslations } : {}),
      ...(o.allergenIds ? { allergenIds: o.allergenIds } : {}),
      ...(o.additiveIds ? { additiveIds: o.additiveIds } : {}),
      ...(o.category ? { category: o.category } : {}),
    })),
  };
}

export function optionGroupBodyFromForm(form: OptionGroupForm): {
  name: string;
  nameTranslations?: TranslationMap;
  minSelectable?: number;
  maxSelectable?: number;
  options: ShopOptionGroupOptionInputDto[];
} {
  return {
    name: form.name.trim(),
    // Sent back on every edit: the backend treats a missing map as "no translations",
    // so dropping it here would silently wipe a group's translated names.
    ...(Object.keys(form.nameTranslations ?? {}).length > 0 ? { nameTranslations: form.nameTranslations } : {}),
    ...(form.kind === 'addon' ? { minSelectable: form.minSelectable, maxSelectable: form.maxSelectable } : {}),
    options: form.options.map((o) => ({
      ...(o.id ? { id: o.id } : {}),
      name: o.name.trim(),
      priceDelta: o.priceDelta,
      isAvailable: o.isAvailable ?? true,
      ...(o.nameTranslations ? { nameTranslations: o.nameTranslations } : {}),
      ...(o.allergenIds ? { allergenIds: o.allergenIds } : {}),
      ...(o.additiveIds ? { additiveIds: o.additiveIds } : {}),
      // null clears a category the owner just emptied; the backend keeps it when the field is omitted
      category: o.category?.trim() || null,
    })),
  };
}

/** i18n key suffixes (under `optionGroups.`) for everything wrong with the form. */
export function validateGroupForm(form: OptionGroupForm): string[] {
  const errors: string[] = [];
  if (form.name.trim() === '') errors.push('nameRequired');
  if (form.options.length === 0) errors.push('optionRequired');
  if (form.options.some((o) => o.name.trim() === '')) errors.push('optionNameRequired');
  if (
    form.kind === 'addon' &&
    (!Number.isInteger(form.minSelectable) ||
      !Number.isInteger(form.maxSelectable) ||
      form.minSelectable < 0 ||
      form.maxSelectable < form.minSelectable)
  ) {
    errors.push('rangeInvalid');
  }
  if (form.options.some((o) => !Number.isInteger(o.priceDelta) || o.priceDelta < 0)) errors.push('priceInvalid');
  return errors;
}

export function withToggledRef(refs: readonly string[], id: string): string[] {
  return refs.includes(id) ? refs.filter((r) => r !== id) : [...refs, id];
}

export function libraryGroupsForPicker(
  groups: ShopOptionGroupDto[],
): Array<{ id: string; kind: OptionGroupKind; name: string; optionCount: number }> {
  const rank = (k: OptionGroupKind) => (k === 'variant' ? 0 : 1);
  return groups
    .map((g) => ({ id: g.id, kind: g.kind, name: g.name, optionCount: g.options.length }))
    .sort((a, b) => rank(a.kind) - rank(b.kind) || a.name.localeCompare(b.name));
}
