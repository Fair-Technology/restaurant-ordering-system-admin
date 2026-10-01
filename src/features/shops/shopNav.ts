export type ShopNavKey =
  | 'orders'
  | 'products'
  | 'categories'
  | 'translations'
  | 'subscription'
  | 'settings'
  | 'staff'
  | 'activity';

const RULES: Array<[ShopNavKey, string]> = [
  ['orders', 'view_orders'],
  ['products', 'manage_menu'],
  ['categories', 'manage_menu'],
  ['translations', 'manage_menu'],
  ['subscription', 'manage_billing'],
  ['settings', 'manage_shop'],
  ['staff', 'manage_staff'],
  ['activity', 'view_audit'],
];

export function shopNavItems(permissions: readonly string[]): ShopNavKey[] {
  return RULES.filter(([, perm]) => permissions.includes(perm)).map(([key]) => key);
}
