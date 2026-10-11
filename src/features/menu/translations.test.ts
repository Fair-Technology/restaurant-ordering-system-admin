import { describe, expect, it } from 'vitest';

import { defaultMenuLanguageForUiLanguage, hasOriginalText, menuLanguagesOf, resolveActiveLanguage, withTranslation } from './translations';

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

describe('editor language tab helpers', () => {
  it('withTranslation replaces one language and keeps the rest', () => {
    expect(withTranslation({ de: 'a' }, 'en', 'b')).toEqual({ de: 'a', en: 'b' });
    expect(withTranslation(undefined, 'en', 'b')).toEqual({ en: 'b' });
    expect(withTranslation({ en: 'x' }, 'en', '')).toEqual({ en: '' });
  });
  it('resolveActiveLanguage falls back to the original language', () => {
    expect(resolveActiveLanguage(['de', 'en'], 'en')).toBe('en');
    expect(resolveActiveLanguage(['de'], 'en')).toBe('de');
    expect(resolveActiveLanguage(['de', 'en'], undefined)).toBe('de');
  });
  it('hasOriginalText ignores blanks', () => {
    expect(hasOriginalText('  ')).toBe(false);
    expect(hasOriginalText(undefined)).toBe(false);
    expect(hasOriginalText('Pizza')).toBe(true);
  });
});
