export type ShopNavKey =
  | 'orders'
  | 'products'
  | 'categories'
  | 'subscription'
  | 'settings'
  | 'staff'
  | 'activity';

// 'staff' has no rule yet: the staff-accounts page arrives in step 26, which
// adds ['staff', 'manage_staff'] here and updates shopNav.test.ts to match.
const RULES: Array<[ShopNavKey, string]> = [
  ['orders', 'view_orders'],
  ['products', 'manage_menu'],
  ['categories', 'manage_menu'],
  ['subscription', 'manage_billing'],
  ['settings', 'manage_shop'],
  ['activity', 'view_audit'],
];

export function shopNavItems(permissions: readonly string[]): ShopNavKey[] {
  return RULES.filter(([, perm]) => permissions.includes(perm)).map(([key]) => key);
}
