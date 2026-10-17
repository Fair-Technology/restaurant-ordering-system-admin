import { describe, expect, it } from 'vitest';
import {
  canGoOnline,
  canToggleOrdersPause,
  isOfflineBySuperadminError,
  formatPauseEnd,
  autoPausedCount,
  shopPauseOutOfDate,
  cleanOrdersPausedMessage,
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

describe('cleanOrdersPausedMessage', () => {
  it('trims and drops empty', () => {
    expect(cleanOrdersPausedMessage('  busy  ')).toBe('busy');
    expect(cleanOrdersPausedMessage('   ')).toBe('');
  });
});

describe('timed pauses', () => {
  it('a timed pause ends at its end time', () => {
    const shop = { isPaused: false, ordersPaused: true, ordersPausedUntil: '2026-10-17T12:30:00.000Z' };
    expect(shopLiveState(shop, Date.parse('2026-10-17T12:29:59.999Z'))).toBe('ordersPaused');
    expect(shopLiveState(shop, Date.parse('2026-10-17T12:30:00.000Z'))).toBe('online');
  });

  it('formats the end in the shop time zone', () => {
    expect(formatPauseEnd('2026-10-17T12:30:00.000Z', 'Europe/Berlin', 'en')).toBe('14:30');
    expect(formatPauseEnd('2026-10-18T02:00:00.000Z', 'Europe/Berlin', 'de')).toBe('04:00');
  });

  it('counts an automatic pause only while it is in force', () => {
    const auto = { missedOrders: 3, at: 'x' };
    expect(autoPausedCount({ ordersPaused: true, ordersAutoPaused: auto }, 0)).toBe(3);
    expect(autoPausedCount({ ordersPaused: false, ordersAutoPaused: auto }, 0)).toBeNull();
  });

  it('refreshes the shop only when a newer queue disagrees', () => {
    const qp = { ordersPaused: true, ordersPausedUntil: null, ordersAutoPaused: { missedOrders: 3, at: 'x' } };
    const shop = { ordersPaused: false };
    expect(shopPauseOutOfDate(qp, 2000, shop, 1000, 0)).toBe(true);
    expect(shopPauseOutOfDate(qp, 1000, shop, 2000, 0)).toBe(false);
    expect(shopPauseOutOfDate(undefined, 2000, shop, 1000, 0)).toBe(false);
    expect(shopPauseOutOfDate(qp, 2000, { ordersPaused: true, ordersAutoPaused: { missedOrders: 3, at: 'x' } }, 1000, 0)).toBe(false);
  });

  it('treats an unreadable end time as still paused, and no end as until switched back', () => {
    expect(shopLiveState({ isPaused: false, ordersPaused: true, ordersPausedUntil: 'garbage' }, 0)).toBe('ordersPaused');
    expect(shopLiveState({ isPaused: false, ordersPaused: true, ordersPausedUntil: null }, 0)).toBe('ordersPaused');
  });

  it('refresh decision checks pause state and missed-order count separately, and ignores an equally old queue', () => {
    const none = null;
    // queue says paused (no auto), shop says not paused -> refresh (pause flag alone)
    expect(shopPauseOutOfDate({ ordersPaused: true, ordersPausedUntil: none, ordersAutoPaused: none }, 2000, { ordersPaused: false }, 1000, 0)).toBe(true);
    // same paused flag, different auto-pause count -> refresh (count alone)
    const auto = (n: number) => ({ missedOrders: n, at: 'x' });
    expect(shopPauseOutOfDate({ ordersPaused: true, ordersPausedUntil: none, ordersAutoPaused: auto(4) }, 2000, { ordersPaused: true, ordersAutoPaused: auto(3) }, 1000, 0)).toBe(true);
    // queue fetched at the same instant as the shop is not newer
    expect(shopPauseOutOfDate({ ordersPaused: true, ordersPausedUntil: none, ordersAutoPaused: none }, 1000, { ordersPaused: false }, 1000, 0)).toBe(false);
  });
});
