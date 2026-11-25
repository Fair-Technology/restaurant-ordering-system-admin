import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';

interface DrawerProps {
  /** aria-label of the dialog. */
  label: string;
  /** Called for backdrop click and Escape. */
  onClose: () => void;
  children: ReactNode;
  /** Width classes applied from the `sm:` breakpoint up (full-screen below). */
  widthClassName?: string;
  /** Background/padding classes for the panel shell. */
  panelClassName?: string;
}

/**
 * Right-hand slide-in drawer: Escape closes, Tab is trapped, focus returns to the opener, and body
 * scroll is locked while mounted. The close button is drawn by the content, not the drawer.
 */
export function Drawer({
  label,
  onClose,
  children,
  widthClassName = 'sm:w-[560px]',
  panelClassName = 'bg-white',
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef: panelRef });

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-ink/30" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`animate-drawer-in-right flex h-full w-full flex-col outline-none ${widthClassName} ${panelClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
