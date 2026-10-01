const lin = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};

export function contrastRatio(hexA: string, hexB: string): number {
  const x = lum(hexA);
  const y = lum(hexB);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function accentContrastOnWhite(hex: string): { ratio: number; ok: boolean } | null {
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) return null;
  const ratio = contrastRatio(hex, '#FFFFFF');
  return { ratio, ok: ratio >= 3 };
}
