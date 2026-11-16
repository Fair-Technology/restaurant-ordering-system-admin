import { PendingButton } from './PendingButton';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  /** Id of the element that names the switch. */
  labelledBy: string;
  describedBy?: string;
  /** A request for this switch is in flight: renders the shared PendingButton */
  isPending?: boolean;
}

/** An on/off switch. A button, so Space and Enter flip it from the keyboard. */
export function MySwitch({ checked, onChange, disabled, labelledBy, describedBy, isPending }: Props) {
  const className = `relative mt-0.5 inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
    checked ? 'bg-[#2f8a4c]' : 'bg-[#d6cdc4]'
  } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`;
  const knob = (
    <span
      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-5' : 'translate-x-0.5'
      }`}
    />
  );

  if (isPending) {
    // An in-flow spinner would shove the knob off its position, so the spinner is drawn here,
    // absolutely centred over a wrapper that has the knob's exact box and carries its travel.
    return (
      <PendingButton
        isPending
        spinner={false}
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={className}
      >
        <span
          className={`relative inline-block h-5 w-5 transform transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        >
          <span className="block h-5 w-5 rounded-full bg-white shadow" />
          <span
            data-pending-spinner=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 -ml-[7px] -mt-[7px] h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent text-ink"
          />
        </span>
      </PendingButton>
    );
  }
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={className}
    >
      {knob}
    </button>
  );
}
