import type { MenuLanguage, ProductSchedule, TranslationMap } from '../../services/api';

export function buildSchedulePayload(input: {
  enabled: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  timeWindowEnabled: boolean;
  noEndDate: boolean;
  offerEnabled: boolean;
  offerPrice: number;
  offerLabel: string;
  extraLanguage?: MenuLanguage;
  offerLabelTranslations?: TranslationMap;
}): ProductSchedule | null {
  if (!input.enabled) return null;
  const payload: ProductSchedule = {
    startDate: input.startDate,
    endDate: input.noEndDate ? null : (input.endDate || null),
    startTime: input.timeWindowEnabled ? (input.startTime || null) : null,
    endTime: input.timeWindowEnabled ? (input.endTime || null) : null,
    daysOfWeek: input.daysOfWeek,
    offerPrice: input.offerEnabled ? input.offerPrice : null,
    offerLabel: input.offerEnabled ? (input.offerLabel || null) : null,
  };
  // Absent map is normalised to {} by the backend, so clearing the label clears the translations.
  if (input.offerEnabled && input.extraLanguage && input.offerLabel.trim() !== '') {
    payload.offerLabelTranslations = input.offerLabelTranslations;
  }
  return payload;
}
