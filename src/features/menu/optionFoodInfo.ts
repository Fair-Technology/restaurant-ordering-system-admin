import type { ProductResponse, TranslationMap } from '../../services/api';
import type { AddonGroup, VariantGroup, VariantOption } from '../../pages/ProductWizardSteps';

/** An option as the API returns it; every field is untrusted. */
export interface ApiOption {
  id?: string; name?: string; nameTranslations?: TranslationMap; priceDelta?: number; isAvailable?: boolean;
  allergenIds?: string[] | null; additiveIds?: string[] | null;
}

/** Options saved before option allergens existed have no lists; they read as "adds nothing". */
export function optionFromApi(o: ApiOption): VariantOption {
  return {
    id: o.id ?? crypto.randomUUID(),
    name: o.name ?? '',
    nameTranslations: o.nameTranslations ?? {},
    priceDelta: o.priceDelta ?? 0,
    isAvailable: o.isAvailable ?? true,
    allergenIds: Array.isArray(o.allergenIds) ? o.allergenIds : [],
    additiveIds: Array.isArray(o.additiveIds) ? o.additiveIds : [],
  };
}

export function optionGroupsFromProduct(
  p: Pick<ProductResponse, 'variantGroups' | 'addonGroups'>,
): { variantGroups: VariantGroup[]; addonGroups: AddonGroup[] } {
  return {
    variantGroups: (p.variantGroups ?? []).map((g) => ({
      id: g.id ?? crypto.randomUUID(),
      name: g.name ?? '',
      nameTranslations: g.nameTranslations ?? {},
      options: (g.options ?? []).map(optionFromApi),
    })),
    addonGroups: (p.addonGroups ?? []).map((g) => ({
      id: g.id ?? crypto.randomUUID(),
      name: g.name ?? '',
      nameTranslations: g.nameTranslations ?? {},
      minSelectable: g.minSelectable ?? 0,
      maxSelectable: g.maxSelectable ?? 1,
      options: (g.options ?? []).map(optionFromApi),
    })),
  };
}

/** Unlike the dish picker, emptying the list stays `[]` — an option has no "undeclared" state. */
export function toggleOptionId(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export function optionDeclarationCount(o: { allergenIds?: readonly string[]; additiveIds?: readonly string[] }): number {
  return (o.allergenIds?.length ?? 0) + (o.additiveIds?.length ?? 0);
}
