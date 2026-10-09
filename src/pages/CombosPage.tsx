import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useDeleteProductMutation,
  useGetCategoriesByShopQuery,
  useGetProductsByShopQuery,
  useGetShopByIdQuery,
} from '../services/api';
import { useGetCombosQuery, useUpdateComboMutation, type ComboBody, type ComboDto } from '../services/combosApi';
import { useToast } from '../contexts/ToastContext';
import { formatCents } from '../utils/money';
import { comboFormToBody, formFromCombo } from '../features/combos/combos';
import { ComboEditor } from '../components/combos/ComboEditor';
import { MyButton } from '../components/ui/MyButton';
import { MyCard } from '../components/ui/MyCard';
import { MySpinner } from '../components/ui/MySpinner';

export function CombosPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_menu');
  const combos = useGetCombosQuery({ shopId: shopId! }, { skip: !canManage });
  const products = useGetProductsByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const categories = useGetCategoriesByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const [updateCombo, { isLoading: switching }] = useUpdateComboMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [editing, setEditing] = useState<ComboDto | 'new' | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (isLoading) return <MySpinner />;
  if (isError || !shop) return <p className="text-red-500">{t('shops.failedToLoadShop')}</p>;

  if (!canManage) {
    return (
      <div className="max-w-lg">
        <MyCard className="p-5">
          <p className="text-sm text-gray-600">{t('combos.accessDenied')}</p>
        </MyCard>
      </div>
    );
  }

  if (combos.isLoading || products.isLoading || categories.isLoading) return <MySpinner />;
  if (combos.isError || !combos.data || !products.data || !categories.data) {
    return <p className="text-red-500">{t('combos.saveFailed')}</p>;
  }

  const dishes = products.data;
  const liveCategories = categories.data.filter((c) => !c.isDeleted);
  const dishIds = new Set(dishes.map((p) => p.id!));
  const dishCount = (ids: string[]) => ids.filter((id) => dishIds.has(id)).length;
  const money = (cents: number) => formatCents(cents, shop.currency ?? 'EUR', i18n.language);
  const serverMessage = (err: unknown): string =>
    (err as { data?: { error?: string } })?.data?.error ?? t('combos.saveFailed');

  const toggle = async (c: ComboDto) => {
    const body = comboFormToBody(formFromCombo(c, dishIds));
    if ('error' in body) {
      setEditing(c);
      return;
    }
    try {
      await updateCombo({
        shopId: shopId!,
        comboId: c.id,
        body: { ...(body as ComboBody), isAvailable: !c.isAvailable },
      }).unwrap();
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  const remove = async (c: ComboDto) => {
    try {
      await deleteProduct({ productId: c.id, shopId: shopId! }).unwrap();
      setConfirmingId(null);
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-xl font-semibold text-gray-900">{t('nav.combos')}</h1>
      <p className="text-sm text-gray-600">{t('combos.help')}</p>
      <div>
        <MyButton onClick={() => setEditing('new')}>{t('combos.new')}</MyButton>
      </div>

      {editing && (
        <ComboEditor
          key={editing === 'new' ? 'new' : editing.id}
          shop={shop}
          shopId={shopId!}
          combo={editing === 'new' ? null : editing}
          products={dishes}
          categories={liveCategories}
          onDone={() => setEditing(null)}
        />
      )}

      <MyCard className="p-6">
        {combos.data.length === 0 ? (
          <p className="text-sm text-gray-500">{t('combos.none')}</p>
        ) : (
          combos.data.map((c) => (
            <div key={c.id}>
              <div className="border-b py-2 flex flex-wrap items-center gap-x-3 text-sm">
                <span className="font-bold text-gray-900">{c.name}</span>
                <span>{money(c.priceCents)}</span>
                <span className="text-gray-600">
                  {liveCategories.find((cat) => cat.id === c.categoryId)?.name ?? '—'}
                </span>
                <span className="text-gray-600">
                  {c.groups
                    .map((g) => t('combos.groupSummary', { name: g.name, count: dishCount(g.productIds) }))
                    .join(' · ')}
                </span>
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                  {c.isAvailable ? t('combos.statusOn') : t('combos.statusOff')}
                </span>
                {c.bmfDrinkShare && (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs text-gray-700">
                    {t('combos.bmfBadge')}
                  </span>
                )}
                <span className="ml-auto flex gap-2">
                  <MyButton size="sm" variant="secondary" onClick={() => setEditing(c)}>
                    {t('combos.edit')}
                  </MyButton>
                  <MyButton size="sm" variant="secondary" disabled={switching} onClick={() => toggle(c)}>
                    {c.isAvailable ? t('combos.switchOff') : t('combos.switchOn')}
                  </MyButton>
                  <MyButton size="sm" variant="secondary" onClick={() => setConfirmingId(c.id)}>
                    {t('combos.delete')}
                  </MyButton>
                </span>
              </div>
              {confirmingId === c.id && (
                <div className="px-3 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-3">
                  <span className="flex-1 text-sm text-red-700">{t('combos.deleteConfirm', { name: c.name })}</span>
                  <button
                    disabled={deleting}
                    onClick={() => remove(c)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
                  >
                    {deleting ? '…' : t('combos.delete')}
                  </button>
                  <button
                    onClick={() => setConfirmingId(null)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    {t('combos.cancel')}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </MyCard>
    </div>
  );
}
