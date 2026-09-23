import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  useCreateProductMutation,
  useGetCategoriesByShopQuery,
  useGenerateUploadUrlMutation,
  useAddProductImageMutation,
  useGetShopByIdQuery,
} from '../services/api';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { Breadcrumb } from '../components/ui/Breadcrumb';
import { getCurrencySymbol } from '../utils/currency';
import { useToast } from '../contexts/ToastContext';
import {
  type VariantGroup, type VariantOption, type AddonGroup, type AddonOption,
  type StepNum, type SpecialInfoItem,
  StepIndicator, Step1Basics, StepSpecialInfo, StepCategories, Step4Customise, Step6Review,
} from './ProductWizardSteps';

export function CreateProductPage() {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const toast = useToast();

  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! });
  const currencySymbol = shop?.currency ? getCurrencySymbol(shop.currency) : '$';
  const [createProduct, { isLoading, isError, error }] = useCreateProductMutation();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();
  const { data: categories } = useGetCategoriesByShopQuery({ shopId: shopId! });
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

  // ── Per-step validation errors ────────────────────────────────────
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
      const product = await createProduct({
        createProductRequest: {
          shopId: shopId!,
          name: form.name,
          description: form.description,
          price: form.price,
          categoryIds: selectedCategoryIds,
          taxRateId: selectedTaxRateId,
          specialInfo: specialInfo.length > 0 ? specialInfo : undefined,
          variantGroups: variantGroups.length > 0 ? variantGroups : undefined,
          addonGroups: addonGroups.length > 0 ? addonGroups : undefined,
        },
      }).unwrap();

      const productId = product.id!;

      if (imageFile) {
        setIsUploading(true);
        const contentType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp';
        const uploadData = await generateUploadUrl({
          shopId: shopId!,
          productId,
          generateImageUploadUrlRequest: { contentType, fileName: imageFile.name },
        }).unwrap();

        await fetch(uploadData.uploadUrl, {
          method: 'PUT',
          headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
          body: imageFile,
        });

        await addProductImage({
          shopId: shopId!,
          productId,
          addProductImageRequest: { imageId: uploadData.imageId, url: uploadData.blobUrl },
        }).unwrap();
      }

      toast.success(t('products.created'));
      navigate(`/shops/${shopId}`);
    } catch {
      setIsUploading(false);
    }
  };

  const isBusy = isLoading || isUploading;
  const submitLabel = isLoading
    ? t('products.creating')
    : isUploading
    ? t('products.uploadingImage')
    : t('products.create');

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
        { label: t('products.newProduct') },
      ]} />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-gray-900">{t('products.createTitle')}</h1>
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

      {isError && (
        <MyCard className="p-4 !bg-red-50 !border-red-200">
          <p className="text-sm text-red-600">
            {(error as { data?: { error?: string } })?.data?.error ?? t('products.failedToCreate')}
          </p>
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
              form={form} imageFile={imageFile}
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
            <MyButton type="button" variant="secondary" onClick={() => navigate(`/shops/${shopId}`)}>
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
    </div>
  );
}
