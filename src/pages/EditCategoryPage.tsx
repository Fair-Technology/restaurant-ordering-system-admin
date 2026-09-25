import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../services/api';
import { useGetCategoryByIdQuery, useUpdateCategoryMutation, useDeleteCategoryMutation } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { useToast } from '../contexts/ToastContext';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { labelFor } from '../features/menu/foodInfo';

export function EditCategoryPage() {
  const { shopId, categoryId } = useParams<{ shopId: string; categoryId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const { data: category, isLoading, isError } = useGetCategoryByIdQuery(
    { shopId: shopId!, categoryId: categoryId! },
    { refetchOnMountOrArgChange: true },
  );
  const [updateCategory, { isLoading: isUpdating, isError: isUpdateError }] =
    useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting, isError: isDeleteError }] =
    useDeleteCategoryMutation();
  const { refs } = useShopReferenceLists(shopId!);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [taxClassId, setTaxClassId] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name ?? '');
      setIcon(category.icon ?? null);
      setTaxClassId(category.taxClassId ?? '');
    }
  }, [category]);

  if (isLoading) return <MySpinner label={t('categories.loadingCategory')} />;
  if (isError || !category) return <p className="text-red-500">{t('categories.failedToLoad')}</p>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCategory({
        shopId: shopId!,
        categoryId: categoryId!,
        updateCategoryRequest: {
          name,
          icon: icon ?? undefined,
          ...(taxClassId ? { taxClassId } : {}),
        },
      }).unwrap();
      toast.success(t('categories.saved'));
      navigate(`/shops/${shopId}/categories`);
    } catch {
      // error shown below
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory({ shopId: shopId!, categoryId: categoryId! }).unwrap();
      toast.success(t('categories.deleted'));
      navigate(`/shops/${shopId}/categories`);
    } catch {
      setConfirmingDelete(false);
    }
  };

  return (
    <div className="max-w-lg space-y-5">
      <Breadcrumb items={[
        { label: t('nav.shops'), to: '/shops' },
        { label: shop?.name ?? t('shops.shop'), to: `/shops/${shopId}` },
        { label: t('nav.categories'), to: `/shops/${shopId}/categories` },
        { label: t('categories.editTitle') },
      ]} />
      <h1 className="text-2xl font-semibold text-gray-900">{t('categories.editTitle')}</h1>

      {isUpdateError && (
        <MyCard className="p-4 !bg-red-50 !border-red-200">
          <p className="text-sm text-red-600">{t('categories.failedToUpdate')}</p>
        </MyCard>
      )}

      {isDeleteError && (
        <MyCard className="p-4 !bg-red-50 !border-red-200">
          <p className="text-sm text-red-600">{t('categories.failedToDelete')}</p>
        </MyCard>
      )}

      <MyCard className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <MyInput
            label={t('categories.name')}
            type="text"
            required
            placeholder={t('categories.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {(refs?.taxClasses.length ?? 0) > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">{t('categories.taxClass')}</label>
              <select
                value={taxClassId}
                onChange={(e) => setTaxClassId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
              >
                {refs!.taxClasses.filter((c) => c.isActive).map((c) => (
                  <option key={c.id} value={c.id}>
                    {labelFor(c.labels, i18n.language)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400">{t('categories.taxClassHelp')}</p>
            </div>
          )}
          <div className="flex gap-2">
            <MyButton
              type="button"
              variant="ghost"
              disabled={isUpdating}
              className="flex-1"
              onClick={() => navigate(`/shops/${shopId}/categories`)}
            >
              {t('categories.cancel')}
            </MyButton>
            <MyButton type="submit" disabled={isUpdating} className="flex-1">
              {isUpdating ? t('categories.saving') : t('categories.saveChanges')}
            </MyButton>
          </div>
        </form>
      </MyCard>

      <MyCard className="p-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-900">{t('categories.dangerZone')}</p>
          <p className="text-xs text-gray-400">{t('categories.deleteWarning')}</p>
          {confirmingDelete ? (
            <div className="space-y-3">
              <MyInput
                label={t('categories.deleteTypeToConfirm', { name: category.name })}
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={category.name}
              />
              <div className="flex gap-2">
                <MyButton
                  variant="danger"
                  disabled={isDeleting || deleteConfirmName !== category.name}
                  onClick={handleDelete}
                >
                  {isDeleting ? t('categories.deleting') : t('categories.confirmDelete')}
                </MyButton>
                <MyButton
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => { setConfirmingDelete(false); setDeleteConfirmName(''); }}
                >
                  {t('categories.cancel')}
                </MyButton>
              </div>
            </div>
          ) : (
            <MyButton variant="danger" onClick={() => setConfirmingDelete(true)}>
              {t('categories.delete')}
            </MyButton>
          )}
        </div>
      </MyCard>
    </div>
  );
}
