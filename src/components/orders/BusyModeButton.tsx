import { useTranslation } from 'react-i18next';
import { useSetBusyModeMutation, type BusyStateDto } from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';

interface Props {
  shopId: string;
  busy: BusyStateDto | undefined;
}

export function BusyModeButton({ shopId, busy }: Props) {
  const { t } = useTranslation();
  const toast = useToast();
  const [setBusyMode, { isLoading }] = useSetBusyModeMutation();

  // An older backend does not send busy mode, so there is nothing to switch
  if (!busy) return null;

  const toggle = async () => {
    try {
      await setBusyMode({ shopId, on: !busy.active }).unwrap();
    } catch {
      toast.error(t('orders.busyFailed'));
    }
  };

  return (
    <button
      type="button"
      aria-pressed={busy.active}
      disabled={isLoading}
      onClick={() => void toggle()}
      className={`min-h-12 rounded-xl px-4 text-sm font-semibold border ${
        busy.active ? 'bg-amber-500 border-amber-600 text-white' : 'bg-white border-amber-400 text-amber-800'
      }`}
    >
      {t(busy.active ? 'orders.busyOn' : 'orders.busyOff', { minutes: busy.extraMinutes })}
    </button>
  );
}
