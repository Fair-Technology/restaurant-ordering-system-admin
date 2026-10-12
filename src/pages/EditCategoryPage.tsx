import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../services/api';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { PageHeader } from '../components/layout/Page';
import { CategoryEditor } from '../components/categories/CategoryEditor';

export function EditCategoryPage() {
  const { shopId, categoryId } = useParams<{ shopId: string; categoryId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const backToList = () => navigate(`/shops/${shopId}/categories`);

  return (
    <div className="max-w-3xl">
      <div className="mb-3">
        <Breadcrumb
          items={[
            { label: t('nav.shops'), to: '/shops' },
            { label: shop?.name ?? t('shops.shop'), to: `/shops/${shopId}` },
            { label: t('nav.categories'), to: `/shops/${shopId}/categories` },
            { label: t('categories.editTitle') },
          ]}
        />
      </div>
      <PageHeader eyebrow={t('nav.group.menu')} title={t('categories.editTitle')} />
      <CategoryEditor
        key={categoryId}
        shopId={shopId!}
        categoryId={categoryId!}
        onSaved={backToList}
        onCancel={backToList}
        onDeleted={backToList}
      />
    </div>
  );
}
