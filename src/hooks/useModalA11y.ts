import { useEffect } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

interface UseModalA11yOptions {
  onClose: () => void;
  /** Ref to the dialog's outer element (must be tabIndex={-1} focusable). */
  containerRef: RefObject<HTMLElement | null>;
  /** Skip Escape-to-close while true (e.g. a nested confirm is up, or a save is in flight). */
  disabled?: boolean;
}

const FOCUSABLE = 'button:not([disabled]), [tabindex="0"], input:not([disabled]), a[href]';

/**
 * Shared modal accessibility: focus the dialog on open, return focus to the opener on close,
 * Escape closes, Tab/Shift+Tab are trapped inside. Returns an onKeyDown handler for the
 * dialog element (scoped to the dialog rather than `document`, so global listeners are untouched).
 */
export function useModalA11y({ onClose, containerRef, disabled = false }: UseModalA11yOptions) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    containerRef.current?.focus();
    // The opener may have been removed from the DOM by the time we close.
    return () => previous?.focus?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per mount; the ref object is stable
  }, []);

  return (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!disabled) onClose();
      return;
    }
    const container = containerRef.current;
    if (e.key !== 'Tab' || !container) return;
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
}
