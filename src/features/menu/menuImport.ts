import type { CreateProductRequestDto } from '../../services/api';

export interface MenuImportRow {
  name: string;
  description: string;
  price: number | null;
}

/** Photos are never imported: the server only accepts photos sent through the dish photo upload. */
export function importRowToCreateRequest(shopId: string, row: MenuImportRow): CreateProductRequestDto {
  return { shopId, name: row.name, description: row.description, price: Math.round((row.price ?? 0) * 100), categoryIds: [] };
}

export function parseMenuImport(text: string): MenuImportRow[] {
  const parsed = JSON.parse(text);
  if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
  return parsed.map((item: Record<string, unknown>, idx: number) => {
    if (typeof item.name !== 'string' || !item.name.trim())
      throw new Error(`Item ${idx + 1}: "name" is required`);
    if (typeof item.description !== 'string')
      throw new Error(`Item ${idx + 1}: "description" is required`);
    return {
      name: item.name,
      description: item.description,
      price: item.price == null ? null : Number(item.price),
    };
  });
}

/** 3 neutral sample dishes (starter, main, dessert) that round-trip through parseMenuImport. No image_url: photos are never imported. */
export const EXAMPLE_MENU_IMPORT_ITEMS = [
  { name: 'Garden Salad', description: 'Mixed greens, cherry tomatoes, cucumber and a light vinaigrette.', price: 7.5 },
  { name: 'Grilled Chicken with Rice', description: 'Herb-marinated chicken breast with steamed rice and seasonal vegetables.', price: 14.9 },
  { name: 'Chocolate Brownie', description: 'Warm chocolate brownie served with a scoop of vanilla ice cream.', price: 6.5 },
];

export function buildExampleMenuImportFile(): string {
  return JSON.stringify(EXAMPLE_MENU_IMPORT_ITEMS, null, 2);
}
