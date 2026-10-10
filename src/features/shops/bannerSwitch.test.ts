import { describe, expect, it } from 'vitest';
import { bannerShownOf, brandingWithBanner } from './bannerSwitch';

describe('bannerShownOf', () => {
  it('is on when the shop never set the switch or has no branding', () => {
    expect(bannerShownOf(undefined)).toBe(true);
    expect(bannerShownOf(null)).toBe(true);
    expect(bannerShownOf({ logoUrl: null })).toBe(true);
  });

  it('is off only when explicitly switched off', () => {
    expect(bannerShownOf({ showHero: false })).toBe(false);
    expect(bannerShownOf({ showHero: true })).toBe(true);
  });
});

describe('brandingWithBanner', () => {
  it('keeps the picture, logo and colour while flipping the switch', () => {
    const stored = { logoUrl: 'https://x/logo.png', heroImageUrl: 'https://x/hero.jpg', accentColor: '#C2410C' };
    expect(brandingWithBanner(stored, false)).toEqual({ ...stored, showHero: false });
  });

  it('works for a shop with no branding yet', () => {
    expect(brandingWithBanner(undefined, false)).toEqual({ showHero: false });
  });
});
