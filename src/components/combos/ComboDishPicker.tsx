import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { toggleDishIds, type CategoryDishes } from '../../features/combos/comboForm';
import { editorFocusRing } from '../editor/EditorShell';

/**
 * "Add dishes" picker for one choice: dishes grouped by category with their price, a checkbox per dish and a
 * "whole category" checkbox that ticks every dish the category has right now (a bulk tick, not a live link).
 * Done applies the ticks to the choice; Cancel / Escape / the backdrop throw them away. Rendered in a portal
 * so it works from inside the drawer; Escape closes only the picker.
 */
export function ComboDishPicker({
  choiceName,
  categories,
  initialIds,
  money,
  onCancel,
  onDone,
}: {
  choiceName: string;
  categories: CategoryDishes[];
  initialIds: string[];
  money: (cents: number) => string;
  onCancel: () => void;
  onDone: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const [ids, setIds] = useState(initialIds);
  const panelRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose: onCancel, containerRef: panelRef });
  const title = choiceName.trim() ? t('combos.picker.titleNamed', { name: choiceName.trim() }) : t('combos.picker.title');

  return createPortal(
    // Keys and clicks stop here so the drawer behind never sees them (it would close on Escape)
    <div onKeyDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="fixed inset-0 z-[60] bg-[#1f1a17]/40" onClick={onCancel} />
      <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          className="pointer-events-auto flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-t-2xl border border-line bg-white text-ink shadow-xl outline-none sm:rounded-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line-soft px-5 pb-4 pt-5">
            <h2 className="font-display text-[22px] font-semibold leading-tight">{title}</h2>
            <button
              type="button"
              onClick={onCancel}
              aria-label={t('combos.picker.close')}
              className={`inline-flex h-11 w-11 flex-none items-center justify-center rounded-full text-[#6b6058] hover:bg-sand hover:text-ink ${editorFocusRing}`}
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {categories.length === 0 && <p className="text-sm text-muted">{t('combos.picker.noDishes')}</p>}
            {categories.map(({ name, dishes }) => {
              const catIds = dishes.map((p) => p.id!);
              const allOn = catIds.every((id) => ids.includes(id));
              return (
                <fieldset key={name} className="space-y-1">
                  <legend className="sr-only">{name}</legend>
                  <label className="flex min-h-11 items-center gap-3 text-sm font-bold">
                    <input
                      type="checkbox"
                      className="h-5 w-5 accent-[#1f1a17]"
                      checked={allOn}
                      onChange={(e) => setIds((cur) => toggleDishIds(cur, catIds, e.target.checked))}
                    />
                    {t('combos.wholeCategory', { category: name })}
                  </label>
                  <div className="space-y-0.5 pl-8">
                    {dishes.map((p) => (
                      <label key={p.id} className="flex min-h-11 items-center gap-3 text-sm text-[#4a413b]">
                        <input
                          type="checkbox"
                          className="h-5 w-5 flex-none accent-[#1f1a17]"
                          checked={ids.includes(p.id!)}
                          onChange={(e) => setIds((cur) => toggleDishIds(cur, [p.id!], e.target.checked))}
                        />
                        <span className="min-w-0 flex-1 break-words">{p.name}</span>
                        <span className="flex-none text-[13px] text-[#6b6058]">{money(p.price ?? 0)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-line-soft px-5 py-3">
            <span role="status" className="mr-auto text-sm font-semibold text-muted">
              {t('combos.dishCount', { count: ids.length })}
            </span>
            <button
              type="button"
              onClick={onCancel}
              className={`h-12 rounded-full border-[1.5px] border-control bg-white px-6 text-[15px] font-semibold hover:bg-cream ${editorFocusRing}`}
            >
              {t('combos.cancel')}
            </button>
            <button
              type="button"
              onClick={() => onDone(ids)}
              className={`h-12 rounded-full bg-ink px-7 text-[15px] font-bold text-white hover:bg-black ${editorFocusRing}`}
            >
              {t('combos.picker.done')}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
