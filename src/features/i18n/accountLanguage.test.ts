import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveLoginLanguage, supportedBrowserLanguage } from './accountLanguage';

describe('supportedBrowserLanguage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('maps de-DE to de', () => expect(supportedBrowserLanguage({ language: 'de-DE' })).toBe('de'));
  it('maps en-US to en', () => expect(supportedBrowserLanguage({ language: 'en-US' })).toBe('en'));
  it('returns null for unsupported languages', () =>
    expect(supportedBrowserLanguage({ language: 'fr-FR' })).toBeNull());
  it('defaults to the global navigator', () => {
    vi.stubGlobal('navigator', { language: 'de' });
    expect(supportedBrowserLanguage()).toBe('de');
  });
});

describe('resolveLoginLanguage', () => {
  it('keeps a stored language and does not persist', () => {
    expect(resolveLoginLanguage('de', 'en', { language: 'en-US' })).toEqual({ language: 'de', persist: false });
  });
  it.each([null, undefined])('uses a supported browser language over the restaurant language (stored %s)', (stored) => {
    expect(resolveLoginLanguage(stored, 'en', { language: 'de-AT' })).toEqual({ language: 'de', persist: true });
  });
  it('falls back to the restaurant language when the browser language is unsupported', () => {
    expect(resolveLoginLanguage(null, 'en', { language: 'fr-FR' })).toEqual({ language: 'en', persist: true });
  });
  it('is not hard-coded to en: unsupported browser + de restaurant gives de', () => {
    expect(resolveLoginLanguage(null, 'de', { language: 'fr-FR' })).toEqual({ language: 'de', persist: true });
  });
  it.each([undefined, null])('shows en without persisting when unsupported browser and no restaurant (%s)', (r) => {
    expect(resolveLoginLanguage(null, r, { language: 'tr-TR' })).toEqual({ language: 'en', persist: false });
  });
  it('no shop -> shop created: nothing persisted until the restaurant language exists', () => {
    const fr = { language: 'fr-FR' };
    expect(resolveLoginLanguage(null, null, fr)).toEqual({ language: 'en', persist: false });
    expect(resolveLoginLanguage(null, 'de', fr)).toEqual({ language: 'de', persist: true });
  });
});
