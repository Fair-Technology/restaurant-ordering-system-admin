import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useGetProductByIdQuery,
  useGetShopByIdQuery,
  useGenerateUploadUrlMutation,
  useAddProductImageMutation,
  useDeleteProductMutation,
  useUpdateProductMutation,
  useGetCategoriesByShopQuery,
} from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { MySpinner } from '../components/ui/MySpinner';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { getCurrencySymbol } from '../utils/currency';
import { useToast } from '../contexts/ToastContext';
import {
  type VariantGroup, type VariantOption, type AddonGroup, type AddonOption,
  type StepNum, type SpecialInfoItem,
  StepIndicator, Step1Basics, StepSpecialInfo, StepCategories, Step4Customise, Step6Review,
} from './ProductWizardSteps';

export function EditProductPage() {
  const { shopId, productId } = useParams<{ shopId: string; productId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const { data: categories } = useGetCategoriesByShopQuery({ shopId: shopId! });
  const { data: product, isLoading, isError } = useGetProductByIdQuery(
    { productId: productId!, shopId: shopId! },
    { refetchOnMountOrArgChange: true },
  );
  const [updateProduct, { isLoading: isUpdating, isError: isUpdateError }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting, isError: isDeleteError }] = useDeleteProductMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();

  const taxRates = shop?.taxRates ?? [];
  const hasTaxRates = taxRates.length > 0;
  const categoriesList = (categories ?? []).filter((c): c is { id: string; name: string } => !!c.id && !!c.name);
  const taxRatesList = taxRates.filter((r): r is { id: string; label: string } => !!r.id && !!r.label);

  // ── Wizard state ──────────────────────────────────────────────────
  const [mode, setMode] = useState<'simple' | 'extended'>('simple');
  const [step, setStep] = useState<StepNum>(1);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const stepSequence: StepNum[] = mode === 'simple' ? [1, 2, 6] : [1, 2, 3, 4, 6];
  const isFirstStep = step === stepSequence[0];
  const isLastStep = step === stepSequence[stepSequence.length - 1];


  // ── Form state ────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', description: '', price: 0 });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedTaxRateId, setSelectedTaxRateId] = useState<string | null>(null);
  const [specialInfo, setSpecialInfo] = useState<SpecialInfoItem[]>([]);
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([]);
  const [addonGroups, setAddonGroups] = useState<AddonGroup[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // ── Danger zone ───────────────────────────────────────────────────
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  // ── Per-step validation errors ────────────────────────────────────
  const [nameError, setNameError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [categoryError, setCategoryError] = useState(false);
  const [taxRateError, setTaxRateError] = useState(false);

  // ── Populate form from loaded product ─────────────────────────────
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name ?? '',
        description: product.description ?? '',
        price: product.price ?? 0,
      });
      setSelectedCategoryIds(product.categories?.map((c) => c.id!).filter(Boolean) ?? []);
      setSpecialInfo(
        (product.specialInfo ?? []).filter((s): s is { icon: string; name: string } => !!s.icon && !!s.name)
      );
      setSelectedTaxRateId(product.taxRateId ?? null);
      setVariantGroups(
        (product.variantGroups ?? []).map(g => ({
          id: g.id ?? crypto.randomUUID(),
          name: g.name ?? '',
          options: (g.options ?? []).map(o => ({
            id: o.id ?? crypto.randomUUID(),
            name: o.name ?? '',
            priceDelta: o.priceDelta ?? 0,
            isAvailable: o.isAvailable ?? true,
          })),
        }))
      );
      setAddonGroups(
        (product.addonGroups ?? []).map(g => ({
          id: g.id ?? crypto.randomUUID(),
          name: g.name ?? '',
          minSelectable: g.minSelectable ?? 0,
          maxSelectable: g.maxSelectable ?? 1,
          options: (g.options ?? []).map(o => ({
            id: o.id ?? crypto.randomUUID(),
            name: o.name ?? '',
            priceDelta: o.priceDelta ?? 0,
            isAvailable: o.isAvailable ?? true,
          })),
        }))
      );
    }
  }, [product]);

  if (isLoading) return <MySpinner label={t('products.loadingProduct')} />;
  if (isError || !product) return <p className="text-red-500">{t('products.failedToLoad')}</p>;

  const existingImageUrl = product.images?.find((img) => img.isPrimary)?.url ?? product.images?.[0]?.url ?? null;

  // ── Variant helpers ───────────────────────────────────────────────
  const addVariantGroup = () => setVariantGroups(gs => [...gs, { id: crypto.randomUUID(), name: '', options: [] }]);
  const removeVariantGroup = (id: string) => setVariantGroups(gs => gs.filter(g => g.id !== id));
  const updateVariantGroupName = (id: string, name: string) =>
    setVariantGroups(gs => gs.map(g => g.id === id ? { ...g, name } : g));
  const addVariantOption = (groupId: string) =>
    setVariantGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g
    ));
  const removeVariantOption = (groupId: string, optionId: string) =>
    setVariantGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
    ));
  const updateVariantOption = (groupId: string, optionId: string, patch: Partial<VariantOption>) =>
    setVariantGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...patch } : o) } : g
    ));

  // ── Addon helpers ─────────────────────────────────────────────────
  const addAddonGroup = () =>
    setAddonGroups(gs => [...gs, { id: crypto.randomUUID(), name: '', minSelectable: 0, maxSelectable: 1, options: [] }]);
  const removeAddonGroup = (id: string) => setAddonGroups(gs => gs.filter(g => g.id !== id));
  const updateAddonGroup = (id: string, patch: Partial<AddonGroup>) =>
    setAddonGroups(gs => gs.map(g => g.id === id ? { ...g, ...patch } : g));
  const addAddonOption = (groupId: string) =>
    setAddonGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g
    ));
  const removeAddonOption = (groupId: string, optionId: string) =>
    setAddonGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
    ));
  const updateAddonOption = (groupId: string, optionId: string, patch: Partial<AddonOption>) =>
    setAddonGroups(gs => gs.map(g =>
      g.id === groupId ? { ...g, options: g.options.map(o => o.id === optionId ? { ...o, ...patch } : o) } : g
    ));

  // ── Navigation ────────────────────────────────────────────────────
  function validateStep(s: StepNum): boolean {
    if (s === 1) {
      const ne = form.name.trim() === '';
      const de = form.description.trim() === '';
      setNameError(ne);
      setDescError(de);
      return !ne && !de;
    }
    if (s === 2) {
      const hasNoCategory = selectedCategoryIds.length === 0;
      const hasNoTax = mode === 'extended' && hasTaxRates && selectedTaxRateId === null;
      setCategoryError(hasNoCategory);
      setTaxRateError(hasNoTax);
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
  function jumpTo(n: StepNum) {
    setDirection(n < step ? 'back' : 'forward');
    setStep(n);
  }

  // ── Submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    try {
      await updateProduct({
        productId: productId!,
        updateProductRequest: {
          shopId: shopId!,
          name: form.name,
          description: form.description,
          price: form.price,
          categoryIds: selectedCategoryIds,
          specialInfo: specialInfo.length > 0 ? specialInfo : undefined,
          variantGroups,
          addonGroups,
          taxRateId: selectedTaxRateId,
        },
      }).unwrap();

      if (imageFile) {
        setIsUploading(true);
        const contentType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp';
        const uploadData = await generateUploadUrl({
          shopId: shopId!,
          productId: productId!,
          generateImageUploadUrlRequest: { contentType, fileName: imageFile.name },
        }).unwrap();

        await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
          body: imageFile,
        });

        await addProductImage({
          shopId: shopId!,
          productId: productId!,
          addProductImageRequest: { imageId: uploadData.imageId, url: uploadData.blobUrl },
        }).unwrap();

        setIsUploading(false);
        setImageFile(null);
      }

      toast.success(t('products.saved'));
      navigate(-1);
    } catch {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteProduct({ shopId: shopId!, productId: productId! }).unwrap();
      toast.success(t('products.deleted'));
      navigate(`/shops/${shopId}`);
    } catch {
      setConfirmingDelete(false);
    }
  };

  const isBusy = isUpdating || isUploading;
  const submitLabel = isUpdating
    ? t('products.saving')
    : isUploading
    ? t('products.uploadingImage')
    : t('products.saveChanges');

  const stepSubtitles: Record<StepNum, string> = {
    1: t('products.wizardStep1Subtitle'),
    2: t('products.wizardStep2Subtitle'),
    3: t('products.wizardStep3Subtitle'),
    4: t('products.wizardStep4Subtitle'),
    6: t('products.wizardStep6Subtitle'),
  };

  return (
    <div className="max-w-lg space-y-5">
      <Breadcrumb items={[
        { label: t('nav.shops'), to: '/shops' },
        { label: shop?.name ?? t('shops.shop'), to: `/shops/${shopId}` },
        { label: t('nav.products'), to: `/shops/${shopId}` },
        { label: product.name ?? t('products.editTitle') },
      ]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('products.editTitle')}</h1>
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
      </div>

      <StepIndicator currentStep={step} onJump={jumpTo} stepSequence={stepSequence} />
      <p className="text-sm text-gray-400">{stepSubtitles[step]}</p>

      {isUpdateError && (
        <MyCard className="p-4 !bg-red-50 !border-red-200">
          <p className="text-sm text-red-600">{t('products.failedToUpdate')}</p>
        </MyCard>
      )}

      <MyCard className="p-6 overflow-hidden">
        <div key={step} className={direction === 'forward' ? 'animate-slide-in-right' : 'animate-slide-in-left'}>
          {step === 1 && (
            <Step1Basics
              form={form} setForm={setForm}
              imageFile={imageFile} setImageFile={setImageFile}
              currencySymbol={currencySymbol}
              nameError={nameError} descError={descError}
              existingImageUrl={existingImageUrl}
            />
          )}
          {step === 2 && (
            <StepCategories
              shopId={shopId!}
              categories={categoriesList}
              selectedCategoryIds={selectedCategoryIds}
              setSelectedCategoryIds={setSelectedCategoryIds}
              taxRates={taxRatesList}
              selectedTaxRateId={selectedTaxRateId}
              setSelectedTaxRateId={setSelectedTaxRateId}
              categoryError={categoryError}
              taxRateError={taxRateError}
              hideTaxRate={mode === 'simple'}
            />
          )}
          {step === 3 && (
            <StepSpecialInfo specialInfo={specialInfo} setSpecialInfo={setSpecialInfo} />
          )}
          {step === 4 && (
            <Step4Customise
              variantGroups={variantGroups}
              addVariantGroup={addVariantGroup}
              removeVariantGroup={removeVariantGroup}
              updateVariantGroupName={updateVariantGroupName}
              addVariantOption={addVariantOption}
              removeVariantOption={removeVariantOption}
              updateVariantOption={updateVariantOption}
              addonGroups={addonGroups}
              addAddonGroup={addAddonGroup}
              removeAddonGroup={removeAddonGroup}
              updateAddonGroup={updateAddonGroup}
              addAddonOption={addAddonOption}
              removeAddonOption={removeAddonOption}
              updateAddonOption={updateAddonOption}
            />
          )}
          {step === 6 && (
            <Step6Review
              form={form} imageFile={imageFile} existingImageUrl={existingImageUrl}
              selectedCategoryIds={selectedCategoryIds}
              categories={categoriesList}
              taxRates={taxRatesList}
              selectedTaxRateId={selectedTaxRateId}
              variantGroups={variantGroups} addonGroups={addonGroups}
              currencySymbol={currencySymbol}
              specialInfo={specialInfo}
            />
          )}
        </div>
      </MyCard>

      {/* Navigation footer */}
      <div className="flex items-center gap-2">
        {isFirstStep && (
          <>
            <MyButton type="button" variant="secondary" onClick={() => navigate(-1)}>
              {t('products.cancel')}
            </MyButton>
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
            <MyButton type="button" disabled={isBusy} onClick={handleSubmit}>
              {submitLabel}
            </MyButton>
          </>
        )}
      </div>

      {/* Danger zone */}
      {isDeleteError && (
        <MyCard className="p-4 !bg-red-50 !border-red-200">
          <p className="text-sm text-red-600">{t('products.failedToDelete')}</p>
        </MyCard>
      )}
      <MyCard className="p-6">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-900">{t('products.dangerZone')}</p>
          <p className="text-xs text-gray-400">{t('products.deleteWarning')}</p>
          {confirmingDelete ? (
            <div className="space-y-3">
              <MyInput
                label={t('products.deleteTypeToConfirm', { name: product.name })}
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={product.name}
              />
              <div className="flex gap-2">
                <MyButton
                  variant="danger"
                  disabled={isDeleting || deleteConfirmName.toLowerCase() !== product.name?.toLowerCase()}
                  onClick={handleDelete}
                >
                  {isDeleting ? t('products.deleting') : t('products.confirmDelete')}
                </MyButton>
                <MyButton
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => { setConfirmingDelete(false); setDeleteConfirmName(''); }}
                >
                  {t('products.cancel')}
                </MyButton>
              </div>
            </div>
          ) : (
            <MyButton variant="danger" onClick={() => setConfirmingDelete(true)}>
              {t('products.delete')}
            </MyButton>
          )}
        </div>
      </MyCard>
    </div>
  );
}
