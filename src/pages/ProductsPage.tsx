import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { MenuLanguage, ProductResponse } from '../services/api';
import {
  useGetProductsByShopQuery,
  useGetCategoriesByShopQuery,
  useGetShopByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
} from '../services/api';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { getCurrencySymbol } from '../utils/currency';
import { formatCents } from '../utils/money';
import { Plus, Search, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  type VariantGroup, type VariantOption, type AddonGroup, type AddonOption,
  type StepNum,
  StepIndicator, Step1Basics, StepFoodInfo, StepCategories, Step4Customise, Step6Review,
} from './ProductWizardSteps';
import { useUploadProductImage } from '../features/menu/useUploadProductImage';
import { createDishWithPhoto, dishPhotoMissing } from '../features/menu/productImage';
import { isWrongSizeError } from '../features/images/imageRules';
import { useShopReferenceLists } from '../features/menu/useShopReferenceLists';
import { EMPTY_FOOD_INFO, effectiveTaxClassId, labelFor, taxClassOptionLabel } from '../features/menu/foodInfo';
import type { FoodInfo } from '../features/menu/foodInfo';
import { isListRefreshing } from '../features/menu/productListStatus';
import { wizardBackAction, wizardStepSequence } from '../features/menu/wizardSteps';
import { importRowToCreateRequest, type MenuImportRow } from '../features/menu/menuImport';
import type { PreviewDish } from '../features/menu/previewBridge';
import { DishEditor } from '../components/menu/DishEditor';
import { LivePreview } from '../components/menu/LivePreview';

// ── Bulk import types ──────────────────────────────────────────────────────────

type ImportRow = MenuImportRow;
type ImportStep = 'upload' | 'preview' | 'importing' | 'done';
// ── Add Product Modal (5-step wizard) ─────────────────────────────────────────

interface AddProductModalProps {
  shopId: string;
  onClose: () => void;
}

function AddProductModal({ shopId, onClose }: AddProductModalProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();

  const { data: shop } = useGetShopByIdQuery({ shopId });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const { data: categories } = useGetCategoriesByShopQuery({ shopId });
  const [createProduct, { isLoading, isError, error }] = useCreateProductMutation();
  const uploadProductImage = useUploadProductImage();
  const { refs } = useShopReferenceLists(shopId);

  const categoriesList = (categories ?? []).filter(
    (c): c is { id: string; name: string; taxClassId?: string | null } => !!c.id && !!c.name,
  );

  const [mode, setMode] = useState<'simple' | 'extended'>('simple');
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const stepSequence = wizardStepSequence(mode);
  const isFirstStep = step === stepSequence[0];
  const isLastStep = step === stepSequence[stepSequence.length - 1];

  const [form, setForm] = useState({ name: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoTried, setPhotoTried] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [foodInfo, setFoodInfo] = useState<FoodInfo>(EMPTY_FOOD_INFO);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  // Set when the dish was created but its photo upload failed: the next attempt only retries the photo.
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);

  const [nameError, setNameError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);

  // Variant helpers
  const addVariantGroup = () => setVariantGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', options: [] }]);
  const removeVariantGroup = (id: string) => setVariantGroups((gs) => gs.filter((g) => g.id !== id));
  const updateVariantGroupName = (id: string, name: string) => setVariantGroups((gs) => gs.map((g) => g.id === id ? { ...g, name } : g));
  const addVariantOption = (groupId: string) => setVariantGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g));
  const removeVariantOption = (groupId: string, optionId: string) => setVariantGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g));
  const updateVariantOption = (groupId: string, optionId: string, patch: Partial<VariantOption>) => setVariantGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: g.options.map((o) => o.id === optionId ? { ...o, ...patch } : o) } : g));

  // Addon helpers
  const addAddonGroup = () => setAddonGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', minSelectable: 0, maxSelectable: 1, options: [] }]);
  const removeAddonGroup = (id: string) => setAddonGroups((gs) => gs.filter((g) => g.id !== id));
  const updateAddonGroup = (id: string, patch: Partial<AddonGroup>) => setAddonGroups((gs) => gs.map((g) => g.id === id ? { ...g, ...patch } : g));
  const addAddonOption = (groupId: string) => setAddonGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g));
  const removeAddonOption = (groupId: string, optionId: string) => setAddonGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g));
  const updateAddonOption = (groupId: string, optionId: string, patch: Partial<AddonOption>) => setAddonGroups((gs) => gs.map((g) => g.id === groupId ? { ...g, options: g.options.map((o) => o.id === optionId ? { ...o, ...patch } : o) } : g));

  function validateStep(s: StepNum): boolean {
    if (s === 1) {
      const ne = form.name.trim() === '';
      const de = form.description.trim() === '';
      const pe = dishPhotoMissing(imageFile, null);
      setNameError(ne); setDescError(de); setPhotoTried(true);
      return !ne && !de && !pe;
    }
    if (s === 2) {
      const hasNoCategory = selectedCategoryIds.length === 0;
      setCategoryError(hasNoCategory);
      return !hasNoCategory;
    }
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    const idx = stepSequence.indexOf(step);
    setDirection('forward');
    setStep(stepSequence[idx + 1]);
  }
  function goBack() {
    const back = wizardBackAction(stepSequence, step);
    if (back.kind === 'exit') { onClose(); return; }
    setDirection('back');
    setStep(back.step);
  }
  function jumpTo(n: StepNum) { setDirection(n < step ? 'back' : 'forward'); setStep(n); }

  const handleSubmit = async () => {
    if (dishPhotoMissing(imageFile, null) || !imageFile) {
      setPhotoTried(true);
      setDirection('back');
      setStep(1);
      return;
    }
    try {
      const result = await createDishWithPhoto({
        existingProductId: createdProductId,
        createDish: async () => {
          const product = await createProduct({
            createProductRequest: {
              shopId,
              name: form.name,
              description: form.description,
              price: form.price,
              categoryIds: selectedCategoryIds,
              variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
              addonGroups: addonGroups.length > 0 ? addonGroups : undefined,
              allergenIds: foodInfo.allergenIds,
              additiveIds: foodInfo.additiveIds,
              dietaryTagIds: foodInfo.dietaryTagIds,
              spiceLevel: foodInfo.spiceLevel,
              prepMinutes: foodInfo.prepMinutes,
              // The dish owns its class: the one picked by hand, else its category's suggestion
          taxClassId: effectiveTaxClassId(selectedCategoryIds, categoriesList, foodInfo.taxClassId),
              unavailableModes: foodInfo.unavailableModes,
            },
          }).unwrap();
          return product.id!;
        },
        uploadPhoto: async (productId) => {
          setIsUploading(true);
          try {
            await uploadProductImage(shopId, productId, imageFile);
          } finally {
            setIsUploading(false);
          }
        },
      });
      if (result.status === 'photo-failed') {
        // The dish exists but has no photo: keep the window open, say so, and let the owner retry just the upload.
        setCreatedProductId(result.productId);
        toast.error(t(isWrongSizeError(result.error) ? 'products.productImageWrongSize' : 'products.failedToUploadImage'));
        return;
      }
      toast.success(t('products.created'));
      onClose();
    } catch {
      // createProduct failed: nothing was created; the existing isError banner explains.
    }
  };

  const isBusy = isLoading || isUploading;
  const submitLabel = isLoading ? t('products.creating') : isUploading ? t('products.uploadingImage') : createdProductId ? t('products.retryPhotoUpload') : t('products.create');
  const stepSubtitles: Record<StepNum, string> = {
    1: t('products.wizardStep1Subtitle'),
    2: t('products.wizardStep2Subtitle'),
    3: t('products.wizardStep3Subtitle'),
    4: t('products.wizardStep4Subtitle'),
    6: t('products.wizardStep6Subtitle'),
  };
  const effectiveTaxClassLabelId = effectiveTaxClassId(selectedCategoryIds, categoriesList, foodInfo.taxClassId);
  const effectiveTaxClassLabel = effectiveTaxClassLabelId
    ? taxClassOptionLabel(
        labelFor((refs?.taxClasses ?? []).find((c) => c.id === effectiveTaxClassLabelId)?.labels ?? { de: '', en: '' }, i18n.language),
        effectiveTaxClassLabelId,
        refs,
        i18n.language,
      )
    : t('products.taxClassNoneYet');

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('products.newProduct')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{stepSubtitles[step]}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['simple', 'extended'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setStep(1); setDirection('forward'); }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      mode === m ? 'bg-gray-900 text-white' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(m === 'simple' ? 'products.modeSimple' : 'products.modeExtended')}
                  </button>
                ))}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Step indicator */}
          <div className="px-6 pt-4 flex-shrink-0">
            <StepIndicator currentStep={step} onJump={jumpTo} stepSequence={stepSequence} />
          </div>

          {/* Step content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {createdProductId && (
              <div role="alert" className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-800">{t('products.createdWithoutPhoto')}</p>
              </div>
            )}
            {isError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">
                  {(error as { data?: { error?: string } })?.data?.error ?? t('products.failedToCreate')}
                </p>
              </div>
            )}
            <div key={step} className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
              {step === 1 && <Step1Basics form={form} setForm={setForm} imageFile={imageFile} setImageFile={setImageFile} currencySymbol={currencySymbol} nameError={nameError} descError={descError} photoError={photoTried && dishPhotoMissing(imageFile, null)} />}
              {step === 2 && <StepCategories shopId={shopId} categories={categoriesList} selectedCategoryIds={selectedCategoryIds} setSelectedCategoryIds={setSelectedCategoryIds} taxClasses={refs?.taxClasses ?? []} taxRefs={refs} taxClassOverride={foodInfo.taxClassId} setTaxClassOverride={(id) => setFoodInfo({ ...foodInfo, taxClassId: id })} categoryError={categoryError} />}
              {step === 3 && <StepFoodInfo foodInfo={foodInfo} setFoodInfo={setFoodInfo} refs={refs} showOptional={mode === 'extended'} />}
              {step === 4 && <Step4Customise variantGroups={variantGroups} addVariantGroup={addVariantGroup} removeVariantGroup={removeVariantGroup} updateVariantGroupName={updateVariantGroupName} addVariantOption={addVariantOption} removeVariantOption={removeVariantOption} updateVariantOption={updateVariantOption} addonGroups={addonGroups} addAddonGroup={addAddonGroup} removeAddonGroup={removeAddonGroup} updateAddonGroup={updateAddonGroup} addAddonOption={addAddonOption} removeAddonOption={removeAddonOption} updateAddonOption={updateAddonOption} />}
              {step === 6 && <Step6Review form={form} imageFile={imageFile} selectedCategoryIds={selectedCategoryIds} categories={categoriesList} variantGroups={variantGroups} addonGroups={addonGroups} currencySymbol={currencySymbol} foodInfo={foodInfo} refs={refs} effectiveTaxClassLabel={effectiveTaxClassLabel} />}
            </div>
          </div>

          {/* Footer navigation */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 flex-shrink-0">
            {isFirstStep && (
              <>
                <MyButton type="button" variant="secondary" onClick={onClose}>{t('products.cancel')}</MyButton>
                <div className="flex-1" />
                <MyButton type="button" onClick={goNext}>{t('products.wizardNext')} →</MyButton>
              </>
            )}
            {!isFirstStep && !isLastStep && (
              <>
                <MyButton type="button" variant="secondary" onClick={goBack}>← {t('products.wizardBack')}</MyButton>
                <div className="flex-1" />
                {(step === 3 || (mode === 'extended' && step === 4)) && (
                  <MyButton type="button" variant="ghost" onClick={goNext}>{t('products.wizardSkip')}</MyButton>
                )}
                <MyButton type="button" onClick={goNext}>{t('products.wizardNext')} →</MyButton>
              </>
            )}
            {isLastStep && (
              <>
                <MyButton type="button" variant="secondary" onClick={goBack}>← {t('products.wizardBack')}</MyButton>
                <div className="flex-1" />
                <MyButton type="button" disabled={isBusy} onClick={handleSubmit}>{submitLabel}</MyButton>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Bulk Import Modal ──────────────────────────────────────────────────────────

function BulkImportModal({ shopId, onClose }: { shopId: string; onClose: () => void }) {
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const [createProduct] = useCreateProductMutation();

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
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error('JSON must be an array');
        const mapped: ImportRow[] = parsed.map((item: Record<string, unknown>, idx: number) => {
          if (typeof item.name !== 'string' || !item.name.trim())
            throw new Error(`Item ${idx + 1}: "name" is required`);
          if (typeof item.description !== 'string')
            throw new Error(`Item ${idx + 1}: "description" is required`);
          return {
            name: item.name,
            description: item.description,
            price: item.price == null ? null : Number(item.price),
          };
        });
        setParseError(null);
        setRows(mapped);
        setStep('preview');
      } catch (err) {
        setParseError((err as Error).message);
      }
    };
    reader.readAsText(file);
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
          createProductRequest: importRowToCreateRequest(shopId, row),
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-base font-semibold text-gray-900">Import Products</h2>
            {step !== 'importing' && (
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={16} />
              </button>
            )}
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Upload step */}
            {step === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload a JSON file containing an array of products with{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">name</code>,{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">description</code>,{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">price</code>.
                  Photos are not imported (any image_url is ignored) — add each dish's photo in the dish editor afterwards.
                </p>
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

/** A dish still missing something before it can be on the menu: allergens declared, a photo, a category. */
function isIncomplete(p: ProductResponse): boolean {
  return p.isDeclared === false || !p.images?.length || !p.categories?.length;
}

function passes(p: ProductResponse, filter: DishFilter, available: boolean): boolean {
  if (filter === 'onMenu') return available && p.isDeclared !== false;
  if (filter === 'off') return !available;
  if (filter === 'incomplete') return isIncomplete(p);
  return true;
}

function DishRow({
  product,
  available,
  toggling,
  selected,
  currencyMoney,
  onOpen,
  onToggle,
}: {
  product: ProductResponse;
  available: boolean;
  toggling: boolean;
  selected: boolean;
  currencyMoney: (cents: number) => string;
  onOpen: () => void;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const imageUrl = product.images?.length ? product.images[product.images.length - 1].url : undefined;
  const groups = (product.variantGroups?.length ?? 0) + (product.addonGroups?.length ?? 0);
  const offer = product.schedule?.offerPrice != null ? product.schedule : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`flex cursor-pointer items-center gap-3.5 border-b border-[#f6f1eb] px-4 py-2.5 transition-colors last:border-b-0 hover:bg-cream focus:outline-none focus-visible:bg-cream ${
        selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
      }`}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className={`h-[42px] w-14 flex-shrink-0 rounded-lg object-cover ${available ? '' : 'opacity-50'}`} />
      ) : (
        <span className="flex h-[42px] w-14 flex-shrink-0 items-center justify-center rounded-lg bg-[#f6f1eb] text-[11px] text-[#b9ada2]">
          {t('dishes.photo')}
        </span>
      )}
      <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${available ? '' : 'opacity-55'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold">{product.name}</span>
          {offer && (
            <span className="rounded-full bg-[#fdeee6] px-2 py-0.5 text-[11px] font-bold text-[#7c2a09]">
              {offer.offerLabel || t('products.offerBadge')} · {currencyMoney(offer.offerPrice!)}
            </span>
          )}
        </div>
        {product.description && <span className="truncate text-[13px] text-[#6b6058]">{product.description}</span>}
        {product.isDeclared === false ? (
          <span className="self-start rounded-full bg-[#fff6e0] px-2 py-0.5 text-xs font-semibold text-[#8a5a00]">{t('products.notOnMenu')}</span>
        ) : !imageUrl ? (
          <span className="self-start rounded-full bg-[#fff6e0] px-2 py-0.5 text-xs font-semibold text-[#8a5a00]">{t('dishes.missingPhoto')}</span>
        ) : null}
      </div>
      <span className="hidden w-[110px] text-[13px] text-[#6b6058] md:block">
        {groups > 0 ? t('dishes.optionGroups', { count: groups }) : '–'}
      </span>
      <span className="w-20 text-right text-[15px] font-bold">{currencyMoney(product.price ?? 0)}</span>
      <button
        type="button"
        role="switch"
        aria-checked={available}
        aria-label={t('dishes.availableFor', { name: product.name })}
        disabled={toggling}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
          available ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
        }`}
      >
        <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${available ? 'right-[3px]' : 'left-[3px]'}`} />
      </button>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

/**
 * ProductsPage ("Gerichte") — the dish list grouped by category with filters and search; clicking a
 * dish opens it in the single-page editor. The live preview (the real storefront) sits on the right
 * and follows: it outlines the dish, shows unsaved edits, and opens a dish here when clicked there.
 */
export function ProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: products, isLoading, isFetching, isError } = useGetProductsByShopQuery({ shopId: shopId! });
  const isRefreshing = isListRefreshing({ isLoading, isFetching });
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const { data: categories } = useGetCategoriesByShopQuery({ shopId: shopId! });
  const [updateProduct] = useUpdateProductMutation();
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '€';
  const money = (cents: number) => formatCents(cents, shop?.currency ?? 'EUR', i18n.language);

  const selectedId = searchParams.get('dish');
  const setParam = (key: string, value: string | null) =>
    setSearchParams((p) => {
      const n = new URLSearchParams(p);
      if (value === null) n.delete(key);
      else n.set(key, value);
      return n;
    });
  const showAddModal = searchParams.get('addProduct') === '1';
  const showImportModal = searchParams.get('importProducts') === '1';

  const [filter, setFilter] = useState<DishFilter>('all');
  const [query, setQuery] = useState('');
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  // Live preview state
  const [previewDish, setPreviewDish] = useState<PreviewDish | null>(null);
  const [previewLanguage, setPreviewLanguage] = useState<MenuLanguage | undefined>();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const onPreviewChange = useCallback((dish: PreviewDish | null, lang: MenuLanguage | undefined) => {
    setPreviewDish(dish);
    setPreviewLanguage(lang);
  }, []);
  useEffect(() => {
    setPreviewOpen(!!selectedId);
    if (!selectedId) setPreviewDish(null);
  }, [selectedId]);

  const categoriesList = (categories ?? []).filter(
    (c): c is { id: string; name: string; taxClassId?: string | null } => !!c.id && !!c.name,
  );

  const availableOf = (p: ProductResponse) => optimistic[p.id!] ?? p.isAvailable !== false;

  const toggle = async (product: ProductResponse) => {
    const id = product.id!;
    if (toggling.has(id)) return;
    const current = availableOf(product);
    const next = !current;
    if (next && !product.categories?.length) {
      toast.error(t('products.availabilityRequiresCategory'));
      return;
    }
    setOptimistic((o) => ({ ...o, [id]: next }));
    setToggling((s) => new Set(s).add(id));
    try {
      await updateProduct({ productId: id, updateProductRequest: { shopId: shopId!, isAvailable: next } }).unwrap();
      setRefreshKey((k) => k + 1);
    } catch {
      setOptimistic((o) => ({ ...o, [id]: current }));
      toast.error(t('products.failedToUpdate'));
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    }
  };

  const all = products ?? [];
  const q = query.trim().toLowerCase();
  const shown = all.filter((p) => passes(p, filter, availableOf(p)) && (!q || (p.name ?? '').toLowerCase().includes(q)));
  const countOf = (f: DishFilter) => all.filter((p) => passes(p, f, availableOf(p))).length;

  // Group by category (sorted as on the menu); dishes without one at the end
  const categoryMap = new Map<string, { id: string; name: string; sortOrder: number }>();
  for (const product of all) {
    for (const cat of product.categories ?? []) {
      if (cat.id && !categoryMap.has(cat.id)) categoryMap.set(cat.id, { id: cat.id, name: cat.name ?? '', sortOrder: cat.sortOrder ?? 0 });
    }
  }
  const groups = [...categoryMap.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((cat) => ({ id: cat.id, name: cat.name, items: shown.filter((p) => p.categories?.some((c) => c.id === cat.id)) }));
  const uncategorized = shown.filter((p) => !p.categories?.length);
  if (uncategorized.length) groups.push({ id: '_none', name: t('products.uncategorized'), items: uncategorized });
  const visibleGroups = groups.filter((g) => g.items.length > 0);

  const chip = (on: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
      on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-cream'
    }`;

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
        <label className="flex h-10 w-[260px] items-center gap-2 rounded-[10px] border border-[#e3d9ce] bg-white px-3 focus-within:border-ink">
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
          <button key={f} type="button" aria-pressed={filter === f} className={chip(filter === f)} onClick={() => setFilter(f)}>
            {t(`dishes.filter.${f}`)}
            <span className="text-xs opacity-70">{countOf(f)}</span>
          </button>
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

      <div aria-busy={isRefreshing} className="min-h-0 flex-1 overflow-y-auto px-7 pb-7">
        {all.length === 0 && <p className="text-sm text-[#8a7f77]">{t('products.empty')}</p>}
        {all.length > 0 && visibleGroups.length === 0 && <p className="text-sm text-[#8a7f77]">{t('dishes.noMatch')}</p>}
        {visibleGroups.map((g) => (
          <section key={g.id} className="mb-[18px] overflow-hidden rounded-2xl border border-line bg-white">
            <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
              <h2 className="text-[15px] font-bold">{g.name}</h2>
              <span className="text-[13px] text-[#8a7f77]">{g.items.length}</span>
            </div>
            {g.items.map((p) => (
              <DishRow
                key={p.id}
                product={p}
                available={availableOf(p)}
                toggling={toggling.has(p.id!)}
                selected={p.id === selectedId}
                currencyMoney={money}
                onOpen={() => setParam('dish', p.id!)}
                onToggle={() => void toggle(p)}
              />
            ))}
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
        ) : selectedId ? (
          <DishEditor
            key={selectedId}
            productId={selectedId}
            shopId={shopId!}
            currencySymbol={currencySymbol}
            categoriesList={categoriesList}
            onClose={() => setParam('dish', null)}
            onSaved={() => setRefreshKey((k) => k + 1)}
            onDeleted={() => {
              setParam('dish', null);
              setRefreshKey((k) => k + 1);
            }}
            onPreviewChange={onPreviewChange}
          />
        ) : (
          list
        )}
      </div>

      <LivePreview
        slug={shop?.slug}
        dish={previewDish}
        focusId={selectedId}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        onSelect={(id) => setParam('dish', id)}
        language={previewLanguage}
        refreshKey={refreshKey}
      />

      {showAddModal && <AddProductModal shopId={shopId!} onClose={() => setParam('addProduct', null)} />}
      {showImportModal && <BulkImportModal shopId={shopId!} onClose={() => setParam('importProducts', null)} />}
    </div>
  );
}
