import type { CreateProductRequest } from '../../services/api';

export interface MenuImportRow {
  name: string;
  description: string;
  price: number | null;
}

/** Photos are never imported: the server only accepts photos sent through the dish photo upload. */
export function importRowToCreateRequest(shopId: string, row: MenuImportRow): CreateProductRequest {
  return { shopId, name: row.name, description: row.description, price: Math.round((row.price ?? 0) * 100), categoryIds: [] };
}
