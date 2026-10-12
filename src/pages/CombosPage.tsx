import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'lucide-react';
import {
  useDeleteProductMutation,
  useGetCategoriesByShopQuery,
  useGetProductsByShopQuery,
  useGetShopByIdQuery,
} from '../services/api';
import { useGetCombosQuery, useUpdateComboMutation, type ComboBody, type ComboDto } from '../services/combosApi';
import { useToast } from '../contexts/ToastContext';
import { formatCents } from '../utils/money';
import { comboFormToBody, comboPhotoUrl, formFromCombo } from '../features/combos/combos';
import { useIsWide } from '../features/menu/useIsWide';
import { ComboEditor } from '../components/combos/ComboEditor';
import { EmptyNote, PageHeader, Row, Section, SideCard, SideColumn, SplitPage } from '../components/layout/Page';
import { badgeClass, pillClass } from '../components/layout/pageStyles';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';

export function CombosPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const wide = useIsWide();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_menu');
  const combos = useGetCombosQuery({ shopId: shopId! }, { skip: !canManage });
  const products = useGetProductsByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const categories = useGetCategoriesByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const [updateCombo, { isLoading: switching }] = useUpdateComboMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // The open editor lives in the address (?combo=<id> or ?combo=new), so it survives a reload
  const comboParam = searchParams.get('combo');
  const setEditing = (value: ComboDto | 'new' | null) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      if (value === null) n.delete('combo');
      else n.set('combo', value === 'new' ? 'new' : value.id);
      return n;
    });

  const header = (count?: number) => (
    <PageHeader
      eyebrow={t('nav.group.menu')}
      title={t('nav.combos')}
      count={count}
      description={t('combos.help')}
      actions={
        canManage && (
          <MyButton size="lg" className="gap-2" onClick={() => setEditing('new')}>
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            {t('combos.new')}
          </MyButton>
        )
      }
    />
  );

  if (isLoading) return <SplitPage><MySpinner /></SplitPage>;
  if (isError || !shop) return <SplitPage><p className="text-[#b42318]">{t('shops.failedToLoadShop')}</p></SplitPage>;

  if (!canManage) {
    return (
      <SplitPage>
        {header()}
        <Section className="max-w-lg">
          <EmptyNote>{t('combos.accessDenied')}</EmptyNote>
        </Section>
      </SplitPage>
    );
  }

  if (combos.isLoading || products.isLoading || categories.isLoading) return <SplitPage><MySpinner /></SplitPage>;
  if (combos.isError || !combos.data || !products.data || !categories.data) {
    return <SplitPage><p className="text-[#b42318]">{t('combos.saveFailed')}</p></SplitPage>;
  }

  const dishes = products.data;
  const liveCategories = categories.data.filter((c) => !c.isDeleted);
  const dishIds = new Set(dishes.map((p) => p.id!));
  const dishCount = (ids: string[]) => ids.filter((id) => dishIds.has(id)).length;
  const money = (cents: number) => formatCents(cents, shop.currency ?? 'EUR', i18n.language);
  const serverMessage = (err: unknown): string =>
    (err as { data?: { error?: string } })?.data?.error ?? t('combos.saveFailed');

  const editing: ComboDto | 'new' | null =
    comboParam === 'new' ? 'new' : (combos.data.find((c) => c.id === comboParam) ?? null);

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
      if (editing !== 'new' && editing?.id === c.id) setEditing(null);
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  const editor = editing && (
    <ComboEditor
      key={editing === 'new' ? 'new' : editing.id}
      shop={shop}
      shopId={shopId!}
      combo={editing === 'new' ? null : editing}
      products={dishes}
      categories={liveCategories}
      onDone={() => setEditing(null)}
    />
  );
  const editorTitle = editing === 'new' ? t('combos.new') : editing ? editing.name : t('nav.combos');
  const closeButton = (
    <button
      type="button"
      onClick={() => setEditing(null)}
      aria-label={t('combos.cancel')}
      className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
    >
      <X size={16} aria-hidden="true" />
    </button>
  );

  // Combos grouped under the category they are shown in, in menu order; any without one at the end
  const groups = liveCategories
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((cat) => ({ id: cat.id!, name: cat.name ?? '', items: combos.data.filter((c) => c.categoryId === cat.id) }))
    .filter((g) => g.items.length > 0);
  const homeless = combos.data.filter((c) => !liveCategories.some((cat) => cat.id === c.categoryId));
  if (homeless.length) groups.push({ id: '_none', name: t('products.uncategorized'), items: homeless });

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const comboRow = (c: ComboDto) => {
    const photo = comboPhotoUrl(c);
    const selected = editing !== 'new' && editing?.id === c.id;
    return (
      <div key={c.id}>
        <Row selected={selected} onSelect={() => setEditing(c)} className="flex-wrap">
          {photo ? (
            <img src={photo} alt="" className={`h-[42px] w-14 flex-shrink-0 rounded-lg object-cover ${c.isAvailable ? '' : 'opacity-50'}`} />
          ) : (
            <span className="flex h-[42px] w-14 flex-shrink-0 items-center justify-center rounded-lg border border-[#f1dfae] bg-[#fff6e0] text-center text-[11px] leading-tight font-semibold text-[#8a5a00]">
              {t('combos.noPhoto')}
            </span>
          )}
          <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${c.isAvailable ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold">{c.name}</span>
              <span className={c.isAvailable ? badgeClass.good : badgeClass.neutral}>
                {c.isAvailable ? t('combos.statusOn') : t('combos.statusOff')}
              </span>
              {c.bmfDrinkShare && <span className={badgeClass.neutral}>{t('combos.bmfBadge')}</span>}
            </div>
            <span className="text-[13px] text-[#6b6058]">
              {c.groups
                .map((g) => t('combos.groupSummary', { name: g.name, count: dishCount(g.productIds) }))
                .join(' · ')}
            </span>
          </div>
          <span className="text-right text-[15px] font-bold">{money(c.priceCents)}</span>
          <span className="flex w-full flex-wrap justify-end gap-2 sm:w-auto" onClick={stop} onKeyDown={stop}>
            <button type="button" className={pillClass(false)} onClick={() => setEditing(c)}>
              {t('combos.edit')}
            </button>
            <button type="button" className={pillClass(false)} disabled={switching} onClick={() => toggle(c)}>
              {c.isAvailable ? t('combos.switchOff') : t('combos.switchOn')}
            </button>
            <button
              type="button"
              className={`${pillClass(false)} !text-[#b42318]`}
              onClick={() => setConfirmingId(c.id)}
            >
              {t('combos.delete')}
            </button>
          </span>
        </Row>
        {confirmingId === c.id && (
          <div className="flex flex-wrap items-center gap-3 border-b border-[#f5c2bd] bg-[#fdeceb] px-4 py-2.5">
            <span className="min-w-0 flex-1 text-sm text-[#b42318]">{t('combos.deleteConfirm', { name: c.name })}</span>
            <button
              type="button"
              disabled={deleting}
              onClick={() => remove(c)}
              className="h-[34px] rounded-full bg-[#b42318] px-3.5 text-[13px] font-bold text-white hover:bg-[#912018] disabled:opacity-40"
            >
              {deleting ? '…' : t('combos.delete')}
            </button>
            <button type="button" className={pillClass(false)} onClick={() => setConfirmingId(null)}>
              {t('combos.cancel')}
            </button>
          </div>
        )}
      </div>
    );
  };

  const side = wide ? (
    <SideColumn label={editorTitle} title={editorTitle} actions={editing && closeButton}>
      <SideCard>{editor || <EmptyNote>{t('combos.selectHint')}</EmptyNote>}</SideCard>
    </SideColumn>
  ) : undefined;

  return (
    <SplitPage side={side}>
      {header(combos.data.length)}

      {/* Smaller screens: the editor opens above the list */}
      {!wide && editing && (
        <Section title={editorTitle} actions={closeButton}>
          {editor}
        </Section>
      )}

      {combos.data.length === 0 ? (
        <Section>
          <EmptyNote>{t('combos.none')}</EmptyNote>
        </Section>
      ) : (
        groups.map((g) => (
          <Section key={g.id} title={g.name} count={g.items.length}>
            {g.items.map(comboRow)}
          </Section>
        ))
      )}
    </SplitPage>
  );
}
