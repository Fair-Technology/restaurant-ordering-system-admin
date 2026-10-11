import { useGenerateUploadUrlMutation, useAddProductImageMutation } from '../../services/api';
import { putBlobToStorage, uploadProductImage } from './productImage';

/** Returns the one function both the create and the edit dish wizard use to upload a (cropped) dish photo. */
export function useUploadProductImage(): (shopId: string, productId: string, file: File) => Promise<void> {
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();
  return (shopId, productId, file) =>
    uploadProductImage(file, file.name, {
      generateUploadUrl: (contentType, fileName) =>
        generateUploadUrl({
          shopId,
          productId,
          generateImageUploadUrlRequest: { contentType, fileName },
        }).unwrap(),
      putBlob: putBlobToStorage,
      addProductImage: (imageId, url) =>
        addProductImage({
          shopId,
          productId,
          addProductImageRequest: { imageId, url },
        }).unwrap(),
    });
}
