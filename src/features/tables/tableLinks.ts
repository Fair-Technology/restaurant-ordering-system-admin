import { toDataURL } from 'qrcode';

export const TABLE_NUMBER_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} -]{0,9}$/u;
export const MAX_TABLE_NUMBERS = 100;
export const PNG_DATA_URL_PREFIX = 'data:image/png;base64,';

/** The tidied table number, or null when it is not 1-10 letters, digits, spaces or dashes starting with a letter or digit. */
export function normaliseTableNumber(raw: string): string | null {
  const t = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  return TABLE_NUMBER_PATTERN.test(t) ? t : null;
}

export interface ParsedTableNumbers {
  valid: string[];
  invalid: string[];
  tooMany: boolean;
}

export function parseTableNumbers(raw: string): ParsedTableNumbers {
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const part of raw.split(',')) {
    const trimmed = part.trim();
    if (trimmed === '') continue;
    const n = normaliseTableNumber(trimmed);
    if (n === null) invalid.push(trimmed);
    else if (!valid.includes(n)) valid.push(n);
  }
  return { valid: valid.slice(0, MAX_TABLE_NUMBERS), invalid, tooMany: valid.length > MAX_TABLE_NUMBERS };
}

export function tableUrl(base: string, slug: string, label: string): string {
  return `${base.replace(/\/+$/, '')}/shops/${encodeURIComponent(slug)}?t=${encodeURIComponent(label)}`;
}

export function qrPngDataUrl(url: string): Promise<string> {
  return toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 1024 });
}
