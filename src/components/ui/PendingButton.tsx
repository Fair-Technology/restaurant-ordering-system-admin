import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';

interface PendingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** A request for this button is in flight */
  isPending: boolean;
  /**
   * How long the request must last before the spinner glyph appears. A request that answers faster
   * than this shows the dimmed button only — never a spinner that flashes for one frame.
   */
  spinnerDelayMs?: number;
  children: ReactNode;
}

/**
 * A button whose request can be slow: while `isPending` it is disabled, dimmed, shows a progress
 * cursor and `aria-busy="true"` at once (that is the part the staffer must see immediately), and it
 * puts a spinner next to the label once the request has lasted longer than `spinnerDelayMs`.
 * Further clicks are ignored: the button is disabled and the handler is swallowed.
 */
export function PendingButton({
  isPending,
  spinnerDelayMs = 120,
  children,
  className = '',
  disabled,
  onClick,
  style,
  type = 'button',
  ...rest
}: PendingButtonProps) {
  const [spinning, setSpinning] = useState(false);
  useEffect(() => {
    if (!isPending) return;
    const id = setTimeout(() => setSpinning(true), spinnerDelayMs);
    return () => {
      clearTimeout(id);
      setSpinning(false);
    };
  }, [isPending, spinnerDelayMs]);

  return (
    <button
      {...rest}
      type={type}
      // Inline: a caller's own `disabled:cursor-not-allowed` would otherwise beat the class below.
      style={isPending ? { ...style, cursor: 'progress' } : style}
      disabled={disabled || isPending}
      aria-busy={isPending ? true : undefined}
      data-pending={isPending ? 'true' : undefined}
      onClick={(e) => {
        if (isPending) {
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        onClick?.(e);
      }}
      className={`inline-flex items-center justify-center gap-1.5 ${className}${isPending ? ' cursor-progress opacity-50' : ''}`}
    >
      {isPending && spinning && (
        <span
          data-pending-spinner=""
          aria-hidden="true"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  );
}
