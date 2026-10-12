export type ShopNavKey =
  | 'orders'
  | 'reports'
  | 'products'
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
  ['reports', 'view_reports'],
  ['products', 'manage_menu'],
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

export function shopNavItems(permissions: readonly string[]): ShopNavKey[] {
  return RULES.filter(([, perm]) => permissions.includes(perm)).map(([key]) => key);
}

export type NavGroupKey = 'service' | 'menu' | 'shop' | 'business';

const GROUPS: Array<[NavGroupKey, ShopNavKey[]]> = [
  ['service', ['orders']],
  ['menu', ['products', 'combos', 'categories']],
  ['shop', ['settings', 'tables', 'promotions', 'legal']],
  ['business', ['reports', 'subscription', 'staff', 'activity']],
];

/** The sidebar's groups (Service, Speisekarte, Shop, Geschäft) with only the pages the user may open; empty groups left out. */
export function navGroups(permissions: readonly string[]): Array<{ key: NavGroupKey; items: ShopNavKey[] }> {
  const allowed = new Set(shopNavItems(permissions));
  return GROUPS.map(([key, items]) => ({ key, items: items.filter((i) => allowed.has(i)) })).filter(
    (g) => g.items.length > 0,
  );
}
