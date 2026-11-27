import { useEffect, type RefObject } from 'react';
import { Link } from 'react-router-dom';

interface Props {
  id: string;
  message: string;
  onDismiss: () => void;
  /** The whole widget (trigger + tooltip). A pointerdown inside it is not "outside": the trigger's own click handler toggles. */
  containerRef: RefObject<HTMLElement | null>;
  /** Optional link under the message (needs `linkLabel` too). A real <a>, so Tab + Enter work. */
  linkTo?: string;
  linkLabel?: string;
}

/**
 * A small popup shown on click/keyboard activation of a trigger, not on hover. `role="status"` makes it
 * a polite live region, so it is announced as it mounts. It never takes focus. Dismisses on Escape or a
 * pointerdown outside `containerRef`. Render it inside a `relative` wrapper that `containerRef` points at.
 */
export function ClickTooltip({ id, message, onDismiss, containerRef, linkTo, linkLabel }: Props) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      onDismiss();
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [onDismiss, containerRef]);

  return (
    <div
      id={id}
      role="status"
      className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-lg bg-ink px-3 py-2 text-[12px] font-medium leading-snug text-white shadow-lg"
    >
      {message}
      {linkTo && linkLabel && (
        <Link
          to={linkTo}
          className="mt-1.5 block border-t border-white/25 pt-1.5 font-semibold text-white underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
