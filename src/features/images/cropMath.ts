import type { ImageRule } from './imageRules';

/** A rectangle in whole source-image pixels (what react-easy-crop calls croppedAreaPixels). */
export interface PixelArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A rectangle as percentages (0-100) of the source image (react-easy-crop's croppedArea). */
export type PercentArea = PixelArea;

/** Width of the safe area as a fraction (0-1) of the crop frame's width; it always spans the full height. */
export function safeAreaFraction(rule: Pick<ImageRule, 'aspect' | 'safeAspect'>): number {
  return Math.min(1, rule.safeAspect / rule.aspect);
}

/** The part of the crop a smaller preview shows: centred, full height, narrowed to the preview's ratio. */
export function previewArea(area: PercentArea, frameAspect: number, previewAspect: number): PercentArea {
  const fraction = Math.min(1, previewAspect / frameAspect);
  const width = area.width * fraction;
  return { x: area.x + (area.width - width) / 2, y: area.y, width, height: area.height };
}

/** The arguments for canvas drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh) for a given crop. */
export interface DrawPlan {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dw: number;
  dh: number;
}

/** Turns a crop area (source pixels) into the draw call that fills the exact output size. */
export function planDraw(area: PixelArea, rule: Pick<ImageRule, 'outputWidth' | 'outputHeight'>): DrawPlan {
  return {
    sx: Math.round(area.x),
    sy: Math.round(area.y),
    sw: Math.max(1, Math.round(area.width)),
    sh: Math.max(1, Math.round(area.height)),
    dw: rule.outputWidth,
    dh: rule.outputHeight,
  };
}

/** The slice of a canvas we need; lets tests pass a fake. */
export interface CropCanvas {
  width: number;
  height: number;
  getContext: (type: '2d') => {
    drawImage: (image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number) => void;
    imageSmoothingQuality?: string;
  } | null;
  toBlob: (cb: (blob: Blob | null) => void, type?: string, quality?: number) => void;
}

export function createDomCanvas(): CropCanvas {
  return document.createElement('canvas') as unknown as CropCanvas;
}

/**
 * Draws the crop onto a canvas of exactly the rule's output size and exports it as a JPEG Blob.
 * The original file is never used beyond being drawn.
 */
export function renderCrop(
  image: CanvasImageSource,
  area: PixelArea,
  rule: ImageRule,
  createCanvas: () => CropCanvas = createDomCanvas,
): Promise<Blob> {
  const plan = planDraw(area, rule);
  const canvas = createCanvas();
  canvas.width = rule.outputWidth;
  canvas.height = rule.outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('imageCropNoCanvas'));
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, plan.sx, plan.sy, plan.sw, plan.sh, 0, 0, plan.dw, plan.dh);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('imageCropExportFailed'))),
      rule.outputMime,
      rule.outputQuality,
    );
  });
}
