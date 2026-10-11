import { describe, expect, it } from 'vitest';
import {
  canGoOnline,
  canToggleOrdersPause,
  isOfflineBySuperadminError,
  ordersPausedMessageOrUndefined,
  shopLiveState,
} from './shopStatus';

describe('shopLiveState', () => {
  it('is offline when the owner switched offline', () => {
    expect(shopLiveState({ isPaused: true })).toBe('offline');
  });
  it('is offline when the platform took it offline, even if the owner flag says online', () => {
    expect(shopLiveState({ isPaused: false, offlineBySuperadmin: true })).toBe('offline');
  });
  it('is ordersPaused when online with orders paused', () => {
    expect(shopLiveState({ isPaused: false, ordersPaused: true })).toBe('ordersPaused');
  });
  it('is online otherwise', () => {
    expect(shopLiveState({ isPaused: false, ordersPaused: false })).toBe('online');
  });
  it('treats a missing shop as offline', () => {
    expect(shopLiveState(undefined)).toBe('offline');
  });
});

describe('canGoOnline / canToggleOrdersPause', () => {
  it('blocks going online when taken offline by the platform', () => {
    expect(canGoOnline({ offlineBySuperadmin: true })).toBe(false);
    expect(canGoOnline({ isPaused: true })).toBe(true);
  });
  it('only allows the pause toggle while online', () => {
    expect(canToggleOrdersPause({ isPaused: true })).toBe(false);
    expect(canToggleOrdersPause({ isPaused: false })).toBe(true);
    expect(canToggleOrdersPause({ isPaused: false, ordersPaused: true })).toBe(true);
  });
});

describe('isOfflineBySuperadminError', () => {
  it('matches 409 with the code', () => {
    expect(isOfflineBySuperadminError({ status: 409, data: { code: 'SHOP_OFFLINE_BY_SUPERADMIN' } })).toBe(true);
  });
  it('ignores other errors', () => {
    expect(isOfflineBySuperadminError({ status: 409, data: { code: 'OPEN_ORDERS' } })).toBe(false);
    expect(isOfflineBySuperadminError({ status: 500 })).toBe(false);
    expect(isOfflineBySuperadminError(null)).toBe(false);
  });
});

describe('ordersPausedMessageOrUndefined', () => {
  it('trims and drops empty', () => {
    expect(ordersPausedMessageOrUndefined('  busy  ')).toBe('busy');
    expect(ordersPausedMessageOrUndefined('   ')).toBeUndefined();
  });
});
