import { describe, it, expect } from 'vitest';
import { importRowToCreateRequest } from './menuImport';

describe('importRowToCreateRequest', () => {
  it('never sends photos, even when the file had image_url', () => {
    const row = { name: 'A', description: 'd', price: 12.5, image_url: 'https://x/y.jpg' } as unknown as Parameters<typeof importRowToCreateRequest>[1];
    expect(importRowToCreateRequest('shop-1', row)).toEqual({ shopId: 'shop-1', name: 'A', description: 'd', price: 1250, categoryIds: [] });
  });
});
