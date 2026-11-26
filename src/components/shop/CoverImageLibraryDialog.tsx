import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { MyButton } from '../ui/MyButton';
import { MySpinner } from '../ui/MySpinner';
import { useModalA11y } from '../../hooks/useModalA11y';
import {
  useExecuteListCoverImageLibraryForShopQuery,
  useExecuteUseLibraryCoverImageForShopMutation,
} from '../../services/api';
import type { ListCoverImageLibraryResultDto } from '../../services/api';

type CoverLibraryImage = ListCoverImageLibraryResultDto['images'][number];

interface CoverImageLibraryDialogProps {
  shopId: string;
  onClose: () => void;
  /** Called after the library image was set as the shop's cover (the caller refetches the shop and toasts). */
  onSaved: () => void;
}

export function CoverImageLibraryDialog({ shopId, onClose, onSaved }: CoverImageLibraryDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError, refetch } = useExecuteListCoverImageLibraryForShopQuery({ shopId });
  const [applyLibraryImage, { isLoading: isSaving }] = useExecuteUseLibraryCoverImageForShopMutation();
  const [selected, setSelected] = useState<CoverLibraryImage | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const onKeyDown = useModalA11y({ onClose, containerRef: dialogRef, disabled: isSaving });

  const handleUse = async () => {
    if (!selected) return;
    setSaveFailed(false);
    try {
      await applyLibraryImage({ shopId, body: { libraryImageId: selected.id } }).unwrap();
      onSaved();
    } catch {
      setSaveFailed(true);
    }
  };

  const images = data?.images ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={isSaving ? undefined : onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex max-h-full w-full max-w-3xl flex-col overflow-y-auto rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">{t('shops.coverLibraryTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label={t('shops.coverLibraryClose')}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          {selected ? (
            <>
              <img
                src={selected.imageUrl}
                alt={t('shops.coverLibraryPreviewAlt', { name: selected.name })}
                className="aspect-[3/1] w-full rounded-xl border border-gray-200 object-cover"
              />
              <p className="text-sm font-medium text-gray-900">{selected.name}</p>
              {saveFailed && <p role="alert" className="text-sm text-red-600">{t('shops.failedToUseLibraryCoverImage')}</p>}
            </>
          ) : isLoading ? (
            <MySpinner label={t('shops.loadingSettings')} />
          ) : isError ? (
            <div role="alert" className="flex flex-col items-start gap-3">
              <p className="text-sm text-red-600">{t('shops.coverLibraryLoadFailed')}</p>
              <MyButton type="button" variant="secondary" size="sm" onClick={() => refetch()}>
                {t('shops.coverLibraryRetry')}
              </MyButton>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">{t('shops.coverLibraryHint')}</p>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img) => (
                  <li key={img.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(img)}
                      className="group flex w-full flex-col gap-1.5 rounded-xl text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
                    >
                      <img
                        src={img.cardImageUrl}
                        alt=""
                        loading="lazy"
                        className="aspect-[3/2] w-full rounded-xl border border-gray-200 object-cover transition-opacity group-hover:opacity-90"
                      />
                      <span className="truncate text-xs text-gray-700">{img.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {selected && (
          <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <MyButton
              type="button"
              variant="ghost"
              onClick={() => { setSelected(null); setSaveFailed(false); }}
              disabled={isSaving}
            >
              {t('shops.coverLibraryBack')}
            </MyButton>
            <MyButton type="button" onClick={handleUse} isPending={isSaving}>
              {isSaving ? t('shops.coverLibraryUsing') : t('shops.coverLibraryUse')}
            </MyButton>
          </div>
        )}
      </div>
    </div>
  );
}
