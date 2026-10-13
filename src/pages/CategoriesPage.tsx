import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Clock, GripVertical, Pencil, Plus, X } from 'lucide-react';
import { IconPickerInline } from '../components/ui/IconPicker';
import {
  useGetCategoriesByShopQuery,
  useUpdateCategoryMutation,
  useCreateCategoryMutation,
} from '../services/api';
import type { GetCategoriesByShopApiResponse } from '../services/api';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { MySwitch } from '../components/ui/MySwitch';
import { useToast } from '../contexts/ToastContext';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { dishTaxClasses, labelFor, taxClassOptionLabel } from '../features/menu/foodInfo';
import { formatSchedule } from '../features/menu/categorySchedule';
import { selectClass, useIsWide } from '../features/menu/useIsWide';
import { EmptyNote, PageHeader, Section, SideCard, SideColumn, SplitPage } from '../components/layout/Page';
import { badgeClass } from '../components/layout/pageStyles';
import { CategoryEditor } from '../components/categories/CategoryEditor';

type Category = NonNullable<GetCategoriesByShopApiResponse>[number];

// ── Create Category Modal ──────────────────────────────────────────────────────

function CreateCategoryModal({
  shopId,
  existingCount,
  onClose,
}: {
  shopId: string;
  existingCount: number;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createCategory, { isLoading, isError, error }] = useCreateCategoryMutation();
  const { refs } = useShopReferenceLists(shopId);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [taxClassOverride, setTaxClassOverride] = useState<string | null>(null);
  const taxClassId = taxClassOverride ?? refs?.defaultTaxClassId ?? '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({
        shopId,
        createCategoryRequest: {
          name,
          sortOrder: existingCount,
          icon: icon ?? undefined,
          ...(taxClassId ? { taxClassId } : {}),
        },
      }).unwrap();
      toast.success(t('categories.created'));
      onClose();
    } catch {
      // error shown below
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-[#1f1a17]/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-category-title"
          className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-white shadow-xl"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pt-5 pb-4">
            <div>
              <h2 id="create-category-title" className="font-display text-[22px] leading-tight font-semibold">
                {t('categories.newCategory')}
              </h2>
              <p className="mt-1 text-[13px] text-muted">{t('categories.createSubtitle')}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('categories.close')}
              className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 px-5 py-5">
              {isError && (
                <p role="alert" className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] p-3 text-sm text-[#b42318]">
                  {(error as { data?: { error?: string } })?.data?.error ?? t('categories.failedToCreate')}
                </p>
              )}
              <div className="flex items-center gap-2">
                <IconPickerInline value={icon} onChange={setIcon} />
                <div className="min-w-0 flex-1">
                  <MyInput
                    type="text"
                    required
                    aria-label={t('categories.name')}
                    placeholder={t('categories.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
              {(refs?.taxClasses.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="create-category-tax" className="text-[13px] font-semibold text-[#4a413b]">
                    {t('categories.taxClass')}
                  </label>
                  <select
                    id="create-category-tax"
                    value={taxClassId}
                    onChange={(e) => setTaxClassOverride(e.target.value)}
                    className={selectClass}
                  >
                    {dishTaxClasses(refs!.taxClasses).map((c) => (
                      <option key={c.id} value={c.id}>
                        {taxClassOptionLabel(labelFor(c.labels, i18n.language), c.id, refs, i18n.language)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted">{t('categories.taxClassHelp')}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-line-soft px-5 py-4">
              <MyButton type="button" variant="secondary" onClick={onClose}>
                {t('products.cancel')}
              </MyButton>
              <MyButton type="submit" disabled={isLoading}>
                {isLoading ? t('categories.creating') : t('categories.create')}
              </MyButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Sortable category row ──────────────────────────────────────────────────────

interface SortableCategoryItemProps {
  cat: Category;
  shopId: string;
  selected: boolean;
  onOpen: () => void;
}

/** Stops clicks on the controls inside a row from also opening the category. */
const keepInside = (e: React.SyntheticEvent) => e.stopPropagation();

function SortableCategoryItem({ cat, shopId, selected, onOpen }: SortableCategoryItemProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [updateCategory, { isLoading: switching }] = useUpdateCategoryMutation();
  // The switch moves at once; the server's answer replaces this when the list reloads
  const saved = cat.isAvailable !== false;
  const [pending, setPending] = useState<{ next: boolean; from: boolean } | null>(null);
  const shown = pending && pending.from === saved ? pending.next : saved;
  const { refs } = useShopReferenceLists(shopId);
  const taxClass = refs?.taxClasses.find((c) => c.id === cat.taxClassId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cat.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const handleIconChange = (icon: string | null) => {
    updateCategory({
      shopId,
      categoryId: cat.id!,
      updateCategoryRequest: { icon },
    });
  };

  // Switching saves at once; the list refreshes from the server
  const handleShownChange = async (next: boolean) => {
    setPending({ next, from: saved });
    try {
      await updateCategory({ shopId, categoryId: cat.id!, updateCategoryRequest: { isAvailable: next } }).unwrap();
      toast.success(next ? t('categories.shown') : t('categories.hidden'));
    } catch {
      setPending(null);
      toast.error(t('categories.toggleFailed'));
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      aria-labelledby={`category-name-${cat.id}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer items-center gap-3 border-b border-line-soft px-4 py-3 transition-colors last:border-b-0 hover:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink ${
        selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : 'bg-white'
      }`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        onClick={keepInside}
        className="flex-shrink-0 cursor-grab touch-none text-[#b9ada2] hover:text-ink active:cursor-grabbing"
        aria-label={t('categories.dragHandle')}
        type="button"
      >
        <GripVertical size={18} aria-hidden="true" />
      </button>

      {/* Icon picker */}
      <span className="flex-shrink-0" onClick={keepInside} onKeyDown={keepInside}>
        <IconPickerInline value={cat.icon ?? null} onChange={handleIconChange} />
      </span>

      {/* Name */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
        <span id={`category-name-${cat.id}`} className={`truncate text-[15px] font-bold ${shown ? '' : 'text-[#8a7f77]'}`}>
          {cat.name}
        </span>
        {!shown && <span className={`flex-shrink-0 ${badgeClass.neutral}`}>{t('categories.off')}</span>}
        {cat.schedule && (
          <span className={`inline-flex flex-shrink-0 items-center gap-1 ${badgeClass.warn}`}>
            <Clock size={12} aria-hidden="true" />
            {formatSchedule(cat.schedule, i18n.language)}
          </span>
        )}
        {taxClass && (
          <span className="flex-shrink-0 text-[13px] text-[#8a7f77]">
            {taxClassOptionLabel(labelFor(taxClass.labels, i18n.language), taxClass.id, refs, i18n.language)}
          </span>
        )}
      </div>

      {/* Shown on the storefront */}
      <span className="flex flex-shrink-0 items-center" onClick={keepInside} onKeyDown={keepInside}>
        <MySwitch
          checked={shown}
          onChange={handleShownChange}
          disabled={switching}
          labelledBy={`category-name-${cat.id}`}
        />
      </span>

      {/* Edit (a link, so it can be opened in a new tab; on wide screens it opens the side column) */}
      <Link
        to={`/shops/${shopId}/categories/${cat.id}/edit`}
        onClick={(e) => {
          e.stopPropagation();
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          onOpen();
        }}
        onKeyDown={keepInside}
        className="flex-shrink-0 rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
        aria-label={t('categories.edit')}
      >
        <Pencil size={15} aria-hidden="true" />
      </Link>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function CategoriesPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const wide = useIsWide();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: categories, isLoading, isError } = useGetCategoriesByShopQuery({ shopId: shopId! });
  const [updateCategory] = useUpdateCategoryMutation();

  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [reorderError, setReorderError] = useState(false);
  const isReordering = useRef(false);

  useEffect(() => {
    if (categories && !isReordering.current) {
      setOrderedCategories(categories);
    }
  }, [categories]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedCategories.findIndex((c) => c.id === active.id);
    const newIndex = orderedCategories.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const snapshot = orderedCategories;
    const reordered = arrayMove(orderedCategories, oldIndex, newIndex);

    isReordering.current = true;
    setOrderedCategories(reordered);
    setReorderError(false);

    try {
      await Promise.all(
        reordered.map((cat, index) =>
          updateCategory({
            shopId: shopId!,
            categoryId: cat.id!,
            updateCategoryRequest: { sortOrder: index },
          }).unwrap(),
        ),
      );
      toast.success(t('categories.reordered'));
    } catch {
      setOrderedCategories(snapshot);
      setReorderError(true);
    } finally {
      isReordering.current = false;
    }
  };

  const setParam = (key: string, value: string | null) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      if (value === null) n.delete(key);
      else n.set(key, value);
      return n;
    });
  const showModal = searchParams.get('addCategory') === '1';
  const closeModal = () => setParam('addCategory', null);

  const selectedId = searchParams.get('category');
  const selected = orderedCategories.find((c) => c.id === selectedId);
  // Wide screens edit in the right column; smaller ones open the edit page
  const open = (cat: Category) => {
    if (wide) setParam('category', cat.id!);
    else navigate(`/shops/${shopId}/categories/${cat.id}/edit`);
  };
  const closeEditor = () => setParam('category', null);

  const side = wide ? (
    <SideColumn
      label={t('categories.editTitle')}
      title={selected ? t('categories.editTitle') : t('nav.categories')}
      hint={selected?.name}
      actions={
        selected && (
          <button
            type="button"
            onClick={closeEditor}
            aria-label={t('categories.close')}
            className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )
      }
    >
      {selected ? (
        <div className="-mx-[18px] min-h-0 flex-1 overflow-y-auto px-[18px]">
          <CategoryEditor
            key={selected.id}
            shopId={shopId!}
            categoryId={selected.id!}
            onSaved={() => undefined}
            onCancel={closeEditor}
            onDeleted={closeEditor}
          />
        </div>
      ) : (
        <SideCard>
          <EmptyNote>{t('categories.selectHint')}</EmptyNote>
        </SideCard>
      )}
    </SideColumn>
  ) : undefined;

  return (
    <SplitPage side={side}>
      <PageHeader
        eyebrow={t('nav.group.menu')}
        title={t('nav.categories')}
        count={categories ? orderedCategories.length : undefined}
        description={t('categories.listHelp')}
        actions={
          <MyButton size="lg" className="gap-2" onClick={() => setParam('addCategory', '1')}>
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            {t('categories.newCategory')}
          </MyButton>
        }
      />

      {isLoading ? (
        <MySpinner label={t('categories.loading')} />
      ) : isError ? (
        <p className="text-[#b42318]">{t('categories.loadError')}</p>
      ) : (
        <>
          {reorderError && (
            <p role="alert" className="mb-[18px] rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]">
              {t('categories.failedToReorder')}
            </p>
          )}

          <Section>
            {orderedCategories.length === 0 && <EmptyNote>{t('categories.empty')}</EmptyNote>}
            {orderedCategories.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={orderedCategories.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
                  {orderedCategories.map((cat) => (
                    <SortableCategoryItem
                      key={cat.id}
                      cat={cat}
                      shopId={shopId!}
                      selected={wide && cat.id === selectedId}
                      onOpen={() => open(cat)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </Section>
        </>
      )}

      {showModal && (
        <CreateCategoryModal
          shopId={shopId!}
          existingCount={orderedCategories.length}
          onClose={closeModal}
        />
      )}
    </SplitPage>
  );
}
