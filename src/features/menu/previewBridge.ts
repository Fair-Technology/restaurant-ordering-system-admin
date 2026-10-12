/**
 * Live preview — the real storefront, embedded next to the admin's editors.
 *
 * The storefront runs at `/shops/<slug>?preview=1` inside a frame. Both sides talk with
 * `postMessage`, every message tagged `source: 'fair-preview'`:
 * - admin → storefront: the dish being edited (unsaved texts, price, availability), which dish to
 *   focus or open, "reload after a save", and which menu language to show;
 * - storefront → admin: "ready" when it has loaded, and "select" when a dish is clicked.
 * The storefront keeps the same protocol in `src/utils/preview.ts`.
 */
export const PREVIEW_SOURCE = 'fair-preview';

export interface PreviewDish {
  id: string;
  /** Language of name and description; the storefront applies them only when showing that language */
  lang?: string | null;
  name: string;
  description: string;
  priceCents: number;
  isAvailable: boolean;
}

/** A message for the storefront, before it is tagged with the source. */
export type AdminMessage =
  | { type: 'dish'; dish: PreviewDish | null }
  | { type: 'focus'; productId: string | null; open: boolean }
  | { type: 'refresh' }
  | { type: 'language'; lang: string };

export type AdminToPreview = AdminMessage & { source: typeof PREVIEW_SOURCE };

export type PreviewToAdmin =
  | { source: typeof PREVIEW_SOURCE; type: 'ready' }
  | { source: typeof PREVIEW_SOURCE; type: 'select'; productId: string };

/** The storefront page to embed, or null when the storefront's address isn't configured. */
export function previewUrl(base: string | undefined, slug: string | undefined): string | null {
  if (!base || !slug) return null;
  return `${base.replace(/\/+$/, '')}/shops/${encodeURIComponent(slug)}?preview=1`;
}

/** Origin of the storefront, to check where messages come from and where they go. */
export function previewOrigin(base: string | undefined): string | null {
  if (!base) return null;
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function isPreviewMessage(data: unknown): data is PreviewToAdmin {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as { source?: unknown; type?: unknown; productId?: unknown };
  if (d.source !== PREVIEW_SOURCE) return false;
  if (d.type === 'ready') return true;
  return d.type === 'select' && typeof d.productId === 'string' && d.productId.length > 0;
}

/** Builds a message for the storefront. */
export function toPreview(message: AdminMessage): AdminToPreview {
  return { source: PREVIEW_SOURCE, ...message };
}
