export interface GoLiveGroupDef {
  id: string;
  titleKey: string;
  keys: string[];
}

/** Fixed display order. The server decides which criteria exist; this only decides where they sit. */
export const GO_LIVE_GROUPS: GoLiveGroupDef[] = [
  { id: 'payments', titleKey: 'shops.goLive.groups.payments', keys: ['stripe_connected'] },
  { id: 'menu', titleKey: 'shops.goLive.groups.menu', keys: ['has_products', 'has_categories'] },
  { id: 'shop', titleKey: 'shops.goLive.groups.shop', keys: ['profile_name', 'profile_address', 'opening_hours'] },
  {
    id: 'legal',
    titleKey: 'shops.goLive.groups.legal',
    keys: ['dpa_accepted', 'impressum', 'terms', 'withdrawal', 'privacy_notice', 'invoice_tax_id'],
  },
];

export const GO_LIVE_FALLBACK_GROUP = { id: 'fallback', titleKey: 'shops.goLive.groups.fallback' };

export interface GoLiveGroup<C extends { key: string }> {
  id: string;
  titleKey: string;
  criteria: C[];
}

/** Known buckets in fixed order (empty ones dropped), then one fallback bucket for unknown keys in server order. */
export function groupGoLiveCriteria<C extends { key: string }>(criteria: C[]): GoLiveGroup<C>[] {
  const known = new Set(GO_LIVE_GROUPS.flatMap((g) => g.keys));
  const groups: GoLiveGroup<C>[] = GO_LIVE_GROUPS.map((g) => ({
    id: g.id,
    titleKey: g.titleKey,
    criteria: criteria.filter((c) => g.keys.includes(c.key)),
  }));
  groups.push({ ...GO_LIVE_FALLBACK_GROUP, criteria: criteria.filter((c) => !known.has(c.key)) });
  return groups.filter((g) => g.criteria.length > 0);
}
