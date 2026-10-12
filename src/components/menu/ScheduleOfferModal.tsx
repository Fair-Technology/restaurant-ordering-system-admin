import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { ProductResponse } from '../../services/api';
import { useUpdateProductMutation } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { MyButton } from '../ui/MyButton';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Step5Schedule, type ScheduleState } from '../../pages/ProductWizardSteps';
import { initialScheduleDays } from '../../features/menu/foodInfo';

// ── Schedule + Offer modal ─────────────────────────────────────────────────────

export function ScheduleOfferModal({
  product,
  currencySymbol,
  onClose,
}: {
  product: ProductResponse;
  currencySymbol: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateProduct, { isLoading: isSaving }] = useUpdateProductMutation();

  const [scheduleEnabled, setScheduleEnabled] = useState(!!product.schedule);
  const [timeWindowEnabled, setTimeWindowEnabled] = useState(
    !!(product.schedule?.startTime || product.schedule?.endTime),
  );
  const [noEndDate, setNoEndDate] = useState(!product.schedule?.endDate);
  const [schedule, setSchedule] = useState<ScheduleState>({
    startDate: product.schedule?.startDate ?? '',
    endDate: product.schedule?.endDate ?? '',
    startTime: product.schedule?.startTime ?? '',
    endTime: product.schedule?.endTime ?? '',
    daysOfWeek: initialScheduleDays(product.schedule?.daysOfWeek),
    offerEnabled: !!(product.schedule?.offerPrice),
    offerPrice: product.schedule?.offerPrice ?? 0,
    offerLabel: product.schedule?.offerLabel ?? '',
  });
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [offerError, setOfferError] = useState<string | null>(null);

  const validate = () => {
    let valid = true;
    if (scheduleEnabled) {
      const endDateInvalid = !noEndDate && schedule.endDate && schedule.endDate < schedule.startDate;
      const endTimeInvalid = timeWindowEnabled && schedule.startTime && schedule.endTime && schedule.endTime <= schedule.startTime;
      if (schedule.daysOfWeek.length === 0) {
        setScheduleError(t('products.scheduleDaysRequired'));
        valid = false;
      } else if (endDateInvalid || endTimeInvalid) {
        setScheduleError(t('products.scheduleInvalid'));
        valid = false;
      } else setScheduleError(null);
    } else {
      setScheduleError(null);
    }
    if (scheduleEnabled && schedule.offerEnabled) {
      if (schedule.offerPrice <= 0) { setOfferError(t('products.offerPriceRequired')); valid = false; }
      else if (schedule.offerPrice >= (product.price ?? 0)) { setOfferError(t('products.offerPriceMustBeLess')); valid = false; }
      else setOfferError(null);
    } else {
      setOfferError(null);
    }
    return valid;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const schedulePayload = scheduleEnabled ? {
      startDate: schedule.startDate,
      endDate: noEndDate ? null : (schedule.endDate || null),
      startTime: timeWindowEnabled ? (schedule.startTime || null) : null,
      endTime: timeWindowEnabled ? (schedule.endTime || null) : null,
      daysOfWeek: schedule.daysOfWeek,
      offerPrice: schedule.offerEnabled ? schedule.offerPrice : null,
      offerLabel: schedule.offerEnabled ? (schedule.offerLabel || null) : null,
    } : null;
    try {
      await updateProduct({
        productId: product.id!,
        updateProductRequest: { shopId: product.shopId!, schedule: schedulePayload },
      }).unwrap();
      toast.success(t('products.saved'));
      onClose();
    } catch {
      // error shown via toast by RTK middleware
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-gray-200">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t('products.scheduleModalTitle')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{product.name}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <p className="text-xs text-gray-400 mb-4">{t('products.scheduleModalSubtitle')}</p>
            <Step5Schedule
              scheduleEnabled={scheduleEnabled}
              setScheduleEnabled={setScheduleEnabled}
              timeWindowEnabled={timeWindowEnabled}
              setTimeWindowEnabled={setTimeWindowEnabled}
              noEndDate={noEndDate}
              setNoEndDate={setNoEndDate}
              schedule={schedule}
              setSchedule={setSchedule}
              scheduleError={scheduleError}
            />

            {/* Special Price section */}
            {scheduleEnabled && (
              <div className="mt-4 border border-gray-200 rounded-xl p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={schedule.offerEnabled}
                    onChange={(e) => setSchedule((s) => ({ ...s, offerEnabled: e.target.checked }))}
                    className="accent-gray-900"
                  />
                  <span className="text-sm font-medium text-gray-700">{t('products.offerPriceToggle')}</span>
                </label>
                {schedule.offerEnabled && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <CurrencyInput
                        label={t('products.offerPrice', { symbol: currencySymbol })}
                        valueCents={schedule.offerPrice}
                        onChange={(cents) => setSchedule((s) => ({ ...s, offerPrice: cents }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">
                        {t('products.offerLabel')}
                      </label>
                      <input
                        type="text"
                        value={schedule.offerLabel}
                        onChange={(e) => setSchedule((s) => ({ ...s, offerLabel: e.target.value }))}
                        placeholder={t('products.offerLabelPlaceholder')}
                        maxLength={50}
                        className="w-full border border-gray-200 rounded-lg bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
                      />
                    </div>
                    {offerError && <p className="text-xs text-red-500">{offerError}</p>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-6 py-4 border-t border-gray-200">
            <MyButton type="button" variant="secondary" onClick={onClose}>{t('products.cancel')}</MyButton>
            <div className="flex-1" />
            <MyButton type="button" disabled={isSaving} onClick={handleSave}>
              {isSaving ? t('products.saving') : t('products.saveChanges')}
            </MyButton>
          </div>
        </div>
      </div>
    </>
  );
}
