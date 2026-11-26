import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import {
  useGetCategoriesByShopQuery,
  useGetProductsByShopQuery,
  useGetShopByIdQuery,
} from '../services/api';
import { useGetCombosQuery, useUpdateComboMutation, type ComboBody, type ComboDto } from '../services/combosApi';
import { useToast } from '../contexts/ToastContext';
import { formatCents } from '../utils/money';
import { comboFormToBody, comboPhotoUrl, formFromCombo, isComboImageRequiredToEnableError } from '../features/combos/combos';
import { COMBO_FILTERS, comboMatchesFilter, type ComboFilter } from '../features/combos/comboForm';
import { ComboEditor } from '../components/combos/ComboEditor';
import { Chip, EmptyNote, PageHeader, Section, SplitPage, Toolbar } from '../components/layout/Page';
import { Drawer } from '../components/ui/Drawer';
import { searchBoxClass } from '../components/layout/pageStyles';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { ComboRow } from '../components/combos/ComboRow';
import { usePageTitle } from '../features/layout/usePageTitle';

export function CombosPage() {
  usePageTitle('nav.combos');
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: shop, isLoading, isError } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_menu');
  const combos = useGetCombosQuery({ shopId: shopId! }, { skip: !canManage });
  const products = useGetProductsByShopQuery({ shopId: shopId!, includeUncategorized: true }, { skip: !canManage });
  const categories = useGetCategoriesByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const [updateCombo, { isLoading: switching, originalArgs: switchingArgs }] = useUpdateComboMutation();
  const [query, setQuery] = useState('');
  // The combo whose switch was just refused for having no photo; its row shows a hint for a few seconds.
  const [photoBlockedId, setPhotoBlockedId] = useState<string | null>(null);
  useEffect(() => {
    if (!photoBlockedId) return;
    const timer = setTimeout(() => setPhotoBlockedId(null), 4000);
    return () => clearTimeout(timer);
  }, [photoBlockedId]);
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
    setPhotoBlockedId(null);
    if (!c.isAvailable && comboPhotoUrl(c) === null) {
      toast.error(t('combos.enableNeedsPhoto', { name: c.name }));
      setPhotoBlockedId(c.id);
      return;
    }
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
      if (isComboImageRequiredToEnableError(err)) {
        toast.error(t('combos.enableNeedsPhoto', { name: c.name }));
        return;
      }
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
      onClose={() => setEditing(null)}
      onDeleted={() => setEditing(null)}
    />
  );
  const editorLabel = editing === 'new' ? t('combos.new') : editing ? t('combos.editor.dialogLabel', { name: editing.name }) : '';

  const q = query.trim().toLowerCase();
  const countOf = (f: ComboFilter) => combos.data.filter((c) => comboMatchesFilter(c, f)).length;
  const visible = combos.data.filter((c) => comboMatchesFilter(c, filter) && (!q || c.name.toLowerCase().includes(q)));

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
      money={money}
      dishCount={dishCount}
      onOpen={() => setEditing(c)}
      onToggle={() => toggle(c)}
      photoBlockedMessage={photoBlockedId === c.id ? t('combos.enableNeedsPhotoInline') : undefined}
    />
  );

  return (
    <SplitPage>
      {header(combos.data.length)}

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
              {t(`combos.filter.${f}`)}
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
          <Section
            key={g.id}
            title={g.name}
            count={g.items.length}
            actions={
              <div aria-hidden="true" className="hidden items-center text-xs font-semibold text-[#6b6058] sm:flex">
                <span className="w-20 text-right">{t('combos.columnPrice')}</span>
                <span className="-mr-1.5 w-14 text-center whitespace-nowrap">{t('combos.columnOnMenu')}</span>
              </div>
            }
          >
            {g.items.map(comboRow)}
          </Section>
        ))
      )}

      {editing && (
        <Drawer label={editorLabel} onClose={() => setEditing(null)} widthClassName="sm:w-[1240px] sm:max-w-full">
          {editor}
        </Drawer>
      )}
    </SplitPage>
  );
}
