import { PendingButton } from '../ui/PendingButton';

/**
 * The on/off toggle-knob switch shown on dish and combo rows. The button is a 44×44 touch target;
 * the visible track stays 40×24.
 */
export function AvailabilitySwitch({
  available,
  pending,
  ariaLabel,
  onToggle,
}: {
  available: boolean;
  pending: boolean;
  ariaLabel: string;
  onToggle: () => void;
}) {
  return (
    <PendingButton
      type="button"
      role="switch"
      aria-checked={available}
      aria-label={ariaLabel}
      isPending={pending}
      spinner={false}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="group flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full focus:outline-none disabled:opacity-50"
    >
      <span
        className={`relative h-6 w-10 rounded-full transition-colors group-focus-visible:ring-2 group-focus-visible:ring-ink group-focus-visible:ring-offset-2 ${
          available ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
        }`}
      >
        <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all ${available ? 'right-[3px]' : 'left-[3px]'}`}>
          {pending && (
            <span
              data-pending-spinner=""
              aria-hidden="true"
              className="absolute inset-0 m-auto h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-ink"
            />
          )}
        </span>
      </span>
    </PendingButton>
  );
}
