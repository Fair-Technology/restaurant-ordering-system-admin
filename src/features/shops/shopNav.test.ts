import { describe, expect, it } from 'vitest';

import { shopNavItems } from './shopNav';

describe('shopNavItems', () => {
  it('staff sees only orders', () => {
    expect(shopNavItems(['view_orders'])).toEqual(['orders']);
  });

  it('manager defaults', () => {
    expect(
      shopNavItems(['view_orders', 'manage_menu', 'manage_staff', 'view_audit']),
    ).toEqual(['orders', 'products', 'categories', 'translations', 'tables', 'staff', 'activity']);
  });

  it('owner', () => {
    expect(
      shopNavItems([
        'view_orders',
        'manage_menu',
        'manage_shop',
        'manage_staff',
        'manage_billing',
        'view_audit',
      ]),
    ).toEqual(['orders', 'products', 'categories', 'translations', 'tables', 'subscription', 'settings', 'legal', 'staff', 'activity']);
  });
});
