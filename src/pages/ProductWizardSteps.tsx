/**
 * Option-group types and editors shared by the dish form (Step4Customise) and the schedule dialog (Step5Schedule).
 */
import { useTranslation } from 'react-i18next';
import { MyCard } from '../components/ui/MyCard';
import { MyButton } from '../components/ui/MyButton';
import { MyInput } from '../components/ui/MyInput';
import { CurrencyInput } from '../components/ui/CurrencyInput';
import type { MenuLanguage, GetReferenceListsApiResponse, TranslationMap } from '../services/api';
import { hasOriginalText } from '../features/menu/translations';
import { OptionFoodInfoField } from '../components/menu/OptionFoodInfoField';
import { TranslationField } from '../components/menu/LanguageTabs';

// ── Shared types ──────────────────────────────────────────────────────────────

export type VariantOption = { id: string; name: string; nameTranslations?: TranslationMap; priceDelta: number; isAvailable: boolean; allergenIds?: string[]; additiveIds?: string[]; category?: string };
export type VariantGroup  = { id: string; name: string; nameTranslations?: TranslationMap; options: VariantOption[] };
export type AddonOption   = { id: string; name: string; nameTranslations?: TranslationMap; priceDelta: number; isAvailable: boolean; allergenIds?: string[]; additiveIds?: string[]; category?: string };
export type AddonGroup    = { id: string; name: string; nameTranslations?: TranslationMap; minSelectable: number; maxSelectable: number; options: AddonOption[] };

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
  refs: GetReferenceListsApiResponse | undefined;
  /** Present only while the translation tab is active: the fields then edit this language's text. */
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
  refs, translation,
}: Step4Props) {
  const { t } = useTranslation();
  if (translation) {
    const { language } = translation;
    const kinds = [['variant', variantGroups], ['addon', addonGroups]] as const;
    const shown = kinds.flatMap(([kind, groups]) => groups.map((g) => ({ kind, g }))).filter(({ g }) => hasOriginalText(g.name) || g.options.some((o) => hasOriginalText(o.name)));
    if (shown.length === 0) return <p className="text-sm text-gray-400">{t('translationFields.nothingToTranslate')}</p>;
    return (
      <div className="space-y-4">
        {kinds.map(([kind, groups]) => {
          const visible = groups.filter((g) => hasOriginalText(g.name) || g.options.some((o) => hasOriginalText(o.name)));
          if (visible.length === 0) return null;
          return (
            <MyCard key={kind} className="p-4 space-y-3">
              <span className="text-sm font-medium text-gray-700">{t(kind === 'variant' ? 'variants.title' : 'addons.title')}</span>
              {visible.map((group) => (
                <div key={group.id} className="border border-gray-200 rounded-xl p-3 space-y-3">
                  <TranslationField
                    original={group.name}
                    value={group.nameTranslations?.[language] ?? ''}
                    onChange={(v) => translation.setGroup(kind, group.id, v)}
                  />
                  <div className="space-y-2">
                    {group.options.map((option) => (
                      <TranslationField
                        key={option.id}
                        original={option.name}
                        value={option.nameTranslations?.[language] ?? ''}
                        onChange={(v) => translation.setOption(kind, group.id, option.id, v)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </MyCard>
          );
        })}
      </div>
    );
  }
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
                <div key={option.id} className="space-y-1">
                <div className="flex items-center gap-2">
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
                {option.priceDelta < 0 && <p role="alert" className="text-xs text-red-600">{t('optionGroups.priceInvalid')}</p>}
                <OptionFoodInfoField allergenIds={option.allergenIds ?? []} additiveIds={option.additiveIds ?? []} refs={refs} onChange={(p) => updateVariantOption(group.id, option.id, p)} />
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
                <div key={option.id} className="space-y-1">
                <div className="flex items-center gap-2">
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
                <MyInput
                  aria-label={t('addons.category')}
                  placeholder={t('addons.categoryPlaceholder')}
                  maxLength={40}
                  value={option.category ?? ''}
                  onChange={(e) => updateAddonOption(group.id, option.id, { category: e.target.value })}
                />
                {option.priceDelta < 0 && <p role="alert" className="text-xs text-red-600">{t('optionGroups.priceInvalid')}</p>}
                <OptionFoodInfoField allergenIds={option.allergenIds ?? []} additiveIds={option.additiveIds ?? []} refs={refs} onChange={(p) => updateAddonOption(group.id, option.id, p)} />
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
              <label htmlFor="schedule-start-date" className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleStartDate')}</label>
              <input
                id="schedule-start-date"
                type="date"
                value={schedule.startDate}
                onChange={(e) => setSchedule((s) => ({ ...s, startDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
              />
            </div>
            {!noEndDate && (
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="schedule-end-date" className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleEndDate')}</label>
                <input
                  id="schedule-end-date"
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
                <label htmlFor="schedule-start-time" className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleStartTime')}</label>
                <input
                  id="schedule-start-time"
                  type="time"
                  value={schedule.startTime}
                  onChange={(e) => setSchedule((s) => ({ ...s, startTime: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                />
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label htmlFor="schedule-end-time" className="text-xs text-gray-500 uppercase tracking-wide">{t('products.scheduleEndTime')}</label>
                <input
                  id="schedule-end-time"
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
