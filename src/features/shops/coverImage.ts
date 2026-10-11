import { IMAGE_MAX_BYTES, IMAGE_TYPES } from '../images/imageRules';
import type { ImageContentType } from '../images/imageRules';

export const COVER_IMAGE_MAX_BYTES = IMAGE_MAX_BYTES;
export const COVER_IMAGE_TYPES = IMAGE_TYPES;
export type CoverImageContentType = ImageContentType;
export const COVER_IMAGE_FILE_ERRORS = ['coverImageWrongType', 'coverImageTooLarge', 'coverImageTooSmall', 'coverImageWrongSize'] as const;
export type CoverImageFileError = (typeof COVER_IMAGE_FILE_ERRORS)[number];

export function checkCoverImageFile(file: Pick<Blob, 'type' | 'size'>): CoverImageFileError | null {
  if (!(COVER_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) return 'coverImageWrongType';
  if (file.size > COVER_IMAGE_MAX_BYTES) return 'coverImageTooLarge';
  return null;
}

export interface CoverImageUploadDeps {
  generateUploadUrl: (contentType: CoverImageContentType) => Promise<{ imageId: string; uploadUrl: string; blobUrl: string }>;
  putBlob: (uploadUrl: string, file: Blob, contentType: CoverImageContentType) => Promise<{ ok: boolean; status: number }>;
  setCoverImage: (imageId: string, url: string) => Promise<unknown>;
}

export async function uploadCoverImage(file: Blob, deps: CoverImageUploadDeps): Promise<void> {
  const fileError = checkCoverImageFile(file);
  if (fileError) throw new Error(fileError);
  const contentType = file.type.toLowerCase() as CoverImageContentType;
  const { imageId, uploadUrl, blobUrl } = await deps.generateUploadUrl(contentType);
  const res = await deps.putBlob(uploadUrl, file, contentType);
  if (!res.ok) throw new Error(`Cover image upload failed with status ${res.status}`);
  await deps.setCoverImage(imageId, blobUrl);
}
