import { PublicClientApplication } from '@azure/msal-browser';
import type { Configuration, RedirectRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: `https://${import.meta.env.VITE_MSAL_TENANT_NAME}.ciamlogin.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  // sessionStorage: MSAL tokens (id/access/refresh) in localStorage are readable by any XSS and
  // persist indefinitely. sessionStorage confines them to the current tab and clears them when the
  // tab closes (standard MSAL hardening). UX tradeoff: a sign-in no longer carries over to new tabs
  // or survives a browser restart; a fresh sign-in is required.
  cache: { cacheLocation: 'sessionStorage' },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'offline_access'],
};

export const apiRequest = {
  scopes: [import.meta.env.VITE_MSAL_API_SCOPE as string],
};
