import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { RouterProvider } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import './config/i18n'
import '@fontsource-variable/fraunces'
import './index.css'
import { store } from './store'
import { router } from './router'
import { msalInstance } from './config/msalConfig'
import { ToastProvider } from './contexts/ToastContext'

;(async () => {
  console.log('[env]', {
    VITE_MSAL_CLIENT_ID: import.meta.env.VITE_MSAL_CLIENT_ID,
    VITE_MSAL_TENANT_ID: import.meta.env.VITE_MSAL_TENANT_ID,
    VITE_MSAL_TENANT_NAME: import.meta.env.VITE_MSAL_TENANT_NAME,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  });

  await msalInstance.initialize();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Suspense fallback={null}>
        <MsalProvider instance={msalInstance}>
          <Provider store={store}>
            <ToastProvider>
              <RouterProvider router={router} />
            </ToastProvider>
          </Provider>
        </MsalProvider>
      </Suspense>
    </StrictMode>,
  )
})();
