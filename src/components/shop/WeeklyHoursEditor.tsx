import { useTranslation } from 'react-i18next';
import type { WeekDayKey, WeeklyHoursDto } from '../../services/ordersApi';
import { WEEK_DAYS } from '../../features/shops/kitchenSettings';

interface Props {
  week: WeeklyHoursDto;
  onChange: (week: WeeklyHoursDto) => void;
  emptyLabel: string;
  removeLabel: string;
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

export function WeeklyHoursEditor({ week, onChange, emptyLabel, removeLabel }: Props) {
  const { t } = useTranslation();

  const changeWindow = (day: WeekDayKey, index: number, field: 'open' | 'close', value: string) => {
    onChange({
      ...week,
      [day]: week[day].map((w, i) => (i === index ? { ...w, [field]: value } : w)),
    });
  };

  return (
    <div className="space-y-3">
      {WEEK_DAYS.map((day) => (
        <div key={day} className="flex flex-wrap items-start gap-3">
          <span className="w-28 pt-2 text-sm font-medium text-gray-800">{t(DAY_LABEL_KEYS[day])}</span>
          <div className="space-y-2">
            {week[day].length === 0 && <span className="block pt-2 text-sm text-gray-500">{emptyLabel}</span>}
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
                  aria-label={removeLabel}
                  className="px-2 text-gray-500 hover:text-gray-900"
                  onClick={() => onChange({ ...week, [day]: week[day].filter((_, j) => j !== i) })}
                >
                  ×
                </button>
              </div>
            ))}
            {week[day].length < MAX_WINDOWS_PER_DAY && (
              <button
                type="button"
                className="text-sm font-medium text-gray-900 underline"
                onClick={() => onChange({ ...week, [day]: [...week[day], { open: '09:00', close: '18:00' }] })}
              >
                {t('shops.ohAddSlot')}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
