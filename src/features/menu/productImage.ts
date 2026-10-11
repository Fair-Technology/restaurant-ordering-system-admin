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

/** A dish needs a photo: either one it already has, or a freshly cropped one waiting to be uploaded. */
export function dishPhotoMissing(pickedFile: Blob | null, existingImageUrl: string | null | undefined): boolean {
  return !pickedFile && !existingImageUrl;
}

export const PRODUCT_IMAGE_REQUIRED_CODE = 'PRODUCT_IMAGE_REQUIRED';

/** True when a failed API call (RTK Query error) was the server refusing to leave a dish without a photo. */
export function isPhotoRequiredError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const { data } = error as { data?: unknown };
  if (typeof data !== 'object' || data === null) return false;
  return (data as { code?: unknown }).code === PRODUCT_IMAGE_REQUIRED_CODE;
}

export interface CreateDishWithPhotoArgs {
  /** Set when an earlier attempt already created the dish but its photo upload failed: then only the photo is retried. */
  existingProductId: string | null;
  createDish: () => Promise<string>;
  uploadPhoto: (productId: string) => Promise<void>;
}

export type CreateDishWithPhotoResult =
  | { status: 'done'; productId: string }
  | { status: 'photo-failed'; productId: string; error: unknown };

/**
 * Create the dish (unless it already exists), then upload its photo. A dish can only get its photo after it exists,
 * so a failed upload leaves a photo-less dish: the result carries its id so the caller can retry just the photo
 * instead of creating a duplicate. A failed create throws (no dish exists yet).
 */
export async function createDishWithPhoto(args: CreateDishWithPhotoArgs): Promise<CreateDishWithPhotoResult> {
  const productId = args.existingProductId ?? (await args.createDish());
  try {
    await args.uploadPhoto(productId);
    return { status: 'done', productId };
  } catch (error) {
    return { status: 'photo-failed', productId, error };
  }
}
