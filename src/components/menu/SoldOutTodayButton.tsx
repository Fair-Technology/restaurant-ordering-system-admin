import { useTranslation } from 'react-i18next';
import { Ban, Undo2 } from 'lucide-react';

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
  return (
    <button
      type="button"
      role="switch"
      aria-checked={soldOut}
      aria-label={soldOut ? t('dishes.soldOutBackFor', { name }) : t('dishes.soldOutFor', { name })}
      disabled={busy}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className={`inline-flex h-7 flex-shrink-0 items-center gap-1 rounded-full border px-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:opacity-50 ${
        soldOut
          ? 'border-[#f1dfae] bg-[#fff6e0] text-[#8a5a00] hover:bg-[#fdf1dc]'
          : 'border-[#e3d9ce] bg-white text-[#6b6058] hover:bg-cream'
      } ${className}`}
    >
      {soldOut ? <Undo2 size={13} aria-hidden="true" /> : <Ban size={13} aria-hidden="true" />}
      {soldOut ? t('dishes.soldOutBack') : t('dishes.soldOutToday')}
    </button>
  );
}
