import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SIDEBAR_HIDDEN_KEY,
  parseSidebarHidden,
  readSidebarHidden,
  writeSidebarHidden,
} from './sidebarPreference';

describe('sidebarPreference', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the documented storage key', () => {
    expect(SIDEBAR_HIDDEN_KEY).toBe('ros.sidebarHidden');
  });

  it('treats a missing or junk value as shown', () => {
    expect(parseSidebarHidden(null)).toBe(false);
    expect(parseSidebarHidden('0')).toBe(false);
    expect(parseSidebarHidden('junk')).toBe(false);
  });

  it('treats "1" as hidden', () => {
    expect(parseSidebarHidden('1')).toBe(true);
  });

  it('reads false on an empty store and true after writing hidden', () => {
    expect(readSidebarHidden()).toBe(false);
    writeSidebarHidden(true);
    expect(readSidebarHidden()).toBe(true);
  });

  it('stores "0" when shown again', () => {
    writeSidebarHidden(true);
    writeSidebarHidden(false);
    expect(store[SIDEBAR_HIDDEN_KEY]).toBe('0');
    expect(readSidebarHidden()).toBe(false);
  });
});
