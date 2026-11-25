import { api } from './api';

// Overrides the generated endpoint: its swagger tag is "Categories", which does not refresh the
// dish list. The generated getProductsByShop provides the bare "Products" tag (no id), so the
// matching invalidation is the bare tag too — an id-ed tag would not match it.
export const dishOrderApi = api.injectEndpoints({
  endpoints: (build) => ({
    setCategoryDishOrder: build.mutation<
      { categoryId: string; products: { id: string; name: string }[] },
      { shopId: string; categoryId: string; body: { productIds: string[] } }
    >({
      query: ({ shopId, categoryId, body }) => ({
        url: `/shops/${shopId}/categories/${categoryId}/dish-order`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Products'],
    }),
  }),
  overrideExisting: true,
});

export const { useSetCategoryDishOrderMutation } = dishOrderApi;
