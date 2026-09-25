import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { ProductResponse } from '../services/api';
import {
  useGetProductsByShopQuery,
  useGetProductByIdQuery,
  useGetCategoriesByShopQuery,
  useGetShopByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGenerateUploadUrlMutation,
  useAddProductImageMutation,
} from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MySpinner } from '../components/ui/MySpinner';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { getCurrencySymbol } from '../utils/currency';
import { Calendar, Pencil, Trash2, X } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import {
  type VariantGroup, type VariantOption, type AddonGroup, type AddonOption,
  type StepNum, type ScheduleState, type SpecialInfoItem,
  StepIndicator, Step1Basics, StepSpecialInfo, StepCategories, Step4Customise, Step5Schedule, Step6Review,
} from './ProductWizardSteps';
import { LucideIconByName } from '../components/ui/IconPicker';

// ── Bulk import types ──────────────────────────────────────────────────────────

type ImportRow = {
  name: string;
  description: string;
  price: number | null;
  image_url: string | null;
};
type ImportStep = 'upload' | 'preview' | 'importing' | 'done';

// ── Product detail view (read-only) ───────────────────────────────────────────

function ProductDetailView({
  product,
  currencySymbol,
  shopId,
  onEdit,
  onDeleted,
  onClose,
}: {
  product: ProductResponse;
  currencySymbol: string;
  shopId: string;
  onEdit: () => void;
  onDeleted: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const imageUrl = product.images?.length ? product.images[product.images.length - 1].url : undefined;

  const handleDelete = async () => {
    try {
      await deleteProduct({ productId: product.id!, shopId }).unwrap();
      toast.success(t('products.deleted'));
      onDeleted();
    } catch {
      toast.error(t('products.failedToDelete'));
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('products.detailTitle')}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{t('products.detailSubtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title={t('products.edit')}
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title={t('products.delete')}
          >
            <Trash2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Delete confirmation strip */}
      {confirmDelete && (
        <div className="px-6 py-2.5 bg-red-50 border-b border-red-100 flex items-center gap-3 flex-shrink-0">
          <span className="flex-1 text-sm text-red-700">{t('products.deleteWarning')}</span>
          <button
            disabled={isDeleting}
            onClick={handleDelete}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
          >
            {isDeleting ? '…' : t('products.confirmDelete')}
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            {t('products.cancel')}
          </button>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Image + name/price row */}
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
            {imageUrl ? (
              <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-gray-300 font-bold text-3xl">
                  {product.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 space-y-1.5 pt-1">
            <div className="flex items-center gap-1.5">
              <p className="text-base font-semibold text-gray-900 leading-tight">{product.name}</p>
              {product.schedule && <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />}
            </div>
            <p className="text-sm font-medium text-gray-700">
              {currencySymbol}{((product.price ?? 0) / 100).toFixed(2)}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${
                product.isAvailable !== false
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-gray-100 border-gray-200 text-gray-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${product.isAvailable !== false ? 'bg-emerald-500' : 'bg-gray-300'}`} />
              {product.isAvailable !== false ? t('products.available') : t('products.unavailable')}
            </span>
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
            {t('products.detailDescription')}
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            {product.description || <span className="text-gray-300 italic">{t('products.noDescription')}</span>}
          </p>
        </div>

        {/* Schedule & Special Price */}
        {product.schedule && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t('products.scheduleModalTitle')}
            </p>
            <div className="rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
              {/* Date range */}
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-gray-500">{t('products.scheduleStartDate')}</span>
                <span className="text-xs font-medium text-gray-800">{product.schedule.startDate}</span>
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs text-gray-500">{t('products.scheduleEndDate')}</span>
                <span className="text-xs font-medium text-gray-800">
                  {product.schedule.endDate ?? t('products.scheduleNoEndDate')}
                </span>
              </div>
              {/* Time window */}
              {(product.schedule.startTime || product.schedule.endTime) && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-gray-500">{t('products.scheduleStartTime')} / {t('products.scheduleEndTime')}</span>
                  <span className="text-xs font-medium text-gray-800">
                    {product.schedule.startTime ?? '00:00'} – {product.schedule.endTime ?? '23:59'}
                  </span>
                </div>
              )}
              {/* Days of week */}
              {(product.schedule.daysOfWeek?.length ?? 0) > 0 && (
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-gray-500">{t('products.scheduleDaysOfWeek')}</span>
                  <span className="text-xs font-medium text-gray-800">
                    {product.schedule.daysOfWeek!
                      .map((d) => t(`products.schedule${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]}`))
                      .join(', ')}
                  </span>
                </div>
              )}
              {/* Special price */}
              {product.schedule.offerPrice != null && (
                <div className="flex items-center justify-between px-3 py-2 bg-emerald-50">
                  <span className="text-xs text-emerald-700 font-medium">
                    {product.schedule.offerLabel || t('products.offerBadge')}
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    {currencySymbol}{(product.schedule.offerPrice / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Categories */}
        {(product.categories?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t('products.detailCategories')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.categories!.map((c) => (
                <span
                  key={c.id}
                  className="text-xs px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Special Info */}
        {(product.specialInfo?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Special Info
            </p>
            <div className="flex flex-wrap gap-1.5">
              {product.specialInfo!.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 border border-gray-200 text-xs text-gray-700"
                >
                  <LucideIconByName name={item.icon} size={12} />
                  {item.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Variant groups */}
        {(product.variantGroups?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('variants.title')}
            </p>
            <div className="space-y-3">
              {product.variantGroups!.map((group, gi) => (
                <div key={group.id ?? gi} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs font-semibold text-gray-700">{group.name}</p>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(group.options ?? []).map((opt, oi) => (
                      <div key={opt.id ?? oi} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.isAvailable !== false ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                          <span className="text-sm text-gray-700">{opt.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {`+${currencySymbol}${((opt.priceDelta ?? 0) / 100).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Addon groups */}
        {(product.addonGroups?.length ?? 0) > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {t('addons.title')}
            </p>
            <div className="space-y-3">
              {product.addonGroups!.map((group, gi) => (
                <div key={group.id ?? gi} className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <p className="text-xs font-semibold text-gray-700">{group.name}</p>
                    <span className="text-xs text-gray-400">
                      {t('addons.min')} {group.minSelectable ?? 0} · {t('addons.max')} {group.maxSelectable ?? 1}
                    </span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {(group.options ?? []).map((opt, oi) => (
                      <div key={opt.id ?? oi} className="flex items-center justify-between px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${opt.isAvailable !== false ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                          <span className="text-sm text-gray-700">{opt.name}</span>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                          {`+${currencySymbol}${((opt.priceDelta ?? 0) / 100).toFixed(2)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ── Edit wizard view (inside the same modal) ──────────────────────────────────

function ProductEditView({
  productId,
  shopId,
  currencySymbol,
  categoriesList,
  taxRatesList,
  hasTaxRates,
  onSaved,
  onBack,
}: {
  productId: string;
  shopId: string;
  currencySymbol: string;
  categoriesList: { id: string; name: string }[];
  taxRatesList: { id: string; label: string }[];
  hasTaxRates: boolean;
  onSaved: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: product, isLoading: productLoading } = useGetProductByIdQuery(
    { productId, shopId },
    { refetchOnMountOrArgChange: true },
  );
  const [updateProduct, { isLoading: isUpdating, isError: isUpdateError }] = useUpdateProductMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();

  const [mode, setMode] = useState<'simple' | 'extended'>('simple');
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [initialized, setInitialized] = useState(false);

  const stepSequence: StepNum[] = mode === 'simple' ? [1, 2, 6] : [1, 2, 3, 4, 6];
  const isFirstStep = step === stepSequence[0];
  const isLastStep = step === stepSequence[stepSequence.length - 1];

  const [form, setForm] = useState({ name: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string | null>(null);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [specialInfo, setSpecialInfo] = useState<SpecialInfoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [nameError, setNameError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [taxRateError, setTaxRateError] = useState(false);

  useEffect(() => {
    if (product && !initialized) {
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        price: product.price ?? 0,
      });
      setSelectedCategoryIds(product.categories?.map((c) => c.id!).filter(Boolean) ?? []);
      setSelectedTaxRateId(product.taxRateId ?? null);
      setVariantGroups(
        (product.variantGroups ?? []).map((g) => ({
          id: g.id ?? crypto.randomUUID(),
          name: g.name ?? '',
          options: (g.options ?? []).map((o) => ({
            id: o.id ?? crypto.randomUUID(),
            name: o.name ?? '',
            priceDelta: o.priceDelta ?? 0,
            isAvailable: o.isAvailable ?? true,
          })),
        })),
      );
      setAddonGroups(
        (product.addonGroups ?? []).map((g) => ({
          id: g.id ?? crypto.randomUUID(),
          name: g.name ?? '',
          minSelectable: g.minSelectable ?? 0,
          maxSelectable: g.maxSelectable ?? 1,
          options: (g.options ?? []).map((o) => ({
            id: o.id ?? crypto.randomUUID(),
            name: o.name ?? '',
            priceDelta: o.priceDelta ?? 0,
            isAvailable: o.isAvailable ?? true,
          })),
        })),
      );
      setSpecialInfo(
        (product.specialInfo ?? []).map((si) => ({ icon: si.icon, name: si.name })),
      );
      setInitialized(true);
    }
  }, [product, initialized]);

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
      setNameError(ne); setDescError(de);
      return !ne && !de;
    }
    if (s === 2) {
      const hasNoCategory = selectedCategoryIds.length === 0;
      const hasNoTax = mode === 'extended' && hasTaxRates && selectedTaxRateId === null;
      setCategoryError(hasNoCategory); setTaxRateError(hasNoTax);
      return !hasNoCategory && !hasNoTax;
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
    const idx = stepSequence.indexOf(step);
    setDirection('back');
    setStep(stepSequence[idx - 1]);
  }
  function jumpTo(n: StepNum) { setDirection(n < step ? 'back' : 'forward'); setStep(n); }

  const handleSubmit = async () => {
    try {
      await updateProduct({
        productId,
        updateProductRequest: {
          shopId,
          name: form.name,
          description: form.description,
          price: form.price,
          categoryIds: selectedCategoryIds,
          variantGroups,
          addonGroups,
          taxRateId: selectedTaxRateId,
          specialInfo: specialInfo.length > 0 ? specialInfo : undefined,
        },
      }).unwrap();

      if (imageFile) {
        setIsUploading(true);
        const contentType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp';
        const uploadData = await generateUploadUrl({
          shopId,
          productId,
          generateImageUploadUrlRequest: { contentType, fileName: imageFile.name },
        }).unwrap();
        await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
          body: imageFile,
        });
        await addProductImage({
          shopId,
          productId,
          addProductImageRequest: { imageId: uploadData.imageId, url: uploadData.blobUrl },
        }).unwrap();
        setIsUploading(false);
      }

      toast.success(t('products.saved'));
      onSaved();
    } catch {
      setIsUploading(false);
    }
  };

  const existingImageUrl = product?.images?.find((img) => img.isPrimary)?.url ?? product?.images?.[0]?.url ?? null;
  const isBusy = isUpdating || isUploading;
  const submitLabel = isUpdating ? t('products.saving') : isUploading ? t('products.uploadingImage') : t('products.saveChanges');
  const stepSubtitles: Record<StepNum, string> = {
    1: t('products.wizardStep1Subtitle'),
    2: t('products.wizardStep2Subtitle'),
    3: t('products.wizardStep3Subtitle'),
    4: t('products.wizardStep4Subtitle'),
    6: t('products.wizardStep6Subtitle'),
  };

  if (productLoading || !initialized) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <MySpinner label={t('products.loadingProduct')} />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200 flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{t('products.editTitle')}</h2>
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
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            title="Back to details"
          >
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
        {isUpdateError && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
            <p className="text-sm text-red-600">{t('products.failedToUpdate')}</p>
          </div>
        )}
        <div key={step} className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
          {step === 1 && (
            <Step1Basics form={form} setForm={setForm} imageFile={imageFile} setImageFile={setImageFile} currencySymbol={currencySymbol} nameError={nameError} descError={descError} existingImageUrl={existingImageUrl} />
          )}
          {step === 2 && (
            <StepCategories shopId={shopId} categories={categoriesList} selectedCategoryIds={selectedCategoryIds} setSelectedCategoryIds={setSelectedCategoryIds} taxRates={taxRatesList} selectedTaxRateId={selectedTaxRateId} setSelectedTaxRateId={setSelectedTaxRateId} categoryError={categoryError} taxRateError={taxRateError} hideTaxRate={mode === 'simple'} />
          )}
          {step === 3 && (
            <StepSpecialInfo specialInfo={specialInfo} setSpecialInfo={setSpecialInfo} />
          )}
          {step === 4 && (
            <Step4Customise variantGroups={variantGroups} addVariantGroup={addVariantGroup} removeVariantGroup={removeVariantGroup} updateVariantGroupName={updateVariantGroupName} addVariantOption={addVariantOption} removeVariantOption={removeVariantOption} updateVariantOption={updateVariantOption} addonGroups={addonGroups} addAddonGroup={addAddonGroup} removeAddonGroup={removeAddonGroup} updateAddonGroup={updateAddonGroup} addAddonOption={addAddonOption} removeAddonOption={removeAddonOption} updateAddonOption={updateAddonOption} />
          )}
          {step === 6 && (
            <Step6Review form={form} imageFile={imageFile} existingImageUrl={existingImageUrl} selectedCategoryIds={selectedCategoryIds} categories={categoriesList} taxRates={taxRatesList} selectedTaxRateId={selectedTaxRateId} variantGroups={variantGroups} addonGroups={addonGroups} currencySymbol={currencySymbol} specialInfo={specialInfo} />
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200 flex-shrink-0">
        {isFirstStep && (
          <>
            <MyButton type="button" variant="secondary" onClick={onBack}>← {t('products.cancel')}</MyButton>
            <div className="flex-1" />
            <MyButton type="button" onClick={goNext}>{t('products.wizardNext')} →</MyButton>
          </>
        )}
        {!isFirstStep && !isLastStep && (
          <>
            <MyButton type="button" variant="secondary" onClick={goBack}>← {t('products.wizardBack')}</MyButton>
            <div className="flex-1" />
            {mode === 'extended' && (step === 3 || step === 4) && (
              <MyButton type="button" variant="ghost" onClick={goNext}>{t('products.wizardSkip')}</MyButton>
            )}
            <MyButton type="button" onClick={goNext}>{t('products.wizardNext')} →</MyButton>
          </>
        )}
        {isLastStep && (
          <>
            <MyButton type="button" variant="secondary" onClick={onBack}>← {t('products.wizardBack')}</MyButton>
            <div className="flex-1" />
            <MyButton type="button" disabled={isBusy} onClick={handleSubmit}>{submitLabel}</MyButton>
          </>
        )}
      </div>
    </>
  );
}

// ── Combined product modal (view → edit) ──────────────────────────────────────

function ProductModal({
  productId,
  shopId,
  onClose,
  onDeleted,
}: {
  productId: string;
  shopId: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { data: categories } = useGetCategoriesByShopQuery({ shopId });
  const { data: fullProduct, isLoading: productLoading } = useGetProductByIdQuery(
    { productId, shopId },
    { refetchOnMountOrArgChange: true },
  );

  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const taxRates = shop?.taxRates ?? [];
  const hasTaxRates = taxRates.length > 0;
  const categoriesList = (categories ?? []).filter((c): c is { id: string; name: string } => !!c.id && !!c.name);
  const taxRatesList = taxRates.filter((r): r is { id: string; label: string } => !!r.id && !!r.label);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
          {productLoading || !fullProduct ? (
            <div className="flex-1 flex items-center justify-center p-10">
              <MySpinner label={t('products.loadingProduct')} />
            </div>
          ) : mode === 'view' ? (
            <ProductDetailView
              product={fullProduct}
              currencySymbol={currencySymbol}
              shopId={shopId}
              onEdit={() => setMode('edit')}
              onDeleted={onDeleted}
              onClose={onClose}
            />
          ) : (
            <ProductEditView
              productId={productId}
              shopId={shopId}
              currencySymbol={currencySymbol}
              categoriesList={categoriesList}
              taxRatesList={taxRatesList}
              hasTaxRates={hasTaxRates}
              onSaved={onClose}
              onBack={() => setMode('view')}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Add Product Modal (5-step wizard) ─────────────────────────────────────────

interface AddProductModalProps {
  shopId: string;
  onClose: () => void;
}

function AddProductModal({ shopId, onClose }: AddProductModalProps) {
  const { t } = useTranslation();
  const toast = useToast();

  const { data: shop } = useGetShopByIdQuery({ shopId });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const { data: categories } = useGetCategoriesByShopQuery({ shopId });
  const [createProduct, { isLoading, isError, error }] = useCreateProductMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();

  const taxRates = shop?.taxRates ?? [];
  const hasTaxRates = taxRates.length > 0;
  const categoriesList = (categories ?? []).filter((c): c is { id: string; name: string } => !!c.id && !!c.name);
  const taxRatesList = taxRates.filter((r): r is { id: string; label: string } => !!r.id && !!r.label);

  const [mode, setMode] = useState<'simple' | 'extended'>('simple');
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const stepSequence: StepNum[] = mode === 'simple' ? [1, 2, 6] : [1, 2, 3, 4, 6];
  const isFirstStep = step === stepSequence[0];
  const isLastStep = step === stepSequence[stepSequence.length - 1];

  const [form, setForm] = useState({ name: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string | null>(null);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [specialInfo, setSpecialInfo] = useState<SpecialInfoItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const [nameError, setNameError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [taxRateError, setTaxRateError] = useState(false);

  useEffect(() => {
    if (mode === 'simple') {
      setSelectedTaxRateId(taxRatesList[0]?.id ?? null);
    } else {
      setSelectedTaxRateId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
      setNameError(ne); setDescError(de);
      return !ne && !de;
    }
    if (s === 2) {
      const hasNoCategory = selectedCategoryIds.length === 0;
      const hasNoTax = mode === 'extended' && hasTaxRates && selectedTaxRateId === null;
      setCategoryError(hasNoCategory); setTaxRateError(hasNoTax);
      return !hasNoCategory && !hasNoTax;
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
    const idx = stepSequence.indexOf(step);
    setDirection('back');
    setStep(stepSequence[idx - 1]);
  }
  function jumpTo(n: StepNum) { setDirection(n < step ? 'back' : 'forward'); setStep(n); }

  const handleSubmit = async () => {
    try {
      const product = await createProduct({
        createProductRequest: {
          shopId,
          name: form.name,
          description: form.description,
          price: form.price,
          categoryIds: selectedCategoryIds,
          taxRateId: selectedTaxRateId,
          variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
          addonGroups: addonGroups.length > 0 ? addonGroups : undefined,
          specialInfo: specialInfo.length > 0 ? specialInfo : undefined,
        },
      }).unwrap();

      if (imageFile) {
        setIsUploading(true);
        const contentType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp';
        const uploadData = await generateUploadUrl({
          shopId,
          productId: product.id!,
          generateImageUploadUrlRequest: { contentType, fileName: imageFile.name },
        }).unwrap();
        await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
          body: imageFile,
        });
        await addProductImage({
          shopId,
          productId: product.id!,
          addProductImageRequest: { imageId: uploadData.imageId, url: uploadData.blobUrl },
        }).unwrap();
      }

      toast.success(t('products.created'));
      onClose();
    } catch {
      setIsUploading(false);
    }
  };

  const isBusy = isLoading || isUploading;
  const submitLabel = isLoading ? t('products.creating') : isUploading ? t('products.uploadingImage') : t('products.create');
  const stepSubtitles: Record<StepNum, string> = {
    1: t('products.wizardStep1Subtitle'),
    2: t('products.wizardStep2Subtitle'),
    3: t('products.wizardStep3Subtitle'),
    4: t('products.wizardStep4Subtitle'),
    6: t('products.wizardStep6Subtitle'),
  };

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
            {isError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">
                  {(error as { data?: { error?: string } })?.data?.error ?? t('products.failedToCreate')}
                </p>
              </div>
            )}
            <div key={step} className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
              {step === 1 && <Step1Basics form={form} setForm={setForm} imageFile={imageFile} setImageFile={setImageFile} currencySymbol={currencySymbol} nameError={nameError} descError={descError} />}
              {step === 2 && <StepCategories shopId={shopId} categories={categoriesList} selectedCategoryIds={selectedCategoryIds} setSelectedCategoryIds={setSelectedCategoryIds} taxRates={taxRatesList} selectedTaxRateId={selectedTaxRateId} setSelectedTaxRateId={setSelectedTaxRateId} categoryError={categoryError} taxRateError={taxRateError} hideTaxRate={mode === 'simple'} />}
              {step === 3 && <StepSpecialInfo specialInfo={specialInfo} setSpecialInfo={setSpecialInfo} />}
              {step === 4 && <Step4Customise variantGroups={variantGroups} addVariantGroup={addVariantGroup} removeVariantGroup={removeVariantGroup} updateVariantGroupName={updateVariantGroupName} addVariantOption={addVariantOption} removeVariantOption={removeVariantOption} updateVariantOption={updateVariantOption} addonGroups={addonGroups} addAddonGroup={addAddonGroup} removeAddonGroup={removeAddonGroup} updateAddonGroup={updateAddonGroup} addAddonOption={addAddonOption} removeAddonOption={removeAddonOption} updateAddonOption={updateAddonOption} />}
              {step === 6 && <Step6Review form={form} imageFile={imageFile} selectedCategoryIds={selectedCategoryIds} categories={categoriesList} taxRates={taxRatesList} selectedTaxRateId={selectedTaxRateId} variantGroups={variantGroups} addonGroups={addonGroups} currencySymbol={currencySymbol} specialInfo={specialInfo} />}
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
                {mode === 'extended' && (step === 3 || step === 4) && (
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
  const taxRatesList = (shop?.taxRates ?? []).filter(
    (r): r is { id: string; label: string; rate: number } => !!r.id && !!r.label,
  );
  const defaultTaxRateId = taxRatesList[0]?.id ?? null;
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
            image_url: typeof item.image_url === 'string' ? item.image_url : null,
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
          createProductRequest: {
            shopId,
            name: row.name,
            description: row.description,
            price: Math.round(row.price! * 100),
            taxRateId: defaultTaxRateId,
            categoryIds: [],
            images: row.image_url
              ? [{ id: crypto.randomUUID(), url: row.image_url }]
              : undefined,
          },
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
                  <code className="text-xs bg-gray-100 px-1 rounded">price</code>, and{' '}
                  <code className="text-xs bg-gray-100 px-1 rounded">image_url</code>.
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
                        <th className="px-3 py-2 text-left w-10">Image</th>
                        <th className="px-3 py-2 text-left">Name</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-left w-24">Price ({currencySymbol})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            {row.image_url ? (
                              <img src={row.image_url} alt="" className="w-8 h-8 rounded object-cover" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-gray-100" />
                            )}
                          </td>
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

// ── Schedule + Offer modal ─────────────────────────────────────────────────────

function ScheduleOfferModal({
  product,
  currencySymbol,
  onClose,
}: {
  product: ProductResponse;
  currencySymbol: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  const [scheduleEnabled, setScheduleEnabled] = useState(!!product.schedule);
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(
    !!(product.schedule?.startTime || product.schedule?.endTime),
  );
  const [noEndDate, setNoEndDate] = useState(!product.schedule?.endDate);
  const [schedule, setSchedule] = useState<ScheduleState>({
    startDate: product.schedule?.startDate ?? '',
    endDate: product.schedule?.endDate ?? '',
    startTime: product.schedule?.startTime ?? '',
    endTime: product.schedule?.endTime ?? '',
    daysOfWeek: product.schedule?.daysOfWeek ?? [],
    offerEnabled: !!(product.schedule?.offerPrice),
    offerPrice: product.schedule?.offerPrice ?? 0,
    offerLabel: product.schedule?.offerLabel ?? '',
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const validate = () => {
    let valid = true;
    if (scheduleEnabled) {
      const endDateInvalid = !noEndDate && schedule.endDate && schedule.endDate < schedule.startDate;
      const endTimeInvalid = timeWindowEnabled && schedule.startTime && schedule.endTime && schedule.endTime <= schedule.startTime;
      if (schedule.daysOfWeek.length === 0) {
        setScheduleError(t('products.scheduleDaysRequired'));
        valid = false;
      } else if (endDateInvalid || endTimeInvalid) {
        setScheduleError(t('products.scheduleInvalid'));
        valid = false;
      } else setScheduleError(null);
    } else {
      setScheduleError(null);
    }
    if (scheduleEnabled && schedule.offerEnabled) {
      if (schedule.offerPrice <= 0) { setOfferError(t('products.offerPriceRequired')); valid = false; }
      else if (schedule.offerPrice >= (product.price ?? 0)) { setOfferError(t('products.offerPriceMustBeLess')); valid = false; }
      else setOfferError(null);
    } else {
      setOfferError(null);
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const schedulePayload = scheduleEnabled ? {
      startDate: schedule.startDate,
      endDate: noEndDate ? null : (schedule.endDate || null),
      startTime: timeWindowEnabled ? (schedule.startTime || null) : null,
      endTime: timeWindowEnabled ? (schedule.endTime || null) : null,
      daysOfWeek: schedule.daysOfWeek,
      offerPrice: schedule.offerEnabled ? schedule.offerPrice : null,
      offerLabel: schedule.offerEnabled ? (schedule.offerLabel || null) : null,
    } : null;
    try {
      await updateProduct({
        productId: product.id!,
        updateProductRequest: { shopId: product.shopId!, schedule: schedulePayload },
      }).unwrap();
      toast.success(t('products.saved'));
      onClose();
    } catch {
      // error shown via toast by RTK middleware
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('products.scheduleModalTitle')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{product.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs text-gray-400 mb-4">{t('products.scheduleModalSubtitle')}</p>
            <Step5Schedule
              scheduleEnabled={scheduleEnabled}
              setScheduleEnabled={setScheduleEnabled}
              timeWindowEnabled={timeWindowEnabled}
              setTimeWindowEnabled={setTimeWindowEnabled}
              noEndDate={noEndDate}
              setNoEndDate={setNoEndDate}
              schedule={schedule}
              setSchedule={setSchedule}
              scheduleError={scheduleError}
            />

            {/* Special Price section */}
            {scheduleEnabled && (
              <div className="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.offerEnabled}
                    onChange={(e) => setSchedule((s) => ({ ...s, offerEnabled: e.target.checked }))}
                    className="accent-gray-900"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('products.offerPriceToggle')}</span>
                </label>
                {schedule.offerEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <CurrencyInput
                        label={t('products.offerPrice', { symbol: currencySymbol })}
                        valueCents={schedule.offerPrice}
                        onChange={(cents) => setSchedule((s) => ({ ...s, offerPrice: cents }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                        {t('products.offerLabel')}
                      </label>
                      <input
                        type="text"
                        value={schedule.offerLabel}
                        onChange={(e) => setSchedule((s) => ({ ...s, offerLabel: e.target.value }))}
                        placeholder={t('products.offerLabelPlaceholder')}
                        maxLength={50}
                        className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                      />
                    </div>
                    {offerError && <p className="text-xs text-red-500">{offerError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200">
            <MyButton type="button" variant="secondary" onClick={onClose}>{t('products.cancel')}</MyButton>
            <div className="flex-1" />
            <MyButton type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? t('products.saving') : t('products.saveChanges')}
            </MyButton>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Products table ─────────────────────────────────────────────────────────────

function ProductTable({
  products,
  onSelect,
  shopId,
  onScheduleClick,
  currencySymbol,
}: {
  products: ProductResponse[];
  onSelect: (id: string) => void;
  shopId: string;
  onScheduleClick: (product: ProductResponse) => void;
  currencySymbol: string;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateProduct] = useUpdateProductMutation();
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  const [optimisticAvailability, setOptimisticAvailability] = useState<Record<string, boolean>>({});

  const handleToggle = async (e: React.MouseEvent, product: ProductResponse) => {
    e.stopPropagation();
    const id = product.id!;
    if (togglingIds.has(id)) return;
    const currentAvailability = optimisticAvailability[id] ?? (product.isAvailable !== false);
    const nextAvailability = !currentAvailability;

    // Block turning ON if product has no categories
    if (nextAvailability && !product.categories?.length) {
      toast.error(t('products.availabilityRequiresCategory'));
      return;
    }

    setOptimisticAvailability((prev) => ({ ...prev, [id]: nextAvailability }));
    setTogglingIds(prev => new Set(prev).add(id));
    try {
      await updateProduct({
        productId: id,
        updateProductRequest: { shopId, isAvailable: nextAvailability },
      }).unwrap();
    } catch {
      setOptimisticAvailability((prev) => ({ ...prev, [id]: currentAvailability }));
      toast.error(t('products.failedToUpdate'));
    } finally {
      setTogglingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  };

  return (
    <div className="divide-y divide-gray-200">
      {products.map((product) => {
        const isAvailable = optimisticAvailability[product.id!] ?? (product.isAvailable !== false);
        const imageUrl = product.images?.length
          ? product.images[product.images.length - 1].url
          : undefined;

        return (
          <div
            key={product.id}
            onClick={() => onSelect(product.id!)}
            className="relative flex items-center gap-4 px-4 py-3 hover:bg-gray-50 cursor-pointer group transition-colors"
          >
            {!isAvailable && (
              <div className="absolute inset-0 bg-white/60 pointer-events-none rounded" />
            )}

            {/* Thumbnail */}
            <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              {imageUrl ? (
                <img src={imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-gray-300 font-semibold text-sm">
                    {product.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Name + schedule indicators */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-sm font-medium text-gray-900 truncate">{product.name}</span>
                {product.schedule ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onScheduleClick(product); }}
                      title={t('products.editSchedule')}
                      className="p-0.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                    </button>
                    {product.schedule.offerPrice != null && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onScheduleClick(product); }}
                        className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full flex-shrink-0 hover:bg-emerald-100 transition-colors"
                      >
                        {product.schedule.offerLabel || t('products.offerBadge')} · {currencySymbol}{(product.schedule.offerPrice / 100).toFixed(2)}
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onScheduleClick(product); }}
                    title={t('products.addSchedule')}
                    className="p-0.5 rounded text-gray-300 hover:text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Price */}
            <span className="text-sm text-gray-500 flex-shrink-0 w-20 text-right">
              {currencySymbol}{((product.price ?? 0) / 100).toFixed(2)}
            </span>

            {/* Availability toggle */}
            <div className="flex-shrink-0 w-14 flex justify-center" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                disabled={togglingIds.has(product.id!)}
                onClick={(e) => handleToggle(e, product)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                  isAvailable ? 'bg-emerald-500' : 'bg-gray-200'
                } ${togglingIds.has(product.id!) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label={isAvailable ? t('products.available') : t('products.unavailable')}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                  isAvailable ? 'translate-x-4' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ProductsPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: products, isLoading, isError } = useGetProductsByShopQuery({ shopId: shopId! });
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [scheduleModalProduct, setScheduleModalProduct] = useState<ProductResponse | null>(null);
  const showAddModal = searchParams.get('addProduct') === '1';
  const closeAddModal = () => setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('addProduct'); return n; });
  const showImportModal = searchParams.get('importProducts') === '1';
  const closeImportModal = () => setSearchParams((p) => { const n = new URLSearchParams(p); n.delete('importProducts'); return n; });

  // Capture sort order once on initial load. Subsequent mutation-triggered refetches
  // will not change this ref, so products won't reorder until the page is remounted.
  const stableSortRef = useRef<Map<string, number> | null>(null);
  if (products && stableSortRef.current === null) {
    const m = new Map<string, number>();
    [...products]
      .sort((a, b) => Number(a.isAvailable === false) - Number(b.isAvailable === false))
      .forEach((p, i) => m.set(p.id!, i));
    stableSortRef.current = m;
  }
  const stableIndex = (p: ProductResponse) => stableSortRef.current?.get(p.id!) ?? Infinity;

  if (isLoading) return <MySpinner label={t('products.loading')} />;
  if (isError) return <p className="text-red-500">{t('products.loadError')}</p>;

  // Group by category
  const categoryMap = new Map<string, { id: string; name: string; sortOrder: number }>();
  for (const product of products ?? []) {
    for (const cat of product.categories ?? []) {
      if (cat.id && !categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, { id: cat.id, name: cat.name ?? '', sortOrder: cat.sortOrder ?? 0 });
      }
    }
  }
  const sortedCategories = [...categoryMap.values()].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name),
  );

  const byCategory = new Map<string, ProductResponse[]>();
  for (const cat of sortedCategories) {
    byCategory.set(
      cat.id,
      [...(products ?? []).filter((p) => p.categories?.some((c) => c.id === cat.id))].sort(
        (a, b) => stableIndex(a) - stableIndex(b),
      ),
    );
  }

  const uncategorized = [...(products ?? []).filter((p) => !p.categories?.length)].sort(
    (a, b) => stableIndex(a) - stableIndex(b),
  );
  const isEmpty = !products?.length;

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <MyButton
            variant="secondary"
            onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('importProducts', '1'); return n; })}
          >
            Import JSON
          </MyButton>
        </div>

        {isEmpty && <p className="text-gray-400 text-sm">{t('products.empty')}</p>}

        {sortedCategories.map((cat) => (
          <section key={cat.id}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              {cat.name}
            </h2>
            <MyCard>
              <ProductTable
                products={byCategory.get(cat.id)!}
                onSelect={setSelectedProductId}
                shopId={shopId!}
                onScheduleClick={setScheduleModalProduct}
                currencySymbol={currencySymbol}
              />
            </MyCard>
          </section>
        ))}

        {uncategorized.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">
              {t('products.uncategorized')}
            </h2>
            <MyCard>
              <ProductTable
                products={uncategorized}
                onSelect={setSelectedProductId}
                shopId={shopId!}
                onScheduleClick={setScheduleModalProduct}
                currencySymbol={currencySymbol}
              />
            </MyCard>
          </section>
        )}
      </div>

      {selectedProductId && (
        <ProductModal
          productId={selectedProductId}
          shopId={shopId!}
          onClose={() => setSelectedProductId(null)}
          onDeleted={() => setSelectedProductId(null)}
        />
      )}

      {showAddModal && (
        <AddProductModal
          shopId={shopId!}
          onClose={closeAddModal}
        />
      )}

      {showImportModal && <BulkImportModal shopId={shopId!} onClose={closeImportModal} />}

      {scheduleModalProduct && (
        <ScheduleOfferModal
          product={scheduleModalProduct}
          currencySymbol={currencySymbol}
          onClose={() => setScheduleModalProduct(null)}
        />
      )}
    </>
  );
}
