import { describe, expect, it } from 'vitest';
import {
  COUNTRY_SUBDIVISIONS,
  countryRequiresState,
  isKnownState,
  subdivisionName,
  subdivisionsForCountry,
} from './subdivisions';

describe('COUNTRY_SUBDIVISIONS', () => {
  it('DE has 16 unique entries incl. BY and TH', () => {
    const de = COUNTRY_SUBDIVISIONS.DE;
    expect(de).toHaveLength(16);
    expect(new Set(de.map((s) => s.code)).size).toBe(16);
    expect(new Set(de.map((s) => s.name)).size).toBe(16);
    expect(de).toContainEqual({ code: 'BY', name: 'Bayern' });
    expect(de).toContainEqual({ code: 'TH', name: 'Thüringen' });
  });
  it('AU has 8 and US has 51 incl. DC', () => {
    expect(COUNTRY_SUBDIVISIONS.AU).toHaveLength(8);
    expect(COUNTRY_SUBDIVISIONS.US).toHaveLength(51);
    expect(COUNTRY_SUBDIVISIONS.US).toContainEqual({ code: 'DC', name: 'District of Columbia' });
  });
});

describe('subdivisionsForCountry', () => {
  it('trims and upper-cases', () => {
    expect(subdivisionsForCountry(' de ')).toBe(COUNTRY_SUBDIVISIONS.DE);
  });
  it('returns null for empty / unknown', () => {
    expect(subdivisionsForCountry(null)).toBeNull();
    expect(subdivisionsForCountry(undefined)).toBeNull();
    expect(subdivisionsForCountry('')).toBeNull();
    expect(subdivisionsForCountry('FR')).toBeNull();
    expect(subdivisionsForCountry('toString')).toBeNull();
  });
});

describe('countryRequiresState', () => {
  it('is true for DE/AU/US only', () => {
    expect(countryRequiresState('DE')).toBe(true);
    expect(countryRequiresState('AU')).toBe(true);
    expect(countryRequiresState('US')).toBe(true);
    expect(countryRequiresState('FR')).toBe(false);
    expect(countryRequiresState(null)).toBe(false);
  });
});

describe('isKnownState', () => {
  it('accepts name, code, case, padding and diacritic-free variants', () => {
    for (const v of ['Bayern', 'BY', 'bayern', '  Bayern  ', 'by', 'Thuringen', 'baden wurttemberg', 'Baden-Württemberg']) {
      expect(isKnownState(v, 'DE')).toBe(true);
    }
  });
  it('rejects unknown and empty values', () => {
    expect(isKnownState('Oberbayern', 'DE')).toBe(false);
    expect(isKnownState('', 'DE')).toBe(false);
  });
  it('accepts anything when the country has no list', () => {
    expect(isKnownState('whatever', 'FR')).toBe(true);
    expect(isKnownState('', null)).toBe(true);
  });
});

describe('subdivisionName', () => {
  it('resolves code and name to the canonical name', () => {
    expect(subdivisionName('BY', 'DE')).toBe('Bayern');
    expect(subdivisionName(' thuringen ', 'DE')).toBe('Thüringen');
  });
  it('returns null otherwise', () => {
    expect(subdivisionName('Oberbayern', 'DE')).toBeNull();
    expect(subdivisionName('', 'DE')).toBeNull();
    expect(subdivisionName('Bayern', 'FR')).toBeNull();
  });
});
