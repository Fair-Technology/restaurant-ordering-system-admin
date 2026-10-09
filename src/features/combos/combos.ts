import { parseAmountToCents } from '../orders/refunds';
import type { ComboBody, ComboDto } from '../../services/combosApi';

export interface ComboGroupForm {
  id?: string;
  name: string;
  productIds: string[];
}

export interface ComboForm {
  name: string;
  description: string;
  price: string;
  categoryId: string;
  bmfDrinkShare: boolean;
  isAvailable: boolean;
  groups: ComboGroupForm[];
}

export type ComboFormError = 'name' | 'price' | 'category' | 'groups';

export const EMPTY_COMBO_FORM: ComboForm = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  bmfDrinkShare: false,
  isAvailable: true,
  groups: [
    { name: '', productIds: [] },
    { name: '', productIds: [] },
  ],
};

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
  return {
    name,
    description: f.description.trim(),
    priceCents,
    categoryId: f.categoryId,
    bmfDrinkShare: f.bmfDrinkShare,
    isAvailable: f.isAvailable,
    groups: f.groups.map((g) => ({ ...(g.id ? { id: g.id } : {}), name: g.name.trim(), productIds: g.productIds })),
  };
}

// dishes that were deleted since the combo was saved drop out of the form
export function formFromCombo(c: ComboDto, dishIds: ReadonlySet<string>): ComboForm {
  return {
    name: c.name,
    description: c.description,
    price: (c.priceCents / 100).toFixed(2),
    categoryId: c.categoryId ?? '',
    bmfDrinkShare: c.bmfDrinkShare,
    isAvailable: c.isAvailable,
    groups: c.groups.map((g) => ({ id: g.id, name: g.name, productIds: g.productIds.filter((id) => dishIds.has(id)) })),
  };
}
