import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

import { ORDER_DISPLAY_STATES } from '../features/orders/orderState';
import { REJECT_REASONS } from '../features/orders/intake';
import { PAYMENT_STATUSES } from '../features/orders/refunds';
import { COVER_IMAGE_FILE_ERRORS } from '../features/shops/coverImage';
import { AUTO_ACCEPT_CHOICES } from '../features/shops/kitchenSettings';

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

  it('every cover image file error is labelled', () => {
    for (const e of COVER_IMAGE_FILE_ERRORS) {
      expect(en).toHaveProperty(`shops.${e}`);
      expect(de).toHaveProperty(`shops.${e}`);
    }
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

  it('every auto-accept choice is labelled', () => {
    for (const c of AUTO_ACCEPT_CHOICES) {
      expect(en).toHaveProperty(`shops.autoAcceptChoice.${c}`);
      expect(de).toHaveProperty(`shops.autoAcceptChoice.${c}`);
    }
  });

  it('every payment status is labelled', () => {
    for (const status of PAYMENT_STATUSES) {
      expect(en).toHaveProperty(`orders.payment.${status}`);
      expect(de).toHaveProperty(`orders.payment.${status}`);
    }
  });
});
