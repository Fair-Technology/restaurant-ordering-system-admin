import { describe, expect, it } from 'vitest';

import { goLiveFixLink } from './goLiveFixLink';

describe('goLiveFixLink', () => {
  it('legal criteria link to the Legal page sections', () => {
    expect(goLiveFixLink('s1', 'impressum')).toBe('/shops/s1/legal?section=impressum');
    expect(goLiveFixLink('s1', 'dpa_accepted')).toBe('/shops/s1/legal?section=dpa');
  });

  it('existing criteria keep their links', () => {
    expect(goLiveFixLink('s1', 'stripe_connected')).toBe('/shops/s1/settings?section=pay');
    expect(goLiveFixLink('s1', 'has_categories')).toBe('/shops/s1/categories');
  });

  it('tax number links to the Impressum', () => {
    expect(goLiveFixLink('s1', 'invoice_tax_id')).toBe('/shops/s1/legal?section=impressum');
  });
});
