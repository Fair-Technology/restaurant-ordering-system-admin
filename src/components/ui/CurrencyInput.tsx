import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { shopLocale } from '../../utils/locale';

const BASE =
  'w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400 ' +
  'transition-all duration-150';

interface CurrencyInputProps {
  label?: string;
  /** Accessible name for when there is no visible `label` (e.g. one input per table row). */
  ariaLabel?: string;
  valueCents: number;
  onChange: (cents: number) => void;
  className?: string;
  /** Replaces the default small-caps label look (e.g. to match a neighbouring field's label). */
  labelClassName?: string;
  /** Shop's country code, for de-AT/de-CH etc; omitted falls back to the UI-language default (de-DE / en-GB). */
  countryCode?: string | null;
}

export function CurrencyInput({ label, ariaLabel, valueCents, onChange, className = '', labelClassName, countryCode }: CurrencyInputProps) {
  const { i18n } = useTranslation();
  const id = useId();
  // +0 and -0 are the same number, so a typed minus on an all-zero field is remembered here.
  const [negativeZero, setNegativeZero] = useState(false);
  const negative = valueCents !== 0 ? valueCents < 0 : negativeZero;
  const formatted = new Intl.NumberFormat(shopLocale(i18n.language, countryCode), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valueCents / 100);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const digit = parseInt(e.key, 10);
    if (!isNaN(digit) && e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      const magnitude = Math.min(Math.abs(valueCents) * 10 + digit, 99_999_999);
      onChange(negative ? -magnitude : magnitude);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      const magnitude = Math.floor(Math.abs(valueCents) / 10);
      if (magnitude === 0) setNegativeZero(false);
      onChange(negative && magnitude !== 0 ? -magnitude : magnitude);
    } else if (e.key === '-') {
      e.preventDefault();
      if (valueCents !== 0) onChange(-valueCents);
      else setNegativeZero(!negativeZero);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className={labelClassName ?? 'text-xs font-medium text-gray-500 uppercase tracking-wide'}>{label}</label>
      )}
      <input
        id={id}
        aria-label={ariaLabel}
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
