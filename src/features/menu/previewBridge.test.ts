import { describe, expect, it } from 'vitest';
import { PREVIEW_SOURCE, isPreviewMessage, previewOrigin, previewUrl, toPreview } from './previewBridge';

describe('previewUrl', () => {
  it('points at the shop in preview mode', () => {
    expect(previewUrl('http://localhost:5175', 'mapasta')).toBe('http://localhost:5175/shops/mapasta?preview=1');
  });

  it('copes with a trailing slash and odd slugs', () => {
    expect(previewUrl('https://shop.example.com/', 'café olé')).toBe('https://shop.example.com/shops/caf%C3%A9%20ol%C3%A9?preview=1');
  });

  it('is null without a storefront address or slug', () => {
    expect(previewUrl(undefined, 'mapasta')).toBeNull();
    expect(previewUrl('http://localhost:5175', undefined)).toBeNull();
  });
});

describe('previewOrigin', () => {
  it('is the scheme, host and port', () => {
    expect(previewOrigin('http://localhost:5175/some/path')).toBe('http://localhost:5175');
  });

  it('is null for a broken address', () => {
    expect(previewOrigin('not a url')).toBeNull();
    expect(previewOrigin(undefined)).toBeNull();
  });
});

describe('isPreviewMessage', () => {
  it('accepts ready and select from the storefront', () => {
    expect(isPreviewMessage({ source: PREVIEW_SOURCE, type: 'ready' })).toBe(true);
    expect(isPreviewMessage({ source: PREVIEW_SOURCE, type: 'select', productId: 'p1' })).toBe(true);
  });

  it('rejects anything else', () => {
    expect(isPreviewMessage(null)).toBe(false);
    expect(isPreviewMessage('ready')).toBe(false);
    expect(isPreviewMessage({ type: 'ready' })).toBe(false);
    expect(isPreviewMessage({ source: 'other', type: 'ready' })).toBe(false);
    expect(isPreviewMessage({ source: PREVIEW_SOURCE, type: 'select' })).toBe(false);
    expect(isPreviewMessage({ source: PREVIEW_SOURCE, type: 'dish', dish: null })).toBe(false);
  });
});

describe('toPreview', () => {
  it('tags the message', () => {
    expect(toPreview({ type: 'refresh' })).toEqual({ source: PREVIEW_SOURCE, type: 'refresh' });
  });
});
