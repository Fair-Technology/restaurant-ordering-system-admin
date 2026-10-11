import { describe, expect, it, vi } from 'vitest';
import { checkProductImageFile, createDishWithPhoto, dishPhotoMissing, isPhotoRequiredError, replaceDishPhoto, uploadProductImage } from './productImage';

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

describe('dishPhotoMissing', () => {
  it('is missing only when there is neither an existing photo nor a freshly cropped one', () => {
    expect(dishPhotoMissing(null, null)).toBe(true);
    expect(dishPhotoMissing(null, undefined)).toBe(true);
    expect(dishPhotoMissing(null, '')).toBe(true);
    expect(dishPhotoMissing(jpeg(), null)).toBe(false);
    expect(dishPhotoMissing(null, 'https://b/old.jpg')).toBe(false);
    expect(dishPhotoMissing(jpeg(), 'https://b/old.jpg')).toBe(false);
  });
});

describe('isPhotoRequiredError', () => {
  it('recognises the backend refusal to remove the last photo', () => {
    expect(isPhotoRequiredError({ status: 409, data: { error: 'x', code: 'PRODUCT_IMAGE_REQUIRED' } })).toBe(true);
    expect(isPhotoRequiredError({ status: 409, data: { error: 'x', code: 'OPEN_ORDERS' } })).toBe(false);
    expect(isPhotoRequiredError(null)).toBe(false);
  });
});

describe('createDishWithPhoto', () => {
  it('creates the dish, then uploads its photo', async () => {
    const createDish = vi.fn().mockResolvedValue('p1');
    const uploadPhoto = vi.fn().mockResolvedValue(undefined);
    const result = await createDishWithPhoto({ existingProductId: null, createDish, uploadPhoto });
    expect(result).toEqual({ status: 'done', productId: 'p1' });
    expect(uploadPhoto).toHaveBeenCalledWith('p1');
  });

  it('reports a failed upload with the new dish id instead of throwing', async () => {
    const boom = new Error('upload failed');
    const result = await createDishWithPhoto({
      existingProductId: null,
      createDish: vi.fn().mockResolvedValue('p1'),
      uploadPhoto: vi.fn().mockRejectedValue(boom),
    });
    expect(result).toEqual({ status: 'photo-failed', productId: 'p1', error: boom });
  });

  it('retries only the photo when the dish already exists (no duplicate dish)', async () => {
    const createDish = vi.fn();
    const uploadPhoto = vi.fn().mockResolvedValue(undefined);
    const result = await createDishWithPhoto({ existingProductId: 'p1', createDish, uploadPhoto });
    expect(createDish).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'done', productId: 'p1' });
  });

  it('throws when the dish itself cannot be created, and uploads nothing', async () => {
    const uploadPhoto = vi.fn();
    await expect(
      createDishWithPhoto({ existingProductId: null, createDish: vi.fn().mockRejectedValue(new Error('no')), uploadPhoto }),
    ).rejects.toThrow('no');
    expect(uploadPhoto).not.toHaveBeenCalled();
  });
});

describe('replaceDishPhoto', () => {
  const img = { id: 'new', url: 'https://b/new.jpg' };

  it('adds the new photo first, then shrinks the list to just the new one', async () => {
    const calls: string[] = [];
    const result = await replaceDishPhoto({
      hadPhoto: true,
      upload: async () => { calls.push('upload'); return img; },
      keepOnly: async (i) => { calls.push(`keepOnly:${i.id}`); },
    });
    expect(calls).toEqual(['upload', 'keepOnly:new']);
    expect(result).toEqual({ status: 'replaced', image: img });
  });

  it('only adds when the dish had no photo', async () => {
    const keepOnly = vi.fn();
    const result = await replaceDishPhoto({ hadPhoto: false, upload: async () => img, keepOnly });
    expect(keepOnly).not.toHaveBeenCalled();
    expect(result.status).toBe('added');
  });

  it('reports old-kept (not a throw) when the shrink fails after a successful add', async () => {
    const boom = new Error('patch failed');
    const result = await replaceDishPhoto({ hadPhoto: true, upload: async () => img, keepOnly: async () => { throw boom; } });
    expect(result).toEqual({ status: 'old-kept', image: img, error: boom });
  });

  it('throws and removes nothing when the upload itself fails', async () => {
    const keepOnly = vi.fn();
    await expect(replaceDishPhoto({ hadPhoto: true, upload: async () => { throw new Error('up'); }, keepOnly })).rejects.toThrow('up');
    expect(keepOnly).not.toHaveBeenCalled();
  });
});
