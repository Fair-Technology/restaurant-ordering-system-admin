export const SHOP_NAME_MIN_LENGTH = 3;
export const SHOP_NAME_MAX_LENGTH = 80;

/** i18n key of the first problem with a requested shop name, or null when it can be submitted. */
export function nameChangeValidationError(requestedName: string, currentName: string): string | null {
  const name = requestedName.trim();
  if (name.length < SHOP_NAME_MIN_LENGTH) return 'shops.nameChangeMinLength';
  if (name.length > SHOP_NAME_MAX_LENGTH) return 'shops.nameChangeMaxLength';
  if (/[<>]/.test(name)) return 'shops.nameChangeInvalidChars';
  if (name.toLowerCase() === currentName.trim().toLowerCase()) return 'shops.nameChangeUnchanged';
  return null;
}
