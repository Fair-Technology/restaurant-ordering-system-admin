import { useState, useEffect, useId } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useApplyCategoryTaxClassMutation,
  useDeleteCategoryMutation,
  useGetCategoryByIdQuery,
  useGetShopByIdQuery,
  useUpdateCategoryMutation,
} from '../../services/api';
import type { CategorySchedule, MenuLanguage, TranslationMap } from '../../services/api';
import { Section } from '../layout/Page';
import { MyButton } from '../ui/MyButton';
import { MyInput } from '../ui/MyInput';
import { MySpinner } from '../ui/MySpinner';
import { MySwitch } from '../ui/MySwitch';
import { useToast } from '../../contexts/ToastContext';
import { useShopReferenceLists } from '../../features/menu/useShopReferenceLists';
import { dishTaxClasses, labelFor, taxClassOptionLabel } from '../../features/menu/foodInfo';
import { menuLanguagesOf, resolveActiveLanguage, withTranslation } from '../../features/menu/translations';
import { LanguageTabs, TranslationField } from '../menu/LanguageTabs';
import { DEFAULT_SCHEDULE, WEEK_DAYS, dayName, isScheduleValid } from '../../features/menu/categorySchedule';
import { selectClass } from '../../features/menu/useIsWide';

interface CategoryEditorProps {
  shopId: string;
  categoryId: string;
  /** After a successful save */
  onSaved: () => void;
  onCancel: () => void;
  /** After the category was deleted */
  onDeleted: () => void;
}

const errorBox = 'mb-[18px] rounded-2xl border border-[#f5c2bd] bg-[#fdeceb] px-4 py-3 text-sm text-[#b42318]';

/** The category form (name, tax class, visibility, times) and its danger zone, as white sections. */
export function CategoryEditor({ shopId, categoryId, onSaved, onCancel, onDeleted }: CategoryEditorProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const uid = useId();
  const shownLabelId = `${uid}-shown-label`;
  const shownHelpId = `${uid}-shown-help`;
  const taxSelectId = `${uid}-tax`;

  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { data: category, isLoading, isError } = useGetCategoryByIdQuery(
    { shopId, categoryId },
    { refetchOnMountOrArgChange: true },
  );
  const [updateCategory, { isLoading: isUpdating, isError: isUpdateError }] = useUpdateCategoryMutation();
  const [deleteCategory, { isLoading: isDeleting, isError: isDeleteError }] = useDeleteCategoryMutation();
  const { refs } = useShopReferenceLists(shopId);
  const [applyTaxClass, { isLoading: isApplying }] = useApplyCategoryTaxClassMutation();
  const [confirmingApply, setConfirmingApply] = useState(false);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string | null>(null);
  const [taxClassId, setTaxClassId] = useState('');
  const [nameTranslations, setNameTranslations] = useState<TranslationMap>({});
  const [shown, setShown] = useState(true);
  const [schedule, setSchedule] = useState<CategorySchedule | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  useEffect(() => {
    if (category) {
      setName(category.name ?? '');
      setIcon(category.icon ?? null);
      setTaxClassId(category.taxClassId ?? '');
      setNameTranslations(category.nameTranslations ?? {});
      setShown(category.isAvailable !== false);
      setSchedule(category.schedule ?? null);
    }
  }, [category]);

  const [pickedLanguage, setPickedLanguage] = useState<MenuLanguage | undefined>();
  const languages = shop ? menuLanguagesOf(shop) : [];
  const extraLanguage = languages[1];
  const activeLanguage = resolveActiveLanguage(languages, pickedLanguage);
  const translating = extraLanguage !== undefined && activeLanguage === extraLanguage;

  if (isLoading) return <MySpinner label={t('categories.loadingCategory')} />;
  if (isError || !category) return <p className="text-sm text-[#b42318]">{t('categories.failedToLoad')}</p>;

  const scheduleInvalid = schedule !== null && !isScheduleValid(schedule);
  const toggleDay = (day: number) =>
    setSchedule((s) =>
      s && { ...s, daysOfWeek: s.daysOfWeek.includes(day) ? s.daysOfWeek.filter((d) => d !== day) : [...s.daysOfWeek, day] },
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (scheduleInvalid) return;
    try {
      await updateCategory({
        shopId,
        categoryId,
        updateCategoryRequest: {
          name,
          ...(extraLanguage ? { nameTranslations } : {}),
          icon: icon ?? undefined,
          ...(taxClassId ? { taxClassId } : {}),
          isAvailable: shown,
          schedule,
        },
      }).unwrap();
      toast.success(t('categories.saved'));
      onSaved();
    } catch {
      // error shown above the form
    }
  };

  // Sets every dish in the category to its saved class; asks first, since it changes many dishes at once
  const savedTaxClass = refs?.taxClasses.find((c) => c.id === category.taxClassId);
  const savedTaxLabel = savedTaxClass
    ? taxClassOptionLabel(labelFor(savedTaxClass.labels, i18n.language), savedTaxClass.id, refs, i18n.language)
    : '';
  const handleApplyTaxClass = async () => {
    try {
      const { updatedCount } = await applyTaxClass({ shopId, categoryId }).unwrap();
      toast.success(
        updatedCount > 0 ? t('categories.applyTaxClassDone', { count: updatedCount }) : t('categories.applyTaxClassNone'),
      );
    } catch {
      toast.error(t('categories.applyTaxClassFailed'));
    } finally {
      setConfirmingApply(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteCategory({ shopId, categoryId }).unwrap();
      toast.success(t('categories.deleted'));
      onDeleted();
    } catch {
      setConfirmingDelete(false);
    }
  };

  return (
    <div>
      {isUpdateError && <p role="alert" className={errorBox}>{t('categories.failedToUpdate')}</p>}
      {isDeleteError && <p role="alert" className={errorBox}>{t('categories.failedToDelete')}</p>}

      <form onSubmit={handleSubmit}>
        <Section title={category.name} padded>
          <div className="space-y-4">
            {extraLanguage && activeLanguage && (
              <LanguageTabs languages={languages} active={activeLanguage} onChange={setPickedLanguage} />
            )}
            {translating ? (
              <TranslationField
                label={t('categories.name')}
                original={name}
                value={nameTranslations[extraLanguage] ?? ''}
                onChange={(v) => setNameTranslations((m) => withTranslation(m, extraLanguage, v))}
              />
            ) : (
              <MyInput
                label={t('categories.name')}
                type="text"
                required
                placeholder={t('categories.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
            {!translating && (refs?.taxClasses.length ?? 0) > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor={taxSelectId} className="text-[13px] font-semibold text-[#4a413b]">
                  {t('categories.taxClass')}
                </label>
                <select
                  id={taxSelectId}
                  value={taxClassId}
                  onChange={(e) => setTaxClassId(e.target.value)}
                  className={selectClass}
                >
                  {dishTaxClasses(refs!.taxClasses).map((c) => (
                    <option key={c.id} value={c.id}>
                      {labelFor(c.labels, i18n.language)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted">{t('categories.taxClassHelp')}</p>
                {savedTaxClass &&
                  (confirmingApply ? (
                    <div className="space-y-2 rounded-xl border border-[#f1dfae] bg-[#fff6e0] p-3">
                      <p className="text-sm text-[#8a5a00]">
                        {t('categories.applyTaxClassConfirm', { name: category.name, label: savedTaxLabel })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <MyButton type="button" size="sm" disabled={isApplying} onClick={handleApplyTaxClass}>
                          {t('categories.applyTaxClassYes')}
                        </MyButton>
                        <MyButton type="button" size="sm" variant="ghost" disabled={isApplying} onClick={() => setConfirmingApply(false)}>
                          {t('categories.cancel')}
                        </MyButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <MyButton
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={taxClassId !== category.taxClassId}
                        onClick={() => setConfirmingApply(true)}
                      >
                        {t('categories.applyTaxClass')}
                      </MyButton>
                      {taxClassId !== category.taxClassId && (
                        <span className="text-xs text-muted">{t('categories.applyTaxClassSaveFirst')}</span>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Section>

        {!translating && (
          <Section title={t('categories.visibilityTitle')}>
            <div className="flex items-start justify-between gap-4 border-b border-line-soft px-4 py-3.5">
              <div>
                <p id={shownLabelId} className="text-sm font-semibold">
                  {t('categories.shownOnMenu')}
                </p>
                <p id={shownHelpId} className="mt-0.5 text-[13px] text-muted">
                  {t('categories.shownOnMenuHelp')}
                </p>
              </div>
              <MySwitch checked={shown} onChange={setShown} labelledBy={shownLabelId} describedBy={shownHelpId} />
            </div>
            <div className="space-y-3 px-4 py-3.5">
              <label className="flex cursor-pointer items-start gap-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-[#e3d9ce] accent-[#1f1a17]"
                  checked={schedule !== null}
                  onChange={(e) => setSchedule(e.target.checked ? DEFAULT_SCHEDULE : null)}
                />
                <span>
                  <span className="block text-sm font-semibold">{t('categories.onlyAtTimes')}</span>
                  <span className="block text-[13px] text-muted">{t('categories.onlyAtTimesHelp')}</span>
                </span>
              </label>
              {schedule && (
                <div className="space-y-3 pl-6">
                  <div role="group" aria-label={t('categories.days')} className="flex flex-wrap gap-1.5">
                    {WEEK_DAYS.map((day) => {
                      const on = schedule.daysOfWeek.includes(day);
                      return (
                        <button
                          key={day}
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggleDay(day)}
                          className={`h-8 min-w-11 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
                            on ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
                          }`}
                        >
                          {dayName(day, i18n.language)}
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex gap-3">
                    <div className="min-w-0 flex-1">
                      <MyInput
                        label={t('categories.from')}
                        type="time"
                        value={schedule.startTime}
                        onChange={(e) => setSchedule({ ...schedule, startTime: e.target.value })}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <MyInput
                        label={t('categories.until')}
                        type="time"
                        value={schedule.endTime}
                        onChange={(e) => setSchedule({ ...schedule, endTime: e.target.value })}
                      />
                    </div>
                  </div>
                  {scheduleInvalid && <p className="text-sm text-[#b42318]">{t('categories.scheduleInvalid')}</p>}
                </div>
              )}
            </div>
          </Section>
        )}

        <div className="mb-[18px] flex flex-wrap justify-end gap-2">
          <MyButton type="button" variant="secondary" disabled={isUpdating} onClick={onCancel}>
            {t('categories.cancel')}
          </MyButton>
          <MyButton type="submit" disabled={isUpdating || scheduleInvalid}>
            {isUpdating ? t('categories.saving') : t('categories.saveChanges')}
          </MyButton>
        </div>
      </form>

      <Section title={t('categories.dangerZone')} tone="danger" padded>
        <div className="space-y-3">
          <p className="text-[13px] text-muted">{t('categories.deleteWarning')}</p>
          {confirmingDelete ? (
            <div className="space-y-3">
              <MyInput
                label={t('categories.deleteTypeToConfirm', { name: category.name })}
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={category.name}
              />
              <div className="flex flex-wrap gap-2">
                <MyButton
                  type="button"
                  variant="danger"
                  disabled={isDeleting || deleteConfirmName !== category.name}
                  onClick={handleDelete}
                >
                  {isDeleting ? t('categories.deleting') : t('categories.confirmDelete')}
                </MyButton>
                <MyButton
                  type="button"
                  variant="ghost"
                  disabled={isDeleting}
                  onClick={() => {
                    setConfirmingDelete(false);
                    setDeleteConfirmName('');
                  }}
                >
                  {t('categories.cancel')}
                </MyButton>
              </div>
            </div>
          ) : (
            <MyButton type="button" variant="danger" onClick={() => setConfirmingDelete(true)}>
              {t('categories.delete')}
            </MyButton>
          )}
        </div>
      </Section>
    </div>
  );
}
