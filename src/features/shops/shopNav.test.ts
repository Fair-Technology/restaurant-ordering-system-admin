import { describe, expect, it } from 'vitest';

import { firstNavKey, navGroups, navPath, shopNavItems, sidebarBottomItems, sidebarTopItems } from './shopNav';

describe('shopNavItems', () => {
  it('staff sees only orders', () => {
    expect(shopNavItems(['view_orders'])).toEqual(['orders']);
  });

  it('manager defaults', () => {
    expect(
      shopNavItems(['view_orders', 'manage_menu', 'manage_staff', 'view_audit']),
    ).toEqual(['orders', 'products', 'combos', 'categories', 'optionGroups', 'tables', 'staff', 'activity']);
  });

  it('owner', () => {
    expect(
      shopNavItems([
        'view_orders',
        'view_reports',
        'manage_menu',
        'manage_shop',
        'manage_staff',
        'manage_billing',
        'view_audit',
      ]),
    ).toEqual(['dashboard', 'orders', 'products', 'combos', 'categories', 'optionGroups', 'promotions', 'tables', 'legal', 'subscription', 'staff', 'activity', 'settings']);
  });

  it('reports for anyone with view_reports', () => {
    expect(shopNavItems(['view_orders', 'view_reports'])).toEqual(['dashboard', 'orders']);
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
      { key: 'menu', items: ['products', 'combos', 'categories', 'optionGroups', 'promotions'] },
      { key: 'shop', items: ['tables', 'legal'] },
      { key: 'business', items: ['subscription', 'staff', 'activity'] },
    ]);
  });

  it('every grouped page appears in exactly one group, and top entries never in a group', () => {
    const all = ['view_orders', 'view_reports', 'manage_menu', 'manage_shop', 'manage_staff', 'manage_billing', 'view_audit'];
    const grouped = navGroups(all).flatMap((g) => g.items);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...sidebarTopItems(all), ...grouped, ...sidebarBottomItems(all)].sort()).toEqual([...shopNavItems(all)].sort());
    for (const key of sidebarTopItems(all)) expect(grouped).not.toContain(key);
    expect(grouped).not.toContain('dashboard');
    expect(grouped).not.toContain('settings');
    expect(sidebarBottomItems(all)).toEqual(['settings']);
    for (const key of sidebarBottomItems(all)) {
      expect(grouped).not.toContain(key);
      expect(sidebarTopItems(all)).not.toContain(key);
    }
  });
});

describe('sidebarTopItems', () => {
  it('lists the dashboard for view_reports', () => {
    expect(sidebarTopItems(['view_orders', 'view_reports'])).toEqual(['dashboard']);
  });

  it('is empty without view_reports', () => {
    expect(sidebarTopItems(['view_orders'])).toEqual([]);
  });
});

describe('sidebarBottomItems', () => {
  it('lists settings for manage_shop', () => {
    expect(sidebarBottomItems(['view_orders', 'manage_shop'])).toEqual(['settings']);
  });

  it('is empty without manage_shop', () => {
    expect(sidebarBottomItems(['view_orders'])).toEqual([]);
  });
});

describe('firstNavKey', () => {
  it('is the dashboard when allowed', () => {
    expect(firstNavKey(['view_reports', 'view_orders'])).toBe('dashboard');
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
