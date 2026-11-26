import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import type { MenuLanguage } from '../../services/api';
import { PendingButton } from '../ui/PendingButton';

/** Visible keyboard focus used across the wide editors. */
export const editorFocusRing = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563eb]';

export type EditorTone = 'ok' | 'warn' | 'muted';
const toneText: Record<EditorTone, string> = { ok: 'text-ok', warn: 'text-warn', muted: 'text-muted' };

export interface EditorSection<K extends string = string> {
  key: K;
  label: string;
  status: { text: string; tone: EditorTone };
}

interface EditorShellProps<K extends string> {
  onClose: () => void;
  closeLabel: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Right side of the header: the on-the-menu switch, the language toggle. */
  headerExtra?: ReactNode;
  navLabel: string;
  sections: EditorSection<K>[];
  activeSection: K;
  onSectionChange: (key: K) => void;
  /** Extra content under the section buttons in the nav (e.g. a checklist). */
  navExtra?: ReactNode;
  /** Content drawn above the active section's content, inside the same scroll area. */
  children: ReactNode;
  /** The `<footer>` content; omit to draw no footer. */
  footer?: ReactNode;
}

/**
 * The wide slide-over editor shell shared by the dish and combo editors: header (close button, title,
 * subtitle, extra controls), a section nav with a status line per section, the active section, and a footer.
 */
export function EditorShell<K extends string>({
  onClose, closeLabel, title, subtitle, headerExtra, navLabel, sections, activeSection, onSectionChange, navExtra, children, footer,
}: EditorShellProps<K>) {
  const mainRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0;
  }, [activeSection]);
  const active = sections.find((s) => s.key === activeSection);

  return (
    <div className="flex min-h-0 flex-1 flex-col text-ink">
      <header className="flex min-h-[72px] flex-none flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#e6d9c6] py-2 pl-5 pr-4 sm:pr-7">
        <button
          type="button"
          onClick={onClose}
          aria-label={closeLabel}
          className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full bg-sand hover:bg-[#ebe4dc] ${editorFocusRing}`}
        >
          <X size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
          <h1 className="truncate text-[22px] font-bold leading-7">{title}</h1>
          {subtitle && <span className="truncate text-[13px] leading-[18px] text-muted">{subtitle}</span>}
        </div>
        {headerExtra && <div className="flex flex-none flex-wrap items-center gap-x-6 sm:ml-auto">{headerExtra}</div>}
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <nav
          aria-label={navLabel}
          className="flex flex-none gap-1.5 overflow-x-auto border-b border-[#e6d9c6] p-3 md:w-[236px] md:flex-col md:overflow-visible md:border-b-0 md:border-r md:px-4 md:py-5"
        >
          {sections.map((s) => (
            <button
              key={s.key}
              type="button"
              aria-current={s.key === activeSection ? 'page' : undefined}
              onClick={() => onSectionChange(s.key)}
              className={`flex min-h-[60px] flex-none flex-col items-start justify-center gap-0.5 rounded-[14px] border px-3.5 py-2 text-left ${editorFocusRing} ${
                s.key === activeSection ? 'border-line bg-cream shadow-[inset_3px_0_0_#1f1a17]' : 'border-transparent hover:bg-cream/60'
              }`}
            >
              <span className="text-[15px] font-semibold leading-5">{s.label}</span>
              <span className={`text-[13px] font-medium leading-[18px] ${toneText[s.status.tone]}`}>{s.status.text}</span>
            </button>
          ))}
          {navExtra}
        </nav>

        <section ref={mainRef} aria-label={active?.label} className="min-w-0 flex-1 overflow-y-auto px-6 pb-10 pt-7 md:px-9">
          <div className="flex max-w-[720px] flex-col gap-7">{children}</div>
        </section>
      </div>

      {footer && (
        <footer className="flex min-h-[72px] flex-none flex-wrap items-center gap-3 border-t border-[#e6d9c6] px-4 py-2 sm:px-7">{footer}</footer>
      )}
    </div>
  );
}

/** The inline German/English pill toggle in the editor header. Render only when the shop has a second language. */
export function LanguageToggle({
  languages, active, onChange, groupLabel, langName, renderBadge,
}: {
  languages: MenuLanguage[];
  active: MenuLanguage;
  onChange: (l: MenuLanguage) => void;
  groupLabel: string;
  langName: (l: MenuLanguage) => string;
  renderBadge?: (l: MenuLanguage) => ReactNode;
}) {
  return (
    <div role="group" aria-label={groupLabel} className="flex gap-0.5 rounded-full bg-sand p-[3px]">
      {languages.map((l) => {
        const on = l === active;
        return (
          <button
            key={l}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(l)}
            className={`inline-flex h-[38px] items-center gap-2 rounded-full px-[18px] text-sm font-semibold ${editorFocusRing} ${on ? 'bg-ink text-white' : 'text-ink'}`}
          >
            {langName(l)}
            {renderBadge?.(l)}
          </button>
        );
      })}
    </div>
  );
}

/** The saved / unsaved dot + text in the footer. */
export function SaveStatus({ dirty, unsavedText, savedText }: { dirty: boolean; unsavedText: string; savedText: string }) {
  return (
    <span role="status" className={`flex items-center gap-2 text-sm font-semibold leading-5 ${dirty ? 'text-warn' : 'text-ok'}`}>
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dirty ? 'bg-warn' : 'bg-ok'}`} />
      {dirty ? unsavedText : savedText}
    </span>
  );
}

/** Discard + Save buttons of an edit footer (both disabled until something changed). */
export function DiscardSaveButtons({
  dirty, isSaving, onDiscard, onSave, discardLabel, saveLabel,
}: {
  dirty: boolean;
  isSaving: boolean;
  onDiscard: () => void;
  onSave: () => void;
  discardLabel: string;
  saveLabel: string;
}) {
  return (
    <>
      <button
        type="button"
        disabled={!dirty || isSaving}
        onClick={onDiscard}
        className={`ml-auto h-12 rounded-full border-[1.5px] border-control bg-white px-6 text-[15px] font-semibold hover:bg-cream disabled:opacity-40 disabled:hover:bg-white ${editorFocusRing}`}
      >
        {discardLabel}
      </button>
      <PendingButton
        type="button"
        isPending={isSaving}
        disabled={!dirty}
        onClick={onSave}
        className={`h-12 rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-black disabled:opacity-40 ${editorFocusRing}`}
      >
        {saveLabel}
      </PendingButton>
    </>
  );
}
