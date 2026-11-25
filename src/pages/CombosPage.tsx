import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search, X } from 'lucide-react';
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
import { useIsWide } from '../features/menu/useIsWide';
import { ComboEditor } from '../components/combos/ComboEditor';
import { Chip, EmptyNote, PageHeader, Section, SideCard, SideColumn, SplitPage, Toolbar } from '../components/layout/Page';
import { searchBoxClass } from '../components/layout/pageStyles';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { ComboRow } from '../components/combos/ComboRow';
import { usePageTitle } from '../features/layout/usePageTitle';

type ComboFilter = 'all' | 'onMenu' | 'off';
const COMBO_FILTERS: ComboFilter[] = ['all', 'onMenu', 'off'];

export function CombosPage() {
  usePageTitle('nav.combos');
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const wide = useIsWide();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_menu');
  const combos = useGetCombosQuery({ shopId: shopId! }, { skip: !canManage });
  const products = useGetProductsByShopQuery({ shopId: shopId!, includeUncategorized: true }, { skip: !canManage });
  const categories = useGetCategoriesByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const [updateCombo, { isLoading: switching, originalArgs: switchingArgs }] = useUpdateComboMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ComboFilter>('all');

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

  const q = query.trim().toLowerCase();
  const matchesFilter = (c: ComboDto, f: ComboFilter) => f === 'all' || (f === 'onMenu' ? c.isAvailable : !c.isAvailable);
  const countOf = (f: ComboFilter) => combos.data.filter((c) => matchesFilter(c, f)).length;
  const visible = combos.data.filter((c) => matchesFilter(c, filter) && (!q || c.name.toLowerCase().includes(q)));

  // Combos grouped under the category they are shown in, in menu order; any without one at the end
  const groups = liveCategories
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((cat) => ({ id: cat.id!, name: cat.name ?? '', items: visible.filter((c) => c.categoryId === cat.id) }))
    .filter((g) => g.items.length > 0);
  const homeless = visible.filter((c) => !liveCategories.some((cat) => cat.id === c.categoryId));
  if (homeless.length) groups.push({ id: '_none', name: t('products.uncategorized'), items: homeless });

  const comboRow = (c: ComboDto) => (
    <ComboRow
      key={c.id}
      combo={c}
      selected={editing !== 'new' && editing?.id === c.id}
      switching={switching && switchingArgs?.comboId === c.id}
      confirmingDelete={confirmingId === c.id}
      deleting={deleting}
      money={money}
      dishCount={dishCount}
      onOpen={() => setEditing(c)}
      onToggle={() => toggle(c)}
      onAskDelete={() => setConfirmingId(c.id)}
      onConfirmDelete={() => remove(c)}
      onCancelDelete={() => setConfirmingId(null)}
    />
  );

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

      {combos.data.length > 0 && (
        <Toolbar>
          <label className={`${searchBoxClass} focus-within:border-ink`}>
            <Search size={16} className="text-[#8a7f77]" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('combos.search')}
              aria-label={t('combos.search')}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          {COMBO_FILTERS.map((f) => (
            <Chip key={f} active={filter === f} count={countOf(f)} onClick={() => setFilter(f)}>
              {t(`dishes.filter.${f}`)}
            </Chip>
          ))}
        </Toolbar>
      )}

      {combos.data.length === 0 ? (
        <Section>
          <EmptyNote>{t('combos.none')}</EmptyNote>
        </Section>
      ) : groups.length === 0 ? (
        <Section>
          <EmptyNote>{t('combos.noMatch')}</EmptyNote>
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
