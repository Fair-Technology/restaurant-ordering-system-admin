/** Format the backend accepts for a shop slug (client-side hint only; the backend is the authority). */
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Suggests a shop link from a shop name. Returns '' when the name has no Latin letters or digits. */
export function slugFromName(name: string): string {
  return (
    name
      .trim()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/Ä/g, 'Ae')
      .replace(/Ö/g, 'Oe')
      .replace(/Ü/g, 'Ue')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 64)
      .replace(/-+$/, '')
  );
}
