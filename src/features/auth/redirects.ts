import { firstNavKey, navPath } from '../shops/shopNav';

export const RETURN_TO_KEY = 'ros.returnTo';

/** Where a staff login must go instead of `pathname`, or null to stay. Staff stay in their own restaurant. */
export function staffRedirectFor(pathname: string, shopId: string): string | null {
  if (pathname === '/phone') return `/shops/${shopId}/phone`;
  return pathname.startsWith(`/shops/${shopId}`) ? null : `/shops/${shopId}/dashboard`;
}

/** The shop page a user lands on: the first they may open, else the phone view (open to anyone on the staff). */
export function shopLandingPath(shopId: string, permissions: readonly string[]): string {
  const key = firstNavKey(permissions);
  return key ? navPath(shopId, key) : `/shops/${shopId}/phone`;
}

/** The remembered page to open after sign-in; '/' unless it is a safe in-app path. */
export function afterLoginPath(stored: string | null): string {
  if (!stored || !stored.startsWith('/') || stored.startsWith('//') || stored.startsWith('/login')) return '/';
  return stored;
}
