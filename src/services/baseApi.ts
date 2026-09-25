import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { msalInstance, apiRequest } from '../config/msalConfig';

let loggingOut = false;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: async (headers) => {
    const account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0];
    if (account) {
      try {
        const result = await msalInstance.acquireTokenSilent({ ...apiRequest, account });
        headers.set('Authorization', `Bearer ${result.accessToken}`);
      } catch {
        // Token expired and silent refresh failed — log out once so the
        // user lands on the login page and can sign in again cleanly.
        if (!loggingOut) {
          loggingOut = true;
          msalInstance.logoutRedirect();
        }
      }
    }
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: rawBaseQuery,
  tagTypes: ['Products', 'Categories', 'Orders', 'Plans', 'Subscriptions', 'Shops'],
  endpoints: () => ({}),
});
