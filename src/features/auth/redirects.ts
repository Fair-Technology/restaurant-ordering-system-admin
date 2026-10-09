export const RETURN_TO_KEY = 'ros.returnTo';

/** Where a staff login must go instead of `pathname`, or null to stay. Staff stay in their own restaurant. */
export function staffRedirectFor(pathname: string, shopId: string): string | null {
  if (pathname === '/phone') return `/shops/${shopId}/phone`;
  return pathname.startsWith(`/shops/${shopId}`) ? null : `/shops/${shopId}/orders`;
}

/** The remembered page to open after sign-in; '/' unless it is a safe in-app path. */
export function afterLoginPath(stored: string | null): string {
  if (!stored || !stored.startsWith('/') || stored.startsWith('//') || stored.startsWith('/login')) return '/';
  return stored;
}
