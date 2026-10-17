import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useUpdateShopMutation } from '../../services/api';
import { PAUSE_DURATIONS, isOfflineBySuperadminError, type OrdersPauseDuration } from '../../features/shops/shopStatus';
import { useToast } from '../../contexts/ToastContext';
import { MyButton } from '../ui/MyButton';

interface Props {
  shopId: string;
  onClose: () => void;
  onPaused: () => void;
}

/** Asks how long to pause new orders for; the server works out the end time from the choice. */
export function PauseOrdersDialog({ shopId, onClose, onPaused }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const [choice, setChoice] = useState<OrdersPauseDuration>('minutes_30');

  const handleConfirm = async () => {
    try {
      await updateShop({ shopId, updateShopRequest: { ordersPaused: true, ordersPausedFor: choice } }).unwrap();
      onPaused();
    } catch (err) {
      toast.error(isOfflineBySuperadminError(err) ? t('nav.offlineBySuperadminToast') : t('shops.statusFailedToSave'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{t('shops.pauseOrdersTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600">{t('shops.pauseOrdersText')}</p>
          <div role="radiogroup" className="space-y-2">
            {PAUSE_DURATIONS.map((d) => (
              <label key={d} className="flex items-center gap-2.5 text-sm text-gray-800 cursor-pointer">
                <input
                  type="radio"
                  name="pause-duration"
                  value={d}
                  checked={choice === d}
                  onChange={() => setChoice(d)}
                  disabled={isLoading}
                />
                {t(`shops.pauseFor.${d}`)}
              </label>
            ))}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <MyButton variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </MyButton>
          <MyButton size="sm" onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? t('shops.pauseOrdersBusy') : t('shops.pauseOrdersConfirm')}
          </MyButton>
        </div>
      </div>
    </div>
  );
}
