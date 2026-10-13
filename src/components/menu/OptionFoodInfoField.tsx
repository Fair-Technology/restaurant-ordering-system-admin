import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ReferenceListsResponse } from '../../services/api';
import { labelFor } from '../../features/menu/foodInfo';
import { optionDeclarationCount, toggleOptionId } from '../../features/menu/optionFoodInfo';

export interface OptionFoodInfoFieldProps {
  allergenIds: readonly string[];
  additiveIds: readonly string[];
  refs: ReferenceListsResponse | undefined;
  onChange: (patch: { allergenIds?: string[]; additiveIds?: string[] }) => void;
}

const chipClass = (pressed: boolean) =>
  `px-2.5 py-1 rounded-full text-xs border transition-colors ${
    pressed
      ? 'bg-gray-900 border-gray-900 text-white'
      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
  }`;

/** Expandable picker for what one size or extra adds to the dish's allergens and additives. */
export function OptionFoodInfoField({ allergenIds, additiveIds, refs, onChange }: OptionFoodInfoFieldProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!refs) return null;
  const count = optionDeclarationCount({ allergenIds, additiveIds });

  return (
    <div className="pl-1">
      <button
        type="button"
        aria-expanded={open}
        className="text-xs text-gray-600 underline-offset-2 hover:underline"
        onClick={() => setOpen(!open)}
      >
        {t('products.optionFoodInfo')}{count > 0 ? ` · ${count}` : ''}
      </button>
      {open && (
        <div className="mt-1.5 space-y-2">
          <p className="text-xs text-gray-500">{t('products.optionFoodInfoHelp')}</p>
          <div role="group" aria-label={t('products.allergens')} className="flex flex-wrap gap-1.5">
            {refs.allergens.filter((a) => a.isActive).map((a) => {
              const pressed = allergenIds.includes(a.id);
              return (
                <button key={a.id} type="button" aria-pressed={pressed} className={chipClass(pressed)}
                  onClick={() => onChange({ allergenIds: toggleOptionId(allergenIds, a.id) })}>
                  {labelFor(a.labels, i18n.language)}
                </button>
              );
            })}
          </div>
          <div role="group" aria-label={t('products.additives')} className="flex flex-wrap gap-1.5">
            {refs.additives.filter((a) => a.isActive).map((a) => {
              const pressed = additiveIds.includes(a.id);
              return (
                <button key={a.id} type="button" aria-pressed={pressed} className={chipClass(pressed)}
                  onClick={() => onChange({ additiveIds: toggleOptionId(additiveIds, a.id) })}>
                  {a.code} {labelFor(a.labels, i18n.language)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
