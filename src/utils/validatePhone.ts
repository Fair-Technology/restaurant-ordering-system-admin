/** Same charset/length rule rs-backend enforces for customerPhone: digits, spaces, + - ( ) . only, 6-15 digits. */
export function isPlausiblePhone(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > 30) return false;
  if (!/^[0-9+\-().\s]+$/.test(trimmed)) return false;
  const digitCount = trimmed.replace(/\D/g, '').length;
  return digitCount >= 6 && digitCount <= 15;
}
