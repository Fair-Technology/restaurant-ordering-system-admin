import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { msalInstance, apiRequest } from '../config/msalConfig';
import { clearStaffSession, readStaffSession } from '../features/staff/staffSession';

let loggingOut = false;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL,
  prepareHeaders: async (headers) => {
    const staff = readStaffSession();
    if (staff) {
      headers.set('Authorization', `Bearer ${staff.token}`);
      return headers;
    }

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

// A staff session that's been deactivated, deleted, or reassigned to
// another restaurant fails its next request with a 403 whose body names one
// of these two errors (see backend's authorizeShopAction). When that
// happens under an active staff session, the session is stale — clear it
// and send the tablet back to that restaurant's sign-in page.
const STAFF_SESSION_INVALID_ERRORS = ['Authentication required', 'You do not have access to this restaurant'];

const baseQueryWithStaffGuard: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const staff = readStaffSession();
  if (
    staff &&
    result.error?.status === 403 &&
    typeof result.error.data === 'object' &&
    result.error.data !== null &&
    STAFF_SESSION_INVALID_ERRORS.includes((result.error.data as { error?: string }).error ?? '')
  ) {
    clearStaffSession();
    window.location.assign(`/${staff.shopSlug}/staff`);
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithStaffGuard,
  tagTypes: ['Products', 'Categories', 'Orders', 'Plans', 'Subscriptions', 'Shops', 'Audit', 'Staff'],
  endpoints: () => ({}),
});
