import { describe, expect, it } from 'vitest';

import { afterLoginPath, shopLandingPath, staffRedirectFor } from './redirects';

describe('redirects', () => {
  it('staff stay in their restaurant, and /phone opens their phone view', () => {
    expect(staffRedirectFor('/phone', 's1')).toBe('/shops/s1/phone');
    expect(staffRedirectFor('/shops/s1/reports', 's1')).toBeNull();
    expect(staffRedirectFor('/', 's1')).toBe('/shops/s1/reports');
    expect(staffRedirectFor('/shops/s2/orders', 's1')).toBe('/shops/s1/reports');
  });

  it('shopLandingPath opens the first page the user may open', () => {
    expect(shopLandingPath('s1', ['view_orders', 'view_reports'])).toBe('/shops/s1/reports');
    expect(shopLandingPath('s1', ['view_orders'])).toBe('/shops/s1/orders');
    expect(shopLandingPath('s1', [])).toBe('/shops/s1/phone');
  });

  it('after sign-in, only safe in-app paths', () => {
    expect(afterLoginPath('/phone')).toBe('/phone');
    expect(afterLoginPath(null)).toBe('/');
    expect(afterLoginPath('//evil.example')).toBe('/');
    expect(afterLoginPath('https://evil.example')).toBe('/');
    expect(afterLoginPath('/login')).toBe('/');
  });
});
