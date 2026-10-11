import { useTranslation } from 'react-i18next';
import type { MenuLanguage } from '../../services/api';
import { hasOriginalText } from '../../features/menu/translations';
import { MyInput, MyTextarea } from '../ui/MyInput';

/** Tab bar for the menu editors: the original language first, then the other one. Render only when the shop has 2+ languages. */
export function LanguageTabs({ languages, active, onChange }: { languages: MenuLanguage[]; active: MenuLanguage; onChange: (l: MenuLanguage) => void }) {
  const { t } = useTranslation();
  return (
    <div role="tablist" className="flex gap-1 border-b border-gray-200" data-testid="language-tabs">
      {languages.map((lang, i) => {
        const name = t(`shops.languageName.${lang}`);
        const selected = lang === active;
        return (
          <button
            key={lang}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(lang)}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              selected ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-700'
            }`}
          >
            {i === 0 ? t('translationFields.originalTab', { language: name }) : name}
          </button>
        );
      })}
    </div>
  );
}

/** One translated field: an input for the other language with the original text shown beneath as a grey hint. Hidden when the original is empty. */
export function TranslationField({
  original, value, onChange, multiline, placeholder, label, className,
}: {
  original: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  if (!hasOriginalText(original)) return null;
  return (
    <div className={className}>
      {multiline ? (
        <MyTextarea label={label} placeholder={placeholder} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <MyInput label={label} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      <p className="mt-1 text-xs text-gray-400 break-words whitespace-pre-wrap">{t('translationFields.original', { text: original })}</p>
    </div>
  );
}
