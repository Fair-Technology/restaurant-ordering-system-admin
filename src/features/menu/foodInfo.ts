import type { LocalizedLabel, SpiceLevel } from '../../services/api';

export interface FoodInfo {
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  taxClassId: string | null;
}

export const EMPTY_FOOD_INFO: FoodInfo = {
  allergenIds: null,
  additiveIds: null,
  dietaryTagIds: [],
  spiceLevel: null,
  prepMinutes: null,
  taxClassId: null,
};

export function foodInfoFromProduct(p: {
  allergenIds?: string[] | null;
  additiveIds?: string[] | null;
  dietaryTagIds?: string[];
  spiceLevel?: SpiceLevel | null;
  prepMinutes?: number | null;
  taxClassId?: string | null;
}): FoodInfo {
  return {
    allergenIds: Array.isArray(p.allergenIds) ? p.allergenIds : null,
    additiveIds: Array.isArray(p.additiveIds) ? p.additiveIds : null,
    dietaryTagIds: p.dietaryTagIds ?? [],
    spiceLevel: p.spiceLevel ?? null,
    prepMinutes: p.prepMinutes ?? null,
    taxClassId: p.taxClassId ?? null,
  };
}

/** Toggles `id` in `list`. Removing the last remaining id returns to undeclared (`null`), not `[]`. */
export function toggleId(list: string[] | null, id: string): string[] | null {
  const base = list ?? [];
  const next = base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
  return next.length === 0 ? null : next;
}

export function isFoodInfoDeclared(f: Pick<FoodInfo, 'allergenIds' | 'additiveIds'>): boolean {
  return Array.isArray(f.allergenIds) && Array.isArray(f.additiveIds);
}

export function effectiveTaxClassId(
  selectedCategoryIds: readonly string[],
  categories: ReadonlyArray<{ id?: string; taxClassId?: string | null }>,
  overrideTaxClassId: string | null,
): string | null {
  return (
    overrideTaxClassId ??
    (selectedCategoryIds.map((id) => categories.find((c) => c.id === id)).find((c) => c)?.taxClassId ?? null)
  );
}

export function labelFor(labels: LocalizedLabel, language: string): string {
  return language.startsWith('de') ? labels.de : labels.en;
}

export function formatRate(bp: number | null): string {
  return bp === null ? '—' : `${bp / 100}%`;
}
