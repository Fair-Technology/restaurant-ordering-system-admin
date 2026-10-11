/**
 * The one place that defines the fixed shape of every uploaded image.
 * The backend enforces the same output sizes (COVER_IMAGE_WRONG_SIZE / PRODUCT_IMAGE_WRONG_SIZE).
 */
export interface ImageRule {
  /** Crop frame ratio, width / height. */
  aspect: number;
  /** Exact stored size in pixels. */
  outputWidth: number;
  outputHeight: number;
  /** Smallest source photo that is accepted (smaller would look blurry). */
  minWidth: number;
  minHeight: number;
  /** Ratio (width / height) of the "safe area" shown on phones, centred in the frame. */
  safeAspect: number;
  outputMime: 'image/jpeg';
  outputQuality: number;
}

/** Shop cover (storefront banner): 3:1, phones show the centre 2:1. */
export const COVER_IMAGE_RULE: ImageRule = {
  aspect: 3,
  outputWidth: 1920,
  outputHeight: 640,
  minWidth: 1200,
  minHeight: 400,
  safeAspect: 2,
  outputMime: 'image/jpeg',
  outputQuality: 0.85,
};

/** Dish photo: 4:3, the phone list shows the centre square. */
export const DISH_IMAGE_RULE: ImageRule = {
  aspect: 4 / 3,
  outputWidth: 1200,
  outputHeight: 900,
  minWidth: 800,
  minHeight: 600,
  safeAspect: 1,
  outputMime: 'image/jpeg',
  outputQuality: 0.85,
};

/** Existing upload limit, shared by cover and dish photos. */
export const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export type ImageContentType = (typeof IMAGE_TYPES)[number];

/** True when the source photo is at least the rule's minimum size. */
export function meetsMinimumSize(width: number, height: number, rule: ImageRule): boolean {
  return width >= rule.minWidth && height >= rule.minHeight;
}

/** Server error codes returned when the uploaded image has the wrong pixel size. */
export const WRONG_SIZE_CODES = ['COVER_IMAGE_WRONG_SIZE', 'PRODUCT_IMAGE_WRONG_SIZE'] as const;

/** True when a failed API call (RTK Query error) was the server refusing the image's pixel size. */
export function isWrongSizeError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { data } = error as { data?: unknown };
  if (typeof data !== 'object' || data === null) return false;
  const code = (data as { code?: unknown }).code;
  return (WRONG_SIZE_CODES as readonly unknown[]).includes(code);
}
