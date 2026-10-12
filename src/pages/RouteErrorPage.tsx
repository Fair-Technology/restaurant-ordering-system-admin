import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NotFoundPage } from './NotFoundPage';
import { MyButton } from '../components/ui/MyButton';

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper px-4 text-center text-ink">
      <h1 className="font-display text-[30px] leading-tight font-semibold">{t('notFound.errorTitle')}</h1>
      <p className="max-w-sm text-sm text-muted">{t('notFound.errorDescription')}</p>
      <MyButton className="mt-2" onClick={() => window.location.assign('/shops')}>{t('notFound.backToShops')}</MyButton>
    </div>
  );
}
