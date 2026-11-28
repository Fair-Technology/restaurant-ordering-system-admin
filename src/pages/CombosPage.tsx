import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
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
import { DragHandleButton } from '../components/menu/DragHandle';
import { useDragHandleProps } from '../components/menu/useDragHandleProps';
import { applyOrder, sortByCategoryOrder } from '../features/menu/categoryOrder';
import { useCategoryDragReorder } from '../features/menu/useCategoryDragReorder';
import { useReorderSensors } from '../features/menu/useReorderSensors';
import { useSetCategoryComboOrderMutation } from '../services/comboOrderApi';
import { usePageTitle } from '../features/layout/usePageTitle';
import { translateServerError } from '../features/api/serverErrorMessage';

type ComboRowProps = Parameters<typeof ComboRow>[0];

/** A combo row with a drag handle. When `dragEnabled` is false the handle stays visible but inert. */
function SortableComboRow({
  dragEnabled,
  reordering,
  ...rowProps
}: Omit<ComboRowProps, 'dragHandle' | 'rowRef' | 'rowStyle'> & { dragEnabled: boolean; reordering: boolean }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, style } = useDragHandleProps(rowProps.combo.id, {
    dragEnabled,
    pending: reordering,
  });
  const handle = (
    <DragHandleButton
      attributes={attributes}
      listeners={listeners}
      pending={reordering}
      dragEnabled={dragEnabled}
      label={t('combos.dragHandle')}
      disabledHint={t('combos.reorderDisabledHint')}
    />
  );
  return <ComboRow {...rowProps} dragHandle={handle} rowRef={setNodeRef} rowStyle={style} />;
}

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
  const [setCategoryComboOrder] = useSetCategoryComboOrderMutation();
  const { orderOverrides, reorderError, savingOrderIds, handleDragEnd, clearStaleOverrides } = useCategoryDragReorder(
    (categoryId, productIds) => setCategoryComboOrder({ shopId: shopId!, categoryId, body: { productIds } }).unwrap(),
  );
  const sensors = useReorderSensors();
  // Once fresh data arrives, the server's order replaces local overrides (except for a save still in flight).
  const comboData = combos.data;
  useEffect(() => {
    clearStaleOverrides();
  }, [comboData, clearStaleOverrides]);

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
    translateServerError(err, t, t('combos.saveFailed'), (k) => (k === 'name' ? t('combos.name') : undefined));

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
    .map((cat) => {
      const inCat = sortByCategoryOrder(
        visible.filter((c) => c.categoryId === cat.id),
        cat.id!,
        (c) => c.categoryOrder?.[cat.id!],
        (c) => c.name,
      );
      return {
        id: cat.id!,
        name: cat.name ?? '',
        items: orderOverrides[cat.id!] ? applyOrder(inCat, orderOverrides[cat.id!], (c) => c.id) : inCat,
      };
    })
    .filter((g) => g.items.length > 0);
  const homeless = visible.filter((c) => !liveCategories.some((cat) => cat.id === c.categoryId));
  if (homeless.length) groups.push({ id: '_none', name: t('products.uncategorized'), items: homeless });

  const canReorder = canManage;
  // Reordering only makes sense on the natural, unfiltered list. That is also what makes `g.items`
  // the category's COMPLETE combo list, which is what the order endpoint expects.
  const dragActive = filter === 'all' && q === '';

  const comboRow = (c: ComboDto, dragEnabled?: boolean, groupId?: string) => {
    const rowProps = {
      combo: c,
      selected: editing !== 'new' && editing?.id === c.id,
      switching: switching && switchingArgs?.comboId === c.id,
      money,
      dishCount,
      onOpen: () => setEditing(c),
      onToggle: () => toggle(c),
      photoBlockedMessage: photoBlockedId === c.id ? t('combos.enableNeedsPhotoInline') : undefined,
    };
    return dragEnabled === undefined ? (
      <ComboRow key={c.id} {...rowProps} />
    ) : (
      <SortableComboRow key={c.id} dragEnabled={dragEnabled} reordering={!!groupId && savingOrderIds.has(groupId)} {...rowProps} />
    );
  };

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
        <>
          {reorderError && (
            <p role="alert" className="mb-[18px] rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]">
              {t('combos.failedToReorder')}
            </p>
          )}
          {groups.map((g) => (
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
            {g.id === '_none' ? g.items.map((c) => comboRow(c)) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd(g.id, g.items.map((c) => c.id), () => toast.success(t('combos.reordered')))}
              >
                <SortableContext items={g.items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                  {g.items.map((c) => comboRow(c, canReorder && dragActive, g.id))}
                </SortableContext>
              </DndContext>
            )}
          </Section>
          ))}
        </>
      )}

      {editing && (
        <Drawer label={editorLabel} onClose={() => setEditing(null)} widthClassName="sm:w-[1240px] sm:max-w-full">
          {editor}
        </Drawer>
      )}
    </SplitPage>
  );
}
