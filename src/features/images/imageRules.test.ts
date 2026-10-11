import { describe, expect, it } from 'vitest';
import { COVER_IMAGE_RULE, DISH_IMAGE_RULE, isWrongSizeError, meetsMinimumSize } from './imageRules';

describe('image rules', () => {
  it('cover is 3:1 at 1920 x 640, minimum 1200 x 400', () => {
    expect(COVER_IMAGE_RULE.outputWidth / COVER_IMAGE_RULE.outputHeight).toBe(COVER_IMAGE_RULE.aspect);
    expect(COVER_IMAGE_RULE.minWidth / COVER_IMAGE_RULE.minHeight).toBe(3);
  });
  it('dish is 4:3 at 1200 x 900, minimum 800 x 600', () => {
    expect(DISH_IMAGE_RULE.outputWidth / DISH_IMAGE_RULE.outputHeight).toBeCloseTo(DISH_IMAGE_RULE.aspect);
    expect(DISH_IMAGE_RULE.minWidth / DISH_IMAGE_RULE.minHeight).toBeCloseTo(4 / 3);
  });
});

describe('meetsMinimumSize', () => {
  it('accepts exactly the minimum and larger', () => {
    expect(meetsMinimumSize(1200, 400, COVER_IMAGE_RULE)).toBe(true);
    expect(meetsMinimumSize(4000, 3000, COVER_IMAGE_RULE)).toBe(true);
    expect(meetsMinimumSize(800, 600, DISH_IMAGE_RULE)).toBe(true);
  });
  it('refuses a photo short in either direction', () => {
    expect(meetsMinimumSize(1199, 400, COVER_IMAGE_RULE)).toBe(false);
    expect(meetsMinimumSize(1200, 399, COVER_IMAGE_RULE)).toBe(false);
    expect(meetsMinimumSize(799, 600, DISH_IMAGE_RULE)).toBe(false);
    expect(meetsMinimumSize(800, 599, DISH_IMAGE_RULE)).toBe(false);
  });
});

describe('isWrongSizeError', () => {
  it('recognises both server codes', () => {
    expect(isWrongSizeError({ status: 400, data: { error: 'x', code: 'COVER_IMAGE_WRONG_SIZE' } })).toBe(true);
    expect(isWrongSizeError({ status: 400, data: { code: 'PRODUCT_IMAGE_WRONG_SIZE' } })).toBe(true);
  });
  it('ignores everything else', () => {
    expect(isWrongSizeError({ status: 400, data: { error: 'x' } })).toBe(false);
    expect(isWrongSizeError({ status: 409, data: { code: 'OPEN_ORDERS' } })).toBe(false);
    expect(isWrongSizeError(new Error('x'))).toBe(false);
    expect(isWrongSizeError(null)).toBe(false);
  });
});
