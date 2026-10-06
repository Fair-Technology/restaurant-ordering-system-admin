import { describe, expect, it, vi } from 'vitest';

import { checkCoverImageFile, uploadCoverImage } from './coverImage';

describe('checkCoverImageFile', () => {
  it('accepts a 10 MB PNG', () => {
    expect(checkCoverImageFile({ type: 'image/png', size: 10485760 })).toBeNull();
  });

  it('refuses a file one byte over 10 MB', () => {
    expect(checkCoverImageFile({ type: 'image/jpeg', size: 10485761 })).toBe('coverImageTooLarge');
  });

  it('refuses HEIC', () => {
    expect(checkCoverImageFile({ type: 'image/heic', size: 100 })).toBe('coverImageWrongType');
  });

  it('reports the wrong type before the size', () => {
    expect(checkCoverImageFile({ type: 'image/gif', size: 20000000 })).toBe('coverImageWrongType');
  });
});

describe('uploadCoverImage', () => {
  it('uploads, then saves the cover', async () => {
    const file = new Blob(['x'], { type: 'image/webp' });
    const generateUploadUrl = vi.fn().mockResolvedValue({ imageId: 'img-1', uploadUrl: 'https://sas/upload', blobUrl: 'https://blob/img-1.webp' });
    const putBlob = vi.fn().mockResolvedValue({ ok: true, status: 201 });
    const setCoverImage = vi.fn().mockResolvedValue({});
    await uploadCoverImage(file, { generateUploadUrl, putBlob, setCoverImage });
    expect(generateUploadUrl).toHaveBeenCalledWith('image/webp');
    expect(putBlob).toHaveBeenCalledWith('https://sas/upload', file, 'image/webp');
    expect(setCoverImage).toHaveBeenCalledWith('img-1', 'https://blob/img-1.webp');
    expect(generateUploadUrl.mock.invocationCallOrder[0]).toBeLessThan(putBlob.mock.invocationCallOrder[0]);
    expect(putBlob.mock.invocationCallOrder[0]).toBeLessThan(setCoverImage.mock.invocationCallOrder[0]);
  });

  it('does not save the cover when the upload fails', async () => {
    const file = new Blob(['x'], { type: 'image/png' });
    const generateUploadUrl = vi.fn().mockResolvedValue({ imageId: 'img-1', uploadUrl: 'u', blobUrl: 'b' });
    const putBlob = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    const setCoverImage = vi.fn();
    await expect(uploadCoverImage(file, { generateUploadUrl, putBlob, setCoverImage })).rejects.toThrow('Cover image upload failed with status 403');
    expect(setCoverImage).not.toHaveBeenCalled();
  });

  it('stops before asking for an upload link when the file is too big', async () => {
    const file = new Blob([new Uint8Array(10485761)], { type: 'image/png' });
    const generateUploadUrl = vi.fn();
    await expect(uploadCoverImage(file, { generateUploadUrl, putBlob: vi.fn(), setCoverImage: vi.fn() })).rejects.toThrow('coverImageTooLarge');
    expect(generateUploadUrl).not.toHaveBeenCalled();
  });
});
