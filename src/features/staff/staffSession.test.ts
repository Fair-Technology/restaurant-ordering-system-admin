import { describe, expect, it } from 'vitest';

import { parseStaffSession } from './staffSession';

const VALID_RAW = JSON.stringify({
  token: 't',
  expiresAt: '2026-09-25T22:00:00.000Z',
  shopId: 'shop-1',
  shopSlug: 'pizzeria-kreuzberg',
  staffId: 'st-1',
  username: 'kitchen',
  role: 'staff',
});
const NOW = new Date('2026-09-25T10:00:00Z');

describe('parseStaffSession', () => {
  it('parses a live session', () => {
    expect(parseStaffSession(VALID_RAW, NOW)).toEqual({
      token: 't',
      expiresAt: '2026-09-25T22:00:00.000Z',
      shopId: 'shop-1',
      shopSlug: 'pizzeria-kreuzberg',
      staffId: 'st-1',
      username: 'kitchen',
      role: 'staff',
    });
  });

  it('expired', () => {
    expect(parseStaffSession(VALID_RAW, new Date('2026-09-25T22:00:00Z'))).toBeNull();
  });

  it('null raw', () => {
    expect(parseStaffSession(null, NOW)).toBeNull();
  });

  it('bad json', () => {
    expect(parseStaffSession('{', NOW)).toBeNull();
  });

  it('bad role', () => {
    const raw = JSON.stringify({
      ...JSON.parse(VALID_RAW),
      role: 'owner',
    });
    expect(parseStaffSession(raw, NOW)).toBeNull();
  });

  it('missing field', () => {
    const parsed = JSON.parse(VALID_RAW);
    delete parsed.token;
    expect(parseStaffSession(JSON.stringify(parsed), NOW)).toBeNull();
  });
});
