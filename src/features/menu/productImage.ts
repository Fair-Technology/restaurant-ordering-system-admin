import { IMAGE_MAX_BYTES, IMAGE_TYPES } from '../images/imageRules';
import type { ImageContentType } from '../images/imageRules';

export const PRODUCT_IMAGE_FILE_ERRORS = ['productImageWrongType', 'productImageTooLarge', 'productImageTooSmall', 'productImageWrongSize'] as const;
export type ProductImageFileError = (typeof PRODUCT_IMAGE_FILE_ERRORS)[number];

export function checkProductImageFile(file: Pick<Blob, 'type' | 'size'>): ProductImageFileError | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) return 'productImageWrongType';
  if (file.size > IMAGE_MAX_BYTES) return 'productImageTooLarge';
  return null;
}

export interface ProductImageUploadDeps {
  generateUploadUrl: (contentType: ImageContentType, fileName: string) => Promise<{ imageId: string; uploadUrl: string; blobUrl: string }>;
  putBlob: (uploadUrl: string, file: Blob, contentType: ImageContentType) => Promise<{ ok: boolean; status: number }>;
  addProductImage: (imageId: string, url: string) => Promise<unknown>;
}

/** The one dish-photo upload: SAS URL, PUT the blob, register it with the dish. Used by create and edit. */
export async function uploadProductImage(file: Blob, fileName: string, deps: ProductImageUploadDeps): Promise<void> {
  const fileError = checkProductImageFile(file);
  if (fileError) throw new Error(fileError);
  const contentType = file.type.toLowerCase() as ImageContentType;
  const { imageId, uploadUrl, blobUrl } = await deps.generateUploadUrl(contentType, fileName);
  const res = await deps.putBlob(uploadUrl, file, contentType);
  if (!res.ok) throw new Error(`Product image upload failed with status ${res.status}`);
  await deps.addProductImage(imageId, blobUrl);
}

/** PUT to Azure Blob Storage with the headers it requires. */
export function putBlobToStorage(uploadUrl: string, file: Blob, contentType: ImageContentType): Promise<{ ok: boolean; status: number }> {
  return fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'x-ms-blob-type': 'BlockBlob', 'Content-Type': contentType },
    body: file,
  });
}
