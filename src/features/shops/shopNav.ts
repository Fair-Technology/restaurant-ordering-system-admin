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
