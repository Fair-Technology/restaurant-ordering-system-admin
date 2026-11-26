import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useDeleteProductMutation, useUpdateProductAvailabilityMutation, useUpdateProductMutation } from '../../services/api';
import type { CategoryDto, MenuLanguage, ProductDto, ProductImage, GetShopResultDto } from '../../services/api';
import { useCreateComboMutation, useUpdateComboMutation, type ComboDto } from '../../services/combosApi';
import { useToast } from '../../contexts/ToastContext';
import { formatCents } from '../../utils/money';
import { isWrongSizeError } from '../../features/images/imageRules';
import { useUploadProductImage } from '../../features/menu/useUploadProductImage';
import { createDishWithPhoto, replaceDishPhoto } from '../../features/menu/productImage';
import { menuLanguagesOf, resolveActiveLanguage, withTranslation } from '../../features/menu/translations';
import {
  comboFormToBody,
  comboPhotoMissing,
  comboPhotoUrl,
  emptyComboForm,
  isComboImageRequiredToEnableError,
  formFromCombo,
  type ComboForm,
  type ComboFormError,
} from '../../features/combos/combos';
import {
  COMBO_SECTIONS,
  comboFormDirty,
  comboNavStatus,
  comboTranslationMissing,
  dishesByCategory,
  type ComboNavStatus,
  type ComboSection,
} from '../../features/combos/comboForm';
import { DiscardSaveButtons, EditorShell, LanguageToggle, SaveStatus, editorFocusRing, type EditorSection } from '../editor/EditorShell';
import { PendingButton } from '../ui/PendingButton';
import { PillSwitch } from '../ui/PillSwitch';
import { MyInput, MyTextarea } from '../ui/MyInput';
import { DishPhotoField } from '../menu/DishPhotoField';
import { selectClass } from '../../features/menu/useIsWide';
import { ComboChoicesSection } from './ComboChoicesSection';

interface ComboEditorProps {
  shop: GetShopResultDto;
  shopId: string;
  combo: ComboDto | null;
  products: ProductDto[];
  categories: CategoryDto[];
  /** The combo was saved (or created): close the editor. */
  onDone: () => void;
  /** Close without saving (the close button). */
  onClose?: () => void;
  /** The combo was deleted from the footer. */
  onDeleted?: () => void;
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[22px] font-bold leading-7">{children}</h2>;
}

export function ComboEditor({ shop, shopId, combo, products, categories, onDone, onClose, onDeleted }: ComboEditorProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [createCombo, { isLoading: creating }] = useCreateComboMutation();
  const [updateCombo, { isLoading: updating }] = useUpdateComboMutation();
  const [deleteProduct, { isLoading: deleting }] = useDeleteProductMutation();
  const dishIds = new Set(products.map((p) => p.id!));
  // The form the editor opened with: what "unsaved changes" and Discard compare against
  const [saved] = useState<ComboForm>(() => (combo ? formFromCombo(combo, dishIds) : emptyComboForm()));
  const [form, setForm] = useState<ComboForm>(saved);
  const [section, setSection] = useState<ComboSection>('basics');
  const [formError, setFormError] = useState<ComboFormError | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [updateProduct] = useUpdateProductMutation();
  const [updateProductAvailability, { isLoading: togglingAvailability }] = useUpdateProductAvailabilityMutation();
  const uploadProductImage = useUploadProductImage();
  const [imageFile, setImageFile] = useState<File | null>(null);
  // The owner tried to turn the combo on without a photo; shown only while the combo still has none.
  const [photoEnableBlocked, setPhotoEnableBlocked] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Set when the combo was created but its photo upload failed: the next save only retries the photo.
  const [createdComboId, setCreatedComboId] = useState<string | null>(null);
  const existingImageUrl = combo ? comboPhotoUrl(combo) : null;
  const isGermany = shop.countryCode === 'DE';

  const languages = menuLanguagesOf(shop);
  const originalLanguage = languages[0];
  const extraLanguage = languages[1];
  const [pickedLanguage, setPickedLanguage] = useState<MenuLanguage | undefined>();
  const activeLanguage = resolveActiveLanguage(languages, pickedLanguage);
  const translating = extraLanguage !== undefined && activeLanguage === extraLanguage ? extraLanguage : undefined;
  const langName = (l: MenuLanguage) => t(`shops.languageName.${l}`);

  const money = (cents: number) => formatCents(cents, shop.currency ?? 'EUR', i18n.language);
  const set = (patch: Partial<ComboForm>) => setForm((f) => ({ ...f, ...patch }));
  const categoriesWithDishes = dishesByCategory(products);

  const dirty = comboFormDirty(saved, form, imageFile);
  // Warn before unsaved edits are thrown away. Saving and deleting close the editor on purpose, so they skip the guard.
  const skipLeaveGuard = useRef(false);
  const blocker = useBlocker(() => dirty && !skipLeaveGuard.current);
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(t('combos.editor.confirmLeave'))) blocker.proceed();
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
  const finish = () => {
    skipLeaveGuard.current = true;
    onDone();
  };

  const serverMessage = (err: unknown): string =>
    (err as { data?: { error?: string } })?.data?.error ?? t('combos.saveFailed');

  const photoMissing = comboPhotoMissing(imageFile, existingImageUrl);
  const photoError = photoEnableBlocked && photoMissing;
  const enableNeedsPhotoToast = () => t('combos.enableNeedsPhoto', { name: form.name.trim() || t('combos.name') });
  const blockEnableWithoutPhoto = () => {
    setPhotoEnableBlocked(true);
    setPickedLanguage(originalLanguage);
    setSection('basics');
    toast.error(enableNeedsPhotoToast());
  };
  const setAvailable = (on: boolean) => {
    if (on && photoMissing) {
      blockEnableWithoutPhoto();
      return;
    }
    setPhotoEnableBlocked(false);
    set({ isAvailable: on });
  };
  const discard = () => {
    setForm(saved);
    setImageFile(null);
    setFormError(null);
    setPhotoEnableBlocked(false);
  };

  const remove = async () => {
    if (!combo) return;
    try {
      await deleteProduct({ productId: combo.id, shopId }).unwrap();
      toast.success(t('combos.deleted'));
      skipLeaveGuard.current = true;
      (onDeleted ?? onDone)();
    } catch (err) {
      toast.error(serverMessage(err));
    }
  };

  const submit = async () => {
    const body = comboFormToBody(form);
    if ('error' in body) {
      setFormError(body.error);
      if (body.error === 'groups') setSection('choices');
      else {
        setSection('basics');
        if (body.error !== 'translation') setPickedLanguage(originalLanguage);
      }
      return;
    }
    setFormError(null);
    // A combo can be saved without a photo, but then it stays off: turning it on needs one.
    if (form.isAvailable && photoMissing) {
      blockEnableWithoutPhoto();
      return;
    }
    if (!combo) {
      try {
        const result = await createDishWithPhoto({
          existingProductId: createdComboId,
          createDish: async () => (await createCombo({ shopId, body: { ...body, isAvailable: false } }).unwrap()).id,
          uploadPhoto: async (comboId) => {
            if (!imageFile) return;
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
        // The backend refuses a combo created ON (it has no photo yet): switch it on now that the photo is in place.
        if (form.isAvailable) {
          // Keep the id first so a retry only retries the switch-on instead of creating a second combo
          setCreatedComboId(result.productId);
          await updateProductAvailability({ productId: result.productId, body: { shopId, isAvailable: true } }).unwrap();
        }
        toast.success(t('combos.saved'));
        finish();
      } catch (err) {
        toast.error(isComboImageRequiredToEnableError(err) ? enableNeedsPhotoToast() : serverMessage(err));
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
              body: { shopId, images: [{ id: image.id, url: image.url } as ProductImage] },
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
      finish();
    } catch (err) {
      setUploading(false);
      if (uploadStage) toast.error(t(isWrongSizeError(err) ? 'products.productImageWrongSize' : 'combos.photoUploadFailed'));
      else if (isComboImageRequiredToEnableError(err)) toast.error(enableNeedsPhotoToast());
      else toast.error(serverMessage(err));
    }
  };

  const busy = creating || updating || uploading || togglingAvailability;
  const saveLabel = uploading
    ? t('products.uploadingImage')
    : createdComboId
      ? t('combos.retryPhotoUpload')
      : t(combo ? 'combos.save' : 'combos.create');

  const navText = (st: ComboNavStatus) => (st.key === 'choices' ? t('combos.nav.choices', { count: st.count }) : t(`combos.nav.${st.key}`));
  const sections: EditorSection<ComboSection>[] = COMBO_SECTIONS.map((s) => {
    const st = comboNavStatus(s, form, { photoMissing, isGermany });
    return { key: s, label: t(`combos.sections.${s}`), status: { text: navText(st), tone: st.tone } };
  });

  const categoryName = categories.find((c) => c.id === form.categoryId)?.name;
  const title = form.name.trim() || t('combos.new');
  const subtitle = categoryName ?? (combo ? t('combos.categoryPick') : t('combos.new'));
  const translationMissing = comboTranslationMissing(form, extraLanguage);

  const headerExtra = (
    <>
      <PillSwitch checked={form.isAvailable} onChange={setAvailable}>
        {form.isAvailable ? t('combos.menuOn') : t('combos.menuOff')}
      </PillSwitch>
      {extraLanguage && activeLanguage && (
        <LanguageToggle
          languages={languages}
          active={activeLanguage}
          onChange={setPickedLanguage}
          groupLabel={t('dishForm.language')}
          langName={langName}
          renderBadge={(l) =>
            l === extraLanguage && translationMissing ? (
              <span role="img" aria-label={t('dishForm.translationMissingDot')} className="h-2 w-2 rounded-full bg-warn-accent" />
            ) : null
          }
        />
      )}
    </>
  );

  const deleteControls = !combo ? null : confirmDelete ? (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm text-[#8f1c13]">{t('combos.deleteConfirm', { name: combo.name })}</span>
      <button
        type="button"
        onClick={() => setConfirmDelete(false)}
        className={`h-11 rounded-full border border-[#e3d9ce] px-4 text-[13px] font-semibold hover:bg-cream ${editorFocusRing}`}
      >
        {t('combos.cancel')}
      </button>
      <PendingButton
        type="button"
        isPending={deleting}
        onClick={() => void remove()}
        className={`h-11 rounded-full bg-[#b42318] px-4 text-[13px] font-bold text-white hover:bg-[#981b14] disabled:opacity-50 ${editorFocusRing}`}
      >
        {deleting ? t('products.deleting') : t('combos.delete')}
      </PendingButton>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setConfirmDelete(true)}
      className={`inline-flex h-11 items-center gap-1.5 rounded-full border border-[#f0c4ad] px-4 text-[13px] font-semibold text-[#b42318] hover:bg-[#fdeceb] ${editorFocusRing}`}
    >
      <Trash2 size={15} strokeWidth={2.2} aria-hidden="true" />
      {t('combos.deleteCombo')}
    </button>
  );

  const footer = (
    <>
      {deleteControls}
      <SaveStatus dirty={dirty} unsavedText={t('combos.editor.unsaved')} savedText={t('combos.editor.allSaved')} />
      <DiscardSaveButtons
        dirty={dirty}
        isSaving={busy}
        onDiscard={discard}
        onSave={submit}
        discardLabel={t('combos.editor.discard')}
        saveLabel={saveLabel}
      />
    </>
  );

  // Basics: name and description are the translatable fields (the other fields are shared by both languages)
  const nameValue = translating ? form.nameTranslations[translating] ?? '' : form.name;
  const descValue = translating ? form.descriptionTranslations[translating] ?? '' : form.description;
  const descMissingHere = translating !== undefined && form.description.trim() !== '' && descValue.trim() === '';
  const nameMissingHere = translating !== undefined && form.name.trim() !== '' && nameValue.trim() === '';

  const basics = (
    <>
      <SectionTitle>{t('combos.sections.basics')}</SectionTitle>
      <div className="flex flex-col gap-7 sm:flex-row sm:items-start">
        <DishPhotoField
          large
          imageFile={imageFile}
          setImageFile={setImageFile}
          existingImageUrl={existingImageUrl}
          photoError={photoError}
          label={t('combos.photo')}
          requiredNote={t('combos.photoNote')}
          errorText={t('combos.enableNeedsPhotoInline')}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <div>
            <MyInput
              label={translating ? t('dishForm.nameLabel', { language: langName(translating) }) : t('combos.name')}
              value={nameValue}
              placeholder={translating ? form.name : undefined}
              onChange={(e) =>
                translating
                  ? set({ nameTranslations: withTranslation(form.nameTranslations, translating, e.target.value) })
                  : set({ name: e.target.value })
              }
              className={`h-12 text-base! ${nameMissingHere ? 'border-warn!' : ''}`}
            />
          </div>
          <div>
            <MyTextarea
              label={translating ? t('dishForm.descriptionLabel', { language: langName(translating) }) : t('combos.description')}
              rows={3}
              value={descValue}
              placeholder={translating ? form.description : undefined}
              onChange={(e) =>
                translating
                  ? set({ descriptionTranslations: withTranslation(form.descriptionTranslations, translating, e.target.value) })
                  : set({ description: e.target.value })
              }
              className={`text-base! leading-6 ${descMissingHere ? 'border-warn!' : ''}`}
            />
            {translating && (nameMissingHere || descMissingHere) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 text-[13px] leading-[18px]">
                <span className="font-semibold text-warn">{t('dishForm.missingTranslation')}</span>
                <button
                  type="button"
                  onClick={() =>
                    set({
                      nameTranslations: withTranslation(form.nameTranslations, translating, nameValue.trim() ? nameValue : form.name),
                      descriptionTranslations: withTranslation(
                        form.descriptionTranslations,
                        translating,
                        descValue.trim() ? descValue : form.description,
                      ),
                    })
                  }
                  className={`min-h-11 text-[13px] font-semibold text-warn-accent underline ${editorFocusRing}`}
                >
                  {t('dishForm.useGerman', { language: langName(originalLanguage ?? translating) })}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
        <MyInput
          label={t('combos.price')}
          inputMode="decimal"
          value={form.price}
          onChange={(e) => set({ price: e.target.value })}
          className="h-12 text-base! font-semibold"
        />
        <div className="flex flex-col gap-1.5">
          <label htmlFor="combo-category" className="text-[13px] font-semibold text-[#4a413b]">
            {t('combos.category')}
          </label>
          <select
            id="combo-category"
            value={form.categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            className={`${selectClass} h-12 text-base`}
          >
            <option value="">{t('combos.categoryPick')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );

  const radioCard = (checked: boolean, onSelect: () => void, label: string, help: string) => (
    <label
      className={`flex min-h-[72px] cursor-pointer items-start gap-3.5 rounded-[18px] border-[1.5px] px-[18px] py-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#2563eb] ${
        checked ? 'border-ink bg-cream' : 'border-[#e6d9c6] bg-white hover:bg-cream/60'
      }`}
    >
      <input type="radio" name="combo-tax" className="mt-1 h-5 w-5 flex-none accent-[#1f1a17]" checked={checked} onChange={onSelect} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-semibold leading-5">{label}</span>
        <span className="text-[13px] leading-[19px] text-muted">{help}</span>
      </span>
    </label>
  );

  const tax = (
    <>
      <SectionTitle>{t('combos.sections.tax')}</SectionTitle>
      {isGermany ? (
        <div role="radiogroup" aria-label={t('combos.sections.tax')} className="flex flex-col gap-3">
          {radioCard(!form.bmfDrinkShare, () => set({ bmfDrinkShare: false }), t('combos.taxSplit'), t('combos.taxSplitHelp'))}
          {radioCard(form.bmfDrinkShare, () => set({ bmfDrinkShare: true }), t('combos.bmf'), t('combos.bmfHelp'))}
        </div>
      ) : (
        <div className="rounded-[18px] border-[1.5px] border-[#e6d9c6] bg-white px-[18px] py-4">
          <p className="text-[15px] font-semibold leading-5">{t('combos.taxSplit')}</p>
          <p className="mt-0.5 text-[13px] leading-[19px] text-muted">{t('combos.taxSplitHelp')}</p>
        </div>
      )}
    </>
  );

  const availability = (
    <>
      <SectionTitle>{t('combos.sections.availability')}</SectionTitle>
      <div className="flex items-center gap-4 border-t border-line-soft py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-semibold leading-[21px]">{t('combos.available')}</span>
          <span className="text-[13px] leading-[19px] text-muted">
            {t(photoMissing ? 'combos.availableHelpNoPhoto' : 'combos.availableHelp')}
          </span>
          {photoError && (
            <span role="alert" className="text-[13px] font-semibold text-[#b42318]">
              {t('combos.enableNeedsPhotoInline')}
            </span>
          )}
        </div>
        <PillSwitch checked={form.isAvailable} onChange={setAvailable} label={t('combos.available')} />
      </div>
    </>
  );

  return (
    <EditorShell
      onClose={onClose ?? onDone}
      closeLabel={t('combos.editor.close')}
      title={title}
      subtitle={subtitle}
      headerExtra={headerExtra}
      navLabel={t('combos.sectionsLabel')}
      sections={sections}
      activeSection={section}
      onSectionChange={setSection}
      footer={footer}
    >
      {createdComboId && (
        <div role="alert" className="rounded-xl border border-[#f1dfae] bg-[#fff6e0] p-3">
          <p className="text-sm text-[#8a5a00]">{t('combos.createdWithoutPhoto')}</p>
        </div>
      )}
      {formError && (
        <p role="alert" className="rounded-xl border border-[#f5c2bd] bg-[#fdeceb] p-3 text-sm text-[#b42318]">
          {t(`combos.formError.${formError}`)}
        </p>
      )}
      {section === 'basics' && basics}
      {section === 'choices' && (
        <>
          <SectionTitle>{t('combos.sections.choices')}</SectionTitle>
          <ComboChoicesSection
            groups={form.groups}
            onChange={(groups) => set({ groups })}
            categories={categoriesWithDishes}
            translating={translating}
            originalLanguage={originalLanguage}
            langName={langName}
            money={money}
          />
        </>
      )}
      {section === 'tax' && tax}
      {section === 'availability' && availability}
    </EditorShell>
  );
}
