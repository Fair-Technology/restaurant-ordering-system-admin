import { useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import type { ProductDto, ProductImage } from '../../services/api';
import {
  useCreateProductMutation,
  useGetProductsByShopQuery,
  useGetShopByIdQuery,
  useUpdateProductMutation,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { DishForm } from './DishForm';
import { useUploadProductImage } from '../../features/menu/useUploadProductImage';
import { createDishWithPhoto, dishPhotoMissing, isPhotoRequiredError, isPhotoRequiredToEnableError, replaceDishPhoto } from '../../features/menu/productImage';
import { failureMessage } from '../../features/api/errorMessage';
import { isWrongSizeError } from '../../features/images/imageRules';
import { useShopReferenceLists } from '../../features/menu/useShopReferenceLists';
import { effectiveTaxClassId } from '../../features/menu/foodInfo';
import { menuLanguagesOf } from '../../features/menu/translations';
import {
  addRequiredChecklist,
  addRequiredLeftCount,
  applySimilarDishCopy,
  copyFromSimilarDish,
  emptyDishFormState,
  type DishFormState,
} from '../../features/menu/dishForm';

interface Props {
  shopId: string;
  currencySymbol: string;
  categoriesList: { id: string; name: string; taxClassId?: string | null }[];
  onClose: () => void;
  /** Called once a dish has really been added to the menu (not for drafts). */
  onAdded?: (productId: string) => void;
}

type Saving = null | 'draft' | 'add';

/**
 * AddDishPanel — the add path of the dish screen: keeps the new dish locally and creates it with the existing
 * create mutation. "Save as draft" needs only a name and keeps the dish off the menu; "Add to menu" needs the
 * whole checklist. Everything you see lives in the shared `DishForm`.
 */
export function AddDishPanel({ shopId, currencySymbol, categoriesList, onClose, onAdded }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { refs } = useShopReferenceLists(shopId);
  const { data: shopDishes } = useGetProductsByShopQuery({ shopId, includeUncategorized: true });
  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const uploadProductImage = useUploadProductImage();

  const languages = shop ? menuLanguagesOf(shop) : [];
  const extraLanguage = languages[1];

  const [value, setValueRaw] = useState<DishFormState>(emptyDishFormState);
  const [imageFile, setImageFileRaw] = useState<File | null>(null);
  const [saving, setSaving] = useState<Saving>(null);
  // Set once the dish exists (a saved draft, or a dish whose photo upload failed): later saves update it instead of creating another.
  const [productId, setProductId] = useState<string | null>(null);
  const uploadedPhoto = useRef<File | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [added, setAdded] = useState<{ id: string; name: string } | null>(null);
  const [similar, setSimilar] = useState<{ id: string; name: string } | null>(null);

  // Any change after a draft was saved means the saved draft is no longer what is on screen.
  const setValue: Dispatch<SetStateAction<DishFormState>> = (next) => {
    setDraftSaved(false);
    setValueRaw(next);
  };
  const setImageFile = (f: File | null) => {
    setDraftSaved(false);
    setImageFileRaw(f);
  };

  const photoMissing = dishPhotoMissing(imageFile, null);
  const checklist = addRequiredChecklist(value);
  const requiredLeft = addRequiredLeftCount(checklist);
  const labelled = checklist.map((c) => ({ ...c, label: t(`dishForm.checklist.${c.id}`) }));

  const persist = async (kind: 'draft' | 'add') => {
    // Safety net behind DishForm's own gate: a dish without a photo can only be saved as a draft, never put on the menu.
    if (kind === 'add' && photoMissing) {
      toast.error(t('products.enableNeedsPhoto', { name: value.form.name.trim() || t('dishForm.newDish') }));
      return;
    }
    setSaving(kind);
    const draft = kind === 'draft';
    const fields = {
      name: value.form.name.trim(),
      description: value.form.description,
      ...(extraLanguage ? { nameTranslations: value.nameTranslations, descriptionTranslations: value.descriptionTranslations } : {}),
      price: value.form.price,
      categoryIds: value.categoryIds,
      allergenIds: value.foodInfo.allergenIds,
      additiveIds: value.foodInfo.additiveIds,
      dietaryTagIds: value.foodInfo.dietaryTagIds,
      prepMinutes: value.foodInfo.prepMinutes,
      // The dish owns its class: the one picked by hand, else its category's suggestion
      taxClassId: effectiveTaxClassId(value.categoryIds, categoriesList, value.foodInfo.taxClassId),
      unavailableModes: value.foodInfo.unavailableModes,
      ageRestricted: value.foodInfo.ageRestricted,
      optionGroupRefs: value.optionGroupRefs,
      // A draft never goes live, even when everything else is filled in
      isAvailable: !draft,
    };
    let uploadStage = false;
    try {
      if (productId) {
        await updateProduct({
          productId,
          body: { shopId, ...fields, spiceLevel: value.foodInfo.spiceLevel, variantGroups: value.variantGroups, addonGroups: value.addonGroups },
        }).unwrap();
      }
      const result = await createDishWithPhoto({
        existingProductId: productId,
        createDish: async () => {
          const created = await createProduct({
            createProductRequestDto: {
              shopId,
              ...fields,
              variantGroups: value.variantGroups.length > 0 ? value.variantGroups : undefined,
              addonGroups: value.addonGroups.length > 0 ? value.addonGroups : undefined,
              spiceLevel: value.foodInfo.spiceLevel ?? undefined,
            },
          }).unwrap();
          setProductId(created.id);
          return created.id;
        },
        uploadPhoto: async (id) => {
          if (!imageFile || uploadedPhoto.current === imageFile) return;
          uploadStage = true;
          if (uploadedPhoto.current) {
            // The saved draft already has a photo: add the new one first, then keep only that one
            await replaceDishPhoto({
              hadPhoto: true,
              upload: () => uploadProductImage(shopId, id, imageFile),
              keepOnly: async (image) => {
                await updateProduct({ productId: id, body: { shopId, images: [{ id: image.id, url: image.url } as ProductImage] } }).unwrap();
              },
            });
          } else {
            await uploadProductImage(shopId, id, imageFile);
          }
          uploadedPhoto.current = imageFile;
        },
      });
      if (result.status === 'photo-failed') {
        // The dish exists but has no photo: stay open, say so, and let the owner retry just the upload.
        setProductId(result.productId);
        toast.error(t(isWrongSizeError(result.error) ? 'products.productImageWrongSize' : 'dishForm.createdWithoutPhoto'));
        return;
      }
      setProductId(result.productId);
      if (draft) {
        setDraftSaved(true);
      } else {
        setAdded({ id: result.productId, name: value.form.name.trim() });
        onAdded?.(result.productId);
      }
    } catch (err) {
      if (isPhotoRequiredToEnableError(err)) toast.error(t('products.enableNeedsPhoto', { name: value.form.name.trim() || t('dishForm.newDish') }));
      else if (isPhotoRequiredError(err)) toast.error(t('products.photoRequired'));
      else if (uploadStage) toast.error(t(isWrongSizeError(err) ? 'products.productImageWrongSize' : 'products.failedToUploadImage'));
      else toast.error(failureMessage(t(draft ? 'dishForm.draftFailed' : 'dishForm.addFailed'), err));
    } finally {
      setSaving(null);
    }
  };

  const addAnother = () => {
    setValueRaw(emptyDishFormState());
    setImageFileRaw(null);
    setProductId(null);
    uploadedPhoto.current = null;
    setDraftSaved(false);
    setAdded(null);
    setSimilar(null);
  };

  const status = added
    ? { text: t('dishForm.addStatus.onMenu'), tone: 'ok' as const }
    : draftSaved
      ? { text: t('dishForm.addStatus.draftSaved'), tone: 'ok' as const }
      : { text: t('dishForm.addStatus.draft'), tone: 'muted' as const };

  return (
    <DishForm
      mode="add"
      shopId={shopId}
      value={value}
      setValue={setValue}
      imageFile={imageFile}
      setImageFile={setImageFile}
      existingImageUrl={null}
      categoriesList={categoriesList}
      refs={refs}
      languages={languages}
      currency={shop?.currency ?? 'EUR'}
      currencySymbol={currencySymbol}
      // Edit-only props: Add has its own footer
      dirty={false}
      isSaving={saving !== null || isCreating || isUpdating}
      saveLabel=""
      onSave={() => {}}
      onDiscard={() => {}}
      onClose={onClose}
      startFromSimilarDish={
        <SimilarDishBox
          dishes={(shopDishes ?? []).filter((p) => !p.isDeleted)}
          selected={similar}
          onPick={(dish) => {
            if (!dish) {
              setSimilar(null);
              return;
            }
            setSimilar({ id: dish.id, name: dish.name });
            setValue((v) => applySimilarDishCopy(v, copyFromSimilarDish(dish, categoriesList)));
          }}
        />
      }
      requiredChecklist={labelled}
      addStatus={status}
      addRequiredLeft={requiredLeft}
      onSaveDraft={() => void persist('draft')}
      isSavingDraft={saving === 'draft'}
      onAddToMenu={() => void persist('add')}
      isAddingToMenu={saving === 'add'}
      onCancel={onClose}
      isAdded={added !== null}
      successBanner={
        added && (
          <div role="status" className="flex items-center gap-3 rounded-2xl bg-ok-bg px-[18px] py-4 text-[15px] font-semibold leading-[22px] text-ok">
            <Check size={22} strokeWidth={3} aria-hidden="true" className="flex-none" />
            <span>{t('dishForm.added', { name: added.name })}</span>
          </div>
        )
      }
      onViewInMenu={onClose}
      onAddAnother={addAnother}
    />
  );
}

/** "Start from a similar dish": pick one of the shop's real dishes to copy its category, tax class and option groups. */
function SimilarDishBox({
  dishes, selected, onPick,
}: {
  dishes: ProductDto[];
  selected: { id: string; name: string } | null;
  onPick: (dish: ProductDto | null) => void;
}) {
  const { t } = useTranslation();
  const sorted = useMemo(() => [...dishes].sort((a, b) => a.name.localeCompare(b.name)), [dishes]);
  return (
    <div className="flex flex-col gap-2.5 rounded-2xl bg-cream px-[18px] py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
          <label htmlFor="similar-dish" className="text-[15px] font-semibold leading-[21px]">
            {t('dishForm.similar.label')}
          </label>
          <span className="text-[13px] leading-[19px] text-muted">{t('dishForm.similar.help')}</span>
        </div>
        <select
          id="similar-dish"
          value={selected?.id ?? ''}
          onChange={(e) => onPick(sorted.find((d) => d.id === e.target.value) ?? null)}
          className="h-12 w-[220px] rounded-xl border-[1.5px] border-control bg-white px-3 text-[15px] text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]"
        >
          <option value="">{t('dishForm.similar.placeholder')}</option>
          {sorted.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {selected && <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.similar.copied', { name: selected.name })}</p>}
    </div>
  );
}
