import type { ReactNode } from 'react';

interface Props {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Accessible name when there is no visible `children` label. */
  label?: string;
  disabled?: boolean;
  /** Visible text beside the track; the whole row is the 44px-tall switch target. */
  children?: ReactNode;
  className?: string;
}

/** The dish screen's switch: a 48×28 pill track with a knob, `role="switch"`, a 44px-tall hit area. Ink when on, grey when off. */
export function PillSwitch({ checked, onChange, label, disabled, children, className = '' }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={children ? undefined : label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`inline-flex h-11 items-center gap-2.5 rounded-full text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb] disabled:opacity-50 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-7 w-12 flex-none items-center rounded-full p-[3px] transition-colors ${checked ? 'justify-end bg-ink' : 'justify-start bg-control'}`}
      >
        <span className="h-[22px] w-[22px] rounded-full bg-white" />
      </span>
      {children}
    </button>
  );
}
