import { describe, expect, it } from 'vitest';

import { navGroups, navPath, shopNavItems } from './shopNav';

describe('shopNavItems', () => {
  it('staff sees only orders', () => {
    expect(shopNavItems(['view_orders'])).toEqual(['orders']);
  });

  it('manager defaults', () => {
    expect(
      shopNavItems(['view_orders', 'manage_menu', 'manage_staff', 'view_audit']),
    ).toEqual(['orders', 'products', 'optionGroups', 'combos', 'categories', 'tables', 'staff', 'activity']);
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
    ).toEqual(['orders', 'products', 'optionGroups', 'combos', 'categories', 'tables', 'promotions', 'subscription', 'settings', 'legal', 'staff', 'activity']);
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
      { key: 'menu', items: ['products', 'optionGroups', 'combos', 'categories'] },
      { key: 'shop', items: ['settings', 'tables', 'promotions', 'legal'] },
      { key: 'business', items: ['reports', 'subscription', 'staff', 'activity'] },
    ]);
  });

  it('every page appears in exactly one group', () => {
    const all = navGroups(['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit']).flatMap((g) => g.items);
    expect([...all].sort()).toEqual([...shopNavItems(['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit'])].sort());
  });
});

describe('navPath', () => {
  // A key is not an URL segment: the dish list is the shop index and the library
  // lives at /option-groups. A keyed path sent the sidebar link to /optionGroups, a 404.
  it('maps the dish list to the shop index', () => {
    expect(navPath('s1', 'products')).toBe('/shops/s1');
  });

  it('maps the option-group library to its hyphenated route', () => {
    expect(navPath('s1', 'optionGroups')).toBe('/shops/s1/option-groups');
  });

  it('uses the key itself for every other page', () => {
    expect(navPath('s1', 'orders')).toBe('/shops/s1/orders');
    expect(navPath('s1', 'categories')).toBe('/shops/s1/categories');
  });
});
