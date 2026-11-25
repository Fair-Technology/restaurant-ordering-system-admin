import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlocker } from 'react-router-dom';
import { Trash2, X } from 'lucide-react';
import type { ProductDto, ProductImage } from '../../services/api';
import {
  useDeleteProductMutation,
  useGetProductByIdQuery,
  useGetShopByIdQuery,
  useUpdateProductMutation,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { MySpinner } from '../ui/MySpinner';
import { PendingButton } from '../ui/PendingButton';
import { DishForm } from './DishForm';
import { ScheduleOfferModal } from './ScheduleOfferModal';
import { useUploadProductImage } from '../../features/menu/useUploadProductImage';
import { isPhotoRequiredError, replaceDishPhoto } from '../../features/menu/productImage';
import { failureMessage } from '../../features/api/errorMessage';
import { isWrongSizeError } from '../../features/images/imageRules';
import { useShopReferenceLists } from '../../features/menu/useShopReferenceLists';
import { effectiveTaxClassId } from '../../features/menu/foodInfo';
import { menuLanguagesOf } from '../../features/menu/translations';
import { dishFormStateFromProduct, type DishFormState } from '../../features/menu/dishForm';
import { formatCents } from '../../utils/money';

interface Props {
  productId: string;
  shopId: string;
  currencySymbol: string;
  categoriesList: { id: string; name: string; taxClassId?: string | null }[];
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

/**
 * DishEditor — the edit path of the dish screen: loads one saved dish, keeps the unsaved changes locally,
 * and saves them with the existing update mutation. Everything you see lives in the shared `DishForm`.
 */
export function DishEditor({ productId, shopId, currencySymbol, categoriesList, onClose, onSaved, onDeleted }: Props) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const { data: product, isLoading, isError } = useGetProductByIdQuery({ productId, shopId }, { refetchOnMountOrArgChange: true });
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { refs } = useShopReferenceLists(shopId);
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();
  const uploadProductImage = useUploadProductImage();

  const languages = shop ? menuLanguagesOf(shop) : [];
  const extraLanguage = languages[1];

  const [saved, setSaved] = useState<DishFormState | null>(null);
  const [edit, setEdit] = useState<DishFormState | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The saved dish is the starting point; a refetch (after a save, or from elsewhere) replaces it,
  // and also replaces the form unless there are unsaved changes in it. (The page gives each dish
  // its own editor via `key`, so switching dishes starts fresh.)
  const [syncedProduct, setSyncedProduct] = useState<ProductDto | undefined>();
  if (product && product.id === productId && product !== syncedProduct) {
    setSyncedProduct(product);
    const next = dishFormStateFromProduct(product);
    setEdit(edit && saved && JSON.stringify(edit) !== JSON.stringify(saved) ? edit : next);
    setSaved(next);
  }

  const dirty = useMemo(
    () => !!edit && !!saved && (imageFile !== null || JSON.stringify(edit) !== JSON.stringify(saved)),
    [edit, saved, imageFile],
  );

  // Warn before unsaved edits are thrown away. Deleting the dish navigates away on purpose, so it skips the guard.
  const skipLeaveGuard = useRef(false);
  const blocker = useBlocker(() => dirty && !skipLeaveGuard.current);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(t('dishes.editor.confirmLeave'))) blocker.proceed();
    else blocker.reset();
  }, [blocker, t]);
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty]);

  if (isLoading || (product && (!edit || !saved))) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <MySpinner label={t('products.loadingProduct')} />
      </div>
    );
  }

  if (isError || !product || !edit || !saved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
        <p className="text-[15px] font-medium text-ink">{t('products.productNotFound')}</p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-11 items-center gap-1 rounded-full bg-sand pl-3 pr-4 text-[13px] font-semibold hover:bg-[#ebe4dc]"
        >
          <X size={16} strokeWidth={2.4} aria-hidden="true" />
          {t('dishes.editor.closeEditor')}
        </button>
      </div>
    );
  }

  const existingImageUrl = product.images?.[0]?.url ?? null;
  const isBusy = isUpdating || isUploading;
  const currency = shop?.currency ?? 'EUR';

  // The form validates name, description, photo and category before calling this
  const save = async () => {
    let uploadStage = false;
    try {
      await updateProduct({
        productId,
        body: {
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
          // null clears the level ("Not spicy"); the update type allows it
          spiceLevel: edit.foodInfo.spiceLevel,
          prepMinutes: edit.foodInfo.prepMinutes,
          // The dish owns its class: the one picked by hand, else its category's suggestion
          taxClassId: effectiveTaxClassId(edit.categoryIds, categoriesList, edit.foodInfo.taxClassId),
          unavailableModes: edit.foodInfo.unavailableModes,
          ageRestricted: edit.foodInfo.ageRestricted,
          isAvailable: edit.isAvailable,
          optionGroupRefs: edit.optionGroupRefs,
        },
      }).unwrap();

      if (imageFile) {
        setIsUploading(true);
        uploadStage = true;
        const replaced = await replaceDishPhoto({
          hadPhoto: (product.images?.length ?? 0) > 0,
          upload: () => uploadProductImage(shopId, productId, imageFile),
          keepOnly: async (image) => {
            await updateProduct({ productId, body: { shopId, images: [{ id: image.id, url: image.url } as ProductImage] } }).unwrap();
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
      toast.success(t('products.saved'));
      onSaved();
    } catch (err) {
      setIsUploading(false);
      if (uploadStage) toast.error(t(isWrongSizeError(err) ? 'products.productImageWrongSize' : 'products.failedToUploadImage'));
      else if (isPhotoRequiredError(err)) toast.error(t('products.photoRequired'));
      else toast.error(failureMessage(t('products.failedToUpdate'), err));
    }
  };

  const discard = () => {
    setEdit(saved);
    setImageFile(null);
  };

  const remove = async () => {
    try {
      await deleteProduct({ productId, shopId }).unwrap();
      toast.success(t('products.deleted'));
      skipLeaveGuard.current = true;
      onDeleted();
    } catch (err) {
      toast.error(failureMessage(t('products.failedToDelete'), err));
    }
  };

  const schedule = product.schedule;
  const money = (cents: number) => formatCents(cents, currency, i18n.language);

  return (
    <>
      <DishForm
        mode="edit"
        shopId={shopId}
        value={edit}
        setValue={(next) => setEdit((e) => (e ? (typeof next === 'function' ? next(e) : next) : e))}
        imageFile={imageFile}
        setImageFile={setImageFile}
        existingImageUrl={existingImageUrl}
        categoriesList={categoriesList}
        refs={refs}
        languages={languages}
        currency={currency}
        currencySymbol={currencySymbol}
        dirty={dirty}
        isSaving={isBusy}
        saveLabel={isUpdating ? t('products.saving') : isUploading ? t('products.uploadingImage') : t('dishForm.save')}
        onSave={() => void save()}
        onDiscard={discard}
        onClose={onClose}
        deleteDish={
          confirmDelete ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#8f1c13]">{t('products.deleteWarning')}</span>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 rounded-full border border-[#e3d9ce] px-4 text-[13px] font-semibold hover:bg-cream"
              >
                {t('products.cancel')}
              </button>
              <PendingButton
                type="button"
                isPending={isDeleting}
                onClick={() => void remove()}
                className="h-11 rounded-full bg-[#b42318] px-4 text-[13px] font-bold text-white hover:bg-[#981b14] disabled:opacity-50"
              >
                {isDeleting ? t('products.deleting') : t('products.confirmDelete')}
              </PendingButton>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              title={t('dishes.editor.deleteHint')}
              className="inline-flex h-11 items-center gap-1.5 rounded-full border border-[#f0c4ad] px-4 text-[13px] font-semibold text-[#b42318] hover:bg-[#fdeceb]"
            >
              <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
              {t('dishes.editor.deleteDish')}
            </button>
          )
        }
        availabilityExtras={
          <>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-cream px-3.5 py-3">
              <span className="text-sm">
                <strong>{t('products.scheduleModalTitle')}</strong>{' '}
                <span className="text-muted">
                  ·{' '}
                  {schedule
                    ? schedule.offerPrice != null
                      ? `${schedule.offerLabel || t('products.offerBadge')} ${money(schedule.offerPrice)}`
                      : t('dishes.editor.scheduleSet')
                    : t('dishes.editor.scheduleNone')}
                </span>
              </span>
              <button type="button" onClick={() => setScheduleOpen(true)} className="h-11 text-[13px] font-semibold underline underline-offset-2">
                {schedule ? t('products.editSchedule') : t('dishes.editor.scheduleSetUp')}
              </button>
            </div>
          </>
        }
      />
      {scheduleOpen && <ScheduleOfferModal product={product} currencySymbol={currencySymbol} languages={languages} onClose={() => setScheduleOpen(false)} />}
    </>
  );
}
