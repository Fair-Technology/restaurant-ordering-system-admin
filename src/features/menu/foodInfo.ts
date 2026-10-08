import type { FulfilmentModeKey, LocalizedLabel, ReferenceListsResponse, SpiceLevel } from '../../services/api';

export interface FoodInfo {
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  taxClassId: string | null;
  unavailableModes: FulfilmentModeKey[];
}

export const EMPTY_FOOD_INFO: FoodInfo = {
  allergenIds: null,
  additiveIds: null,
  dietaryTagIds: [],
  spiceLevel: null,
  prepMinutes: null,
  taxClassId: null,
  unavailableModes: [],
};

export function foodInfoFromProduct(p: {
  allergenIds?: string[] | null;
  additiveIds?: string[] | null;
  dietaryTagIds?: string[];
  spiceLevel?: SpiceLevel | null;
  prepMinutes?: number | null;
  taxClassId?: string | null;
  unavailableModes?: FulfilmentModeKey[];
}): FoodInfo {
  return {
    allergenIds: Array.isArray(p.allergenIds) ? p.allergenIds : null,
    additiveIds: Array.isArray(p.additiveIds) ? p.additiveIds : null,
    dietaryTagIds: p.dietaryTagIds ?? [],
    spiceLevel: p.spiceLevel ?? null,
    prepMinutes: p.prepMinutes ?? null,
    taxClassId: p.taxClassId ?? null,
    unavailableModes: p.unavailableModes ?? [],
  };
}

export const MODE_ORDER: readonly FulfilmentModeKey[] = ['collection', 'delivery', 'dine_in'];

/** Toggles a way of ordering in the list of modes a dish is hidden for, keeping the fixed order. */
export function toggleMode(list: readonly FulfilmentModeKey[], mode: FulfilmentModeKey): FulfilmentModeKey[] {
  const next = list.includes(mode) ? list.filter((m) => m !== mode) : [...list, mode];
  return MODE_ORDER.filter((m) => next.includes(m));
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

/** Tax option name with its current collection rate beside it ("Speisen — 7 %"); the bare name when the rate isn't a single known number. */
export function taxClassOptionLabel(
  name: string,
  taxClassId: string,
  refs: Pick<ReferenceListsResponse, 'currentTaxRates' | 'taxRatesUniformAcrossModes'> | undefined,
  language: string,
): string {
  if (!refs?.taxRatesUniformAcrossModes) return name;
  const rate = refs.currentTaxRates.find((r) => r.taxClassId === taxClassId)?.rates.collection;
  if (typeof rate !== 'number') return name;
  const de = language.startsWith('de');
  const percent = new Intl.NumberFormat(de ? 'de-DE' : 'en-GB', { maximumFractionDigits: 2 }).format(rate / 100);
  return `${name} — ${percent}${de ? ' %' : '%'}`;
}
