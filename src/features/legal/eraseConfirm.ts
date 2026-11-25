/** True when the typed text equals the customer email (trimmed, case-insensitive). */
export function isEraseEmailMatch(typed: string, email: string): boolean {
  const t = typed.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  return t !== '' && t === e;
}
