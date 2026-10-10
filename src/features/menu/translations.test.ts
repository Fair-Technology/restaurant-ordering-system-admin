import { describe, expect, it } from 'vitest';

import { defaultMenuLanguageForUiLanguage, menuLanguagesOf } from './translations';

describe('menuLanguagesOf', () => {
  it('uses the saved languages when there are any', () => {
    expect(menuLanguagesOf({ menuLanguages: ['en', 'de'], countryCode: 'DE' })).toEqual(['en', 'de']);
  });

  it('with none saved, falls back by country like the backend', () => {
    expect(menuLanguagesOf({ countryCode: 'DE' })).toEqual(['de']);
    expect(menuLanguagesOf({ menuLanguages: [], countryCode: 'at' })).toEqual(['de']);
    expect(menuLanguagesOf({ countryCode: 'AU' })).toEqual(['en']);
    expect(menuLanguagesOf({})).toEqual(['en']);
  });
});

describe('defaultMenuLanguageForUiLanguage', () => {
  it('German UI or browser languages default to German', () => {
    expect(defaultMenuLanguageForUiLanguage('de')).toBe('de');
    expect(defaultMenuLanguageForUiLanguage('de-AT')).toBe('de');
    expect(defaultMenuLanguageForUiLanguage('DE-ch')).toBe('de');
  });

  it('anything else, or nothing, defaults to English', () => {
    expect(defaultMenuLanguageForUiLanguage('en-GB')).toBe('en');
    expect(defaultMenuLanguageForUiLanguage('fr')).toBe('en');
    expect(defaultMenuLanguageForUiLanguage(undefined)).toBe('en');
    expect(defaultMenuLanguageForUiLanguage('')).toBe('en');
  });
});
