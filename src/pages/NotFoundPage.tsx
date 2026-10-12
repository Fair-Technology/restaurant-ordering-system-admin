import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MyButton } from '../components/ui/MyButton';

export function NotFoundPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shopId } = useParams<{ shopId: string }>();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-center">
      <h1 className="font-display text-[30px] leading-tight font-semibold">{t('notFound.title')}</h1>
      <p className="max-w-sm text-sm text-muted">{t('notFound.description')}</p>
      <MyButton className="mt-2" onClick={() => navigate(shopId ? `/shops/${shopId}` : '/shops')}>
        {shopId ? t('notFound.backToShop') : t('notFound.backToShops')}
      </MyButton>
    </div>
  );
}
