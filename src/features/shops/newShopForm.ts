import type { CreateShopRequestDto, MenuLanguage } from '../../services/api';
import { openedCountry } from './openedCountries';
import type { OpenedCountry } from './openedCountries';
import { SLUG_PATTERN } from './slugFromName';

export interface NewShopFormValues {
  name?: string;
  slug?: string;
  countryCode?: string;
  industry?: string;
  currency?: string;
  timezone?: string;
  address?: { street?: string; city?: string; state?: string; postcode?: string; country?: string };
}

const WORKDAY = [{ open: '09:00', close: '17:00' }];

/** Mon–Fri 09:00–17:00; the owner edits these in Settings. */
export const DEFAULT_OPENING_HOURS: CreateShopRequestDto['openingHours'] = {
  mon: WORKDAY.map((s) => ({ ...s })),
  tue: WORKDAY.map((s) => ({ ...s })),
  wed: WORKDAY.map((s) => ({ ...s })),
  thu: WORKDAY.map((s) => ({ ...s })),
  fri: WORKDAY.map((s) => ({ ...s })),
  sat: [],
  sun: [],
};

/** A blank new-shop form: no country, no currency, no time zone — the owner must choose. */
export function defaultNewShopForm(
  menuLanguage: MenuLanguage,
): NewShopFormValues & Pick<CreateShopRequestDto, 'openingHours' | 'menuLanguage'> {
  return {
    name: '',
    countryCode: '',
    menuLanguage,
    address: { street: '', city: '', state: '', postcode: '', country: '' },
    openingHours: DEFAULT_OPENING_HOURS,
  };
}

/** Country chosen: country, currency, time zone and address country are set together. */
export function withCountry<T extends NewShopFormValues>(
  form: T,
  country: OpenedCountry,
  addressCountryLabel: string,
): T {
  return {
    ...form,
    countryCode: country.code,
    currency: country.currency,
    timezone: country.timezone,
    address: { ...form.address, country: addressCountryLabel },
  };
}

export type NewShopFormError = 'name' | 'slug' | 'industry' | 'country' | 'dpa';

/** The first thing blocking submit, in the order the form shows them; null when it may submit. */
export function newShopFormError(
  form: NewShopFormValues,
  dpaAccepted: boolean,
  /** Whether the last live availability check for exactly `form.slug` said it is free. */
  slugAvailable: boolean = true,
): NewShopFormError | null {
  if ((form.name ?? '').trim().length < 3) return 'name';
  if (!SLUG_PATTERN.test(form.slug ?? '') || !slugAvailable) return 'slug';
  if (!(form.industry ?? '').trim()) return 'industry';
  if (!openedCountry(form.countryCode)) return 'country';
  if (dpaAccepted === false) return 'dpa';
  return null;
}
