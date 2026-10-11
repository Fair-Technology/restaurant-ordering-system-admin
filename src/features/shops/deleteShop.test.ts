import { describe, expect, it } from 'vitest';
import { canDeleteShop, deleteShopErrorKind, isShopNameMatch, visibleShops } from './deleteShop';

describe('canDeleteShop', () => {
  it('allows only the owner', () => {
    expect(canDeleteShop('owner')).toBe(true);
    expect(canDeleteShop('manager')).toBe(false);
    expect(canDeleteShop('staff')).toBe(false);
    expect(canDeleteShop(null)).toBe(false);
    expect(canDeleteShop(undefined)).toBe(false);
  });
});

describe('isShopNameMatch', () => {
  it('requires the exact name', () => {
    expect(isShopNameMatch('Pizza Hub', 'Pizza Hub')).toBe(true);
    expect(isShopNameMatch('pizza hub', 'Pizza Hub')).toBe(false);
    expect(isShopNameMatch('', '')).toBe(false);
    expect(isShopNameMatch('x', undefined)).toBe(false);
  });
});

describe('deleteShopErrorKind', () => {
  it('maps errors', () => {
    expect(deleteShopErrorKind({ status: 409, data: { code: 'OPEN_ORDERS' } })).toBe('openOrders');
    expect(deleteShopErrorKind({ status: 409, data: { code: 'OTHER' } })).toBe('generic');
    expect(deleteShopErrorKind({ status: 403, data: {} })).toBe('forbidden');
    expect(deleteShopErrorKind({ status: 500 })).toBe('generic');
    expect(deleteShopErrorKind(undefined)).toBe('generic');
  });
});

describe('visibleShops', () => {
  it('drops deleted shops', () => {
    expect(visibleShops([{ isDeleted: true }, { isDeleted: false }, {}])).toHaveLength(2);
  });
});
