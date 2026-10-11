import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import { ImageCropDialog } from '../ui/ImageCropDialog';
import { DISH_IMAGE_RULE } from '../../features/images/imageRules';
import { checkProductImageFile } from '../../features/menu/productImage';

/**
 * The photo picker shared by dishes and combos: file input, 4:3 crop window, before/after preview.
 * The cropped file is handed up via setImageFile; uploading it is the caller's job.
 */
export function DishPhotoField({ imageFile, setImageFile, existingImageUrl, photoError }: {
  imageFile: File | null;
  setImageFile: (f: File | null) => void;
  existingImageUrl?: string | null;
  /** True after a failed save attempt without a photo: shows the required-photo message. */
  photoError?: boolean;
}) {
  const { t } = useTranslation();
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  return (
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-gray-700">
          {t('products.image')}{' '}
          <span className="text-gray-400 font-normal">{t('products.imageRequiredNote')}</span>
        </p>
        {/* Image preview */}
        {existingImageUrl && imageFile ? (
          /* Replacing existing: old (with overlay) → arrow → new */
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0">
                <img src={existingImageUrl} alt={t('products.currentImage')} className="w-full h-full object-cover" />
                {/* Dark overlay to indicate it's being replaced */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white text-lg font-light leading-none">×</span>
                </div>
              </div>
              <span className="text-xs text-gray-400">{t('products.currentImage')}</span>
            </div>

            <ArrowRight size={16} className="text-gray-400 flex-shrink-0 mt-0 mb-4" />

            <div className="flex flex-col items-center gap-1">
              <img
                src={URL.createObjectURL(imageFile)}
                alt={t('products.newImage')}
                className="w-16 h-16 rounded-xl object-cover border border-gray-200 flex-shrink-0"
              />
              <span className="text-xs text-gray-400">{t('products.newImage')}</span>
            </div>
          </div>
        ) : existingImageUrl ? (
          /* Existing image, no replacement selected yet */
          <div className="flex flex-col items-center gap-1 w-fit">
            <img
              src={existingImageUrl}
              alt={t('products.currentImage')}
              className="w-16 h-16 rounded-xl object-cover border border-gray-200"
            />
            <span className="text-xs text-gray-400">{t('products.currentImage')}</span>
          </div>
        ) : imageFile ? (
          /* No existing image, new file selected */
          <div className="flex items-center gap-2">
            <img
              src={URL.createObjectURL(imageFile)}
              alt="preview"
              className="w-12 h-12 rounded-lg object-cover border border-gray-200"
            />
            <p className="text-xs text-gray-400">{imageFile.name}</p>
          </div>
        ) : null}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label={t('products.image')}
          aria-required="true"
          onChange={(e) => {
            const picked = e.target.files?.[0] ?? null;
            const err = picked ? checkProductImageFile(picked) : null;
            setImageError(err ? t(`products.${err}`) : null);
            setPendingImage(picked && !err ? picked : null);
            e.target.value = '';
          }}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
        />
        {imageError && <p role="alert" className="text-sm text-red-600">{imageError}</p>}
        {photoError && !imageError && <p role="alert" className="text-sm text-red-600">{t('products.photoRequired')}</p>}
        {pendingImage && (
          <ImageCropDialog
            file={pendingImage}
            rule={DISH_IMAGE_RULE}
            title={t('products.imageCropTitle')}
            hint={t('products.imageCropHint')}
            safeAreaLabel={t('products.imageVisibleInList')}
            tooSmallMessage={t('products.productImageTooSmall')}
            previews={[
              { label: t('products.imagePreviewCard'), aspect: 4 / 3 },
              { label: t('products.imagePreviewPhoneList'), aspect: 1 },
            ]}
            onCancel={() => setPendingImage(null)}
            onConfirm={(blob) => {
              const baseName = pendingImage.name.replace(/\.[^.]+$/, '') || 'dish';
              setImageFile(new File([blob], `${baseName}.jpg`, { type: blob.type || DISH_IMAGE_RULE.outputMime }));
              setPendingImage(null);
            }}
          />
        )}
      </div>
  );
}
