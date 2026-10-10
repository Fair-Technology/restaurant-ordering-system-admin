import type { ShopBranding } from '../../services/api';

/** Whether the shop page shows its banner: a shop that never set the switch shows it. */
export function bannerShownOf(branding: ShopBranding | undefined): boolean {
  return branding?.showHero !== false;
}

/**
 * The branding to send when saving: the stored picture, logo and colour carried over untouched
 * (a save replaces the whole branding), with the banner switch set as given.
 */
export function brandingWithBanner(branding: ShopBranding | undefined, showHero: boolean): NonNullable<ShopBranding> {
  return {
    logoUrl: branding?.logoUrl ?? undefined,
    heroImageUrl: branding?.heroImageUrl ?? undefined,
    accentColor: branding?.accentColor ?? undefined,
    showHero,
  };
}
