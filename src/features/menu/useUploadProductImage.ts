import { useDispatch } from 'react-redux';
import { useGenerateUploadUrlMutation, useAddProductImageMutation } from '../../services/api';
import { baseApi } from '../../services/baseApi';
import { putBlobToStorage, uploadProductImage, type UploadedProductImage } from './productImage';

/** Returns the one function both the create and the edit dish wizard use to upload a (cropped) dish photo. */
export function useUploadProductImage(): (shopId: string, productId: string, file: File) => Promise<UploadedProductImage> {
  const dispatch = useDispatch();
  const [generateUploadUrl] = useGenerateUploadUrlMutation();
  const [addProductImage] = useAddProductImageMutation();
  return async (shopId, productId, file) => {
    const uploaded = await uploadProductImage(file, file.name, {
      generateUploadUrl: (contentType, fileName) =>
        generateUploadUrl({
          shopId,
          productId,
          body: { contentType, fileName },
        }).unwrap(),
      putBlob: putBlobToStorage,
      addProductImage: (imageId, url) =>
        addProductImage({
          shopId,
          productId,
          body: { imageId, url },
        }).unwrap(),
    });
    // addProductImage only invalidates 'Product Images', which no list or editor query provides, so the
    // dish and combo lists (refetched by the save that came before the photo) would keep showing the old photo.
    dispatch(baseApi.util.invalidateTags(['Products']));
    return uploaded;
  };
}
