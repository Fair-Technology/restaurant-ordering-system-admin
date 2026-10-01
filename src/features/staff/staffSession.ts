export interface StaffSession {
  token: string;
  expiresAt: string;
  shopId: string;
  shopSlug: string;
  staffId: string;
  username: string;
  role: 'manager' | 'staff';
}

export const STAFF_SESSION_KEY = 'ros.staffSession.v1';

const REQUIRED_STRING_FIELDS = [
  'token',
  'expiresAt',
  'shopId',
  'shopSlug',
  'staffId',
  'username',
] as const;

export function parseStaffSession(raw: string | null, now: Date): StaffSession | null {
  if (raw === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;

  for (const field of REQUIRED_STRING_FIELDS) {
    if (typeof candidate[field] !== 'string') return null;
  }
  if (candidate.role !== 'manager' && candidate.role !== 'staff') return null;

  const session = candidate as unknown as StaffSession;
  if (Date.parse(session.expiresAt) <= now.getTime()) return null;

  return session;
}

export function readStaffSession(now: Date = new Date()): StaffSession | null {
  return parseStaffSession(localStorage.getItem(STAFF_SESSION_KEY), now);
}

export function writeStaffSession(session: StaffSession): void {
  localStorage.setItem(STAFF_SESSION_KEY, JSON.stringify(session));
}

export function clearStaffSession(): void {
  localStorage.removeItem(STAFF_SESSION_KEY);
}
