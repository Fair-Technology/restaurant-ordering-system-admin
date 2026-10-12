import { describe, expect, it } from 'vitest';

import { navGroups, shopNavItems } from './shopNav';

describe('shopNavItems', () => {
  it('staff sees only orders', () => {
    expect(shopNavItems(['view_orders'])).toEqual(['orders']);
  });

  it('manager defaults', () => {
    expect(
      shopNavItems(['view_orders', 'manage_menu', 'manage_staff', 'view_audit']),
    ).toEqual(['orders', 'products', 'combos', 'categories', 'tables', 'staff', 'activity']);
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
    ).toEqual(['orders', 'products', 'combos', 'categories', 'tables', 'promotions', 'subscription', 'settings', 'legal', 'staff', 'activity']);
  });

  it('reports for anyone with view_reports', () => {
    expect(shopNavItems(['view_orders', 'view_reports'])).toEqual(['orders', 'reports']);
  });
});

describe('navGroups', () => {
  it('staff gets only the service group', () => {
    expect(navGroups(['view_orders'])).toEqual([{ key: 'service', items: ['orders'] }]);
  });

  it('owner gets all four groups in sidebar order', () => {
    expect(
      navGroups(['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit']),
    ).toEqual([
      { key: 'service', items: ['orders'] },
      { key: 'menu', items: ['products', 'combos', 'categories'] },
      { key: 'shop', items: ['settings', 'tables', 'promotions', 'legal'] },
      { key: 'business', items: ['reports', 'subscription', 'staff', 'activity'] },
    ]);
  });

  it('every page appears in exactly one group', () => {
    const all = navGroups(['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit']).flatMap((g) => g.items);
    expect([...all].sort()).toEqual([...shopNavItems(['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit'])].sort());
  });
});
