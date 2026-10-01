import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
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
import { GripVertical, Pencil, X } from 'lucide-react';
import { IconPickerInline } from '../components/ui/IconPicker';
import {
  useGetCategoriesByShopQuery,
  useUpdateCategoryMutation,
  useCreateCategoryMutation,
} from '../services/api';
import type { GetCategoriesByShopApiResponse } from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { useToast } from '../contexts/ToastContext';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { labelFor } from '../features/menu/foodInfo';

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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('categories.newCategory')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{t('categories.createSubtitle')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-5 space-y-4">
              {isError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">
                    {(error as { data?: { error?: string } })?.data?.error ?? t('categories.failedToCreate')}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2">
                <IconPickerInline value={icon} onChange={setIcon} />
                <MyInput
                  type="text"
                  required
                  placeholder={t('categories.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1"
                />
              </div>
              {(refs?.taxClasses.length ?? 0) > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-gray-700">{t('categories.taxClass')}</label>
                  <select
                    value={taxClassId}
                    onChange={(e) => setTaxClassOverride(e.target.value)}
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
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-6 pb-5">
              <MyButton type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? t('categories.creating') : t('categories.create')}
              </MyButton>
              <MyButton type="button" variant="secondary" onClick={onClose}>
                {t('products.cancel')}
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
}

function SortableCategoryItem({ cat, shopId }: SortableCategoryItemProps) {
  const { t, i18n } = useTranslation();
  const [updateCategory] = useUpdateCategoryMutation();
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

  return (
    <div ref={setNodeRef} style={style} className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-5 py-4">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none"
        aria-label={t('categories.dragHandle')}
        type="button"
      >
        <GripVertical size={18} />
      </button>

      {/* Icon picker */}
      <IconPickerInline value={cat.icon ?? null} onChange={handleIconChange} />

      {/* Name */}
      <div className="flex items-center gap-2 min-w-0">
        <p className="font-medium text-gray-900 truncate">{cat.name}</p>
        {taxClass && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 flex-shrink-0">
            {labelFor(taxClass.labels, i18n.language)}
          </span>
        )}
      </div>

      {/* Edit */}
      <Link
        to={`/shops/${shopId}/categories/${cat.id}/edit`}
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        aria-label={t('categories.edit')}
      >
        <Pencil size={15} />
      </Link>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function CategoriesPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const toast = useToast();
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

  const showModal = searchParams.get('addCategory') === '1';
  const closeModal = () => setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('addCategory'); return n; });

  if (isLoading) return <MySpinner label={t('categories.loading')} />;
  if (isError) return <p className="text-red-500">{t('categories.loadError')}</p>;

  return (
    <>
      <div className="space-y-4">
        {reorderError && (
          <MyCard className="p-4 !bg-red-50 !border-red-200">
            <p className="text-sm text-red-600">{t('categories.failedToReorder')}</p>
          </MyCard>
        )}

        <MyCard>
          {orderedCategories.length === 0 && !isLoading && (
            <p className="p-5 text-gray-400 text-sm">{t('categories.empty')}</p>
          )}
          {orderedCategories.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedCategories.map((c) => c.id!)} strategy={verticalListSortingStrategy}>
                {/* Header row */}
                <div className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-3 px-5 py-2 border-b border-gray-100">
                  <span className="w-4.5" />
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Icon</span>
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{t('categories.name')}</span>
                  <span className="w-7" />
                </div>
                <div className="divide-y divide-gray-200">
                  {orderedCategories.map((cat) => (
                    <SortableCategoryItem key={cat.id} cat={cat} shopId={shopId!} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </MyCard>
      </div>

      {showModal && (
        <CreateCategoryModal
          shopId={shopId!}
          existingCount={orderedCategories.length}
          onClose={closeModal}
        />
      )}
    </>
  );
}
