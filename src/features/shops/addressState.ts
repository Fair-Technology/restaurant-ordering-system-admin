import { subdivisionsForCountry, subdivisionName } from './subdivisions';

export interface StateOption {
  value: string;
  label: string;
}

export interface HiddenStateField {
  kind: 'hidden';
}

export interface SelectStateField {
  kind: 'select';
  /** The country's states, name as both value and label (a legacy value is prepended). */
  options: StateOption[];
  /** Currently selected value ('' when nothing is selected). */
  value: string;
  /** The value is a saved text that is not one of the known states. */
  isLegacy: boolean;
}

export type StateField = HiddenStateField | SelectStateField;

/**
 * How the address `state` field should render for a country. Countries without a
 * subdivision list hide the field (the caller keeps the stored value untouched).
 * A saved free-text value that matches no known state stays visible and selectable.
 */
export function stateFieldFor(
  countryCode: string | undefined | null,
  currentState: string | undefined | null,
): StateField {
  const list = subdivisionsForCountry(countryCode);
  if (!list) return { kind: 'hidden' };

  const options: StateOption[] = list.map((s) => ({ value: s.name, label: s.name }));
  const raw = (currentState ?? '').trim();
  if (!raw) return { kind: 'select', options, value: '', isLegacy: false };

  const canonical = subdivisionName(raw, countryCode);
  if (canonical) return { kind: 'select', options, value: canonical, isLegacy: false };

  return {
    kind: 'select',
    options: [{ value: raw, label: raw }, ...options],
    value: raw,
    isLegacy: true,
  };
}
