import { describe, expect, it } from 'vitest';

import { firstNavKey, navGroups, navPath, shopNavItems, sidebarTopItems } from './shopNav';

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
    ).toEqual(['orders', 'products', 'optionGroups', 'combos', 'categories', 'settings', 'tables', 'promotions', 'legal', 'subscription', 'staff', 'activity']);
  });

  it('reports for anyone with view_reports', () => {
    expect(shopNavItems(['view_orders', 'view_reports'])).toEqual(['reports', 'orders']);
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
      { key: 'business', items: ['subscription', 'staff', 'activity'] },
    ]);
  });

  it('every grouped page appears in exactly one group, and top entries never in a group', () => {
    const all = ['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit'];
    const grouped = navGroups(all).flatMap((g) => g.items);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...sidebarTopItems(all), ...grouped].sort()).toEqual([...shopNavItems(all)].sort());
    for (const key of sidebarTopItems(all)) expect(grouped).not.toContain(key);
    expect(grouped).not.toContain('reports');
  });
});

describe('sidebarTopItems', () => {
  it('lists the dashboard for view_reports', () => {
    expect(sidebarTopItems(['view_orders', 'view_reports'])).toEqual(['reports']);
  });

  it('is empty without view_reports', () => {
    expect(sidebarTopItems(['view_orders'])).toEqual([]);
  });
});

describe('firstNavKey', () => {
  it('is the dashboard when allowed', () => {
    expect(firstNavKey(['view_reports', 'view_orders'])).toBe('reports');
  });

  it('is orders without view_reports, even though reports comes first', () => {
    expect(firstNavKey(['view_orders'])).toBe('orders');
  });

  it('is undefined when nothing is allowed', () => {
    expect(firstNavKey([])).toBeUndefined();
  });
});

describe('navPath', () => {
  // A key is not always an URL segment: the library lives at /option-groups.
  // A keyed path sent the sidebar link to /optionGroups, a 404.
  it('maps the dish list to its own products route', () => {
    expect(navPath('s1', 'products')).toBe('/shops/s1/products');
  });

  it('maps the option-group library to its hyphenated route', () => {
    expect(navPath('s1', 'optionGroups')).toBe('/shops/s1/option-groups');
  });

  it('uses the key itself for every other page', () => {
    expect(navPath('s1', 'orders')).toBe('/shops/s1/orders');
    expect(navPath('s1', 'categories')).toBe('/shops/s1/categories');
  });
});
