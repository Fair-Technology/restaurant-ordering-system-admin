import { useTranslation } from 'react-i18next';
import { Ban, Undo2 } from 'lucide-react';
import { PendingButton } from '../ui/PendingButton';

interface Props {
  /** The dish's name, for the screen-reader label. */
  name: string;
  /** True while the dish is hidden for the rest of today. */
  soldOut: boolean;
  busy?: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * One-tap "sold out today" control: hides a dish for the rest of the service day
 * (or puts it back). Stops the click so it never opens the row it sits in.
 */
export function SoldOutTodayButton({ name, soldOut, busy, onToggle, className = '' }: Props) {
  const { t } = useTranslation();
  const label = soldOut ? t('dishes.soldOutBackFor', { name }) : t('dishes.soldOutFor', { name });
  return (
    <PendingButton
      type="button"
      role="switch"
      aria-checked={soldOut}
      aria-label={label}
      title={label}
      isPending={!!busy}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`inline-flex h-7 flex-shrink-0 items-center gap-1! rounded-full px-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
        soldOut
          ? 'border border-[#cfe3d2] bg-[#f1f8f1] text-[#2f6b3f] hover:bg-[#e6f1e7]'
          : 'border border-dashed border-[#d6cdc4] bg-transparent text-[#8a8077] hover:border-[#b9ada2] hover:bg-cream/60 hover:text-[#6b6058]'
      } ${className}`}
    >
      {soldOut ? <Undo2 size={13} aria-hidden="true" /> : <Ban size={13} aria-hidden="true" />}
      <span className="hidden min-[480px]:inline">{soldOut ? t('dishes.soldOutBack') : t('dishes.soldOutToday')}</span>
    </PendingButton>
  );
}
