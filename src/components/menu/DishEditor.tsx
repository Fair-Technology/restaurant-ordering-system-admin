import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft } from 'lucide-react';
import type { MenuLanguage, ProductResponse, TranslationMap } from '../../services/api';
import {
  useDeleteProductMutation,
  useGetProductByIdQuery,
  useGetShopByIdQuery,
  useUpdateProductMutation,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { MyInput, MyTextarea } from '../ui/MyInput';
import { MySpinner } from '../ui/MySpinner';
import { CurrencyInput } from '../ui/CurrencyInput';
import { DishPhotoField } from './DishPhotoField';
import { LanguageTabs, TranslationField } from './LanguageTabs';
import { ScheduleOfferModal } from './ScheduleOfferModal';
import {
  StepCategories,
  StepFoodInfo,
  Step4Customise,
  type AddonGroup,
  type AddonOption,
  type VariantGroup,
  type VariantOption,
} from '../../pages/ProductWizardSteps';
import { useUploadProductImage } from '../../features/menu/useUploadProductImage';
import { dishPhotoMissing, isPhotoRequiredError, replaceDishPhoto } from '../../features/menu/productImage';
import { isWrongSizeError } from '../../features/images/imageRules';
import { useShopReferenceLists } from '../../features/menu/useShopReferenceLists';
import { optionGroupsFromProduct } from '../../features/menu/optionFoodInfo';
import { EMPTY_FOOD_INFO, effectiveTaxClassId, foodInfoFromProduct, type FoodInfo } from '../../features/menu/foodInfo';
import { menuLanguagesOf, resolveActiveLanguage, withTranslation } from '../../features/menu/translations';
import type { PreviewDish } from '../../features/menu/previewBridge';
import { formatCents } from '../../utils/money';

export const DESCRIPTION_SOFT_LIMIT = 160;

interface Props {
  productId: string;
  shopId: string;
  currencySymbol: string;
  categoriesList: { id: string; name: string; taxClassId?: string | null }[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  /** Unsaved state for the live preview (null while loading) */
  onPreviewChange: (dish: PreviewDish | null, language: MenuLanguage | undefined) => void;
}

interface EditState {
  form: { name: string; description: string; price: number };
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  categoryIds: string[];
  foodInfo: FoodInfo;
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
  isAvailable: boolean;
}

function stateFromProduct(product: ProductResponse): EditState {
  return {
    form: { name: product.name ?? '', description: product.description ?? '', price: product.price ?? 0 },
    nameTranslations: product.nameTranslations ?? {},
    descriptionTranslations: product.descriptionTranslations ?? {},
    categoryIds: product.categories?.map((c) => c.id!).filter(Boolean) ?? [],
    foodInfo: foodInfoFromProduct(product),
    isAvailable: product.isAvailable !== false,
    ...optionGroupsFromProduct(product),
  };
}

const section = 'rounded-2xl border border-line bg-white px-5 py-[18px]';
const sectionTitle = 'mb-3 text-base font-bold text-ink';

/**
 * DishEditor — one dish on one page (no wizard): basics with photo, categories and tax,
 * allergens and food info, sizes and extras, availability, and delete. Changes stay local until
 * "Speichern"; meanwhile they are shown in the live preview next to the editor.
 */
export function DishEditor({ productId, shopId, currencySymbol, categoriesList, onClose, onSaved, onDeleted, onPreviewChange }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: product, isLoading } = useGetProductByIdQuery({ productId, shopId }, { refetchOnMountOrArgChange: true });
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { refs } = useShopReferenceLists(shopId);
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const uploadProductImage = useUploadProductImage();

  const languages = shop ? menuLanguagesOf(shop) : [];
  const [pickedLanguage, setPickedLanguage] = useState<MenuLanguage | undefined>();
  const activeLanguage = resolveActiveLanguage(languages, pickedLanguage);
  const extraLanguage = languages[1];
  const translatingLanguage = extraLanguage !== undefined && activeLanguage === extraLanguage ? extraLanguage : undefined;

  const [saved, setSaved] = useState<EditState | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [tried, setTried] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const basicsRef = useRef<HTMLElement>(null);
  const categoriesRef = useRef<HTMLElement>(null);

  // The saved dish is the starting point; a refetch (after a save, or from elsewhere) replaces it,
  // and also replaces the form unless there are unsaved changes in it. (The page gives each dish
  // its own editor via `key`, so switching dishes starts fresh.)
  const [syncedProduct, setSyncedProduct] = useState<ProductResponse | undefined>();
  if (product && product.id === productId && product !== syncedProduct) {
    setSyncedProduct(product);
    const next = stateFromProduct(product);
    setEdit(edit && saved && JSON.stringify(edit) !== JSON.stringify(saved) ? edit : next);
    setSaved(next);
  }

  const dirty = useMemo(
    () => !!edit && !!saved && (imageFile !== null || JSON.stringify(edit) !== JSON.stringify(saved)),
    [edit, saved, imageFile],
  );

  // What the live preview shows: the texts of the language being edited
  useEffect(() => {
    if (!edit) {
      onPreviewChange(null, activeLanguage);
      return;
    }
    const name = translatingLanguage ? edit.nameTranslations[translatingLanguage] || edit.form.name : edit.form.name;
    const description = translatingLanguage
      ? edit.descriptionTranslations[translatingLanguage] || edit.form.description
      : edit.form.description;
    onPreviewChange(
      { id: productId, lang: activeLanguage ?? null, name, description, priceCents: edit.form.price, isAvailable: edit.isAvailable },
      activeLanguage,
    );
  }, [edit, productId, activeLanguage, translatingLanguage, onPreviewChange]);

  if (isLoading || !product || !edit || !saved) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <MySpinner label={t('products.loadingProduct')} />
      </div>
    );
  }

  const patch = (p: Partial<EditState>) => setEdit((e) => (e ? { ...e, ...p } : e));
  const setForm: React.Dispatch<React.SetStateAction<EditState['form']>> = (next) =>
    setEdit((e) => (e ? { ...e, form: typeof next === 'function' ? next(e.form) : next } : e));
  const setVariantGroups = (fn: (gs: VariantGroup[]) => VariantGroup[]) => setEdit((e) => (e ? { ...e, variantGroups: fn(e.variantGroups) } : e));
  const setAddonGroups = (fn: (gs: AddonGroup[]) => AddonGroup[]) => setEdit((e) => (e ? { ...e, addonGroups: fn(e.addonGroups) } : e));

  const existingImageUrl = product.images?.find((img) => img.isPrimary)?.url ?? product.images?.[0]?.url ?? null;
  const nameMissing = edit.form.name.trim() === '';
  const descMissing = edit.form.description.trim() === '';
  const photoMissing = dishPhotoMissing(imageFile, existingImageUrl);
  const categoryMissing = edit.categoryIds.length === 0;
  const isBusy = isUpdating || isUploading;

  const save = async () => {
    setTried(true);
    if (nameMissing || descMissing || photoMissing) {
      setPickedLanguage(languages[0]);
      basicsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (categoryMissing) {
      categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    let uploadStage = false;
    try {
      await updateProduct({
        productId,
        updateProductRequest: {
          shopId,
          name: edit.form.name,
          description: edit.form.description,
          ...(extraLanguage ? { nameTranslations: edit.nameTranslations, descriptionTranslations: edit.descriptionTranslations } : {}),
          price: edit.form.price,
          categoryIds: edit.categoryIds,
          variantGroups: edit.variantGroups,
          addonGroups: edit.addonGroups,
          allergenIds: edit.foodInfo.allergenIds,
          additiveIds: edit.foodInfo.additiveIds,
          dietaryTagIds: edit.foodInfo.dietaryTagIds,
          spiceLevel: edit.foodInfo.spiceLevel,
          prepMinutes: edit.foodInfo.prepMinutes,
          // The dish owns its class: the one picked by hand, else its category's suggestion
          taxClassId: effectiveTaxClassId(edit.categoryIds, categoriesList, edit.foodInfo.taxClassId),
          unavailableModes: edit.foodInfo.unavailableModes,
          isAvailable: edit.isAvailable,
        },
      }).unwrap();

      if (imageFile) {
        setIsUploading(true);
        uploadStage = true;
        const replaced = await replaceDishPhoto({
          hadPhoto: (product.images?.length ?? 0) > 0,
          upload: () => uploadProductImage(shopId, productId, imageFile),
          keepOnly: async (image) => {
            await updateProduct({ productId, updateProductRequest: { shopId, images: [{ id: image.id, url: image.url }] } }).unwrap();
          },
        });
        setIsUploading(false);
        setImageFile(null);
        if (replaced.status === 'old-kept') {
          toast.error(t('products.photoReplaceIncomplete'));
          onSaved();
          return;
        }
      }
      setSaved(edit);
      setTried(false);
      toast.success(t('products.saved'));
      onSaved();
    } catch (err) {
      setIsUploading(false);
      if (uploadStage) toast.error(t(isWrongSizeError(err) ? 'products.productImageWrongSize' : 'products.failedToUploadImage'));
      else if (isPhotoRequiredError(err)) toast.error(t('products.photoRequired'));
      else toast.error(t('products.failedToUpdate'));
    }
  };

  const discard = () => {
    setEdit(saved);
    setImageFile(null);
    setTried(false);
  };

  const remove = async () => {
    try {
      await deleteProduct({ productId, shopId }).unwrap();
      toast.success(t('products.deleted'));
      onDeleted();
    } catch {
      toast.error(t('products.failedToDelete'));
    }
  };

  // Variant and extra helpers for the shared customise step
  const variantHelpers = {
    addVariantGroup: () => setVariantGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', options: [] }]),
    removeVariantGroup: (id: string) => setVariantGroups((gs) => gs.filter((g) => g.id !== id)),
    updateVariantGroupName: (id: string, name: string) => setVariantGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name } : g))),
    addVariantOption: (groupId: string) =>
      setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g))),
    removeVariantOption: (groupId: string, optionId: string) =>
      setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g))),
    updateVariantOption: (groupId: string, optionId: string, p: Partial<VariantOption>) =>
      setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...p } : o)) } : g))),
  };
  const addonHelpers = {
    addAddonGroup: () => setAddonGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', minSelectable: 0, maxSelectable: 1, options: [] }]),
    removeAddonGroup: (id: string) => setAddonGroups((gs) => gs.filter((g) => g.id !== id)),
    updateAddonGroup: (id: string, p: Partial<AddonGroup>) => setAddonGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...p } : g))),
    addAddonOption: (groupId: string) =>
      setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: [...g.options, { id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true }] } : g))),
    removeAddonOption: (groupId: string, optionId: string) =>
      setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g))),
    updateAddonOption: (groupId: string, optionId: string, p: Partial<AddonOption>) =>
      setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...p } : o)) } : g))),
  };
  const setGroupTranslation = (kind: 'variant' | 'addon', groupId: string, value: string) => {
    if (!extraLanguage) return;
    const apply = <G extends { id: string; nameTranslations?: TranslationMap }>(gs: G[]) =>
      gs.map((g) => (g.id === groupId ? { ...g, nameTranslations: withTranslation(g.nameTranslations, extraLanguage, value) } : g));
    if (kind === 'variant') setVariantGroups(apply);
    else setAddonGroups(apply);
  };
  const setOptionTranslation = (kind: 'variant' | 'addon', groupId: string, optionId: string, value: string) => {
    if (!extraLanguage) return;
    const apply = <G extends { id: string; options: { id: string; nameTranslations?: TranslationMap }[] }>(gs: G[]) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, nameTranslations: withTranslation(o.nameTranslations, extraLanguage, value) } : o)) }
          : g,
      );
    if (kind === 'variant') setVariantGroups(apply);
    else setAddonGroups(apply);
  };

  const schedule = product.schedule;
  const money = (cents: number) => formatCents(cents, shop?.currency ?? 'EUR', i18n.language);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center gap-3.5 border-b border-line bg-white px-7 pb-3 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-9 items-center gap-1 rounded-full bg-sand pl-2 pr-3 text-[13px] font-semibold hover:bg-[#ebe4dc]"
        >
          <ChevronLeft size={16} strokeWidth={2.4} aria-hidden="true" />
          {t('nav.dishes')}
        </button>
        <h1 className="min-w-0 truncate font-display text-2xl font-semibold">{edit.form.name || t('products.newProduct')}</h1>
        {extraLanguage && activeLanguage && (
          <div className="ml-auto">
            <LanguageTabs languages={languages} active={activeLanguage} onChange={setPickedLanguage} />
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-6 pt-5">
        <div className="flex max-w-[860px] flex-col gap-4">
          {/* Basics */}
          <section ref={basicsRef} className={`${section} scroll-mt-4`}>
            <h2 className={sectionTitle}>{t('dishes.editor.basics')}</h2>
            {translatingLanguage ? (
              <div className="flex flex-col gap-4">
                <TranslationField
                  label={t('products.name')}
                  original={edit.form.name}
                  value={edit.nameTranslations[translatingLanguage] ?? ''}
                  onChange={(v) => patch({ nameTranslations: withTranslation(edit.nameTranslations, translatingLanguage, v) })}
                />
                <TranslationField
                  label={t('products.description')}
                  original={edit.form.description}
                  value={edit.descriptionTranslations[translatingLanguage] ?? ''}
                  onChange={(v) => patch({ descriptionTranslations: withTranslation(edit.descriptionTranslations, translatingLanguage, v) })}
                  multiline
                />
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <DishPhotoField
                  imageFile={imageFile}
                  setImageFile={setImageFile}
                  existingImageUrl={existingImageUrl}
                  photoError={tried && photoMissing}
                />
                <div className="flex flex-col gap-3">
                  <div>
                    <MyInput
                      label={t('products.name')}
                      value={edit.form.name}
                      placeholder={t('products.namePlaceholder')}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                    {tried && nameMissing && <p className="mt-1 text-xs text-[#b42318]">{t('dishes.editor.nameRequired')}</p>}
                  </div>
                  <div>
                    <MyTextarea
                      label={t('products.description')}
                      rows={3}
                      value={edit.form.description}
                      placeholder={t('products.descriptionPlaceholder')}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    />
                    <p className={`mt-1 text-xs ${tried && descMissing ? 'text-[#b42318]' : 'text-[#8a7f77]'}`}>
                      {tried && descMissing
                        ? t('dishes.editor.descriptionRequired')
                        : t('dishes.editor.descriptionHint', { count: edit.form.description.length, max: DESCRIPTION_SOFT_LIMIT })}
                    </p>
                  </div>
                  <div className="max-w-[200px]">
                    <CurrencyInput
                      label={t('products.price', { symbol: currencySymbol })}
                      valueCents={edit.form.price}
                      onChange={(cents) => setForm((f) => ({ ...f, price: cents }))}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {!translatingLanguage && (
            <section ref={categoriesRef} className={`${section} scroll-mt-4`}>
              <h2 className={sectionTitle}>{t('dishes.editor.categories')}</h2>
              <StepCategories
                shopId={shopId}
                categories={categoriesList}
                selectedCategoryIds={edit.categoryIds}
                setSelectedCategoryIds={(ids) => patch({ categoryIds: ids })}
                taxClasses={refs?.taxClasses ?? []}
                taxRefs={refs}
                taxClassOverride={edit.foodInfo.taxClassId}
                setTaxClassOverride={(id) => patch({ foodInfo: { ...edit.foodInfo, taxClassId: id } })}
                categoryError={tried && categoryMissing}
              />
            </section>
          )}

          {!translatingLanguage && (
            <section className={section}>
              <h2 className={sectionTitle}>{t('dishes.editor.foodInfo')}</h2>
              <StepFoodInfo foodInfo={edit.foodInfo ?? EMPTY_FOOD_INFO} setFoodInfo={(fi) => patch({ foodInfo: fi })} refs={refs} showOptional />
            </section>
          )}

          <section className={section}>
            <h2 className={sectionTitle}>{t('dishes.editor.options')}</h2>
            <Step4Customise
              variantGroups={edit.variantGroups}
              {...variantHelpers}
              addonGroups={edit.addonGroups}
              {...addonHelpers}
              refs={refs}
              translation={translatingLanguage ? { language: translatingLanguage, setGroup: setGroupTranslation, setOption: setOptionTranslation } : undefined}
            />
          </section>

          {!translatingLanguage && (
            <section className={section}>
              <h2 className={sectionTitle}>{t('dishes.editor.availability')}</h2>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p id="dish-on-menu-label" className="text-sm font-semibold">{t('dishes.editor.onMenu')}</p>
                  <p className="text-[13px] text-[#6b6058]">{t('dishes.editor.onMenuHelp')}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={edit.isAvailable}
                  aria-labelledby="dish-on-menu-label"
                  onClick={() => patch({ isAvailable: !edit.isAvailable })}
                  className={`relative h-6 w-10 flex-shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
                    edit.isAvailable ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
                  }`}
                >
                  <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${edit.isAvailable ? 'right-[3px]' : 'left-[3px]'}`} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-cream px-3.5 py-3">
                <span className="text-sm">
                  <strong>{t('products.scheduleModalTitle')}</strong>{' '}
                  <span className="text-[#6b6058]">
                    ·{' '}
                    {schedule
                      ? schedule.offerPrice != null
                        ? `${schedule.offerLabel || t('products.offerBadge')} ${money(schedule.offerPrice)}`
                        : t('dishes.editor.scheduleSet')
                      : t('dishes.editor.scheduleNone')}
                  </span>
                </span>
                <button type="button" onClick={() => setScheduleOpen(true)} className="text-[13px] font-semibold underline underline-offset-2">
                  {schedule ? t('products.editSchedule') : t('dishes.editor.scheduleSetUp')}
                </button>
              </div>
            </section>
          )}

          {!translatingLanguage && (
            <section className="rounded-2xl border border-[#f5c2bd] bg-white px-5 py-4">
              {confirmDelete ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex-1 text-sm text-[#8f1c13]">{t('products.deleteWarning')}</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="h-9 rounded-full border border-[#e3d9ce] px-4 text-[13px] font-semibold hover:bg-cream"
                  >
                    {t('products.cancel')}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => void remove()}
                    className="h-9 rounded-full bg-[#b42318] px-4 text-[13px] font-bold text-white hover:bg-[#981b14] disabled:opacity-50"
                  >
                    {isDeleting ? t('products.deleting') : t('products.confirmDelete')}
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-[#6b6058]">{t('dishes.editor.deleteHint')}</span>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="h-9 rounded-full border border-[#f0c4ad] px-4 text-[13px] font-semibold text-[#b42318] hover:bg-[#fdeceb]"
                  >
                    {t('products.delete')}
                  </button>
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* Save bar */}
      <div className="flex items-center gap-3 border-t border-line bg-white px-7 py-3">
        {dirty ? (
          <span className="flex items-center gap-2 text-[13px] text-[#8a5a00]" role="status">
            <span className="h-2 w-2 rounded-full bg-[#d97706]" aria-hidden="true" />
            {t('dishes.editor.unsaved')}
          </span>
        ) : (
          <span className="text-[13px] text-[#1d5a32]" role="status">
            {t('dishes.editor.allSaved')}
          </span>
        )}
        <button
          type="button"
          disabled={!dirty || isBusy}
          onClick={discard}
          className="ml-auto h-[42px] rounded-full border border-[#e3d9ce] bg-white px-[18px] text-sm font-semibold hover:bg-cream disabled:opacity-40"
        >
          {t('dishes.editor.discard')}
        </button>
        <button
          type="button"
          disabled={!dirty || isBusy}
          onClick={() => void save()}
          className="h-[42px] rounded-full bg-ink px-[22px] text-sm font-bold text-white hover:bg-black disabled:opacity-40"
        >
          {isUpdating ? t('products.saving') : isUploading ? t('products.uploadingImage') : t('dishes.editor.save')}
        </button>
      </div>

      {scheduleOpen && <ScheduleOfferModal product={product} currencySymbol={currencySymbol} onClose={() => setScheduleOpen(false)} />}
    </div>
  );
}
