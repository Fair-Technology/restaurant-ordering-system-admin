import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { shopLocale } from '../../utils/locale';

const BASE =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 ' +
  'transition-all duration-150';

interface CurrencyInputProps {
  label?: string;
  valueCents: number;
  onChange: (cents: number) => void;
  className?: string;
  /** Shop's country code, for de-AT/de-CH etc; omitted falls back to the UI-language default (de-DE / en-GB). */
  countryCode?: string | null;
}

export function CurrencyInput({ label, valueCents, onChange, className = '', countryCode }: CurrencyInputProps) {
  const { i18n } = useTranslation();
  const id = useId();
  const formatted = new Intl.NumberFormat(shopLocale(i18n.language, countryCode), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueCents / 100);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const digit = parseInt(e.key, 10);
    if (!isNaN(digit) && e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      onChange(Math.min(valueCents * 10 + digit, 99_999_999));
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      onChange(Math.floor(valueCents / 10));
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      )}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatted}
        onChange={() => {}}
        onKeyDown={handleKeyDown}
        className={`${BASE} ${className}`}
      />
    </div>
  );
}
