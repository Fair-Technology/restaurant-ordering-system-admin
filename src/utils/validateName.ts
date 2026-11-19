/** Trims `value`; returns the trimmed name, or null if it is empty after trimming. */
export function requiredName(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}
