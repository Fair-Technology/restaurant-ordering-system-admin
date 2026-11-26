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

  it('shop profile criteria link to the matching settings section', () => {
    expect(goLiveFixLink('s1', 'profile_name')).toBe('/shops/s1/settings?section=details');
    expect(goLiveFixLink('s1', 'profile_address')).toBe('/shops/s1/settings?section=details');
    expect(goLiveFixLink('s1', 'opening_hours')).toBe('/shops/s1/settings?section=hours');
  });

  it('menu and remaining legal criteria keep their links', () => {
    expect(goLiveFixLink('s1', 'has_products')).toBe('/shops/s1/products');
    expect(goLiveFixLink('s1', 'terms')).toBe('/shops/s1/legal?section=terms');
    expect(goLiveFixLink('s1', 'withdrawal')).toBe('/shops/s1/legal?section=withdrawal');
    expect(goLiveFixLink('s1', 'privacy_notice')).toBe('/shops/s1/legal?section=privacy');
  });

  it('unknown keys fall back to the settings page', () => {
    expect(goLiveFixLink('s1', 'some_future_key')).toBe('/shops/s1/settings');
  });
});
