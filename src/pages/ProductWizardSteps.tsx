/**
 * Shared step components for the Create / Edit product wizards.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput, MyTextarea } from '../components/ui/MyInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import { useCreateCategoryMutation } from '../services/api';
import type { MenuLanguage, ReferenceEntry, ReferenceListsResponse, SpiceLevel, TranslationMap } from '../services/api';
import { effectiveTaxClassId, MODE_ORDER, isFoodInfoDeclared, labelFor, taxClassOptionLabel, toggleId, toggleMode, unavailableModesInOrder } from '../features/menu/foodInfo';
import type { FoodInfo } from '../features/menu/foodInfo';
import { TranslationsSection } from '../components/menu/TranslationsSection';
import type { TranslationRow } from '../components/menu/TranslationsSection';

// ── Shared types ──────────────────────────────────────────────────────────────

export type VariantOption = { id: string; name: string; nameTranslations?: TranslationMap; priceDelta: number; isAvailable: boolean };
export type VariantGroup  = { id: string; name: string; nameTranslations?: TranslationMap; options: VariantOption[] };
export type AddonOption   = { id: string; name: string; nameTranslations?: TranslationMap; priceDelta: number; isAvailable: boolean };
export type AddonGroup    = { id: string; name: string; nameTranslations?: TranslationMap; minSelectable: number; maxSelectable: number; options: AddonOption[] };
export type StepNum = 1 | 2 | 3 | 4 | 6;

export interface ScheduleState {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  offerEnabled: boolean;
  offerPrice: number; // cents
  offerLabel: string;
}

// ── Step Indicator ────────────────────────────────────────────────────────────

interface StepIndicatorProps {
  currentStep: StepNum;
  onJump: (n: StepNum) => void;
  stepSequence?: StepNum[];
}

export function StepIndicator({ currentStep, onJump, stepSequence = [1, 2, 3, 4, 6] }: StepIndicatorProps) {
  const { t } = useTranslation();
  const STEP_LABELS: Record<StepNum, string> = {
    1: t('products.wizardStep1'),
    2: t('products.wizardStep2'),
    3: t('products.wizardStep3'),
    4: t('products.wizardStep4'),
    6: t('products.wizardStep6'),
  };

  const currentIdx = stepSequence.indexOf(currentStep);

  return (
    <div className="flex items-center justify-between w-full">
      {stepSequence.map((n, i) => {
        const isCompleted = i < currentIdx;
        const isActive = n === currentStep;
        const isLast = i === stepSequence.length - 1;

        const circleBase =
          'flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors duration-200 shrink-0';
        const circleClass = isCompleted
          ? 'bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-400'
          : isActive
          ? 'bg-gray-900 border-gray-900 text-white'
          : 'bg-transparent border-gray-200 text-gray-300';

        return (
          <div key={n} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 min-w-0 self-start">
              <button
                type="button"
                className={`${circleBase} ${circleClass}`}
                onClick={() => isCompleted && onJump(n)}
                disabled={!isCompleted}
                aria-current={isActive ? 'step' : undefined}
              >
                {isCompleted ? '✓' : i + 1}
              </button>
              <span
                className={`min-h-[2rem] max-w-[74px] text-[11px] font-medium leading-snug text-center whitespace-normal break-words transition-colors duration-200 ${
                  isCompleted ? 'text-emerald-500' : isActive ? 'text-gray-900' : 'text-gray-300'
                }`}
              >
                {STEP_LABELS[n]}
              </span>
            </div>
            {!isLast && (
              <div
                className={`flex-1 h-px mx-1 mt-3 transition-colors duration-200 ${
                  isCompleted ? 'bg-emerald-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Basics ────────────────────────────────────────────────────────────

interface Step1Props {
  form: { name: string; description: string; price: number };
  setForm: React.Dispatch<React.SetStateAction<{ name: string; description: string; price: number }>>;
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  currencySymbol: string;
  nameError: boolean;
  descError: boolean;
  existingImageUrl?: string | null;
  /** Present only when the shop has a second menu language. */
  translation?: {
    language: MenuLanguage;
    name: string;
    description: string;
    setName: (v: string) => void;
    setDescription: (v: string) => void;
  };
}

export function Step1Basics({ form, setForm, imageFile, setImageFile, currencySymbol, nameError, descError, existingImageUrl, translation }: Step1Props) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div>
        <MyInput
          label={t('products.name')}
          type="text"
          placeholder={t('products.namePlaceholder')}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        {nameError && (
          <p className="mt-1 text-xs text-red-500">{t('products.name')} is required.</p>
        )}
      </div>
      <div>
        <MyTextarea
          label={t('products.description')}
          placeholder={t('products.descriptionPlaceholder')}
          rows={3}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        {descError && (
          <p className="mt-1 text-xs text-red-500">{t('products.description')} is required.</p>
        )}
      </div>
      {translation && (
        <TranslationsSection
          language={translation.language}
          rows={[
            { id: 'name', original: form.name, value: translation.name, onChange: translation.setName },
            { id: 'description', original: form.description, value: translation.description, onChange: translation.setDescription, multiline: true },
          ]}
        />
      )}
      <CurrencyInput
        label={t('products.price', { symbol: currencySymbol })}
        valueCents={form.price}
        onChange={(cents) => setForm((f) => ({ ...f, price: cents }))}
      />
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-gray-700">
          {t('products.image')}{' '}
          <span className="text-gray-300 font-normal">{t('products.imageOptionalNote')}</span>
        </p>
        {/* Image preview */}
        {existingImageUrl && imageFile ? (
          /* Replacing existing: old (with overlay) → arrow → new */
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={existingImageUrl} alt={t('products.currentImage')} className="w-full h-full object-cover" />
                {/* Dark overlay to indicate it's being replaced */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-lg font-light leading-none">×</span>
                </div>
              </div>
              <span className="text-xs text-gray-400">{t('products.currentImage')}</span>
            </div>

            <ArrowRight size={16} className="text-gray-400 flex-shrink-0 mt-0 mb-4" />

            <div className="flex flex-col items-center gap-1">
              <img
                src={URL.createObjectURL(imageFile)}
                alt={t('products.newImage')}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              />
              <span className="text-xs text-gray-400">{t('products.newImage')}</span>
            </div>
          </div>
        ) : existingImageUrl ? (
          /* Existing image, no replacement selected yet */
          <div className="flex flex-col items-center gap-1 w-fit">
            <img
              src={existingImageUrl}
              alt={t('products.currentImage')}
              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
            />
            <span className="text-xs text-gray-400">{t('products.currentImage')}</span>
          </div>
        ) : imageFile ? (
          /* No existing image, new file selected */
          <div className="flex items-center gap-2">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="preview"
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
            <p className="text-xs text-gray-400">{imageFile.name}</p>
          </div>
        ) : null}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
        />
      </div>
    </div>
  );
}

// ── Step 3: Food info (allergens, additives, dietary tags, spiciness, prep time) ──

interface StepFoodInfoProps {
  foodInfo: FoodInfo;
  setFoodInfo: (f: FoodInfo) => void;
  refs: ReferenceListsResponse | undefined;
  showOptional: boolean;
}

export function StepFoodInfo({ foodInfo, setFoodInfo, refs, showOptional }: StepFoodInfoProps) {
  const { t, i18n } = useTranslation();

  if (!refs) {
    return <p className="text-sm text-gray-500">{t('products.refsLoadError')}</p>;
  }

  const chipClass = (pressed: boolean) =>
    `px-2.5 py-1 rounded-full text-xs border transition-colors ${
      pressed
        ? 'bg-gray-900 border-gray-900 text-white'
        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">{t('products.allergens')}</label>
        <div className="flex flex-wrap gap-1.5">
          {refs.allergens.filter((a) => a.isActive).map((a) => {
            const pressed = (foodInfo.allergenIds ?? []).includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={pressed}
                className={chipClass(pressed)}
                onClick={() => setFoodInfo({ ...foodInfo, allergenIds: toggleId(foodInfo.allergenIds, a.id) })}
              >
                {labelFor(a.labels, i18n.language)}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={Array.isArray(foodInfo.allergenIds) && foodInfo.allergenIds.length === 0}
            onChange={(e) => setFoodInfo({ ...foodInfo, allergenIds: e.target.checked ? [] : null })}
            className="accent-gray-900"
          />
          {t('products.allergensNone')}
        </label>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-700">{t('products.additives')}</label>
        <div className="flex flex-wrap gap-1.5">
          {refs.additives.filter((a) => a.isActive).map((a) => {
            const pressed = (foodInfo.additiveIds ?? []).includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                aria-pressed={pressed}
                className={chipClass(pressed)}
                onClick={() => setFoodInfo({ ...foodInfo, additiveIds: toggleId(foodInfo.additiveIds, a.id) })}
              >
                {a.code} {labelFor(a.labels, i18n.language)}
              </button>
            );
          })}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={Array.isArray(foodInfo.additiveIds) && foodInfo.additiveIds.length === 0}
            onChange={(e) => setFoodInfo({ ...foodInfo, additiveIds: e.target.checked ? [] : null })}
            className="accent-gray-900"
          />
          {t('products.additivesNone')}
        </label>
      </div>

      {!isFoodInfoDeclared(foodInfo) && (
        <p className="text-xs text-amber-600">{t('products.foodInfoUndeclaredWarning')}</p>
      )}

      {showOptional && (
        <>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('products.dietaryTags')}</label>
            <div className="flex flex-wrap gap-1.5">
              {refs.dietaryTags.map((tag) => {
                const pressed = foodInfo.dietaryTagIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    aria-pressed={pressed}
                    className={chipClass(pressed)}
                    onClick={() =>
                      setFoodInfo({
                        ...foodInfo,
                        dietaryTagIds: pressed
                          ? foodInfo.dietaryTagIds.filter((id) => id !== tag.id)
                          : [...foodInfo.dietaryTagIds, tag.id],
                      })
                    }
                  >
                    {labelFor(tag.labels, i18n.language)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">{t('products.spiceLevel')}</label>
            <select
              value={foodInfo.spiceLevel ?? ''}
              onChange={(e) => setFoodInfo({ ...foodInfo, spiceLevel: (e.target.value || null) as SpiceLevel | null })}
              className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
            >
              <option value="">{t('products.spiceNone')}</option>
              {refs.spiceLevels.map((level) => (
                <option key={level.id} value={level.id}>
                  {labelFor(level.labels, i18n.language)}
                </option>
              ))}
            </select>
          </div>

          <MyInput
            label={t('products.prepMinutes')}
            type="number"
            min="1"
            max="240"
            value={foodInfo.prepMinutes ?? ''}
            onChange={(e) =>
              setFoodInfo({
                ...foodInfo,
                prepMinutes: e.target.value === '' ? null : Math.round(Number(e.target.value)),
              })
            }
          />
        </>
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700">{t('products.notOfferedFor')}</legend>
        <p className="text-xs text-gray-500">{t('products.notOfferedForHelp')}</p>
        {MODE_ORDER.map((m) => (
          <label key={m} className="flex items-center gap-3 text-sm text-gray-800">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={foodInfo.unavailableModes.includes(m)}
              onChange={() => setFoodInfo({ ...foodInfo, unavailableModes: toggleMode(foodInfo.unavailableModes, m) })}
            />
            <span>{t(`orders.fulfilment.${m}`)}</span>
          </label>
        ))}
      </fieldset>
    </div>
  );
}

// ── Step 2: Categories & Tax ───────────────────────────────────────────────────

interface Step2CategoriesProps {
  shopId: string;
  categories: { id: string; name: string; taxClassId?: string | null }[];
  selectedCategoryIds: string[];
  setSelectedCategoryIds: (ids: string[]) => void;
  taxClasses: ReferenceEntry[];
  taxRefs?: Pick<ReferenceListsResponse, 'currentTaxRates' | 'taxRatesUniformAcrossModes'>;
  taxClassOverride: string | null;
  setTaxClassOverride: (id: string | null) => void;
  categoryError: boolean;
  showTaxOverride?: boolean;
}

export function StepCategories({
  shopId,
  categories,
  selectedCategoryIds,
  setSelectedCategoryIds,
  taxClasses,
  taxRefs,
  taxClassOverride,
  setTaxClassOverride,
  categoryError,
  showTaxOverride = false,
}: Step2CategoriesProps) {
  const { t, i18n } = useTranslation();
  const [createCategory, { isLoading: isCreating }] = useCreateCategoryMutation();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createError, setCreateError] = useState('');

  const remaining = categories.filter((c) => !selectedCategoryIds.includes(c.id));
  const selected  = categories.filter((c) => selectedCategoryIds.includes(c.id));

  const addCategory = (id: string) => {
    if (id) setSelectedCategoryIds([...selectedCategoryIds, id]);
  };
  const removeCategory = (id: string) =>
    setSelectedCategoryIds(selectedCategoryIds.filter((s) => s !== id));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreateError('');

    // If a category with this name already exists, select it instead of creating
    const existing = categories.find(
      (c) => c.name.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      if (!selectedCategoryIds.includes(existing.id)) {
        setSelectedCategoryIds([...selectedCategoryIds, existing.id]);
      }
      setNewName('');
      setShowCreate(false);
      return;
    }

    try {
      const created = await createCategory({
        shopId,
        createCategoryRequest: { name, sortOrder: categories.length },
      }).unwrap();
      if (created.id) setSelectedCategoryIds([...selectedCategoryIds, created.id]);
      setNewName('');
      setShowCreate(false);
    } catch {
      setCreateError('Failed to create category. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            {t('products.categories')}
          </label>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs bg-gray-100 border border-gray-200 text-gray-700"
                >
                  {cat.name}
                  <button
                    type="button"
                    onClick={() => removeCategory(cat.id)}
                    className="text-gray-400 hover:text-gray-700 transition-colors leading-none"
                    aria-label={`Remove ${cat.name}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {remaining.length > 0 && (
            <select
              value=""
              onChange={(e) => { addCategory(e.target.value); e.target.value = ''; }}
              className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
            >
              <option value="" className="text-gray-400">
                {selected.length === 0 ? 'Select a category…' : 'Add another category…'}
              </option>
              {remaining.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          )}

          {!showCreate && (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="text-xs text-gray-500 hover:text-gray-800 underline underline-offset-2 self-start"
            >
              + New category
            </button>
          )}

          {showCreate && (
            <form onSubmit={handleCreate} className="flex gap-2 items-center">
              <input
                autoFocus
                type="text"
                placeholder="Category name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
              />
              <MyButton type="submit" disabled={isCreating || !newName.trim()} className="shrink-0 text-sm py-2">
                {isCreating ? 'Creating…' : 'Create'}
              </MyButton>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(''); setCreateError(''); }}
                className="text-gray-400 hover:text-gray-700 text-xs shrink-0"
              >
                Cancel
              </button>
            </form>
          )}

          {createError && (
            <p className="text-xs text-red-500">{createError}</p>
          )}

          {categoryError && (
            <p className="text-xs text-red-500">{t('products.categoryRequired')}</p>
          )}
        </div>

      {showTaxOverride && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">
            {t('products.taxClass')}
          </label>
          <select
            value={taxClassOverride ?? ''}
            onChange={(e) => setTaxClassOverride(e.target.value || null)}
            className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
          >
            <option value="">
              {(() => {
                const fromCategoryId = effectiveTaxClassId(selectedCategoryIds, categories, null);
                const fromCategory = taxClasses.find((c) => c.id === fromCategoryId);
                return fromCategory
                  ? t('products.taxClassFromCategory', { label: taxClassOptionLabel(labelFor(fromCategory.labels, i18n.language), fromCategory.id, taxRefs, i18n.language) })
                  : t('products.taxClassNoneYet');
              })()}
            </option>
            {taxClasses.filter((c) => c.isActive).map((c) => (
              <option key={c.id} value={c.id}>
                {taxClassOptionLabel(labelFor(c.labels, i18n.language), c.id, taxRefs, i18n.language)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Customise (Variants + Addons) ─────────────────────────────────────

interface Step4Props {
  variantGroups: VariantGroup[];
  addVariantGroup: () => void;
  removeVariantGroup: (id: string) => void;
  updateVariantGroupName: (id: string, name: string) => void;
  addVariantOption: (groupId: string) => void;
  removeVariantOption: (groupId: string, optionId: string) => void;
  updateVariantOption: (groupId: string, optionId: string, patch: Partial<VariantOption>) => void;
  addonGroups: AddonGroup[];
  addAddonGroup: () => void;
  removeAddonGroup: (id: string) => void;
  updateAddonGroup: (id: string, patch: Partial<AddonGroup>) => void;
  addAddonOption: (groupId: string) => void;
  removeAddonOption: (groupId: string, optionId: string) => void;
  updateAddonOption: (groupId: string, optionId: string, patch: Partial<AddonOption>) => void;
  /** Present only when the shop has a second menu language. */
  translation?: {
    language: MenuLanguage;
    setGroup: (kind: 'variant' | 'addon', groupId: string, value: string) => void;
    setOption: (kind: 'variant' | 'addon', groupId: string, optionId: string, value: string) => void;
  };
}

export function Step4Customise({
  variantGroups, addVariantGroup, removeVariantGroup, updateVariantGroupName,
  addVariantOption, removeVariantOption, updateVariantOption,
  addonGroups, addAddonGroup, removeAddonGroup, updateAddonGroup,
  addAddonOption, removeAddonOption, updateAddonOption,
  translation,
}: Step4Props) {
  const { t } = useTranslation();
  const translationRows: TranslationRow[] = translation
    ? ([['variant', variantGroups], ['addon', addonGroups]] as const).flatMap(([kind, groups]) =>
        groups.flatMap((g) => [
          {
            id: `${kind}-${g.id}`,
            original: g.name,
            value: g.nameTranslations?.[translation.language] ?? '',
            onChange: (v: string) => translation.setGroup(kind, g.id, v),
          },
          ...g.options.map((o) => ({
            id: `${kind}-${g.id}-${o.id}`,
            original: o.name,
            value: o.nameTranslations?.[translation.language] ?? '',
            onChange: (v: string) => translation.setOption(kind, g.id, o.id, v),
          })),
        ]),
      )
    : [];
  return (
    <div className="space-y-4">
      {/* Variant Groups */}
      <MyCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t('variants.title')}</span>
          <MyButton type="button" variant="secondary" size="sm" onClick={addVariantGroup}>
            {t('variants.addGroup')}
          </MyButton>
        </div>
        {variantGroups.map(group => (
          <div key={group.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
            <MyInput
              placeholder={t('variants.groupNamePlaceholder')}
              value={group.name}
              onChange={(e) => updateVariantGroupName(group.id, e.target.value)}
            />
            <div className="space-y-2">
              {group.options.map(option => (
                <div key={option.id} className="flex items-center gap-2">
                  <MyInput
                    placeholder={t('variants.optionNamePlaceholder')}
                    value={option.name}
                    onChange={(e) => updateVariantOption(group.id, option.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <CurrencyInput
                    valueCents={option.priceDelta}
                    onChange={(cents) => updateVariantOption(group.id, option.id, { priceDelta: cents })}
                    className="w-24"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={option.isAvailable}
                      onChange={(e) => updateVariantOption(group.id, option.id, { isAvailable: e.target.checked })}
                      className="accent-gray-900"
                    />
                    {t('variants.available')}
                  </label>
                  <MyButton type="button" variant="ghost" size="sm" onClick={() => removeVariantOption(group.id, option.id)}>
                    ×
                  </MyButton>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => addVariantOption(group.id)}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                {t('variants.addOption')}
              </button>
              <MyButton
                type="button" variant="ghost" size="sm"
                onClick={() => removeVariantGroup(group.id)}
                className="text-red-500 hover:text-red-600"
              >
                {t('variants.removeGroup')}
              </MyButton>
            </div>
          </div>
        ))}
      </MyCard>

      {/* Addon Groups */}
      <MyCard className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">{t('addons.title')}</span>
          <MyButton type="button" variant="secondary" size="sm" onClick={addAddonGroup}>
            {t('addons.addGroup')}
          </MyButton>
        </div>
        {addonGroups.map(group => (
          <div key={group.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
            <MyInput
              placeholder={t('addons.groupNamePlaceholder')}
              value={group.name}
              onChange={(e) => updateAddonGroup(group.id, { name: e.target.value })}
            />
            <div className="flex gap-3">
              <MyInput
                label={t('addons.min')} type="number" min="0"
                value={group.minSelectable}
                onChange={(e) => updateAddonGroup(group.id, { minSelectable: parseInt(e.target.value || '0', 10) })}
                className="flex-1"
              />
              <MyInput
                label={t('addons.max')} type="number" min="0"
                value={group.maxSelectable}
                onChange={(e) => updateAddonGroup(group.id, { maxSelectable: parseInt(e.target.value || '0', 10) })}
                className="flex-1"
              />
            </div>
            <div className="space-y-2">
              {group.options.map(option => (
                <div key={option.id} className="flex items-center gap-2">
                  <MyInput
                    placeholder={t('addons.optionNamePlaceholder')}
                    value={option.name}
                    onChange={(e) => updateAddonOption(group.id, option.id, { name: e.target.value })}
                    className="flex-1"
                  />
                  <CurrencyInput
                    valueCents={option.priceDelta}
                    onChange={(cents) => updateAddonOption(group.id, option.id, { priceDelta: cents })}
                    className="w-24"
                  />
                  <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={option.isAvailable}
                      onChange={(e) => updateAddonOption(group.id, option.id, { isAvailable: e.target.checked })}
                      className="accent-gray-900"
                    />
                    {t('addons.available')}
                  </label>
                  <MyButton type="button" variant="ghost" size="sm" onClick={() => removeAddonOption(group.id, option.id)}>
                    ×
                  </MyButton>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => addAddonOption(group.id)}
                className="text-xs text-gray-500 hover:text-gray-900 transition-colors"
              >
                {t('addons.addOption')}
              </button>
              <MyButton
                type="button" variant="ghost" size="sm"
                onClick={() => removeAddonGroup(group.id)}
                className="text-red-500 hover:text-red-600"
              >
                {t('addons.removeGroup')}
              </MyButton>
            </div>
          </div>
        ))}
      </MyCard>

      {translation && <TranslationsSection language={translation.language} rows={translationRows} />}
    </div>
  );
}

// ── Step 5: Schedule ──────────────────────────────────────────────────────────

interface Step5Props {
  scheduleEnabled: boolean;
  setScheduleEnabled: (v: boolean) => void;
  timeWindowEnabled: boolean;
  setTimeWindowEnabled: (v: boolean) => void;
  noEndDate: boolean;
  setNoEndDate: (v: boolean) => void;
  schedule: ScheduleState;
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleState>>;
  scheduleError: string | null;
}

export function Step5Schedule({
  scheduleEnabled, setScheduleEnabled,
  timeWindowEnabled, setTimeWindowEnabled,
  noEndDate, setNoEndDate,
  schedule, setSchedule,
  scheduleError,
}: Step5Props) {
  const { t } = useTranslation();
  return (
    <MyCard className="p-4 space-y-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={scheduleEnabled}
          onChange={(e) => setScheduleEnabled(e.target.checked)}
          className="accent-gray-900"
        />
        <span className="text-sm font-medium text-gray-700">{t('products.scheduleTitle')}</span>
      </label>
      <p className="text-xs text-gray-400">{t('products.scheduleToggle')}</p>
      {scheduleEnabled && (
        <div className="space-y-3 pt-1">
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleStartDate')}</label>
              <input
                type="date"
                value={schedule.startDate}
                onChange={(e) => setSchedule((s) => ({ ...s, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
              />
            </div>
            {!noEndDate && (
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleEndDate')}</label>
                <input
                  type="date"
                  value={schedule.endDate}
                  onChange={(e) => setSchedule((s) => ({ ...s, endDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                />
              </div>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={noEndDate}
              onChange={(e) => setNoEndDate(e.target.checked)}
              className="accent-gray-900"
            />
            {t('products.scheduleNoEndDate')}
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={timeWindowEnabled}
              onChange={(e) => {
                const checked = e.target.checked;
                setTimeWindowEnabled(checked);
                if (checked) {
                  setSchedule((s) => ({
                    ...s,
                    startTime: s.startTime || '00:00',
                    endTime: s.endTime || '23:59',
                  }));
                }
              }}
              className="accent-gray-900"
            />
            {t('products.scheduleSpecificTimes')}
          </label>
          {timeWindowEnabled && (
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleStartTime')}</label>
                <input
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setSchedule((s) => ({ ...s, startTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleEndTime')}</label>
                <input
                  type="time"
                  value={schedule.endTime}
                  onChange={(e) => setSchedule((s) => ({ ...s, endTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleDaysOfWeek')}</label>
            <div className="flex flex-wrap gap-1.5">
              {([1,2,3,4,5,6,0] as number[]).map((day) => {
                const keys = ['scheduleSun','scheduleMon','scheduleTue','scheduleWed','scheduleThu','scheduleFri','scheduleSat'];
                const label = t(`products.${keys[day]}`);
                const isSelected = schedule.daysOfWeek.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSchedule((s) => ({
                      ...s,
                      daysOfWeek: isSelected
                        ? s.daysOfWeek.filter((d) => d !== day)
                        : [...s.daysOfWeek, day],
                    }))}
                    className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                      isSelected
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          {scheduleError && (
            <p className="text-xs text-red-500">{scheduleError}</p>
          )}
        </div>
      )}
    </MyCard>
  );
}

// ── Step 6: Review ────────────────────────────────────────────────────────────

interface Step6Props {
  form: { name: string; description: string; price: number };
  imageFile: File | null;
  existingImageUrl?: string | null;
  selectedCategoryIds: string[];
  categories: { id: string; name: string }[];
  variantGroups: VariantGroup[];
  addonGroups: AddonGroup[];
  currencySymbol: string;
  foodInfo: FoodInfo;
  refs: ReferenceListsResponse | undefined;
  effectiveTaxClassLabel: string;
}

export function Step6Review({
  form, imageFile, existingImageUrl, selectedCategoryIds, categories,
  variantGroups, addonGroups, currencySymbol, foodInfo, refs, effectiveTaxClassLabel,
}: Step6Props) {
  const { t, i18n } = useTranslation();

  const selectedCategories = categories.filter(c => selectedCategoryIds.includes(c.id));
  const displayImageUrl = imageFile ? URL.createObjectURL(imageFile) : existingImageUrl;

  const declaredLabels = (
    ids: string[] | null,
    defs: ReadonlyArray<{ id: string; labels: { de: string; en: string } }>,
    noneKey: string,
  ) => {
    if (ids === null) return <span className="text-gray-400">{t('products.notDeclared')}</span>;
    if (ids.length === 0) return <span className="text-gray-400">{t(noneKey)}</span>;
    return (
      <div className="flex flex-wrap gap-1 justify-end">
        {defs.filter((d) => ids.includes(d.id)).map((d) => (
          <span key={d.id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-700">
            {labelFor(d.labels, i18n.language)}
          </span>
        ))}
      </div>
    );
  };

  const priceFormatted = (form.price / 100).toLocaleString(navigator.language, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        {displayImageUrl && (
          <img
            src={displayImageUrl}
            alt="preview"
            className="w-20 h-20 rounded-xl object-cover border border-gray-200 shrink-0"
          />
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 truncate">{form.name}</p>
          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{form.description}</p>
          <p className="text-base font-medium text-emerald-600 mt-1">
            {currencySymbol}{priceFormatted}
          </p>
        </div>
      </div>

      <div className="divide-y divide-gray-200">
        <ReviewRow label={t('products.categories')}>
          {selectedCategories.length > 0 ? (
            <div className="flex flex-wrap gap-1 justify-end">
              {selectedCategories.map(c => (
                <span key={c.id} className="text-xs bg-gray-100 rounded-full px-2 py-0.5 text-gray-700">
                  {c.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-gray-400">{t('products.wizardReviewNone')}</span>
          )}
        </ReviewRow>
        <ReviewRow label={t('products.taxClass')}>
          {effectiveTaxClassLabel}
        </ReviewRow>
        <ReviewRow label={t('variants.title')}>
          {variantGroups.length > 0
            ? t('products.wizardReviewVariants', { count: variantGroups.length })
            : <span className="text-gray-400">{t('products.wizardReviewNone')}</span>}
        </ReviewRow>
        <ReviewRow label={t('addons.title')}>
          {addonGroups.length > 0
            ? t('products.wizardReviewAddons', { count: addonGroups.length })
            : <span className="text-gray-400">{t('products.wizardReviewNone')}</span>}
        </ReviewRow>
        <ReviewRow label={t('products.allergens')}>
          {declaredLabels(foodInfo.allergenIds, refs?.allergens ?? [], 'products.allergensNone')}
        </ReviewRow>
        <ReviewRow label={t('products.additives')}>
          {declaredLabels(foodInfo.additiveIds, refs?.additives ?? [], 'products.additivesNone')}
        </ReviewRow>
        <ReviewRow label={t('products.notOfferedFor')}>
          {foodInfo.unavailableModes.length > 0
            ? unavailableModesInOrder(foodInfo.unavailableModes).map((m) => t(`orders.fulfilment.${m}`)).join(', ')
            : <span className="text-gray-400">{t('products.notOfferedForNone')}</span>}
        </ReviewRow>
      </div>
    </div>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-xs text-gray-400 uppercase tracking-wide shrink-0">{label}</span>
      <span className="text-sm text-gray-700 text-right">{children}</span>
    </div>
  );
}
