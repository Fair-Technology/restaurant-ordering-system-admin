import { api } from './api';

/** `getGoLiveStatus` provides bare "Shops" (id-less), but these generated mutations only
 * invalidate their own resource tag, so the go-live checklist and the sidebar badge stay
 * stale after adding/editing/removing a dish, its photo, or a category, until something
 * else (a reload, or the sidebar's 30s poll) catches up. Kept outside the generated api.ts. */
api.enhanceEndpoints({
  endpoints: {
    createProduct: { invalidatesTags: ['Products', 'Shops'] },
    updateProduct: { invalidatesTags: ['Products', 'Shops'] },
    deleteProduct: { invalidatesTags: ['Products', 'Shops'] },
    updateProductAvailability: { invalidatesTags: ['Products', 'Shops'] },
    addProductImage: { invalidatesTags: ['Product Images', 'Shops'] },
    createCategory: { invalidatesTags: ['Categories', 'Shops'] },
    deleteCategory: { invalidatesTags: ['Categories', 'Shops'] },
  },
});
