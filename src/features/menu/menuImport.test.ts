import { describe, it, expect } from 'vitest';
import { buildExampleMenuImportFile, importRowToCreateRequest, parseMenuImport } from './menuImport';

describe('importRowToCreateRequest', () => {
  it('never sends photos, even when the file had image_url', () => {
    const row = { name: 'A', description: 'd', price: 12.5, image_url: 'https://x/y.jpg' } as unknown as Parameters<typeof importRowToCreateRequest>[1];
    expect(importRowToCreateRequest('shop-1', row)).toEqual({ shopId: 'shop-1', name: 'A', description: 'd', price: 1250, categoryIds: [] });
  });
});

describe('parseMenuImport', () => {
  it('parses the downloadable example file into exactly 3 rows', () => {
    const rows = parseMenuImport(buildExampleMenuImportFile());
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({ name: 'Garden Salad', description: 'Mixed greens, cherry tomatoes, cucumber and a light vinaigrette.', price: 7.5 });
  });

  it('rejects a non-array', () => {
    expect(() => parseMenuImport('{}')).toThrow('JSON must be an array');
  });

  it('rejects a missing name', () => {
    expect(() => parseMenuImport('[{"description":"x","price":1}]')).toThrow('Item 1: "name" is required');
  });

  it('rejects a missing description', () => {
    expect(() => parseMenuImport('[{"name":"A","price":1}]')).toThrow('Item 1: "description" is required');
  });
});
