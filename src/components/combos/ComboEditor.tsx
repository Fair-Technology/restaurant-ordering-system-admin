import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateProductMutation } from '../../services/api';
import type { CategoryResponse, MenuLanguage, ProductResponse, ShopResponse } from '../../services/api';
import { useCreateComboMutation, useUpdateComboMutation, type ComboDto } from '../../services/combosApi';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../utils/money';
import { isWrongSizeError } from '../../features/images/imageRules';
import { useUploadProductImage } from '../../features/menu/useUploadProductImage';
import { createDishWithPhoto, isPhotoRequiredError, replaceDishPhoto } from '../../features/menu/productImage';
import { menuLanguagesOf, resolveActiveLanguage, withTranslation } from '../../features/menu/translations';
import {
  comboFormToBody,
  comboPhotoMissing,
  comboPhotoUrl,
  EMPTY_COMBO_FORM,
  formFromCombo,
  type ComboForm,
  type ComboFormError,
  type ComboGroupForm,
} from '../../features/combos/combos';
import { MyButton } from '../ui/MyButton';
import { MyInput, MyTextarea } from '../ui/MyInput';
import { DishPhotoField } from '../menu/DishPhotoField';
import { selectClass } from '../../features/menu/useIsWide';
import { LanguageTabs, TranslationField } from '../menu/LanguageTabs';

const MAX_GROUPS = 5;
const NO_CATEGORY = '—';

interface ComboEditorProps {
  shop: ShopResponse;
  shopId: string;
  combo: ComboDto | null;
  products: ProductResponse[];
  categories: CategoryResponse[];
  onDone: () => void;
}

export function ComboEditor({ shop, shopId, combo, products, categories, onDone }: ComboEditorProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createCombo, { isLoading: creating }] = useCreateComboMutation();
  const [updateCombo, { isLoading: updating }] = useUpdateComboMutation();
  const dishIds = new Set(products.map((p) => p.id!));
  const [form, setForm] = useState<ComboForm>(() =>
    combo ? formFromCombo(combo, dishIds) : EMPTY_COMBO_FORM,
  );
  const [formError, setFormError] = useState<ComboFormError | null>(null);
  const [updateProduct] = useUpdateProductMutation();
  const uploadProductImage = useUploadProductImage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [photoTried, setPhotoTried] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Set when the combo was created but its photo upload failed: the next save only retries the photo.
  const [createdComboId, setCreatedComboId] = useState<string | null>(null);
  const existingImageUrl = combo ? comboPhotoUrl(combo) : null;

  const languages = menuLanguagesOf(shop);
  const extraLanguage = languages[1];
  const [pickedLanguage, setPickedLanguage] = useState<MenuLanguage | undefined>();
  const activeLanguage = resolveActiveLanguage(languages, pickedLanguage);
  const translating = extraLanguage !== undefined && activeLanguage === extraLanguage;

  const money = (cents: number) => formatCents(cents, shop.currency ?? 'EUR', i18n.language);
  const set = (patch: Partial<ComboForm>) => setForm((f) => ({ ...f, ...patch }));
  const setGroup = (index: number, patch: Partial<ComboGroupForm>) =>
    set({ groups: form.groups.map((g, i) => (i === index ? { ...g, ...patch } : g)) });

  // dishes under the name of their first category, so a whole category can be ticked at once
  const dishesByCategory = new Map<string, ProductResponse[]>();
  for (const p of products) {
    const name = p.categories?.[0]?.name ?? NO_CATEGORY;
    dishesByCategory.set(name, [...(dishesByCategory.get(name) ?? []), p]);
  }

  const toggleDishes = (index: number, ids: string[], on: boolean) => {
    const current = form.groups[index].productIds;
    setGroup(index, {
      productIds: on ? [...current, ...ids.filter((id) => !current.includes(id))] : current.filter((id) => !ids.includes(id)),
    });
  };

  const serverMessage = (err: unknown): string =>
    (err as { data?: { error?: string } })?.data?.error ?? t('combos.saveFailed');

  const photoError = photoTried && comboPhotoMissing(imageFile, existingImageUrl);

  const submit = async () => {
    const body = comboFormToBody(form);
    if ('error' in body) {
      setFormError(body.error);
      return;
    }
    setFormError(null);
    // A combo always has a photo: new ones need one, older photo-less ones must get one before any change is saved.
    if (comboPhotoMissing(imageFile, existingImageUrl) && !createdComboId) {
      setPhotoTried(true);
      setPickedLanguage(undefined);
      return;
    }
    if (!combo) {
      if (!imageFile) return;
      try {
        const result = await createDishWithPhoto({
          existingProductId: createdComboId,
          createDish: async () => (await createCombo({ shopId, body }).unwrap()).id,
          uploadPhoto: async (comboId) => {
            setUploading(true);
            try {
              await uploadProductImage(shopId, comboId, imageFile);
            } finally {
              setUploading(false);
            }
          },
        });
        if (result.status === 'photo-failed') {
          setCreatedComboId(result.productId);
          toast.error(t(isWrongSizeError(result.error) ? 'products.productImageWrongSize' : 'combos.photoUploadFailed'));
          return;
        }
        toast.success(t('combos.saved'));
        onDone();
      } catch (err) {
        toast.error(serverMessage(err));
      }
      return;
    }
    let uploadStage = false;
    try {
      // The photo goes first and the combo save last: the save is what reloads the combo list, so the
      // list then already carries the new photo (saved the other way round it showed "no photo" until a reload).
      let photoReplaceIncomplete = false;
      if (imageFile) {
        setUploading(true);
        uploadStage = true;
        const replaced = await replaceDishPhoto({
          hadPhoto: combo.images.length > 0,
          upload: () => uploadProductImage(shopId, combo.id, imageFile),
          keepOnly: async (image) => {
            await updateProduct({
              productId: combo.id,
              updateProductRequest: { shopId, images: [{ id: image.id, url: image.url }] },
            }).unwrap();
          },
        });
        setUploading(false);
        uploadStage = false;
        photoReplaceIncomplete = replaced.status === 'old-kept';
      }
      await updateCombo({ shopId, comboId: combo.id, body }).unwrap();
      if (photoReplaceIncomplete) toast.error(t('combos.photoReplaceIncomplete'));
      else toast.success(t('combos.saved'));
      onDone();
    } catch (err) {
      setUploading(false);
      if (uploadStage) toast.error(t(isWrongSizeError(err) ? 'products.productImageWrongSize' : 'combos.photoUploadFailed'));
      else if (isPhotoRequiredError(err)) toast.error(t('combos.photoRequired'));
      else toast.error(serverMessage(err));
    }
  };

  const busy = creating || updating || uploading;
  const saveLabel = uploading ? t('products.uploadingImage') : createdComboId ? t('combos.retryPhotoUpload') : t('combos.save');

  if (translating) {
    const nothing = form.name.trim() === '' && form.description.trim() === '';
    return (
      <div className="space-y-4 p-4 sm:p-5">
        <LanguageTabs languages={languages} active={activeLanguage!} onChange={setPickedLanguage} />
        <TranslationField
          label={t('combos.name')}
          original={form.name}
          value={form.nameTranslations[extraLanguage] ?? ''}
          onChange={(v) => set({ nameTranslations: withTranslation(form.nameTranslations, extraLanguage, v) })}
        />
        <TranslationField
          label={t('combos.description')}
          original={form.description}
          value={form.descriptionTranslations[extraLanguage] ?? ''}
          onChange={(v) => set({ descriptionTranslations: withTranslation(form.descriptionTranslations, extraLanguage, v) })}
          multiline
        />
        {form.groups.map((group, index) => (
          <TranslationField
            key={group.id ?? index}
            label={t('combos.groupNameTranslated', { number: index + 1 })}
            original={group.name}
            value={group.nameTranslations[extraLanguage] ?? ''}
            onChange={(v) => setGroup(index, { nameTranslations: withTranslation(group.nameTranslations, extraLanguage, v) })}
          />
        ))}
        {nothing && form.groups.every((g) => g.name.trim() === '') && (
          <p className="text-sm text-muted">{t('translationFields.nothingToTranslate')}</p>
        )}
        <div className="flex flex-wrap gap-2 border-t border-line-soft pt-4">
          <MyButton type="button" disabled={busy} onClick={submit}>
            {saveLabel}
          </MyButton>
          <MyButton type="button" variant="secondary" onClick={onDone}>
            {t('combos.cancel')}
          </MyButton>
        </div>
        {formError && <p role="alert" className="text-sm text-[#b42318]">{t(`combos.formError.${formError}`)}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-5">
      {createdComboId && (
        <div role="alert" className="rounded-xl border border-[#f1dfae] bg-[#fff6e0] p-3">
          <p className="text-sm text-[#8a5a00]">{t('combos.createdWithoutPhoto')}</p>
        </div>
      )}
      {extraLanguage && activeLanguage && (
        <LanguageTabs languages={languages} active={activeLanguage} onChange={setPickedLanguage} />
      )}
      <MyInput label={t('combos.name')} value={form.name} onChange={(e) => set({ name: e.target.value })} />
      <MyTextarea
        label={t('combos.description')}
        rows={2}
        value={form.description}
        onChange={(e) => set({ description: e.target.value })}
      />
      <MyInput
        label={t('combos.price')}
        inputMode="decimal"
        value={form.price}
        onChange={(e) => set({ price: e.target.value })}
      />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="combo-category" className="text-[13px] font-semibold text-[#4a413b]">
          {t('combos.category')}
        </label>
        <select
          id="combo-category"
          value={form.categoryId}
          onChange={(e) => set({ categoryId: e.target.value })}
          className={selectClass}
        >
          <option value="">{t('combos.categoryPick')}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <DishPhotoField imageFile={imageFile} setImageFile={setImageFile} existingImageUrl={existingImageUrl} photoError={photoError} />

      {shop.countryCode === 'DE' && (
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              className="accent-[#1f1a17]"
              checked={form.bmfDrinkShare}
              onChange={(e) => set({ bmfDrinkShare: e.target.checked })}
            />
            {t('combos.bmf')}
          </label>
          <p className="pl-6 text-xs text-muted">{t('combos.bmfHelp')}</p>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" className="accent-[#1f1a17]" checked={form.isAvailable} onChange={(e) => set({ isAvailable: e.target.checked })} />
        {t('combos.available')}
      </label>

      <h3 className="border-t border-line-soft pt-4 text-[15px] font-bold">{t('combos.groups')}</h3>
      {form.groups.map((group, index) => (
        <div key={group.id ?? index} className="space-y-3 rounded-xl border border-line bg-paper p-3.5">
          <MyInput
            label={t('combos.groupName')}
            value={group.name}
            onChange={(e) => setGroup(index, { name: e.target.value })}
          />
          <p className="text-[13px] font-semibold text-[#4a413b]">{t('combos.groupDishes')}</p>
          <div className="space-y-3">
            {[...dishesByCategory.entries()].map(([categoryName, dishes]) => {
              const ids = dishes.map((p) => p.id!);
              const allOn = ids.every((id) => group.productIds.includes(id));
              return (
                <div key={categoryName} className="space-y-1">
                  <label className="flex items-center gap-2 text-sm font-semibold">
                    <input type="checkbox" className="accent-[#1f1a17]" checked={allOn} onChange={(e) => toggleDishes(index, ids, e.target.checked)} />
                    {t('combos.wholeCategory', { category: categoryName })}
                  </label>
                  <div className="pl-6 space-y-1">
                    {dishes.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-[#4a413b]">
                        <input
                          type="checkbox"
                          className="accent-[#1f1a17]"
                          checked={group.productIds.includes(p.id!)}
                          onChange={(e) => toggleDishes(index, [p.id!], e.target.checked)}
                        />
                        {p.name}
                        <span className="ml-auto pl-2 text-[13px] text-[#8a7f77]">{money(p.price ?? 0)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          {form.groups.length > 1 && (
            <button
              type="button"
              className="text-xs font-semibold text-[#b42318] hover:underline"
              onClick={() => set({ groups: form.groups.filter((_, i) => i !== index) })}
            >
              {t('combos.removeGroup')}
            </button>
          )}
        </div>
      ))}
      {form.groups.length < MAX_GROUPS && (
        <MyButton
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => set({ groups: [...form.groups, { name: '', nameTranslations: {}, productIds: [] }] })}
        >
          {t('combos.addGroup')}
        </MyButton>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line-soft pt-4">
        <MyButton type="button" disabled={busy} onClick={submit}>
          {saveLabel}
        </MyButton>
        <MyButton type="button" variant="secondary" onClick={onDone}>
          {t('combos.cancel')}
        </MyButton>
      </div>
      {formError && <p role="alert" className="text-sm text-[#b42318]">{t(`combos.formError.${formError}`)}</p>}
    </div>
  );
}
