import { describe, expect, it } from 'vitest';
import i18next from 'i18next';
import en from '../../../public/locales/en/common.json';
import de from '../../../public/locales/de/common.json';

describe('shops.scheduledHelp', () => {
  it('interpolates the day count in both languages', async () => {
    const i18n = i18next.createInstance();
    await i18n.init({
      lng: 'en',
      resources: { en: { translation: en }, de: { translation: de } },
      interpolation: { escapeValue: false },
    });
    expect(i18n.t('shops.scheduledHelp', { days: 2 })).toContain('up to 2 days ahead');
    expect(i18n.t('shops.scheduledHelp', { days: 2, lng: 'de' })).toContain('bis zu 2 Tage im Voraus');
  });
});
