import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { afterLoginPath, RETURN_TO_KEY } from '../features/auth/redirects';
import { loginRequest } from '../config/msalConfig';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';

export function LoginPage() {
  const { instance, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { t } = useTranslation();

  if (isAuthenticated) {
    const stored = (() => {
      try {
        return sessionStorage.getItem(RETURN_TO_KEY);
      } catch {
        return null;
      }
    })();
    return <Navigate to={afterLoginPath(stored)} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
      <div className="w-full max-w-sm px-4">
        {inProgress !== InteractionStatus.None ? (
          <p className="text-center text-sm text-muted">{t('auth.loading')}</p>
        ) : (
          <MyCard className="p-8">
            <div className="mb-7">
              <h1 className="font-display text-[30px] leading-tight font-semibold">{t('auth.adminPortal')}</h1>
              <p className="mt-1.5 text-sm text-muted">{t('auth.signInSubtitle')}</p>
            </div>

            <div className="flex flex-col gap-3">
              <MyButton
                size="lg"
                className="w-full"
                onClick={() => instance.loginRedirect(loginRequest)}
              >
                {t('auth.signIn')}
              </MyButton>
              <MyButton
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={() => instance.loginRedirect({ ...loginRequest, prompt: 'create' })}
              >
                {t('auth.createAccount')}
              </MyButton>
            </div>
          </MyCard>
        )}
      </div>
    </div>
  );
}
