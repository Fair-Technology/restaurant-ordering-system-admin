import { useModalA11y } from '../hooks/useModalA11y';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CategoryDto, ProductDto } from '../services/api';
import {
  useGetProductsByShopQuery,
  useGetCategoriesByShopQuery,
  useGetShopByIdQuery,
  useCreateProductMutation,
} from '../services/api';
import { useSetCategoryDishOrderMutation } from '../services/dishOrderApi';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { getCurrencySymbolOrDefault } from '../utils/currency';
import { formatCents } from '../utils/money';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DragHandleButton } from '../components/menu/DragHandle';
import { useDragHandleProps } from '../components/menu/useDragHandleProps';
import { applyOrder, sortByCategoryOrder } from '../features/menu/categoryOrder';
import { useCategoryDragReorder } from '../features/menu/useCategoryDragReorder';
import { useReorderSensors } from '../features/menu/useReorderSensors';
import { Chip } from '../components/layout/Page';
import { searchBoxClass } from '../components/layout/pageStyles';
import { AvailabilitySwitch } from '../components/menu/AvailabilitySwitch';
import { PhotoBlockedNote } from '../components/menu/PhotoBlockedNote';
import { Copy, Download, Plus, Search, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { buildExampleMenuImportFile, parseMenuImport } from '../features/menu/menuImport';
import { isIncomplete, isListRefreshing } from '../features/menu/productListStatus';
import { useSetAvailable } from '../features/menu/useSetAvailable';
import { importRowToCreateRequest, type MenuImportRow } from '../features/menu/menuImport';
import { Drawer } from '../components/ui/Drawer';
import { DishEditor } from '../components/menu/DishEditor';
import { AddDishPanel } from '../components/menu/AddDishPanel';
import { PageHeader, Section, SplitPage } from '../components/layout/Page';
import { usePageTitle } from '../features/layout/usePageTitle';

// ── Bulk import types ──────────────────────────────────────────────────────────

type ImportRow = MenuImportRow;
type ImportStep = 'upload' | 'preview' | 'importing' | 'done';
// ── Bulk Import Modal ──────────────────────────────────────────────────────────

export function BulkImportModal({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const currencySymbol = getCurrencySymbolOrDefault(shop?.currency);
  const { t } = useTranslation();
  const [createProduct] = useCreateProductMutation();
  const mouseDownOnOverlayRef = useRef(false);

  const [step, setStep] = useState<ImportStep>('upload');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [failures, setFailures] = useState<{ name: string; error: string }[]>([]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const mapped: ImportRow[] = parseMenuImport(ev.target?.result as string);
        setParseError(null);
        setRows(mapped);
        setStep('preview');
      } catch (err) {
        setParseError((err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const attemptClose = () => {
    if (step === 'importing') return;
    if (step === 'preview' && rows.length > 0) {
      if (!window.confirm(t('dishes.importModal.confirmDiscard'))) return;
    }
    onClose();
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose: attemptClose, containerRef });

  const downloadExample = () => {
    const url = URL.createObjectURL(new Blob([buildExampleMenuImportFile()], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dishes-import-example.json';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const updatePrice = (idx: number, value: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, price: value === '' ? null : Number(value) } : r)),
    );
  };

  const canImport = rows.length > 0 && rows.every((r) => r.price !== null && r.price >= 0);

  const handleImport = async () => {
    setStep('importing');
    setProgress(0);

    const errs: { name: string; error: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      setProgress(i + 1);
      try {
        await createProduct({
          createProductRequestDto: importRowToCreateRequest(shopId, row),
        }).unwrap();
      } catch {
        errs.push({ name: row.name, error: 'Failed to create' });
      }
    }
    setFailures(errs);
    setStep('done');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onMouseDown={(e) => { mouseDownOnOverlayRef.current = e.target === e.currentTarget; }}
        onMouseUp={(e) => {
          const started = mouseDownOnOverlayRef.current;
          mouseDownOnOverlayRef.current = false;
          if (started && e.target === e.currentTarget) attemptClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-products-title"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          ref={containerRef}
          className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        >

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
            <h2 id="import-products-title" className="text-base font-semibold text-gray-900">Import Products</h2>
            {step !== 'importing' && (
              <button onClick={attemptClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Upload step */}
            {step === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">{t('dishes.importModal.uploadHint')}</p>
                <button
                  type="button"
                  data-testid="download-example-file"
                  onClick={downloadExample}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 underline-offset-2 hover:underline"
                >
                  <Download size={14} />
                  {t('dishes.importModal.downloadExample')}
                </button>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-gray-400 transition-colors">
                  <span className="text-sm text-gray-400">Click to select a .json file</span>
                  <input type="file" accept=".json" className="hidden" onChange={handleFile} />
                </label>
                {parseError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {parseError}
                  </p>
                )}
              </div>
            )}

            {/* Preview step */}
            {step === 'preview' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">
                  {rows.length} products found. Fix any prices marked in red before importing.
                </p>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left w-24">Price ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                          <td className="px-3 py-2 text-gray-500 max-w-xs">
                            <span className="line-clamp-2">{row.description}</span>
                          </td>
                          <td className="px-3 py-2">
                            {row.price === null ? (
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="w-20 px-2 py-1 text-sm border border-red-400 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400"
                                onBlur={(e) => updatePrice(idx, e.target.value)}
                              />
                            ) : (
                              <span className="text-gray-700">{row.price.toFixed(2)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Importing step */}
            {step === 'importing' && (
              <div className="flex flex-col items-center justify-center gap-4 py-10">
                <MySpinner label={`Creating product ${progress} of ${rows.length}…`} />
              </div>
            )}

            {/* Done step */}
            {step === 'done' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{rows.length - failures.length} of {rows.length}</span> products created successfully.
                </p>
                {failures.length > 0 && (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 space-y-1">
                    <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Failed</p>
                    {failures.map((f, i) => (
                      <p key={i} className="text-sm text-red-700">{f.name} — {f.error}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Footer */}
          {step === 'preview' && (
            <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <MyButton variant="secondary" onClick={() => setStep('upload')}>← Back</MyButton>
              <div className="flex-1" />
              <MyButton disabled={!canImport} onClick={handleImport}>
                Import {rows.length} products
              </MyButton>
            </div>
          )}
          {step === 'done' && (
            <div className="flex justify-end px-6 py-4 border-t border-gray-200 flex-shrink-0">
              <MyButton onClick={onClose}>Close</MyButton>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

// ── Dish list ──────────────────────────────────────────────────────────────────

type DishFilter = 'all' | 'onMenu' | 'off' | 'incomplete';

function passes(
  p: ProductDto,
  filter: DishFilter,
  available: boolean,
  brokenImageIds: ReadonlySet<string>,
): boolean {
  if (filter === 'onMenu') return available && p.isDeclared !== false;
  if (filter === 'off') return !available;
  if (filter === 'incomplete') return isIncomplete(p, brokenImageIds);
  return true;
}

/** Stops clicks on the controls inside a row from also opening the dish. */
const keepInside = (e: React.SyntheticEvent) => e.stopPropagation();

/**
 * Invisible probe that loads every dish's stored photo regardless of the active filter, so a
 * dead/broken image URL is caught even if the dish is never scrolled into view under the
 * current filter (e.g. the owner only ever looks at the "Incomplete" tab). `onBroken` fires at
 * most once per dish id.
 */
function ImageHealthProbe({ products, onBroken }: { products: ProductDto[]; onBroken: (id: string) => void }) {
  return (
    <div aria-hidden="true" className="hidden">
      {products
        .filter((p): p is ProductDto & { id: string } => !!p.id && !!p.images?.length)
        .map((p) => (
          <img
            key={p.id}
            src={p.images![p.images!.length - 1].url}
            alt=""
            onError={() => onBroken(p.id)}
          />
        ))}
    </div>
  );
}

function DishRow({
  product,
  available,
  toggling,
  selected,
  broken,
  currencyMoney,
  onOpen,
  onToggle,
  canManage,
  onDuplicate,
  photoBlockedMessage,
  dragHandle,
  rowRef,
  rowStyle,
}: {
  product: ProductDto;
  available: boolean;
  toggling: boolean;
  selected: boolean;
  broken: boolean;
  currencyMoney: (cents: number) => string;
  onOpen: () => void;
  onToggle: () => void;
  /** Only people who can manage the menu get the Duplicate action. */
  canManage: boolean;
  /** Opens the Add dish drawer pre-filled from this dish. */
  onDuplicate: () => void;
  /** Shown under the name right after the switch was refused because the dish has no photo. */
  photoBlockedMessage?: string;
  /** Drag handle, rendered first in the row; absent for rows that cannot be reordered. */
  dragHandle?: React.ReactNode;
  rowRef?: (node: HTMLElement | null) => void;
  rowStyle?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const imageUrl = product.images?.length ? product.images[product.images.length - 1].url : undefined;
  const effectiveImageUrl = broken ? undefined : imageUrl;
  const groups = (product.variantGroups?.length ?? 0) + (product.addonGroups?.length ?? 0);
  const offer = product.schedule?.offerPrice != null ? product.schedule : null;

  return (
    <div
      ref={rowRef}
      style={rowStyle}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer items-center gap-2.5 border-b border-[#f6f1eb] px-3 sm:gap-3.5 sm:px-4 py-2.5 transition-colors last:border-b-0 hover:bg-cream focus:outline-none focus-visible:bg-cream ${
        selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
      }`}
    >
      {dragHandle}
      {effectiveImageUrl ? (
        <img src={effectiveImageUrl} alt="" className={`h-[42px] w-14 flex-shrink-0 rounded-lg object-cover ${available ? '' : 'opacity-50'}`} />
      ) : (
        <span className="flex h-[42px] w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[#f6f1eb] text-[11px] text-[#b9ada2]">
          {t('dishes.photo')}
        </span>
      )}
      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${available ? '' : 'opacity-55'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold break-words">{product.name}</span>
          {offer && (
            <span className="rounded-full bg-[#fdeee6] px-2 py-0.5 text-[11px] font-bold text-[#7c2a09]">
              {offer.offerLabel || t('products.offerBadge')} · {currencyMoney(offer.offerPrice!)}
            </span>
          )}
        </div>
        {product.description && <span className="truncate text-[13px] text-[#6b6058]">{product.description}</span>}
        {product.isDeclared === false ? (
          <span className="self-start rounded-full bg-[#fff6e0] px-2 py-0.5 text-xs font-semibold text-[#8a5a00]">{t('products.notOnMenu')}</span>
        ) : !effectiveImageUrl ? (
          <span className="self-start rounded-full bg-[#fff6e0] px-2 py-0.5 text-xs font-semibold text-[#8a5a00]">{t('dishes.missingPhoto')}</span>
        ) : null}
        {photoBlockedMessage && <PhotoBlockedNote message={photoBlockedMessage} onAddPhoto={onOpen} />}
      </div>
      <span className="hidden w-[110px] text-[13px] text-[#6b6058] md:block">
        {groups > 0 ? t('dishes.optionGroups', { count: groups }) : '–'}
      </span>
      <span className="min-w-14 flex-shrink-0 text-right text-[15px] font-bold sm:w-20">{currencyMoney(product.price ?? 0)}</span>
      {canManage && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          onKeyDown={keepInside}
          aria-label={t('dishes.duplicateDish', { name: product.name })}
          title={t('dishes.duplicateDish', { name: product.name })}
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[#6b6058] hover:bg-sand hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
        >
          <Copy size={18} aria-hidden="true" />
        </button>
      )}
      <AvailabilitySwitch
        available={available}
        pending={toggling}
        ariaLabel={t('dishes.availableFor', { name: product.name })}
        onToggle={onToggle}
      />
    </div>
  );
}

type DishRowProps = Parameters<typeof DishRow>[0];

/** A dish row with a drag handle. When `dragEnabled` is false the handle stays visible but inert. */
function SortableDishRow({
  dragEnabled,
  reordering,
  ...rowProps
}: Omit<DishRowProps, 'dragHandle' | 'rowRef' | 'rowStyle'> & { dragEnabled: boolean; reordering: boolean }) {
  const { t } = useTranslation();
  const { attributes, listeners, setNodeRef, style } = useDragHandleProps(rowProps.product.id!, {
    dragEnabled,
    pending: reordering,
  });
  const handle = (
    <DragHandleButton
      attributes={attributes}
      listeners={listeners}
      pending={reordering}
      dragEnabled={dragEnabled}
      label={t('dishes.dragHandle')}
      disabledHint={t('dishes.reorderDisabledHint')}
    />
  );
  return <DishRow {...rowProps} dragHandle={handle} rowRef={setNodeRef} rowStyle={style} />;
}

// ── Page ───────────────────────────────────────────────────────────────────────

/**
 * ProductsPage ("Gerichte") — the dish list grouped by category with filters and search; clicking a
 * dish opens it in the single-page editor.
 */
export function ProductsPage() {
  usePageTitle('nav.dishes');
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const canManage = (shop?.callerPermissions ?? []).includes('manage_menu');
  const { data: products, isLoading, isFetching, isError } = useGetProductsByShopQuery(
    { shopId: shopId!, includeUncategorized: true },
    { skip: !canManage },
  );
  const isRefreshing = isListRefreshing({ isLoading, isFetching });
  const { data: categories } = useGetCategoriesByShopQuery({ shopId: shopId! }, { skip: !canManage });
  const { setAvailable } = useSetAvailable(shopId!);
  const currencySymbol = getCurrencySymbolOrDefault(shop?.currency);
  const money = (cents: number) => formatCents(cents, shop?.currency ?? 'EUR', i18n.language);

  const selectedId = searchParams.get('dish');
  const setParam = (key: string, value: string | null) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      if (value === null) n.delete(key);
      else n.set(key, value);
      return n;
    });
  };
  const showAddModal = searchParams.get('addProduct') === '1';
  const duplicateFromId = searchParams.get('duplicateFrom');
  // Opens Add dish pre-filled from a dish (closing the editor if it was open), in one URL change.
  const closeAdd = () => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.delete('addProduct');
      n.delete('duplicateFrom');
      return n;
    });
  };
  const openDuplicate = (id: string) => {
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      n.delete('dish');
      n.set('duplicateFrom', id);
      return n;
    });
  };
  const showImportModal = searchParams.get('importProducts') === '1';

  const [filter, setFilter] = useState<DishFilter>('all');
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  // The dish whose switch was just refused for having no photo; its row shows a hint for a few seconds.
  const [photoBlockedId, setPhotoBlockedId] = useState<string | null>(null);
  useEffect(() => {
    if (!photoBlockedId) return;
    const timer = setTimeout(() => setPhotoBlockedId(null), 4000);
    return () => clearTimeout(timer);
  }, [photoBlockedId]);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const [brokenImageIds, setBrokenImageIds] = useState<Set<string>>(new Set());
  const markImageBroken = useCallback((id: string) => {
    setBrokenImageIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const [setCategoryDishOrder] = useSetCategoryDishOrderMutation();
  const { orderOverrides, reorderError, savingOrderIds, handleDragEnd, clearStaleOverrides } = useCategoryDragReorder(
    (categoryId, productIds) => setCategoryDishOrder({ shopId: shopId!, categoryId, body: { productIds } }).unwrap(),
  );

  // Once fresh data arrives, the server's order replaces local overrides (except for a save still in flight).
  useEffect(() => {
    clearStaleOverrides();
  }, [products, clearStaleOverrides]);

  const sensors = useReorderSensors();

  if (shop && !canManage) {
    return (
      <SplitPage>
        <div className="px-7 pt-[22px]">
          <PageHeader eyebrow={t('nav.group.menu')} title={t('nav.dishes')} />
          <Section padded>
            <p className="text-sm text-[#4a413b]">{t('products.accessDenied')}</p>
          </Section>
        </div>
      </SplitPage>
    );
  }

  const categoriesList = (categories ?? []).filter(
    (c): c is CategoryDto => !!c.id && !!c.name,
  );

  const availableOf = (p: ProductDto) => optimistic[p.id!] ?? p.isAvailable !== false;

  const toggle = (product: ProductDto) => {
    const id = product.id!;
    if (toggling.has(id)) return;
    const current = availableOf(product);
    const next = !current;
    if (next && !product.categories?.length) {
      toast.error(t('products.availabilityRequiresCategory'));
      return;
    }
    setPhotoBlockedId(null);
    if (next && !product.images?.length) {
      toast.error(t('products.enableNeedsPhoto', { name: product.name }));
      setPhotoBlockedId(id);
      return;
    }
    setOptimistic((o) => ({ ...o, [id]: next }));
    setToggling((s) => new Set(s).add(id));
    void setAvailable(id, next, (ok) => {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
      if (!ok) {
        setOptimistic((o) => ({ ...o, [id]: current }));
      }
    }, product.name);
  };

  const all = products ?? [];
  const selectedDish = selectedId ? all.find((p) => p.id === selectedId) : undefined;
  const duplicateSource = duplicateFromId ? all.find((p) => p.id === duplicateFromId) : undefined;
  const q = query.trim().toLowerCase();
  const shown = all.filter((p) => passes(p, filter, availableOf(p), brokenImageIds) && (!q || (p.name ?? '').toLowerCase().includes(q)));
  const countOf = (f: DishFilter) => all.filter((p) => passes(p, f, availableOf(p), brokenImageIds)).length;

  // Group by category (sorted as on the menu); dishes without one at the end
  const categoryMap = new Map<string, { id: string; name: string; sortOrder: number }>();
  for (const product of all) {
    for (const cat of product.categories ?? []) {
      if (cat.id && !categoryMap.has(cat.id)) categoryMap.set(cat.id, { id: cat.id, name: cat.name ?? '', sortOrder: cat.sortOrder ?? 0 });
    }
  }
  const groups = [...categoryMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((cat) => {
      const inCat = sortByCategoryOrder(
        shown.filter((p) => p.categories?.some((c) => c.id === cat.id)),
        cat.id,
        (p) => p.categoryOrder?.[cat.id],
        (p) => p.name ?? '',
      );
      return { id: cat.id, name: cat.name, items: orderOverrides[cat.id] ? applyOrder(inCat, orderOverrides[cat.id], (p) => p.id!) : inCat };
    });
  const uncategorized = shown.filter((p) => !p.categories?.length);
  if (uncategorized.length) groups.push({ id: '_none', name: t('products.uncategorized'), items: uncategorized });
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const canReorder = canManage;
  // Reordering only makes sense on the natural, unfiltered list
  const dragActive = filter === 'all' && q === '';

  const renderRow = (p: ProductDto, dragEnabled?: boolean, groupId?: string) => {
    const rowProps = {
      product: p,
      available: availableOf(p),
      toggling: toggling.has(p.id!),
      selected: p.id === selectedId,
      broken: brokenImageIds.has(p.id!),
      currencyMoney: money,
      onOpen: () => setParam('dish', p.id!),
      onToggle: () => toggle(p),
      canManage,
      onDuplicate: () => openDuplicate(p.id!),
      photoBlockedMessage: photoBlockedId === p.id ? t('products.enableNeedsPhotoInline') : undefined,
    };
    return dragEnabled === undefined ? (
      <DishRow key={p.id} {...rowProps} />
    ) : (
      <SortableDishRow key={p.id} dragEnabled={dragEnabled} reordering={!!groupId && savingOrderIds.has(groupId)} {...rowProps} />
    );
  };

  const list = (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-end justify-between gap-4 px-7 pb-3.5 pt-[22px]">
        <div>
          <div className="text-[13px] text-[#6b6058]">{t('nav.group.menu')}</div>
          <h1 className="mt-0.5 font-display text-[30px] font-semibold leading-tight">
            {t('nav.dishes')} <span className="font-sans text-[15px] font-medium text-[#6b6058]">{all.length}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <MyButton variant="secondary" onClick={() => setParam('importProducts', '1')}>
            {t('dishes.import')}
          </MyButton>
          <MyButton size="lg" className="gap-2" onClick={() => setParam('addProduct', '1')}>
            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            {t('dishes.add')}
          </MyButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-7 pb-3.5">
        <label className={`${searchBoxClass} focus-within:border-ink`}>
          <Search size={16} className="text-[#8a7f77]" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('dishes.search')}
            aria-label={t('dishes.search')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        {(['all', 'onMenu', 'off', 'incomplete'] as const).map((f) => (
          <Chip key={f} active={filter === f} count={countOf(f)} onClick={() => setFilter(f)}>
            {t(`dishes.filter.${f}`)}
          </Chip>
        ))}
        <span role="status" className="ml-auto flex items-center gap-2 text-[13px] text-[#6b6058]">
          {isRefreshing && (
            <>
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#e3d9ce] border-t-[#6b6058]" />
              {t('products.refreshing')}
            </>
          )}
        </span>
      </div>

      <ImageHealthProbe products={all} onBroken={markImageBroken} />

      <div aria-busy={isRefreshing} className="min-h-0 flex-1 overflow-y-auto px-7 pb-7">
        {reorderError && (
          <p role="alert" className="mb-[18px] rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]">
            {t('dishes.failedToReorder')}
          </p>
        )}
        {all.length === 0 && <p className="text-sm text-[#8a7f77]">{t('products.empty')}</p>}
        {all.length > 0 && visibleGroups.length === 0 && <p className="text-sm text-[#8a7f77]">{t('dishes.noMatch')}</p>}
        {visibleGroups.map((g) => (
          <section key={g.id} className="mb-[18px] overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
              <h2 className="text-[15px] font-bold">{g.name}</h2>
              <span className="text-[13px] text-[#8a7f77]">{g.items.length}</span>
            </div>
            {g.id === '_none' ? g.items.map((p) => renderRow(p)) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(g.id, g.items.map((p) => p.id!), () => toast.success(t('dishes.reordered')))}>
                <SortableContext items={g.items.map((p) => p.id!)} strategy={verticalListSortingStrategy}>
                  {g.items.map((p) => renderRow(p, canReorder && dragActive, g.id))}
                </SortableContext>
              </DndContext>
            )}
          </section>
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        {isLoading ? (
          <MySpinner label={t('products.loading')} />
        ) : isError ? (
          <p className="p-7 text-[#b42318]">{t('products.loadError')}</p>
        ) : (
          list
        )}
      </div>

      {selectedId && (
        <Drawer
          label={selectedDish ? t('dishes.editor.dialogLabel', { name: selectedDish.name }) : t('dishes.editor.untitledDish')}
          onClose={() => setParam('dish', null)}
          widthClassName="sm:w-[1240px] sm:max-w-full"
        >
          <DishEditor
            key={selectedId}
            productId={selectedId}
            shopId={shopId!}
            currencySymbol={currencySymbol}
            categoriesList={categoriesList}
            onClose={() => setParam('dish', null)}
            onSaved={() => {}}
            onDeleted={() => setParam('dish', null)}
            canManage={canManage}
            onDuplicate={() => openDuplicate(selectedId)}
          />
        </Drawer>
      )}

      {(showAddModal || duplicateSource) && (
        <Drawer label={t('dishForm.newDish')} onClose={closeAdd} widthClassName="sm:w-[1240px] sm:max-w-full">
          <AddDishPanel
            key={duplicateSource?.id ?? 'new'}
            shopId={shopId!}
            currencySymbol={currencySymbol}
            categoriesList={categoriesList}
            onClose={closeAdd}
            duplicateFrom={duplicateSource}
          />
        </Drawer>
      )}
      {showImportModal && <BulkImportModal shopId={shopId!} onClose={() => setParam('importProducts', null)} />}
    </div>
  );
}
