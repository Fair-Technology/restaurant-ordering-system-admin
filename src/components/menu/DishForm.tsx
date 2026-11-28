import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Check, X } from 'lucide-react';
import type { GetReferenceListsApiResponse, MenuLanguage, ShopOptionGroupDto, TranslationMap } from '../../services/api';
import { useCreateCategoryMutation, useGetOptionGroupsQuery } from '../../services/api';
import { MyInput, MyTextarea } from '../ui/MyInput';
import { MySelect } from '../ui/MySelect';
import { CurrencyInput } from '../ui/CurrencyInput';
import { PendingButton } from '../ui/PendingButton';
import { PillSwitch } from '../ui/PillSwitch';
import { DiscardSaveButtons, EditorShell, LanguageToggle, SaveStatus, editorFocusRing, type EditorSection } from '../editor/EditorShell';
import { useToast } from '../../contexts/ToastContext';
import { DishPhotoField } from './DishPhotoField';
import { OptionGroupDialog } from './OptionGroupDialog';
import {
  Step4Customise,
  type AddonGroup,
  type AddonOption,
  type VariantGroup,
  type VariantOption,
} from '../../pages/ProductWizardSteps';
import { dishPhotoMissing } from '../../features/menu/productImage';
import {
  MODE_ORDER,
  categoryWithOtherTaxClass,
  dishTaxClasses,
  effectiveTaxClassId,
  labelFor,
  taxClassOptionLabel,
  toggleId,
  toggleMode,
} from '../../features/menu/foodInfo';
import { resolveActiveLanguage, withTranslation } from '../../features/menu/translations';
import { withReorderedExtras, withToggledRef } from '../../features/menu/optionGroupLibrary';
import {
  DESCRIPTION_LIMIT,
  DISH_SECTIONS,
  addNavStatus,
  extraGroupCount,
  firstIncompleteAddSection,
  groupBadge,
  groupCategories,
  listStatus,
  navStatus,
  translationMissing,
  variantSlotFilled,
  vatBreakdown,
  type AddRequiredItem,
  type DishFormState,
  type DishSection,
  type ListStatus,
} from '../../features/menu/dishForm';
import { formatCents } from '../../utils/money';
import type { FulfilmentMode } from '../../services/api';

const focusRing = editorFocusRing;
/** The Name input's id while editing the original language, so Duplicate can focus it. */
const DISH_NAME_INPUT_ID = 'dish-name-input';

export interface DishFormProps {
  /** `edit` changes a saved dish; `add` is a new one. Nothing inside needs a dish id, so both share every part below. */
  mode: 'edit' | 'add';
  shopId: string;
  value: DishFormState;
  setValue: Dispatch<SetStateAction<DishFormState>>;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  existingImageUrl: string | null;
  categoriesList: { id: string; name: string; taxClassId?: string | null }[];
  refs: GetReferenceListsApiResponse | undefined;
  /** The shop's menu languages, original first. */
  languages: MenuLanguage[];
  currency: string;
  currencySymbol: string;
  dirty: boolean;
  /** A save request (or photo upload) is in flight. */
  isSaving: boolean;
  saveLabel: string;
  /** Called only once the basics (name, description, photo, category) pass validation. */
  onSave: () => void;
  onDiscard: () => void;
  onClose: () => void;
  /**
   * Add-mode only: the "Start from a similar dish" box. Rendered above the Basics fields; ignored in edit mode.
   * (Its content and behaviour belong to the Add dish ticket.)
   */
  startFromSimilarDish?: ReactNode;
  /** Extra rows at the bottom of the Availability section (edit mode: the schedule / special price card). */
  availabilityExtras?: ReactNode;
  /** Edit-mode only: the Delete dish control. Rendered at the left of the footer, so it shows on every section. */
  deleteDish?: ReactNode;
  /** Add mode only: opened via Duplicate, so the Name field is focused with its text selected once, on open. */
  autoFocusName?: boolean;
  /** Add mode only: a message that highlights the photo field (the photo of a duplicated dish could not be copied). */
  photoCopyError?: string;

  // ── Add mode only (ignored when `mode` is `edit`) ──────────────────────────────
  /** The "Before you add it" list under the nav; each row jumps to its section. */
  requiredChecklist?: (AddRequiredItem & { label: string })[];
  /** The footer's left status text. */
  addStatus?: { text: string; tone: 'muted' | 'ok' };
  /** How many of the six required items are still open; 0 turns the primary button into "Add to menu". */
  addRequiredLeft?: number;
  onSaveDraft?: () => void;
  isSavingDraft?: boolean;
  /** Called only once `addRequiredLeft` is 0. */
  onAddToMenu?: () => void;
  isAddingToMenu?: boolean;
  onCancel?: () => void;
  /** Shown at the top of the scrolling content after a successful add. */
  successBanner?: ReactNode;
  /** The dish was added: the footer offers "View in menu" and "Add another dish" instead. */
  isAdded?: boolean;
  /** With `isAdded`: false when the dish was saved but left off the menu (no photo). Defaults to true. */
  isAddedOnMenu?: boolean;
  onViewInMenu?: () => void;
  onAddAnother?: () => void;
}

/**
 * The right-hand dish screen shared by Edit and Add: header (title, on-the-menu switch, language toggle),
 * a four-item section nav, the active section, and the Discard / Save changes footer. All state lives in the
 * parent; this component only draws it and validates the basics before calling `onSave`.
 */
export function DishForm({
  mode,
  shopId,
  value,
  setValue,
  imageFile,
  setImageFile,
  existingImageUrl,
  categoriesList,
  refs,
  languages,
  currency,
  currencySymbol,
  dirty,
  isSaving,
  saveLabel,
  onSave,
  onDiscard,
  onClose,
  startFromSimilarDish,
  availabilityExtras,
  deleteDish,
  autoFocusName = false,
  photoCopyError,
  requiredChecklist,
  addStatus,
  addRequiredLeft = 0,
  onSaveDraft,
  isSavingDraft = false,
  onAddToMenu,
  isAddingToMenu = false,
  onCancel,
  successBanner,
  isAdded = false,
  isAddedOnMenu = true,
  onViewInMenu,
  onAddAnother,
}: DishFormProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: libraryGroups } = useGetOptionGroupsQuery({ shopId });
  const library = libraryGroups ?? [];

  const [section, setSection] = useState<DishSection>('basics');
  const [pickedLanguage, setPickedLanguage] = useState<MenuLanguage | undefined>();
  const [tried, setTried] = useState(false);
  // Duplicate: put the cursor in Name with its text selected so the owner can overtype the "(copy)" suffix.
  useEffect(() => {
    if (!autoFocusName) return;
    const el = document.getElementById(DISH_NAME_INPUT_ID) as HTMLInputElement | null;
    el?.focus();
    el?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when first opened
  }, []);
  // The owner tried to turn the dish on (or add it to the menu) without a photo; clears itself once a photo is there.
  const [enableBlocked, setEnableBlocked] = useState(false);

  const originalLanguage = languages[0];
  const extraLanguage = languages[1];
  const activeLanguage = resolveActiveLanguage(languages, pickedLanguage);
  const translating = extraLanguage !== undefined && activeLanguage === extraLanguage ? extraLanguage : undefined;

  const patch = (p: Partial<DishFormState>) => setValue((v) => ({ ...v, ...p }));
  const patchFood = (p: Partial<DishFormState['foodInfo']>) => setValue((v) => ({ ...v, foodInfo: { ...v.foodInfo, ...p } }));

  const nameMissing = value.form.name.trim() === '';
  const descMissing = value.form.description.trim() === '';
  const photoMissing = dishPhotoMissing(imageFile, existingImageUrl);
  const categoryMissing = value.categoryIds.length === 0;
  const extraMissing = translationMissing(value, extraLanguage);

  const hasNegativeOptionPrice = [...value.variantGroups, ...value.addonGroups].some((g) => g.options.some((o) => o.priceDelta < 0));

  const save = () => {
    setTried(true);
    if (nameMissing || descMissing || categoryMissing) {
      setPickedLanguage(originalLanguage);
      setSection('basics');
      return;
    }
    if (hasNegativeOptionPrice) {
      setPickedLanguage(originalLanguage);
      setSection('options');
      return;
    }
    onSave();
  };
  const blockEnableWithoutPhoto = () => {
    setPickedLanguage(originalLanguage);
    setSection('basics');
    setEnableBlocked(true);
    toast.error(t('products.enableNeedsPhoto', { name: value.form.name.trim() || t(mode === 'add' ? 'dishForm.newDish' : 'dishes.editor.untitledDish') }));
  };
  const discard = () => {
    setTried(false);
    setEnableBlocked(false);
    onDiscard();
  };

  // Add mode: the primary button either shows what is still missing (and takes you there) or adds the dish.
  const addPrimary = () => {
    setTried(true);
    if (addRequiredLeft > 0) {
      setPickedLanguage(originalLanguage);
      setSection(firstIncompleteAddSection(requiredChecklist ?? []) ?? 'basics');
      return;
    }
    if (hasNegativeOptionPrice) {
      setPickedLanguage(originalLanguage);
      setSection('options');
      return;
    }
    onAddToMenu?.();
  };
  const addDraft = () => {
    setTried(true);
    if (!nameMissing) onSaveDraft?.();
  };

  const selectedCategories = categoriesList.filter((c) => value.categoryIds.includes(c.id));
  const categoriesText = selectedCategories.length ? selectedCategories.map((c) => c.name).join(', ') : t('dishForm.noCategory');
  const langName = (l: MenuLanguage) => t(`shops.languageName.${l}`);
  const variantCount = variantSlotFilled(value, library);
  const extraCount = extraGroupCount(value, library);

  const sections: EditorSection<DishSection>[] = DISH_SECTIONS.map((s) => {
    const st =
      mode === 'add'
        ? addNavStatus(s, value, requiredChecklist ?? [], variantCount, extraCount, tried)
        : navStatus(s, value, extraLanguage, variantCount, extraCount);
    const text =
      st.key === 'translationMissing'
        ? t(`dishForm.descriptionMissing.${st.language}`)
        : st.key === 'variantExtras'
          ? [
              t('dishForm.nav.variantCount', { count: st.variantCount }),
              t('dishForm.nav.extraCount', { count: st.extraCount }),
            ].join(' · ')
          : st.key === 'requiredLeft'
            ? t('dishForm.nav.requiredLeft', { count: st.count })
            : t(`dishForm.nav.${st.key}`);
    return { key: s, label: t(`dishForm.sectionNames.${s}`), status: { text, tone: st.tone } };
  });

  const headerExtra = (
    <>
      {mode === 'edit' && (
        <PillSwitch
          checked={value.isAvailable}
          onChange={(on) => {
            if (on && photoMissing) {
              blockEnableWithoutPhoto();
              return;
            }
            setEnableBlocked(false);
            patch({ isAvailable: on });
          }}
        >
          {value.isAvailable ? t('dishForm.menuOn') : t('dishForm.menuOff')}
        </PillSwitch>
      )}
      {extraLanguage && activeLanguage && (
        <LanguageToggle
          languages={languages}
          active={activeLanguage}
          onChange={setPickedLanguage}
          groupLabel={t('dishForm.language')}
          langName={langName}
          renderBadge={(l) => (
            <>
              {mode === 'add' && l === extraLanguage && <span className="font-medium opacity-85">{t('dishForm.optionalBadge')}</span>}
              {mode === 'edit' && l === extraLanguage && extraMissing && (
                <span role="img" aria-label={t('dishForm.translationMissingDot')} className="h-2 w-2 rounded-full bg-warn-accent" />
              )}
            </>
          )}
        />
      )}
    </>
  );

  const navExtra =
    mode === 'add' && requiredChecklist ? (
      <div className="flex flex-none flex-col gap-1 md:mt-3.5 md:border-t md:border-line-soft md:pt-4">
        <span className="px-3.5 text-xs font-semibold uppercase leading-4 tracking-[.06em] text-muted">{t('dishForm.checklist.title')}</span>
        {requiredChecklist.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setSection(c.section);
              if (c.section === 'basics') setPickedLanguage(originalLanguage);
            }}
            aria-label={t(c.done ? 'dishForm.checklist.done' : 'dishForm.checklist.notDone', {
              label: c.label,
              section: t(`dishForm.sectionNames.${c.section}`),
            })}
            className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3.5 text-left text-sm font-medium hover:bg-cream/60 ${focusRing}`}
          >
            <span
              aria-hidden="true"
              className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 ${c.done ? 'border-ok bg-ok' : 'border-control bg-white'}`}
            >
              {c.done && <Check size={12} strokeWidth={3.5} className="text-white" />}
            </span>
            <span className="whitespace-nowrap">{c.label}</span>
          </button>
        ))}
      </div>
    ) : undefined;

  const footer =
    mode === 'edit' ? (
      <>
        {deleteDish}
        <SaveStatus dirty={dirty} unsavedText={t('dishes.editor.unsaved')} savedText={t('dishes.editor.allSaved')} />
        <DiscardSaveButtons
          dirty={dirty}
          isSaving={isSaving}
          onDiscard={discard}
          onSave={save}
          discardLabel={t('dishes.editor.discard')}
          saveLabel={saveLabel}
        />
      </>
    ) : (
      <>
          <span role="status" className={`flex items-center gap-2 text-sm font-semibold leading-5 ${isAdded || addStatus?.tone === 'ok' ? 'text-ok' : 'text-muted'}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${isAdded || addStatus?.tone === 'ok' ? 'bg-ok' : 'bg-muted'}`} />
            {addStatus?.text}
          </span>
          {isAdded ? (
            <>
              <button
                type="button"
                onClick={onViewInMenu}
                className={`ml-auto h-12 rounded-full border-[1.5px] border-control bg-white px-6 text-[15px] font-semibold hover:bg-cream ${focusRing}`}
              >
                {t('dishForm.viewInMenu')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTried(false);
                  setSection('basics');
                  setPickedLanguage(undefined);
                  onAddAnother?.();
                }}
                className={`h-12 rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-black ${focusRing}`}
              >
                {t('dishForm.addAnother')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                className={`ml-auto h-12 rounded-full px-5 text-[15px] font-semibold hover:bg-cream ${focusRing}`}
              >
                {t('dishForm.cancel')}
              </button>
              <PendingButton
                type="button"
                isPending={isSavingDraft}
                disabled={nameMissing || isAddingToMenu}
                onClick={addDraft}
                className={`h-12 rounded-full border-[1.5px] border-control bg-white px-6 text-[15px] font-semibold hover:bg-cream disabled:opacity-40 disabled:hover:bg-white ${focusRing}`}
              >
                {t('dishForm.saveDraft')}
              </PendingButton>
              <PendingButton
                type="button"
                isPending={isAddingToMenu}
                disabled={isSavingDraft}
                onClick={addPrimary}
                className={`h-12 rounded-full border-2 border-ink px-7 text-[15px] font-bold disabled:opacity-40 ${focusRing} ${
                  addRequiredLeft > 0 ? 'bg-white text-ink hover:bg-cream' : 'bg-ink text-white hover:bg-black'
                }`}
              >
                {addRequiredLeft > 0 ? t('dishForm.requiredLeft', { count: addRequiredLeft }) : t(photoMissing ? 'dishForm.saveDish' : 'dishForm.addToMenu')}
              </PendingButton>
            </>
          )}
      </>
    );

  return (
    <EditorShell
      onClose={onClose}
      closeLabel={t('dishes.editor.closeEditor')}
      title={value.form.name || t(mode === 'add' ? 'dishForm.newDish' : 'dishes.editor.untitledDish')}
      subtitle={
        mode === 'edit'
          ? t('dishForm.subtitleEdit', { categories: categoriesText })
          : t(isAdded ? (isAddedOnMenu ? 'dishForm.subtitleAdded' : 'dishForm.subtitleSavedOff') : 'dishForm.subtitleAdd')
      }
      headerExtra={headerExtra}
      navLabel={t('dishForm.sections')}
      sections={sections}
      activeSection={section}
      onSectionChange={setSection}
      navExtra={navExtra}
      footer={footer}
    >
      {mode === 'add' && isAdded && successBanner}
      {section === 'basics' && (
        <>
          {mode === 'add' && startFromSimilarDish}
          <BasicsSection
            mode={mode}
            value={value}
            patch={patch}
            patchFood={patchFood}
            shopId={shopId}
            imageFile={imageFile}
            setImageFile={setImageFile}
            existingImageUrl={existingImageUrl}
            categoriesList={categoriesList}
            refs={refs}
            currency={currency}
            currencySymbol={currencySymbol}
            translating={translating}
            originalLanguage={originalLanguage}
            labelLanguage={extraLanguage ? activeLanguage : undefined}
            langName={langName}
            tried={tried}
            enableBlocked={enableBlocked && photoMissing}
            photoCopyError={photoMissing ? photoCopyError : undefined}
            nameMissing={nameMissing}
            descMissing={descMissing}
            photoMissing={photoMissing}
            categoryMissing={categoryMissing}
          />
        </>
      )}
      {section === 'food' && <FoodSection value={value} patchFood={patchFood} refs={refs} />}
      {section === 'options' && (
        <OptionsSection
          shopId={shopId}
          value={value}
          setValue={setValue}
          library={library}
          currency={currency}
          refs={refs}
          translating={translating}
        />
      )}
      {section === 'availability' && (
        <AvailabilitySection mode={mode} value={value} patchFood={patchFood}>
          {mode === 'edit' && availabilityExtras}
        </AvailabilitySection>
      )}
    </EditorShell>
  );
}

// ── Shared bits ────────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[22px] font-bold leading-7">{children}</h2>;
}

/** A toggle chip: navy fill + white text when on, white with a navy outline when off. */
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold ${focusRing} ${
        on ? 'border-ink bg-ink text-white' : 'border-control bg-white text-ink hover:bg-cream'
      }`}
    >
      {children}
    </button>
  );
}

// ── 1. Basics ──────────────────────────────────────────────────────────────────

interface BasicsProps {
  mode: DishFormProps['mode'];
  value: DishFormState;
  patch: (p: Partial<DishFormState>) => void;
  patchFood: (p: Partial<DishFormState['foodInfo']>) => void;
  shopId: string;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  existingImageUrl: string | null;
  categoriesList: DishFormProps['categoriesList'];
  refs: GetReferenceListsApiResponse | undefined;
  currency: string;
  currencySymbol: string;
  translating: MenuLanguage | undefined;
  /** The shop's original (first) language: what "Use the German text" copies from. */
  originalLanguage: MenuLanguage | undefined;
  /** The language shown in the field labels, e.g. "Name (German)"; absent when the shop has one language. */
  labelLanguage: MenuLanguage | undefined;
  langName: (l: MenuLanguage) => string;
  tried: boolean;
  /** The owner tried to turn the dish on without a photo. */
  enableBlocked: boolean;
  photoCopyError?: string;
  nameMissing: boolean;
  descMissing: boolean;
  photoMissing: boolean;
  categoryMissing: boolean;
}

function BasicsSection({
  mode, value, patch, patchFood, shopId, imageFile, setImageFile, existingImageUrl, categoriesList, refs, currency, currencySymbol,
  translating, originalLanguage, labelLanguage, langName, tried, enableBlocked, photoCopyError, nameMissing, descMissing, photoMissing, categoryMissing,
}: BasicsProps) {
  const { t, i18n } = useTranslation();
  const adding = mode === 'add';
  /** Add mode marks each field "Required" or "optional" beside its label; edit mode keeps the plain labels. */
  const withBadge = (label: string, badge: string | null) => (adding && badge ? `${label} · ${badge}` : label);

  // The language being edited: the original fields, or the extra language's translation map.
  const nameValue = translating ? value.nameTranslations[translating] ?? '' : value.form.name;
  const descValue = translating ? value.descriptionTranslations[translating] ?? '' : value.form.description;
  const descEmptyHere = descValue.trim() === '';
  const missingHere = translating !== undefined && descEmptyHere;

  const setName = (v: string) =>
    translating ? patch({ nameTranslations: withTranslation(value.nameTranslations, translating, v) }) : patch({ form: { ...value.form, name: v } });
  const setDesc = (v: string) =>
    translating
      ? patch({ descriptionTranslations: withTranslation(value.descriptionTranslations, translating, v) })
      : patch({ form: { ...value.form, description: v } });

  // Tax: the dish's own class, else its first category's suggestion
  const taxClasses = refs?.taxClasses ?? [];
  const selectedCategories = categoriesList.filter((c) => value.categoryIds.includes(c.id));
  const ownTaxId = effectiveTaxClassId(value.categoryIds, categoriesList, value.foodInfo.taxClassId);
  const taxLabel = (id: string) => {
    const c = taxClasses.find((x) => x.id === id);
    return c ? taxClassOptionLabel(labelFor(c.labels, i18n.language), c.id, refs, i18n.language) : id;
  };
  const differing = categoryWithOtherTaxClass(selectedCategories, ownTaxId);
  const money = (cents: number) => formatCents(cents, currency, i18n.language);
  // One known rate only: when rates differ per way of ordering there is no single VAT figure to show.
  const rateBp =
    ownTaxId && refs?.taxRatesUniformAcrossModes ? refs.currentTaxRates.find((r) => r.taxClassId === ownTaxId)?.rates.collection ?? null : null;
  const vat = typeof rateBp === 'number' ? vatBreakdown(value.form.price, rateBp) : null;

  return (
    <>
      <SectionTitle>{t('dishForm.sectionNames.basics')}</SectionTitle>
      <div className="flex flex-col gap-7 sm:flex-row sm:items-start">
        <DishPhotoField
          large
          imageFile={imageFile}
          setImageFile={setImageFile}
          existingImageUrl={existingImageUrl}
          photoError={(enableBlocked && photoMissing) || !!photoCopyError}
          label={t('dishes.editor.dishPhoto')}
          errorText={photoCopyError ?? t('products.enableNeedsPhotoInline')}
          {...(adding ? { requiredNote: t('dishForm.optionalBadge') } : {})}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
          <div>
            <MyInput
              label={withBadge(
                labelLanguage ? t('dishForm.nameLabel', { language: langName(labelLanguage) }) : t('products.name'),
                translating ? t('dishForm.optionalBadge') : t('dishForm.requiredBadge'),
              )}
              id={translating ? undefined : DISH_NAME_INPUT_ID}
              value={nameValue}
              placeholder={translating ? value.form.name : t('products.namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base!"
            />
            {tried && nameMissing && !translating && (
              <p role="alert" className="mt-1 text-xs text-[#b42318]">
                {t(adding ? 'dishForm.errors.name' : 'dishes.editor.nameRequired')}
              </p>
            )}
          </div>
          <div>
            <MyTextarea
              label={withBadge(
                labelLanguage ? t('dishForm.descriptionLabel', { language: langName(labelLanguage) }) : t('products.description'),
                t('dishForm.optionalBadge'),
              )}
              rows={3}
              maxLength={DESCRIPTION_LIMIT}
              value={descValue}
              // Empty translation: show the original text as a greyed fallback, but save the field empty
              placeholder={translating ? value.form.description : t('products.descriptionPlaceholder')}
              onChange={(e) => setDesc(e.target.value)}
              className={`resize-none text-base! leading-6 ${missingHere ? 'border-warn!' : ''}`}
            />
            <div className="mt-1.5 flex justify-between gap-3 text-[13px] leading-[18px] text-muted">
              {missingHere ? (
                <span className="font-semibold text-warn">{t('dishForm.missingTranslation')}</span>
              ) : mode === 'edit' && tried && descMissing && !translating ? (
                <span role="alert" className="text-[#b42318]">{t('dishes.editor.descriptionRequired')}</span>
              ) : null}
              {translating && descEmptyHere && (
                <button
                  type="button"
                  onClick={() =>
                    patch({
                      nameTranslations: withTranslation(value.nameTranslations, translating, value.form.name),
                      descriptionTranslations: withTranslation(value.descriptionTranslations, translating, value.form.description),
                    })
                  }
                  className={`-my-2 min-h-11 text-[13px] font-semibold text-warn-accent underline ${focusRing}`}
                >
                  {t('dishForm.useGerman', { language: langName(originalLanguage ?? translating) })}
                </button>
              )}
              <span className="ml-auto">{t('dishForm.counter', { count: descValue.length, max: DESCRIPTION_LIMIT })}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        <CurrencyInput
          label={withBadge(t('products.price', { symbol: currencySymbol }), t('dishForm.requiredBadge'))}
          valueCents={value.form.price}
          onChange={(cents) => patch({ form: { ...value.form, price: Math.max(0, cents) } })}
          labelClassName="text-[13px] font-semibold text-[#4a413b]"
          className="h-12 text-base! font-semibold"
        />
        <MySelect
          label={t('products.taxClass')}
          value={ownTaxId ?? ''}
          onChange={(e) => patchFood({ taxClassId: e.target.value || null })}
          className="h-12 text-base!"
        >
          {!ownTaxId && (
            <option value="" disabled>
              {t('products.taxClassNoneYet')}
            </option>
          )}
          {dishTaxClasses(taxClasses).map((c) => (
            <option key={c.id} value={c.id}>
              {taxLabel(c.id)}
            </option>
          ))}
        </MySelect>
        {adding && tried && value.form.price <= 0 && (
          <p role="alert" className="text-xs text-[#b42318] sm:col-span-2">{t('dishForm.errors.price', { amount: money(0) })}</p>
        )}
        <p className="text-[13px] leading-[18px] text-muted sm:col-span-2">
          {vat
            ? t('dishForm.priceSummary', { price: money(value.form.price), vat: money(vat.vat), net: money(vat.net) })
            : t('dishForm.priceSummaryNoRate', { price: money(value.form.price) })}
        </p>
        {differing && ownTaxId && (
          <p role="note" data-testid="tax-class-differs" className="rounded-lg bg-warn-bg px-3 py-2 text-xs text-warn sm:col-span-2">
            {t('products.taxClassDiffers', { category: differing.name, suggested: taxLabel(differing.taxClassId!), own: taxLabel(ownTaxId) })}
          </p>
        )}
      </div>

      <CategoriesField
        shopId={shopId}
        categories={categoriesList}
        selectedIds={value.categoryIds}
        onChange={(ids) => patch({ categoryIds: ids })}
        error={tried && categoryMissing}
        addMode={adding}
      />
    </>
  );
}

function CategoriesField({
  shopId, categories, selectedIds, onChange, error, addMode,
}: {
  shopId: string;
  categories: DishFormProps['categoriesList'];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error: boolean;
  /** Add mode: mark the field "Required" and word the error like the other add-screen errors. */
  addMode: boolean;
}) {
  const { t } = useTranslation();
  const [createCategory, { isLoading: creating }] = useCreateCategoryMutation();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState(false);

  const selected = categories.filter((c) => selectedIds.includes(c.id));
  const remaining = categories.filter((c) => !selectedIds.includes(c.id));

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreateError(false);
    const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!selectedIds.includes(existing.id)) onChange([...selectedIds, existing.id]);
      setNewName('');
      setAdding(false);
      return;
    }
    try {
      const created = await createCategory({ shopId, body: { name, sortOrder: categories.length } }).unwrap();
      if (created.id) onChange([...selectedIds, created.id]);
      setNewName('');
      setAdding(false);
    } catch {
      setCreateError(true);
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <span className="text-sm font-semibold leading-5">
        {t('products.categories')}
        {addMode && <span className="font-medium text-muted"> · {t('dishForm.requiredBadge')}</span>}
      </span>
      <div className="flex flex-wrap gap-2">
        {selected.map((c) => (
          <span key={c.id} className="flex h-10 items-center gap-1 rounded-full bg-sand pl-4 pr-1.5 text-sm font-semibold">
            {c.name}
            <button
              type="button"
              aria-label={t('dishForm.removeCategory', { name: c.name })}
              onClick={() => onChange(selectedIds.filter((id) => id !== c.id))}
              className={`flex h-8 w-8 items-center justify-center rounded-full hover:bg-black/5 ${focusRing}`}
            >
              <X size={14} strokeWidth={3} aria-hidden="true" />
            </button>
          </span>
        ))}
        <button
          type="button"
          aria-expanded={adding}
          onClick={() => setAdding((a) => !a)}
          className={`h-10 rounded-full border-[1.5px] border-dashed border-control bg-white px-4 text-sm font-semibold hover:bg-cream ${focusRing}`}
        >
          {t('dishForm.addCategory')}
        </button>
      </div>
      {adding && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#e6d9c6] p-3.5">
          {remaining.length > 0 && (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('dishForm.pickCategory')}>
              {remaining.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onChange([...selectedIds, c.id]);
                    setAdding(false);
                  }}
                  className={`h-10 rounded-full border-[1.5px] border-control bg-white px-4 text-sm font-semibold hover:bg-cream ${focusRing}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={create} className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <MyInput
                label={t('dishForm.newCategory')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-11"
              />
            </div>
            <PendingButton
              type="submit"
              isPending={creating}
              disabled={!newName.trim()}
              className={`h-11 rounded-full bg-ink px-5 text-sm font-bold text-white disabled:opacity-40 ${focusRing}`}
            >
              {t('dishForm.createCategory')}
            </PendingButton>
          </form>
          {createError && <p role="alert" className="text-xs text-[#b42318]">{t('dishForm.createCategoryFailed')}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-xs text-[#b42318]">{t(addMode ? 'dishForm.errors.category' : 'products.categoryRequired')}</p>}
    </div>
  );
}

// ── 2. Food info ───────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: ListStatus }) {
  const { t } = useTranslation();
  const ok = status.kind !== 'unconfirmed';
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold leading-[18px] ${ok ? 'bg-ok-bg text-ok' : 'bg-warn-bg text-warn'}`}>
      {status.kind === 'selected' ? t('dishForm.status.selected', { count: status.count }) : t(`dishForm.status.${status.kind}`)}
    </span>
  );
}

/** "Contains none of …": a checkbox-styled button, ticked only when the list is affirmed empty (`[]`, not `null`). */
function NoneCheckbox({ checked, onChange, children }: { checked: boolean; onChange: (next: boolean) => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 items-center gap-2.5 self-start rounded-lg text-left text-sm font-medium ${focusRing}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md border-2 ${checked ? 'border-ink bg-ink' : 'border-muted bg-white'}`}
      >
        {checked && <Check size={14} strokeWidth={3.5} className="text-white" />}
      </span>
      {children}
    </button>
  );
}

function FoodSection({
  value, patchFood, refs,
}: {
  value: DishFormState;
  patchFood: (p: Partial<DishFormState['foodInfo']>) => void;
  refs: GetReferenceListsApiResponse | undefined;
}) {
  const { t, i18n } = useTranslation();
  const f = value.foodInfo;
  if (!refs) {
    return (
      <>
        <SectionTitle>{t('dishForm.sectionNames.food')}</SectionTitle>
        <p className="text-sm text-muted">{t('products.refsLoadError')}</p>
      </>
    );
  }
  const allergens = refs.allergens.filter((a) => a.isActive);
  const additives = refs.additives.filter((a) => a.isActive);
  const h3 = 'text-[17px] font-bold leading-6';

  return (
    <>
      <SectionTitle>{t('dishForm.sectionNames.food')}</SectionTitle>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className={h3}>{t('products.allergens')}</h3>
          <StatusPill status={listStatus(f.allergenIds)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {allergens.map((a) => (
            <Chip key={a.id} on={(f.allergenIds ?? []).includes(a.id)} onClick={() => patchFood({ allergenIds: toggleId(f.allergenIds, a.id) })}>
              {labelFor(a.labels, i18n.language)}
            </Chip>
          ))}
        </div>
        <NoneCheckbox checked={Array.isArray(f.allergenIds) && f.allergenIds.length === 0} onChange={(on) => patchFood({ allergenIds: on ? [] : null })}>
          {t('dishForm.allergensNone', { count: allergens.length })}
        </NoneCheckbox>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <h3 className={h3}>{t('products.additives')}</h3>
          <StatusPill status={listStatus(f.additiveIds)} />
        </div>
        <div className="flex flex-wrap gap-2">
          {additives.map((a) => (
            <Chip key={a.id} on={(f.additiveIds ?? []).includes(a.id)} onClick={() => patchFood({ additiveIds: toggleId(f.additiveIds, a.id) })}>
              {a.code} {labelFor(a.labels, i18n.language)}
            </Chip>
          ))}
        </div>
        <NoneCheckbox checked={Array.isArray(f.additiveIds) && f.additiveIds.length === 0} onChange={(on) => patchFood({ additiveIds: on ? [] : null })}>
          {t('dishForm.additivesNone')}
        </NoneCheckbox>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className={h3}>{t('products.dietaryTags')}</h3>
        <div className="flex flex-wrap gap-2">
          {refs.dietaryTags.map((tag) => {
            const on = f.dietaryTagIds.includes(tag.id);
            return (
              <Chip
                key={tag.id}
                on={on}
                onClick={() => patchFood({ dietaryTagIds: on ? f.dietaryTagIds.filter((id) => id !== tag.id) : [...f.dietaryTagIds, tag.id] })}
              >
                {labelFor(tag.labels, i18n.language)}
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className={h3}>{t('products.spiceLevel')}</h3>
        <div role="group" aria-label={t('products.spiceLevel')} className="flex flex-wrap gap-0.5 self-start rounded-full bg-sand p-[3px]">
          {/* "Not spicy" is the real unset state (`spiceLevel: null`), then one segment per level the shop's list offers */}
          {[{ id: null, label: t('products.spiceNone') }, ...refs.spiceLevels.map((l) => ({ id: l.id, label: labelFor(l.labels, i18n.language) }))].map((s) => {
            const on = f.spiceLevel === s.id;
            return (
              <button
                key={s.id ?? 'none'}
                type="button"
                aria-pressed={on}
                onClick={() => patchFood({ spiceLevel: s.id })}
                className={`h-[42px] rounded-full px-5 text-sm font-semibold ${focusRing} ${on ? 'bg-ink text-white' : 'text-ink'}`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

/** One extras card; the grip only exists when there is something to reorder. */
function SortableExtra({
  id, className, draggable, handleLabel, children,
}: {
  id: string;
  className: string;
  draggable: boolean;
  handleLabel: string;
  children: (handle: ReactNode) => ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const handle = draggable ? (
    <button
      type="button"
      {...attributes}
      {...listeners}
      aria-label={handleLabel}
      className={`flex-none cursor-grab touch-none text-control hover:text-ink active:cursor-grabbing ${focusRing}`}
    >
      <GripVertical size={18} aria-hidden="true" />
    </button>
  ) : null;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }} className={className}>
      {children(handle)}
    </li>
  );
}

// ── 3. Options and extras ──────────────────────────────────────────────────────

function OptionsSection({
  shopId, value, setValue, library, currency, refs, translating,
}: {
  shopId: string;
  value: DishFormState;
  setValue: Dispatch<SetStateAction<DishFormState>>;
  library: ShopOptionGroupDto[];
  currency: string;
  refs: GetReferenceListsApiResponse | undefined;
  translating: MenuLanguage | undefined;
}) {
  const { t, i18n } = useTranslation();
  // Which kind's picker is open (the Variant one swaps, the Extras one adds)
  const [picking, setPicking] = useState<null | 'variant' | 'addon'>(null);
  // `null` = closed, `'new-variant'`/`'new-addon'` = creating, otherwise the library group being edited
  const [dialog, setDialog] = useState<null | 'new-variant' | 'new-addon' | string>(null);
  const creating = dialog === 'new-variant' || dialog === 'new-addon';
  const money = (cents: number) => formatCents(cents, currency, i18n.language);

  // Library groups the dish references, in the dish's own order; references to groups that no longer exist are skipped
  const attached = value.optionGroupRefs.map((id) => library.find((g) => g.id === id)).filter((g): g is ShopOptionGroupDto => !!g);
  const variantAttached = attached.filter((g) => g.kind === 'variant');
  const extraAttached = attached.filter((g) => g.kind === 'addon');
  const availableOf = (kind: 'variant' | 'addon') => library.filter((g) => g.kind === kind && !value.optionGroupRefs.includes(g.id));
  const editing = dialog && !creating ? library.find((g) => g.id === dialog) : undefined;
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const setRefs = (fn: (refs: string[]) => string[]) => setValue((v) => ({ ...v, optionGroupRefs: fn(v.optionGroupRefs) }));
  // Local form state only; Save persists it, there is no call or toast on drop
  const reorderExtras = (newOrderIds: string[]) => setRefs((refs) => withReorderedExtras(refs, newOrderIds));
  const onExtrasDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const ids = extraAttached.map((g) => g.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    reorderExtras(arrayMove(ids, from, to));
  };

  // Dish-only groups (saved on the dish itself, before the shared library existed) stay editable here
  const setVariantGroups = (fn: (gs: VariantGroup[]) => VariantGroup[]) => setValue((v) => ({ ...v, variantGroups: fn(v.variantGroups) }));
  const setAddonGroups = (fn: (gs: AddonGroup[]) => AddonGroup[]) => setValue((v) => ({ ...v, addonGroups: fn(v.addonGroups) }));
  const blankOption = () => ({ id: crypto.randomUUID(), name: '', priceDelta: 0, isAvailable: true });
  const variantHelpers = {
    addVariantGroup: () => setVariantGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', options: [] }]),
    removeVariantGroup: (id: string) => setVariantGroups((gs) => gs.filter((g) => g.id !== id)),
    updateVariantGroupName: (id: string, name: string) => setVariantGroups((gs) => gs.map((g) => (g.id === id ? { ...g, name } : g))),
    addVariantOption: (groupId: string) => setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: [...g.options, blankOption()] } : g))),
    removeVariantOption: (groupId: string, optionId: string) =>
      setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g))),
    updateVariantOption: (groupId: string, optionId: string, p: Partial<VariantOption>) =>
      setVariantGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...p } : o)) } : g))),
  };
  const addonHelpers = {
    addAddonGroup: () => setAddonGroups((gs) => [...gs, { id: crypto.randomUUID(), name: '', minSelectable: 0, maxSelectable: 1, options: [] }]),
    removeAddonGroup: (id: string) => setAddonGroups((gs) => gs.filter((g) => g.id !== id)),
    updateAddonGroup: (id: string, p: Partial<AddonGroup>) => setAddonGroups((gs) => gs.map((g) => (g.id === id ? { ...g, ...p } : g))),
    addAddonOption: (groupId: string) => setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: [...g.options, blankOption()] } : g))),
    removeAddonOption: (groupId: string, optionId: string) =>
      setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.filter((o) => o.id !== optionId) } : g))),
    updateAddonOption: (groupId: string, optionId: string, p: Partial<AddonOption>) =>
      setAddonGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, ...p } : o)) } : g))),
  };
  const setGroupTranslation = (kind: 'variant' | 'addon', groupId: string, text: string) => {
    if (!translating) return;
    const apply = <G extends { id: string; nameTranslations?: TranslationMap }>(gs: G[]) =>
      gs.map((g) => (g.id === groupId ? { ...g, nameTranslations: withTranslation(g.nameTranslations, translating, text) } : g));
    if (kind === 'variant') setVariantGroups(apply);
    else setAddonGroups(apply);
  };
  const setOptionTranslation = (kind: 'variant' | 'addon', groupId: string, optionId: string, text: string) => {
    if (!translating) return;
    const apply = <G extends { id: string; options: { id: string; nameTranslations?: TranslationMap }[] }>(gs: G[]) =>
      gs.map((g) =>
        g.id === groupId
          ? { ...g, options: g.options.map((o) => (o.id === optionId ? { ...o, nameTranslations: withTranslation(o.nameTranslations, translating, text) } : o)) }
          : g,
      );
    if (kind === 'variant') setVariantGroups(apply);
    else setAddonGroups(apply);
  };

  const badgeText = (g: ShopOptionGroupDto) => {
    const b = groupBadge(g);
    if (!b.required) return t('dishForm.badge.optionalUpTo', { max: b.max });
    return b.min === b.max ? t('dishForm.badge.requiredExact', { count: b.min }) : t('dishForm.badge.requiredRange', { min: b.min, max: b.max });
  };
  const cardClass = 'flex flex-col gap-3 rounded-[18px] border-[1.5px] border-[#e6d9c6] bg-white px-[18px] py-4';
  const groupCardBody = (g: ShopOptionGroupDto, handle?: ReactNode) => {
    const cats = g.kind === 'addon' ? groupCategories(g) : [];
    const required = groupBadge(g).required;
    return (
      <>
        <div className="flex flex-wrap items-center gap-3">
          {handle}
          <h3 className="text-[17px] font-bold leading-6">{g.name}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold leading-[18px] ${required ? 'bg-warn-bg text-warn' : 'bg-sand text-ink'}`}>
            {badgeText(g)}
          </span>
        </div>
        <ul className="flex flex-wrap gap-1.5">
          {g.options.map((o) => (
            <li key={o.id} className="flex h-8 items-center gap-1.5 rounded-full border border-[#e6d9c6] bg-cream px-3 text-[13px] font-medium">
              {o.name}
              {o.priceDelta > 0 && <span className="text-muted">+ {money(o.priceDelta)}</span>}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-3 border-t border-line-soft pt-2.5">
          {cats.length > 0 && <span className="text-[13px] leading-[18px] text-muted">{t('dishForm.groupedAs', { list: cats.join(', ') })}</span>}
          <button
            type="button"
            onClick={() => setDialog(g.id)}
            className={`ml-auto h-11 rounded-lg px-3.5 text-sm font-semibold text-warn-accent underline ${focusRing}`}
          >
            {t('dishForm.editGroup')}<span className="sr-only"> {g.name}</span>
          </button>
          <button
            type="button"
            onClick={() => setRefs((r) => withToggledRef(r, g.id))}
            className={`h-11 rounded-lg px-3.5 text-sm font-semibold ${focusRing}`}
          >
            {t('dishForm.removeFromDish')}<span className="sr-only"> {g.name}</span>
          </button>
        </div>
      </>
    );
  };
  const hasDishOnly = value.variantGroups.length + value.addonGroups.length > 0;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <SectionTitle>{t('dishForm.sectionNames.options')}</SectionTitle>
        <p className="text-sm leading-[21px] text-muted">{t('dishForm.optionsIntro')}</p>
      </div>

      {/* Variant: exactly one group is shown to customers */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[17px] font-bold leading-6">{t('dishForm.variantSection.title')}</h3>
          <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.variantSection.help')}</p>
        </div>
        {variantAttached.length > 0 && (
          <ul className="flex flex-col gap-3.5">
            <li className={cardClass}>{groupCardBody(variantAttached[0])}</li>
            {/* Legacy dishes can still carry more than one; the extras aren't shown, and only an explicit click drops them */}
            {variantAttached.slice(1).map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-[#e6d9c6] bg-white px-[18px] py-3">
                <span className="text-[15px] font-semibold">{g.name}</span>
                <span className="rounded-full bg-warn-bg px-2.5 py-0.5 text-xs font-semibold leading-[18px] text-warn">{t('dishForm.notShownToCustomers')}</span>
                <button
                  type="button"
                  onClick={() => setRefs((r) => withToggledRef(r, g.id))}
                  className={`ml-auto h-11 rounded-lg px-3.5 text-sm font-semibold ${focusRing}`}
                >
                  {t('dishForm.removeFromDish')}<span className="sr-only"> {g.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-expanded={picking === 'variant'}
            onClick={() => setPicking((p) => (p === 'variant' ? null : 'variant'))}
            className={`h-12 rounded-full bg-ink px-5 text-[15px] font-semibold text-white ${focusRing}`}
          >
            {variantAttached.length === 0 ? t('dishForm.chooseVariantGroup') : t('dishForm.replaceVariantGroup')}
          </button>
          {variantAttached.length === 0 && (
            <button
              type="button"
              onClick={() => setDialog('new-variant')}
              className={`h-12 rounded-full border-[1.5px] border-control bg-white px-5 text-[15px] font-semibold hover:bg-cream ${focusRing}`}
            >
              {t('dishForm.createGroup')}
            </button>
          )}
        </div>
        {picking === 'variant' && (
          <div className="rounded-2xl border border-[#e6d9c6] p-3.5">
            {availableOf('variant').length === 0 ? (
              <p className="text-sm text-muted">{t('dishForm.noVariantGroupsToAttach')}</p>
            ) : (
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label={variantAttached.length === 0 ? t('dishForm.chooseVariantGroup') : t('dishForm.replaceVariantGroup')}
              >
                {availableOf('variant').map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      // Replace swaps the shown group; choosing into an empty slot just adds
                      const current = variantAttached[0]?.id;
                      setRefs((r) => [...r.filter((id) => id !== current), g.id]);
                      setPicking(null);
                    }}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-control bg-white px-4 text-sm font-semibold hover:bg-cream ${focusRing}`}
                  >
                    {g.name}
                    <span className="text-xs font-normal text-muted">{t('optionGroups.optionCount', { count: g.options.length })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Extras: any number, in the order customers see them */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[17px] font-bold leading-6">{t('dishForm.extrasSection.title')}</h3>
          <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.extrasSection.help')}</p>
        </div>
        {extraAttached.length > 1 && <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.extrasDragHint')}</p>}
        {extraAttached.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onExtrasDragEnd}>
            <SortableContext items={extraAttached.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              <ul className="flex flex-col gap-3.5">
                {extraAttached.map((g) => (
                  <SortableExtra key={g.id} id={g.id} className={cardClass} draggable={extraAttached.length > 1} handleLabel={t('categories.dragHandle')}>
                    {(handle) => groupCardBody(g, handle)}
                  </SortableExtra>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            aria-expanded={picking === 'addon'}
            onClick={() => setPicking((p) => (p === 'addon' ? null : 'addon'))}
            className={`h-12 rounded-full bg-ink px-5 text-[15px] font-semibold text-white ${focusRing}`}
          >
            {t('dishForm.attachGroup')}
          </button>
          <button
            type="button"
            onClick={() => setDialog('new-addon')}
            className={`h-12 rounded-full border-[1.5px] border-control bg-white px-5 text-[15px] font-semibold hover:bg-cream ${focusRing}`}
          >
            {t('dishForm.createGroup')}
          </button>
        </div>
        {picking === 'addon' && (
          <div className="rounded-2xl border border-[#e6d9c6] p-3.5">
            {availableOf('addon').length === 0 ? (
              <p className="text-sm text-muted">{t('dishForm.nothingToAttach')}</p>
            ) : (
              <div className="flex flex-wrap gap-2" role="group" aria-label={t('dishForm.attachGroup')}>
                {availableOf('addon').map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      setRefs((r) => withToggledRef(r, g.id));
                      setPicking(null);
                    }}
                    className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-control bg-white px-4 text-sm font-semibold hover:bg-cream ${focusRing}`}
                  >
                    {g.name}
                    <span className="text-xs font-normal text-muted">{t('optionGroups.optionCount', { count: g.options.length })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.groupsShared')}</p>
      </div>

      {hasDishOnly && (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#e6d9c6] p-4">
          <h3 className="text-[17px] font-bold leading-6">{t('dishForm.dishOnlyGroups')}</h3>
          <p className="text-[13px] leading-[19px] text-muted">{t('dishForm.dishOnlyGroupsHelp')}</p>
          <Step4Customise
            variantGroups={value.variantGroups}
            {...variantHelpers}
            addonGroups={value.addonGroups}
            {...addonHelpers}
            refs={refs}
            translation={translating ? { language: translating, setGroup: setGroupTranslation, setOption: setOptionTranslation } : undefined}
          />
        </div>
      )}

      {(creating || editing) && (
        <OptionGroupDialog
          key={editing?.id ?? dialog}
          shopId={shopId}
          group={editing}
          defaultKind={dialog === 'new-variant' ? 'variant' : 'addon'}
          currency={currency}
          onClose={() => setDialog(null)}
          // A group created from here is attached straight away; editing one changes it for every dish
          onSaved={(id) => {
            if (creating) setRefs((r) => (r.includes(id) ? r : [...r, id]));
          }}
        />
      )}
    </>
  );
}

// ── 4. Availability ────────────────────────────────────────────────────────────

const MODE_HELP: Record<FulfilmentMode, string> = {
  collection: 'dishForm.modeHelp.collection',
  delivery: 'dishForm.modeHelp.delivery',
  dine_in: 'dishForm.modeHelp.dine_in',
};

function AvailabilitySection({
  mode, value, patchFood, children,
}: {
  mode: DishFormProps['mode'];
  value: DishFormState;
  patchFood: (p: Partial<DishFormState['foodInfo']>) => void;
  children?: ReactNode;
}) {
  const { t } = useTranslation();
  const f = value.foodInfo;
  const rowClass = 'flex items-center gap-4 border-t border-line-soft py-3';

  return (
    <>
      {mode === 'add' ? (
        <div className="flex flex-col gap-1.5">
          <SectionTitle>{t('dishForm.sectionNames.availability')}</SectionTitle>
          <p className="text-sm leading-[21px] text-muted">{t('dishForm.availabilityIntroAdd')}</p>
        </div>
      ) : (
        <SectionTitle>{t('dishForm.sectionNames.availability')}</SectionTitle>
      )}
      <div className="flex flex-col gap-3">
        <h3 className="text-[17px] font-bold leading-6">{t('dishForm.availableFor')}</h3>
        <ul className="flex flex-col">
          {/* A switch is ON when the way of ordering is NOT in the dish's `unavailableModes` */}
          {MODE_ORDER.map((m) => (
            <li key={m} className={rowClass}>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span id={`mode-${m}`} className="text-[15px] font-semibold leading-[21px]">{t(`orders.fulfilment.${m}`)}</span>
                <span className="text-[13px] leading-[19px] text-muted">{t(MODE_HELP[m])}</span>
              </div>
              <PillSwitch
                checked={!f.unavailableModes.includes(m)}
                onChange={() => patchFood({ unavailableModes: toggleMode(f.unavailableModes, m) })}
                label={t(`orders.fulfilment.${m}`)}
              />
            </li>
          ))}
          <li className={rowClass}>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-semibold leading-[21px]">{t('products.ageRestricted')}</span>
              <span className="text-[13px] leading-[19px] text-muted">{t('products.ageRestrictedHelp')}</span>
            </div>
            <PillSwitch checked={f.ageRestricted} onChange={(on) => patchFood({ ageRestricted: on })} label={t('products.ageRestricted')} />
          </li>
        </ul>
      </div>

      <div className="relative max-w-[240px]">
        <MyInput
          label={t('dishForm.prepTime')}
          type="number"
          inputMode="numeric"
          min="1"
          max="240"
          value={f.prepMinutes ?? ''}
          onChange={(e) => patchFood({ prepMinutes: e.target.value === '' ? null : Math.round(Number(e.target.value)) })}
          className="h-12 pr-[84px] text-base!"
        />
        {/* The unit sits inside the field, at its right edge */}
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 right-3.5 flex h-12 items-center text-sm text-muted">
          {t('dishForm.prepUnit')}
        </span>
      </div>

      {children}
    </>
  );
}
