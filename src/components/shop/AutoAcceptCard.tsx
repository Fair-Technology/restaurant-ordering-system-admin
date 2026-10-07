import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ShopResponse } from '../../services/api';
import { useUpdateOrderSettingsMutation } from '../../services/ordersApi';
import type { WeekDayKey, WeeklyHoursDto } from '../../services/ordersApi';
import {
  AUTO_ACCEPT_CHOICES,
  WEEK_DAYS,
  autoAcceptBody,
  autoAcceptChoiceOf,
  weekOf,
  type AutoAcceptChoice,
} from '../../features/shops/kitchenSettings';
import { MyCard } from '../ui/MyCard';
import { MyButton } from '../ui/MyButton';

interface Props {
  shop: ShopResponse;
  onRefetch: () => void;
}

const DAY_LABEL_KEYS: Record<WeekDayKey, string> = {
  mon: 'shops.ohMon',
  tue: 'shops.ohTue',
  wed: 'shops.ohWed',
  thu: 'shops.ohThu',
  fri: 'shops.ohFri',
  sat: 'shops.ohSat',
  sun: 'shops.ohSun',
};

const MAX_WINDOWS_PER_DAY = 4;

export function AutoAcceptCard({ shop, onRefetch }: Props) {
  const { t } = useTranslation();
  const [choiceState, setChoiceState] = useState<AutoAcceptChoice | null>(null);
  const [weekState, setWeekState] = useState<WeeklyHoursDto | null>(null);
  const [message, setMessage] = useState<{ kind: 'saved' | 'failed'; text: string } | null>(null);
  const [updateOrderSettings, { isLoading }] = useUpdateOrderSettingsMutation();

  const choice = choiceState ?? autoAcceptChoiceOf(shop.orderSettings);
  const week = weekState ?? weekOf(shop.orderSettings?.autoAcceptHours);

  const changeWindow = (day: WeekDayKey, index: number, field: 'open' | 'close', value: string) => {
    setWeekState({
      ...week,
      [day]: week[day].map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    });
  };

  const handleSave = async () => {
    if (!shop.id) return;
    setMessage(null);
    try {
      await updateOrderSettings({ shopId: shop.id, body: autoAcceptBody(choice, week) }).unwrap();
      setChoiceState(null);
      setWeekState(null);
      onRefetch();
      setMessage({ kind: 'saved', text: t('shops.autoAcceptSaved') });
    } catch {
      setMessage({ kind: 'failed', text: t('shops.autoAcceptFailed') });
    }
  };

  return (
    <MyCard className="p-6 space-y-4" id="auto-accept">
      <h2 className="text-base font-semibold text-gray-900">{t('shops.autoAcceptTitle')}</h2>
      <p className="text-sm text-gray-600">{t('shops.autoAcceptHelp')}</p>
      <div className="space-y-2">
        {AUTO_ACCEPT_CHOICES.map((c) => (
          <label key={c} className="flex items-center gap-3 text-sm text-gray-800">
            <input
              type="radio"
              name="autoAcceptChoice"
              className="h-4 w-4"
              checked={choice === c}
              onChange={() => setChoiceState(c)}
            />
            <span>{t(`shops.autoAcceptChoice.${c}`)}</span>
          </label>
        ))}
      </div>
      {choice === 'scheduled' && (
        <div className="space-y-3">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="flex flex-wrap items-start gap-3">
              <span className="w-28 pt-2 text-sm font-medium text-gray-800">{t(DAY_LABEL_KEYS[day])}</span>
              <div className="space-y-2">
                {week[day].length === 0 && (
                  <span className="block pt-2 text-sm text-gray-500">{t('shops.autoAcceptNoTimes')}</span>
                )}
                {week[day].map((w, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      step={60}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      value={w.open}
                      onChange={(e) => changeWindow(day, i, 'open', e.target.value)}
                    />
                    <span className="text-sm text-gray-600">{t('shops.ohTo')}</span>
                    <input
                      type="time"
                      step={60}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                      value={w.close}
                      onChange={(e) => changeWindow(day, i, 'close', e.target.value)}
                    />
                    <button
                      type="button"
                      aria-label={t('shops.autoAcceptRemove')}
                      className="px-2 text-gray-500 hover:text-gray-900"
                      onClick={() => setWeekState({ ...week, [day]: week[day].filter((_, j) => j !== i) })}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {week[day].length < MAX_WINDOWS_PER_DAY && (
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-900 underline"
                    onClick={() => setWeekState({ ...week, [day]: [...week[day], { open: '09:00', close: '18:00' }] })}
                  >
                    {t('shops.ohAddSlot')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {message && (
        <p className={`text-sm ${message.kind === 'saved' ? 'text-green-700' : 'text-red-600'}`}>{message.text}</p>
      )}
      <div className="border-t border-gray-200 pt-4">
        <MyButton onClick={handleSave} disabled={isLoading}>
          {t('shops.autoAcceptSave')}
        </MyButton>
      </div>
    </MyCard>
  );
}
