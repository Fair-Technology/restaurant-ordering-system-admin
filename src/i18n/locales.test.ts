import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { ORDER_DISPLAY_STATES } from '../features/orders/orderState';
import { REJECT_REASONS } from '../features/orders/intake';

const dirname = path.dirname(fileURLToPath(import.meta.url));

function loadLocale(lng: string): Record<string, unknown> {
  const raw = fs.readFileSync(
    path.resolve(dirname, `../../public/locales/${lng}/common.json`),
    'utf-8',
  );
  return JSON.parse(raw);
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenKeys(value as Record<string, unknown>, fullKey);
    }
    return [fullKey];
  });
}

describe('locales', () => {
  const en = loadLocale('en');
  const de = loadLocale('de');

  it('en and de have identical keys', () => {
    const enKeys = flattenKeys(en).sort();
    const deKeys = flattenKeys(de).sort();
    expect(deKeys).toEqual(enKeys);
  });

  it('every order state has a label', () => {
    for (const state of ORDER_DISPLAY_STATES) {
      expect(en).toHaveProperty(`orders.state.${state}`);
      expect(de).toHaveProperty(`orders.state.${state}`);
    }
  });

  it('every decline reason is labelled', () => {
    for (const r of REJECT_REASONS) {
      expect(en).toHaveProperty(`orders.rejectReason.${r}`);
      expect(de).toHaveProperty(`orders.rejectReason.${r}`);
    }
  });
});
