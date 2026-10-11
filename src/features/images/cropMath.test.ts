import { describe, expect, it, vi } from 'vitest';
import { COVER_IMAGE_RULE, DISH_IMAGE_RULE } from './imageRules';
import { planDraw, previewArea, renderCrop, safeAreaFraction } from './cropMath';
import type { CropCanvas } from './cropMath';

describe('safeAreaFraction', () => {
  it('cover phones see the centre two thirds', () => {
    expect(safeAreaFraction(COVER_IMAGE_RULE)).toBeCloseTo(2 / 3);
    // 2/3 of the stored 1920 px is 1280 px
    expect(safeAreaFraction(COVER_IMAGE_RULE) * COVER_IMAGE_RULE.outputWidth).toBeCloseTo(1280);
  });
  it('dish phone list sees the centre square (3/4 of the width)', () => {
    expect(safeAreaFraction(DISH_IMAGE_RULE)).toBeCloseTo(0.75);
  });
});

describe('previewArea', () => {
  const area = { x: 10, y: 20, width: 60, height: 30 };
  it('same ratio shows the whole crop', () => {
    expect(previewArea(area, 3, 3)).toEqual(area);
  });
  it('narrower preview shows the centred part at full height', () => {
    const p = previewArea(area, 3, 2);
    expect(p.width).toBeCloseTo(40);
    expect(p.x).toBeCloseTo(20);
    expect(p.y).toBe(20);
    expect(p.height).toBe(30);
  });
  it('never widens', () => {
    expect(previewArea(area, 1, 3).width).toBe(60);
  });
});

describe('planDraw', () => {
  it('maps a crop area to the exact output size', () => {
    expect(planDraw({ x: 100.4, y: 50.6, width: 2400.2, height: 799.7 }, COVER_IMAGE_RULE)).toEqual({
      sx: 100, sy: 51, sw: 2400, sh: 800, dw: 1920, dh: 640,
    });
  });
  it('dish output is 1200 x 900', () => {
    const plan = planDraw({ x: 0, y: 0, width: 1600, height: 1200 }, DISH_IMAGE_RULE);
    expect([plan.dw, plan.dh]).toEqual([1200, 900]);
  });
  it('never asks for an empty source rectangle', () => {
    const plan = planDraw({ x: 0, y: 0, width: 0, height: 0 }, DISH_IMAGE_RULE);
    expect(plan.sw).toBe(1);
    expect(plan.sh).toBe(1);
  });
});

function fakeCanvas() {
  const drawImage = vi.fn();
  const toBlob = vi.fn<CropCanvas['toBlob']>((cb, type) => cb(new Blob(['x'], { type })));
  const canvas: CropCanvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob };
  return { canvas, drawImage, toBlob };
}

describe('renderCrop', () => {
  const image = {} as CanvasImageSource;

  it('renders the cover at exactly 1920 x 640 as JPEG quality 0.85', async () => {
    const { canvas, drawImage, toBlob } = fakeCanvas();
    const blob = await renderCrop(image, { x: 10, y: 20, width: 1800, height: 600 }, COVER_IMAGE_RULE, () => canvas);
    expect([canvas.width, canvas.height]).toEqual([1920, 640]);
    expect(drawImage).toHaveBeenCalledWith(image, 10, 20, 1800, 600, 0, 0, 1920, 640);
    expect(toBlob.mock.calls[0][1]).toBe('image/jpeg');
    expect(toBlob.mock.calls[0][2]).toBe(0.85);
    expect(blob.type).toBe('image/jpeg');
  });

  it('renders a dish photo at exactly 1200 x 900', async () => {
    const { canvas } = fakeCanvas();
    await renderCrop(image, { x: 0, y: 0, width: 800, height: 600 }, DISH_IMAGE_RULE, () => canvas);
    expect([canvas.width, canvas.height]).toEqual([1200, 900]);
  });

  it('rejects when the canvas cannot export', async () => {
    const { canvas } = fakeCanvas();
    canvas.toBlob = (cb) => cb(null);
    await expect(renderCrop(image, { x: 0, y: 0, width: 8, height: 6 }, DISH_IMAGE_RULE, () => canvas)).rejects.toThrow('imageCropExportFailed');
  });

  it('rejects when there is no 2d context', async () => {
    const { canvas } = fakeCanvas();
    canvas.getContext = () => null;
    await expect(renderCrop(image, { x: 0, y: 0, width: 8, height: 6 }, DISH_IMAGE_RULE, () => canvas)).rejects.toThrow('imageCropNoCanvas');
  });
});
