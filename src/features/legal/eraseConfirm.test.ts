import { describe, expect, it } from 'vitest';
import { isEraseEmailMatch } from './eraseConfirm';

describe('isEraseEmailMatch', () => {
  it('matches case-insensitively', () => {
    expect(isEraseEmailMatch('Jane@Example.com', 'jane@example.com')).toBe(true);
  });
  it('rejects empty typed text, even against an empty email', () => {
    expect(isEraseEmailMatch('', 'jane@example.com')).toBe(false);
    expect(isEraseEmailMatch('  ', '')).toBe(false);
  });
  it('trims whitespace on both sides', () => {
    expect(isEraseEmailMatch('  jane@example.com ', ' jane@example.com')).toBe(true);
  });
  it('rejects a different or partial email', () => {
    expect(isEraseEmailMatch('jane@example', 'jane@example.com')).toBe(false);
  });
});
