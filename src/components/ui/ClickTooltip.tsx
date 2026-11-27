import { useEffect, type RefObject } from 'react';

interface Props {
  id: string;
  message: string;
  onDismiss: () => void;
  /** The whole widget (trigger + tooltip). A pointerdown inside it is not "outside": the trigger's own click handler toggles. */
  containerRef: RefObject<HTMLElement | null>;
}

/**
 * A small popup shown on click/keyboard activation of a trigger, not on hover. `role="status"` makes it
 * a polite live region, so it is announced as it mounts. It never takes focus. Dismisses on Escape or a
 * pointerdown outside `containerRef`. Render it inside a `relative` wrapper that `containerRef` points at.
 */
export function ClickTooltip({ id, message, onDismiss, containerRef }: Props) {
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
    </div>
  );
}
