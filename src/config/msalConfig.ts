import { PublicClientApplication } from '@azure/msal-browser';
import type { Configuration, RedirectRequest } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_MSAL_CLIENT_ID,
    authority: `https://${import.meta.env.VITE_MSAL_TENANT_NAME}.ciamlogin.com/${import.meta.env.VITE_MSAL_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  // localStorage: a sign-in carries over to new tabs and browser restarts; signing out clears it.
  cache: { cacheLocation: 'localStorage' },
};

export const msalInstance = new PublicClientApplication(msalConfig);

export const loginRequest: RedirectRequest = {
  scopes: ['openid', 'profile', 'offline_access'],
};

export const apiRequest = {
  scopes: [import.meta.env.VITE_MSAL_API_SCOPE as string],
};
