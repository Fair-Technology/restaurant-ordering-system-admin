import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { chipClass } from './pageStyles';

/**
 * Building blocks shared by every admin page, so they all look like "Gerichte" and "Bestellungen":
 * a header with an eyebrow and a Fraunces title, chips to filter, white sections on warm paper,
 * and (on wide screens) a grey column on the right for a preview or the selected item.
 */

interface PageHeaderProps {
  /** Small line above the title: the sidebar group ("Speisekarte", "Shop", "Geschäft") */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** Quiet text after the title, e.g. "12 Gerichte" */
  count?: ReactNode;
  /** Buttons on the right */
  actions?: ReactNode;
  /** A line of help under the title */
  description?: ReactNode;
}

export function PageHeader({ eyebrow, title, count, actions, description }: PageHeaderProps) {
  return (
    <div className="mb-[18px] flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="mt-0.5 font-display text-[30px] leading-tight font-semibold">
          {title}
          {count !== undefined && count !== null && (
            <span className="ml-2 font-sans text-[15px] font-medium text-muted">{count}</span>
          )}
        </h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface SectionProps {
  title?: ReactNode;
  count?: ReactNode;
  /** Quiet text on the right of the title row */
  hint?: ReactNode;
  /** Buttons on the right of the title row */
  actions?: ReactNode;
  /** A coloured dot before the title (Tailwind background class) */
  dot?: string;
  id?: string;
  /** Pad the body (forms, text). Lists of rows leave it off and pad their rows. */
  padded?: boolean;
  /** Help text under the title row */
  description?: ReactNode;
  tone?: 'default' | 'danger';
  className?: string;
  children?: ReactNode;
}

/** A white section with a title row, like one category on the dishes page. */
export function Section({
  title,
  count,
  hint,
  actions,
  dot,
  id,
  padded = false,
  description,
  tone = 'default',
  className = '',
  children,
}: SectionProps) {
  const border = tone === 'danger' ? 'border-[#f5c2bd]' : 'border-line';
  return (
    <section id={id} className={`mb-[18px] scroll-mt-6 overflow-hidden rounded-2xl border bg-white ${border} ${className}`}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-line-soft px-4 py-3">
          {dot && <span className={`h-[9px] w-[9px] rounded-full ${dot}`} aria-hidden="true" />}
          {title && <h2 className={`text-[15px] font-bold ${tone === 'danger' ? 'text-[#b42318]' : ''}`}>{title}</h2>}
          {count !== undefined && count !== null && <span className="text-[13px] text-[#8a7f77]">{count}</span>}
          {hint && <span className="ml-auto text-[13px] text-muted">{hint}</span>}
          {actions && <div className={`${hint ? '' : 'ml-auto'} flex items-center gap-2`}>{actions}</div>}
        </div>
      )}
      {description && <p className="border-b border-line-soft px-4 py-2.5 text-[13px] text-muted">{description}</p>}
      {padded ? <div className="p-4 sm:p-5">{children}</div> : children}
    </section>
  );
}

/** One row in a section list: hover tint, hairline between rows, optional selection bar. */
export function Row({
  selected = false,
  onSelect,
  children,
  className = '',
}: {
  selected?: boolean;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
}) {
  const base = `flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0 ${
    selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
  } ${className}`;
  if (!onSelect) return <div className={base}>{children}</div>;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={selected ? 'true' : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`${base} cursor-pointer transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink`}
    >
      {children}
    </div>
  );
}

/** Text for an empty section. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="p-4 text-sm text-[#8a7f77]">{children}</p>;
}

interface ChipProps {
  active: boolean;
  onClick: () => void;
  count?: number | null;
  children: ReactNode;
}

export function Chip({ active, onClick, count, children }: ChipProps) {
  return (
    <button type="button" aria-pressed={active} className={chipClass(active)} onClick={onClick}>
      {children}
      {count !== undefined && count !== null && <span className="text-xs opacity-70">{count}</span>}
    </button>
  );
}

/** A row of chips (and a search field, if given) under the page header. */
export function Toolbar({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div role={label ? 'group' : undefined} aria-label={label} className="mb-3.5 flex flex-wrap items-center gap-2">
      {children}
    </div>
  );
}

/** Previous / page x of y / next, under a long list. */
export function Pager({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (page: number) => void }) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  const btn =
    'h-[34px] rounded-full border border-[#e3d9ce] bg-white px-3.5 text-[13px] font-bold text-ink hover:bg-sand disabled:opacity-40';
  return (
    <div className="flex items-center justify-between gap-3">
      <button type="button" className={btn} disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {t('orders.previousPage')}
      </button>
      <span className="text-[13px] text-muted">{t('orders.pageInfo', { page, total: totalPages })}</span>
      <button type="button" className={btn} disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        {t('orders.nextPage')}
      </button>
    </div>
  );
}

/**
 * Full-height page with a scrolling work area on the left and a grey column on the right
 * (shown from `xl` up). The route must be listed as full-bleed in Layout.
 */
export function SplitPage({ side, children }: { side?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-4 pt-[22px] pb-7 sm:px-7">{children}</div>
      {side}
    </div>
  );
}

/** The right-hand grey column of a SplitPage. */
export function SideColumn({ title, hint, actions, children, label }: { title: ReactNode; hint?: ReactNode; actions?: ReactNode; label?: string; children: ReactNode }) {
  return (
    <aside aria-label={label} className="hidden w-[452px] flex-shrink-0 flex-col border-l border-line bg-[#efebe6] xl:flex">
      <div className="flex items-center gap-2.5 px-[18px] py-3.5">
        <span className="text-[13px] font-bold">{title}</span>
        {hint && <span className="text-xs text-muted">{hint}</span>}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-[18px] pb-[18px]">{children}</div>
    </aside>
  );
}

/** A white scrolling card that fills the side column. */
export function SideCard({ children }: { children: ReactNode }) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-y-auto rounded-2xl border border-line bg-white">{children}</div>;
}
