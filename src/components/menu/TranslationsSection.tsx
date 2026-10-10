import { useTranslation } from 'react-i18next';
import type { MenuLanguage } from '../../services/api';
import { MyInput, MyTextarea } from '../ui/MyInput';

export interface TranslationRow {
  id: string;
  /** The text in the shop's original menu language, shown beside the box. */
  original: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}

/** Folded "Translations (optional)" block: the original text on the left, a box for the extra language on the right. Never required; empty means "show the original". */
export function TranslationsSection({ language, rows }: { language: MenuLanguage; rows: TranslationRow[] }) {
  const { t } = useTranslation();
  const visible = rows.filter((r) => r.original.trim() !== '');
  if (visible.length === 0) return null;
  const languageName = t(`shops.languageName.${language}`);

  return (
    <details className="group rounded-xl border border-gray-200 bg-gray-50/50" data-testid="translations-section">
      <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-gray-700">
        {t('translationFields.title')}
        <span className="ml-2 text-xs font-normal text-gray-400">{languageName}</span>
      </summary>
      <div className="px-3 pb-3 space-y-2">
        <p className="text-xs text-gray-500">{t('translationFields.hint', { language: languageName })}</p>
        {visible.map((row) => (
          <div key={row.id} className="grid grid-cols-2 gap-3 items-start">
            <p className="text-sm text-gray-500 pt-2 break-words whitespace-pre-wrap">{row.original}</p>
            {row.multiline ? (
              <MyTextarea
                aria-label={`${languageName}: ${row.original}`}
                rows={2}
                value={row.value}
                onChange={(e) => row.onChange(e.target.value)}
              />
            ) : (
              <MyInput
                aria-label={`${languageName}: ${row.original}`}
                value={row.value}
                onChange={(e) => row.onChange(e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </details>
  );
}
