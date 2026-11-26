export type ShopNavKey =
  | 'orders'
  | 'dashboard'
  | 'products'
  | 'optionGroups'
  | 'combos'
  | 'categories'
  | 'tables'
  | 'promotions'
  | 'subscription'
  | 'settings'
  | 'legal'
  | 'staff'
  | 'activity';

const RULES: Array<[ShopNavKey, string]> = [
  ['orders', 'view_orders'],
  ['dashboard', 'view_reports'],
  ['products', 'manage_menu'],
  ['optionGroups', 'manage_menu'],
  ['combos', 'manage_menu'],
  ['categories', 'manage_menu'],
  ['tables', 'manage_menu'],
  ['promotions', 'manage_shop'],
  ['subscription', 'manage_billing'],
  ['settings', 'manage_shop'],
  ['legal', 'manage_shop'],
  ['staff', 'manage_staff'],
  ['activity', 'view_audit'],
];

export type NavGroupKey = 'service' | 'menu' | 'shop' | 'business';

/** Entries above the first group header, in order (the Dashboard). */
const TOP: ShopNavKey[] = ['dashboard'];

const GROUPS: Array<[NavGroupKey, ShopNavKey[]]> = [
  ['service', ['orders']],
  ['menu', ['products', 'combos', 'categories', 'optionGroups', 'promotions']],
  ['shop', ['tables', 'legal']],
  ['business', ['subscription', 'staff', 'activity']],
];

/** Entries below the last group, in order (Settings). */
const BOTTOM: ShopNavKey[] = ['settings'];

/** The one authoritative sidebar order: the top entries, then each group's items, then the bottom entries. */
const ORDER: ShopNavKey[] = [...TOP, ...GROUPS.flatMap(([, items]) => items), ...BOTTOM];

export function shopNavItems(permissions: readonly string[]): ShopNavKey[] {
  const allowed = new Set(RULES.filter(([, perm]) => permissions.includes(perm)).map(([key]) => key));
  return ORDER.filter((key) => allowed.has(key));
}

/** The ungrouped entries above the groups that the user may open, in order. */
export function sidebarTopItems(permissions: readonly string[]): ShopNavKey[] {
  const allowed = new Set(shopNavItems(permissions));
  return TOP.filter((key) => allowed.has(key));
}

/** The ungrouped entries below the groups that the user may open, in order (today: Settings). */
export function sidebarBottomItems(permissions: readonly string[]): ShopNavKey[] {
  const allowed = new Set(shopNavItems(permissions));
  return BOTTOM.filter((key) => allowed.has(key));
}

/** The first page in sidebar order the user may open, or undefined when they may open none. */
export function firstNavKey(permissions: readonly string[]): ShopNavKey | undefined {
  return shopNavItems(permissions)[0];
}

/** Nav keys whose URL segment is not the key itself. */
const PATHS: Partial<Record<ShopNavKey, string>> = {
  optionGroups: 'option-groups',
};

/** The shop-relative URL for a nav item. A key is not always the segment: the library lives at /option-groups. */
export function navPath(shopId: string, key: ShopNavKey): string {
  return `/shops/${shopId}/${PATHS[key] ?? key}`;
}

/** The sidebar's groups (Service, Speisekarte, Shop, Geschäft) with only the pages the user may open; empty groups left out. Top and bottom entries are not drawn here. */
export function navGroups(permissions: readonly string[]): Array<{ key: NavGroupKey; items: ShopNavKey[] }> {
  const allowed = new Set(shopNavItems(permissions));
  return GROUPS.map(([key, items]) => ({ key, items: items.filter((i) => allowed.has(i)) })).filter(
    (g) => g.items.length > 0,
  );
}
