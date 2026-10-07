import type { ShopResponse } from '../../services/api';
import type { UpdateOrderSettingsBody, WeekDayKey, WeeklyHoursDto } from '../../services/ordersApi';

export const WEEK_DAYS: readonly WeekDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const AUTO_ACCEPT_CHOICES = ['always', 'scheduled', 'never'] as const;
export type AutoAcceptChoice = (typeof AUTO_ACCEPT_CHOICES)[number];

type StoredSettings = ShopResponse['orderSettings'];

export function autoAcceptChoiceOf(s: StoredSettings): AutoAcceptChoice {
  if (s?.autoAccept === false) return 'never';
  return s?.autoAcceptHours ? 'scheduled' : 'always';
}

export function weekOf(h: Partial<WeeklyHoursDto> | null | undefined): WeeklyHoursDto {
  const out = {} as WeeklyHoursDto;
  for (const d of WEEK_DAYS) out[d] = [...(h?.[d] ?? [])];
  return out;
}

export function autoAcceptBody(choice: AutoAcceptChoice, week: WeeklyHoursDto): UpdateOrderSettingsBody {
  if (choice === 'never') return { autoAccept: false };
  if (choice === 'always') return { autoAccept: true, autoAcceptHours: null };
  return { autoAccept: true, autoAcceptHours: week };
}

export interface KitchenTiming {
  collection: number;
  dineIn: number;
  lastOrdersMinutes: number | null;
  busyExtraMinutes: number;
}

export function kitchenTimingOf(s: StoredSettings): KitchenTiming {
  return {
    collection: s?.prepMinutes?.collection ?? 20,
    dineIn: s?.prepMinutes?.dine_in ?? 20,
    lastOrdersMinutes: s?.lastOrdersMinutes ?? null,
    busyExtraMinutes: s?.busyExtraMinutes ?? 20,
  };
}

export function kitchenTimingBody(k: KitchenTiming): UpdateOrderSettingsBody {
  return {
    prepMinutes: { collection: k.collection, dine_in: k.dineIn },
    lastOrdersMinutes: k.lastOrdersMinutes,
    busyExtraMinutes: k.busyExtraMinutes,
  };
}
