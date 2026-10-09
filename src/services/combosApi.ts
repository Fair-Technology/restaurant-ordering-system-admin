import { api } from './api';

export interface ComboGroupDto {
  id: string;
  name: string;
  productIds: string[];
}

export interface ComboDto {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  categoryId: string | null;
  isAvailable: boolean;
  bmfDrinkShare: boolean;
  groups: ComboGroupDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ComboBody {
  name: string;
  description: string;
  priceCents: number;
  categoryId: string;
  bmfDrinkShare: boolean;
  isAvailable: boolean;
  groups: Array<{ id?: string; name: string; productIds: string[] }>;
}

// Combos are product records on the server, so they share the shop's product list tag: deleting a combo
// (the ordinary deleteProduct mutation) and saving a dish both refresh the combo list too.
const listTag = (shopId: string) => [{ type: 'Products' as const, id: `LIST-${shopId}` }];

export const combosApi = api.injectEndpoints({
  endpoints: (build) => ({
    getCombos: build.query<ComboDto[], { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/combos` }),
      providesTags: (_r, _e, { shopId }) => listTag(shopId),
    }),
    createCombo: build.mutation<ComboDto, { shopId: string; body: ComboBody }>({
      query: ({ shopId, body }) => ({ url: `/shops/${shopId}/combos`, method: 'POST', body }),
      invalidatesTags: (_r, _e, { shopId }) => listTag(shopId),
    }),
    updateCombo: build.mutation<ComboDto, { shopId: string; comboId: string; body: ComboBody }>({
      query: ({ shopId, comboId, body }) => ({ url: `/shops/${shopId}/combos/${comboId}`, method: 'PUT', body }),
      invalidatesTags: (_r, _e, { shopId }) => listTag(shopId),
    }),
  }),
});

export const { useGetCombosQuery, useCreateComboMutation, useUpdateComboMutation } = combosApi;
