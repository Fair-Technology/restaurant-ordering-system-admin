import { describe, expect, it } from 'vitest';
import { countryDisplayName, openedCountry } from './openedCountries';

describe('countryDisplayName', () => {
  it('localizes a known code and keeps the stored label English', () => {
    expect(countryDisplayName('DE', 'de')).toBe('Deutschland');
    expect(countryDisplayName('de', 'en')).toBe('Germany');
    expect(countryDisplayName('DE', 'fr')).toBe('Germany');
    expect(openedCountry('DE')?.label).toBe('Germany');
  });
  it('is empty for unknown codes', () => {
    expect(countryDisplayName('GB', 'de')).toBe('');
    expect(countryDisplayName(undefined, 'de')).toBe('');
  });
});
