import { describe, expect, it, vi } from 'vitest';
import { checkProductImageFile, uploadProductImage } from './productImage';

const jpeg = (size = 5) => new Blob([new Uint8Array(size)], { type: 'image/jpeg' });

describe('checkProductImageFile', () => {
  it('accepts jpeg, png and webp up to 10 MB', () => {
    expect(checkProductImageFile({ type: 'image/webp', size: 10485760 })).toBeNull();
    expect(checkProductImageFile({ type: 'IMAGE/PNG', size: 1 })).toBeNull();
  });
  it('refuses wrong types and big files', () => {
    expect(checkProductImageFile({ type: 'image/gif', size: 1 })).toBe('productImageWrongType');
    expect(checkProductImageFile({ type: 'image/jpeg', size: 10485761 })).toBe('productImageTooLarge');
  });
});

describe('uploadProductImage', () => {
  it('asks for a URL, PUTs the blob, then registers it', async () => {
    const file = jpeg();
    const generateUploadUrl = vi.fn().mockResolvedValue({ imageId: 'i1', uploadUrl: 'https://u', blobUrl: 'https://b' });
    const putBlob = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const addProductImage = vi.fn().mockResolvedValue({});
    await uploadProductImage(file, 'dish.jpg', { generateUploadUrl, putBlob, addProductImage });
    expect(generateUploadUrl).toHaveBeenCalledWith('image/jpeg', 'dish.jpg');
    expect(putBlob).toHaveBeenCalledWith('https://u', file, 'image/jpeg');
    expect(addProductImage).toHaveBeenCalledWith('i1', 'https://b');
  });

  it('does not register the image when the PUT fails', async () => {
    const addProductImage = vi.fn();
    await expect(
      uploadProductImage(jpeg(), 'd.jpg', {
        generateUploadUrl: vi.fn().mockResolvedValue({ imageId: 'i', uploadUrl: 'u', blobUrl: 'b' }),
        putBlob: vi.fn().mockResolvedValue({ ok: false, status: 403 }),
        addProductImage,
      }),
    ).rejects.toThrow('Product image upload failed with status 403');
    expect(addProductImage).not.toHaveBeenCalled();
  });

  it('refuses a bad file before any request', async () => {
    const generateUploadUrl = vi.fn();
    await expect(
      uploadProductImage(new Blob(['x'], { type: 'image/gif' }), 'd.gif', { generateUploadUrl, putBlob: vi.fn(), addProductImage: vi.fn() }),
    ).rejects.toThrow('productImageWrongType');
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });

  it('lets a server refusal (wrong size) reach the caller untouched', async () => {
    const refusal = { status: 400, data: { code: 'PRODUCT_IMAGE_WRONG_SIZE' } };
    await expect(
      uploadProductImage(jpeg(), 'd.jpg', {
        generateUploadUrl: vi.fn().mockResolvedValue({ imageId: 'i', uploadUrl: 'u', blobUrl: 'b' }),
        putBlob: vi.fn().mockResolvedValue({ ok: true, status: 201 }),
        addProductImage: vi.fn().mockRejectedValue(refusal),
      }),
    ).rejects.toBe(refusal);
  });
});
