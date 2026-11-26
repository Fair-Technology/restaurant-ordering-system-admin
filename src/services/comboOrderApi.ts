import { api } from './api';

// Combos are product records sharing the combos list tag (see combosApi.ts), so reordering
// invalidates that same list tag.
export const comboOrderApi = api.injectEndpoints({
  endpoints: (build) => ({
    setCategoryComboOrder: build.mutation<
      unknown,
      { shopId: string; categoryId: string; body: { productIds: string[] } }
    >({
      query: ({ shopId, categoryId, body }) => ({
        url: `/shops/${shopId}/categories/${categoryId}/combo-order`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Products' as const, id: `LIST-${shopId}` }],
    }),
  }),
  overrideExisting: true,
});

export const { useSetCategoryComboOrderMutation } = comboOrderApi;
