import { api } from './api';

/** `getMe` provides "Users" but the generated `createShop` only invalidates "Shops". Without this,
 * `restaurantLanguage` on the signed-in owner stays stale after creating their first restaurant
 * (AccountLanguageSync would only see it after a reload). Kept outside the generated api.ts. */
api.enhanceEndpoints({
  endpoints: {
    createShop: { invalidatesTags: ['Shops', 'Users'] },
  },
});
