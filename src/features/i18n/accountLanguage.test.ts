import { afterEach, describe, expect, it, vi } from 'vitest';
import { browserAccountLanguage, resolveLoginLanguage } from './accountLanguage';

describe('browserAccountLanguage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps de-DE to de', () => expect(browserAccountLanguage({ language: 'de-DE' })).toBe('de'));
  it('maps en-US to en', () => expect(browserAccountLanguage({ language: 'en-US' })).toBe('en'));
  it('falls back to en for unsupported languages', () =>
    expect(browserAccountLanguage({ language: 'fr-FR' })).toBe('en'));
  it('defaults to the global navigator', () => {
    vi.stubGlobal('navigator', { language: 'de' });
    expect(browserAccountLanguage()).toBe('de');
  });
});

describe('resolveLoginLanguage', () => {
  it('keeps a stored language and does not persist', () => {
    expect(resolveLoginLanguage('de', { language: 'en-US' })).toEqual({ language: 'de', persist: false });
  });
  it.each([null, undefined])('defaults from the browser and persists when stored is %s', (stored) => {
    expect(resolveLoginLanguage(stored, { language: 'de-AT' })).toEqual({ language: 'de', persist: true });
  });
});
