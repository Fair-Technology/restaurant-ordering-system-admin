import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInstance } from 'i18next';
import { beforeAll, describe, expect, it } from 'vitest';
import { resolveActionLabel, resolveActorDisplayLabel } from './activityLabels';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const load = (lng: string) =>
  JSON.parse(fs.readFileSync(path.resolve(dirname, `../../../public/locales/${lng}/common.json`), 'utf-8'));

const i18n = createInstance();
beforeAll(async () => {
  await i18n.init({
    lng: 'en',
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],
    resources: { en: { common: load('en') }, de: { common: load('de') } },
    interpolation: { escapeValue: false },
  });
});

describe('resolveActionLabel', () => {
  it('resolves dotted action keys without nesting traversal', () => {
    const t = i18n.getFixedT('en');
    expect(resolveActionLabel('shop.update', t)).toBe('Shop details updated');
    expect(resolveActionLabel('shop.nameChange.requested', t)).toBe('Restaurant name change requested');
    expect(resolveActionLabel('optionGroup.create', t)).toBe('Option group created');
  });
  it('translates to German', () => {
    const t = i18n.getFixedT('de');
    expect(resolveActionLabel('shop.update', t)).toBe('Shopdetails aktualisiert');
  });
  it('falls back to the raw action for unknown keys', () => {
    expect(resolveActionLabel('foo.bar', i18n.getFixedT('en'))).toBe('foo.bar');
  });
  it('every action key in en exists in de', () => {
    expect(Object.keys(load('de').activity.action).sort()).toEqual(Object.keys(load('en').activity.action).sort());
  });
});

describe('resolveActorDisplayLabel', () => {
  const t = i18n.getFixedT('de');
  it('translates generic fallbacks', () => {
    expect(resolveActorDisplayLabel('Owner', 'owner', t)).toBe('Inhaber');
    expect(resolveActorDisplayLabel('Platform', 'superadmin', t)).toBe('Plattform');
    expect(resolveActorDisplayLabel('System', 'system', t)).toBe('System');
    expect(resolveActorDisplayLabel('Deleted staff account', 'staff', t)).toBe('Gelöschtes Mitarbeiterkonto');
  });
  it('leaves real names alone', () => {
    expect(resolveActorDisplayLabel('Owner', 'staff', t)).toBe('Owner');
    expect(resolveActorDisplayLabel('Anna', 'owner', t)).toBe('Anna');
  });
});
