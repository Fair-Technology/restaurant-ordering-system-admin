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
      className={`inline-flex min-h-12 items-center gap-1.5 rounded-full border px-4 text-[13px] font-bold transition-colors disabled:opacity-50 ${
        busy.active ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
      }`}
    >
      {t(busy.active ? 'orders.busyOn' : 'orders.busyOff', { minutes: busy.extraMinutes })}
    </button>
  );
}
