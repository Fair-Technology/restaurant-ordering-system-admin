import { arrayMove } from '@dnd-kit/sortable';
import type { MenuLanguage, ProductDto } from '../../services/api';
import type { ComboDto } from '../../services/combosApi';
import { comboPhotoUrl, type ComboForm, type ComboGroupForm } from './combos';

export const MAX_GROUPS = 5;
export const NO_CATEGORY = '—';

export type ComboSection = 'basics' | 'choices' | 'tax' | 'availability';
export const COMBO_SECTIONS: readonly ComboSection[] = ['basics', 'choices', 'tax', 'availability'];

export type ComboNavTone = 'ok' | 'warn' | 'muted';
export interface ComboNavStatus {
  /** i18n key suffix under `combos.nav.` */
  key: 'photoMissing' | 'notFinished' | 'complete' | 'choices' | 'addChoice' | 'bmf' | 'split' | 'onMenu' | 'off';
  tone: ComboNavTone;
  count?: number;
}

/** The status line under each section label in the editor's left nav. */
export function comboNavStatus(
  section: ComboSection,
  form: ComboForm,
  opts: { photoMissing: boolean; isGermany: boolean },
): ComboNavStatus {
  switch (section) {
    case 'basics':
      if (opts.photoMissing) return { key: 'photoMissing', tone: 'warn' };
      if (form.name.trim() === '' || form.price.trim() === '' || form.categoryId === '') return { key: 'notFinished', tone: 'muted' };
      return { key: 'complete', tone: 'ok' };
    case 'choices': {
      const filled = form.groups.filter((g) => g.productIds.length > 0).length;
      return filled > 0 ? { key: 'choices', tone: 'ok', count: filled } : { key: 'addChoice', tone: 'warn' };
    }
    case 'tax':
      return opts.isGermany && form.bmfDrinkShare ? { key: 'bmf', tone: 'muted' } : { key: 'split', tone: 'muted' };
    case 'availability':
      return form.isAvailable ? { key: 'onMenu', tone: 'ok' } : { key: 'off', tone: 'muted' };
  }
}

/** Moves the choice with key `activeKey` to the place of the one with key `overKey`; the array order is the order saved. */
export function reorderGroups(groups: ComboGroupForm[], activeKey: string, overKey: string): ComboGroupForm[] {
  const from = groups.findIndex((g) => g.key === activeKey);
  const to = groups.findIndex((g) => g.key === overKey);
  if (from < 0 || to < 0 || from === to) return groups;
  return arrayMove(groups, from, to);
}

/** True when the form differs from the saved one, or a new photo is waiting to be uploaded. */
export function comboFormDirty(saved: ComboForm, edit: ComboForm, imageFile: File | null): boolean {
  return imageFile !== null || JSON.stringify(saved) !== JSON.stringify(edit);
}

export interface CategoryDishes {
  name: string;
  dishes: ProductDto[];
}

/** Dishes under the name of their first category, in first-seen order, so a whole category can be ticked at once. */
export function dishesByCategory(products: ProductDto[]): CategoryDishes[] {
  const map = new Map<string, ProductDto[]>();
  for (const p of products) {
    const name = p.categories?.[0]?.name ?? NO_CATEGORY;
    map.set(name, [...(map.get(name) ?? []), p]);
  }
  return [...map.entries()].map(([name, dishes]) => ({ name, dishes }));
}

/** Ticks (on) or unticks (off) the given dish ids. A pure bulk edit of the list: nothing stays linked to a category. */
export function toggleDishIds(current: string[], ids: string[], on: boolean): string[] {
  return on ? [...current, ...ids.filter((id) => !current.includes(id))] : current.filter((id) => !ids.includes(id));
}

export type ChoiceChip =
  | { kind: 'category'; name: string; ids: string[] }
  | { kind: 'dish'; id: string; name: string };

/**
 * What a choice shows as chips: every dish ticked, except that a category whose dishes are ALL currently
 * ticked (two or more) collapses into one "All current <category> dishes" chip. It is only a display of
 * the ticked ids; dishes added to the category later are not in the choice.
 */
export function choiceChips(productIds: string[], categories: CategoryDishes[]): ChoiceChip[] {
  const chips: ChoiceChip[] = [];
  const covered = new Set<string>();
  for (const c of categories) {
    const ids = c.dishes.map((d) => d.id!);
    if (ids.length >= 2 && ids.every((id) => productIds.includes(id))) {
      chips.push({ kind: 'category', name: c.name, ids });
      ids.forEach((id) => covered.add(id));
    }
  }
  const nameOf = new Map(categories.flatMap((c) => c.dishes.map((d) => [d.id!, d.name ?? ''] as const)));
  for (const id of productIds) {
    if (!covered.has(id) && nameOf.has(id)) chips.push({ kind: 'dish', id, name: nameOf.get(id)! });
  }
  return chips;
}

/** True when any non-empty original text (name, description, a choice's name) has no text in the extra language. */
export function comboTranslationMissing(form: ComboForm, extraLanguage: MenuLanguage | undefined): boolean {
  if (extraLanguage === undefined) return false;
  const missing = (orig: string, map: Partial<Record<MenuLanguage, string>>) => orig.trim() !== '' && (map[extraLanguage] ?? '').trim() === '';
  return (
    missing(form.name, form.nameTranslations) ||
    missing(form.description, form.descriptionTranslations) ||
    form.groups.some((g) => missing(g.name, g.nameTranslations))
  );
}

export type ComboFilter = 'all' | 'onMenu' | 'off' | 'photoMissing';
export const COMBO_FILTERS: ComboFilter[] = ['all', 'onMenu', 'off', 'photoMissing'];

export function comboMatchesFilter(c: ComboDto, f: ComboFilter): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'onMenu':
      return c.isAvailable;
    case 'off':
      return !c.isAvailable;
    case 'photoMissing':
      return comboPhotoUrl(c) === null;
  }
}
