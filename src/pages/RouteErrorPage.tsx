import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NotFoundPage } from './NotFoundPage';
import { MyButton } from '../components/ui/MyButton';

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-center">
      <h1 className="text-xl font-semibold text-gray-900">{t('notFound.errorTitle')}</h1>
      <p className="max-w-sm text-sm text-gray-500">{t('notFound.errorDescription')}</p>
      <MyButton onClick={() => window.location.assign('/shops')}>{t('notFound.backToShops')}</MyButton>
    </div>
  );
}
