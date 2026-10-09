import { describe, expect, it } from 'vitest';

import { afterLoginPath, staffRedirectFor } from './redirects';

describe('redirects', () => {
  it('staff stay in their restaurant, and /phone opens their phone view', () => {
    expect(staffRedirectFor('/phone', 's1')).toBe('/shops/s1/phone');
    expect(staffRedirectFor('/shops/s1/reports', 's1')).toBeNull();
    expect(staffRedirectFor('/', 's1')).toBe('/shops/s1/orders');
    expect(staffRedirectFor('/shops/s2/orders', 's1')).toBe('/shops/s1/orders');
  });

  it('after sign-in, only safe in-app paths', () => {
    expect(afterLoginPath('/phone')).toBe('/phone');
    expect(afterLoginPath(null)).toBe('/');
    expect(afterLoginPath('//evil.example')).toBe('/');
    expect(afterLoginPath('https://evil.example')).toBe('/');
    expect(afterLoginPath('/login')).toBe('/');
  });
});
