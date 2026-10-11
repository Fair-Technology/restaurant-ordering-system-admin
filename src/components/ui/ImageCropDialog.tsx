import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Minus, Plus, X } from 'lucide-react';
import { MyButton } from './MyButton';
import { meetsMinimumSize } from '../../features/images/imageRules';
import type { ImageRule } from '../../features/images/imageRules';
import { previewArea, renderCrop, safeAreaFraction } from '../../features/images/cropMath';
import type { PercentArea, PixelArea } from '../../features/images/cropMath';

export interface CropPreview {
  /** Already-translated label shown under the preview. */
  label: string;
  /** Width / height of this preview. */
  aspect: number;
}

interface ImageCropDialogProps {
  file: File;
  rule: ImageRule;
  /** Already-translated texts: the caller owns the copy for its image type. */
  title: string;
  hint: string;
  safeAreaLabel: string;
  tooSmallMessage: string;
  previews: CropPreview[];
  /** Called with the cropped image at exactly the rule's output size. */
  onConfirm: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  busy?: boolean;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const ZOOM_STEP = 0.2;
const PREVIEW_HEIGHT_PX = 72;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
}

function CropPreviewBox({ url, area, frameAspect, preview }: { url: string; area: PercentArea; frameAspect: number; preview: CropPreview }) {
  const shown = previewArea(area, frameAspect, preview.aspect);
  return (
    <figure className="flex flex-col items-center gap-1">
      <div
        className="relative overflow-hidden rounded-md border border-gray-200 bg-gray-100"
        style={{ height: PREVIEW_HEIGHT_PX, width: PREVIEW_HEIGHT_PX * preview.aspect }}
        aria-hidden="true"
      >
        {shown.width > 0 && (
          <img
            src={url}
            alt=""
            draggable={false}
            className="absolute left-0 top-0 max-w-none"
            style={{
              width: `${10000 / shown.width}%`,
              transform: `translate(${-shown.x}%, ${-shown.y}%)`,
              transformOrigin: 'top left',
            }}
          />
        )}
      </div>
      <figcaption className="text-xs text-gray-500">{preview.label}</figcaption>
    </figure>
  );
}

export function ImageCropDialog({ file, rule, title, hint, safeAreaLabel, tooSmallMessage, previews, onConfirm, onCancel, busy = false }: ImageCropDialogProps) {
  const { t } = useTranslation();
  const titleId = useId();
  const hintId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [url, setUrl] = useState<string | null>(null);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [area, setArea] = useState<PercentArea>({ x: 0, y: 0, width: 100, height: 100 });
  const [pixels, setPixels] = useState<PixelArea | null>(null);
  const [frame, setFrame] = useState<{ width: number; height: number } | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Decode the picked file once; the same element is later drawn onto the output canvas.
  useEffect(() => {
    // A cleaned-up run (StrictMode runs effects twice in dev) revokes its URL before the
    // image has loaded; its late onerror must not mark the current file as unreadable.
    let cancelled = false;
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    setLoadFailed(false);
    img.onload = () => {
      if (cancelled) return;
      imageRef.current = img;
      setUrl(objectUrl);
      setSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setLoadFailed(true);
    };
    img.src = objectUrl;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  // Focus the dialog on open, give focus back to what opened it on close.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      if (!busy) onCancel();
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [tabindex="0"], input:not([disabled])'),
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onCropAreaChange = useCallback((percent: PercentArea, px: PixelArea) => {
    setArea(percent);
    setPixels(px);
  }, []);

  const tooSmall = size !== null && !meetsMinimumSize(size.width, size.height, rule);
  const ready = size !== null && !tooSmall && pixels !== null && !loadFailed;
  const safeFraction = safeAreaFraction(rule);

  const handleSave = async () => {
    if (!ready || !imageRef.current || !pixels) return;
    setSaveFailed(false);
    try {
      const blob = await renderCrop(imageRef.current, pixels, rule);
      await onConfirm(blob);
    } catch {
      setSaveFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={busy ? undefined : onCancel} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={hintId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex max-h-full w-full max-w-2xl flex-col overflow-y-auto rounded-2xl bg-white shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <h2 id={titleId} className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={t('imageCrop.cancel')}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <p id={hintId} className="text-sm text-gray-600">{hint}</p>

          {tooSmall && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{tooSmallMessage}</p>}
          {loadFailed && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{t('imageCrop.loadFailed')}</p>}

          {!tooSmall && !loadFailed && (
            <>
              <div className="relative h-64 overflow-hidden rounded-xl bg-gray-900 sm:h-80">
                {url && size && (
                  <Cropper
                    image={url}
                    crop={crop}
                    zoom={zoom}
                    minZoom={MIN_ZOOM}
                    maxZoom={MAX_ZOOM}
                    aspect={rule.aspect}
                    keyboardStep={10}
                    showGrid={false}
                    onCropChange={setCrop}
                    onZoomChange={(z) => setZoom(clampZoom(z))}
                    onCropAreaChange={onCropAreaChange}
                    onCropComplete={onCropAreaChange}
                    onCropSizeChange={setFrame}
                    cropperProps={{ 'aria-label': t('imageCrop.cropperLabel') }}
                  />
                )}
                {frame && (
                  <div
                    className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    style={{ width: frame.width, height: frame.height }}
                    aria-hidden="true"
                  >
                    <div className="absolute inset-y-0 left-0 bg-black/55" style={{ width: `${((1 - safeFraction) / 2) * 100}%` }} />
                    <div className="absolute inset-y-0 right-0 bg-black/55" style={{ width: `${((1 - safeFraction) / 2) * 100}%` }} />
                    <div
                      className="absolute inset-y-0 border-x border-dashed border-white/80"
                      style={{ left: `${((1 - safeFraction) / 2) * 100}%`, right: `${((1 - safeFraction) / 2) * 100}%` }}
                    />
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
                      {safeAreaLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2" role="group" aria-label={t('imageCrop.zoom')}>
                <MyButton type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} disabled={zoom <= MIN_ZOOM} aria-label={t('imageCrop.zoomOut')}>
                  <Minus size={14} />
                </MyButton>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(clampZoom(Number(e.target.value)))}
                  aria-label={t('imageCrop.zoom')}
                  className="flex-1"
                />
                <MyButton type="button" variant="secondary" size="sm" onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} disabled={zoom >= MAX_ZOOM} aria-label={t('imageCrop.zoomIn')}>
                  <Plus size={14} />
                </MyButton>
              </div>
              <p className="text-xs text-gray-400">{t('imageCrop.keyboardHint')}</p>

              {url && (
                <div className="flex flex-wrap items-end gap-6">
                  {previews.map((p) => (
                    <CropPreviewBox key={p.label} url={url} area={area} frameAspect={rule.aspect} preview={p} />
                  ))}
                </div>
              )}
            </>
          )}

          {saveFailed && <p role="alert" className="text-sm text-red-600">{t('imageCrop.saveFailed')}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <MyButton type="button" variant="ghost" onClick={onCancel} disabled={busy}>{t('imageCrop.cancel')}</MyButton>
          <MyButton type="button" onClick={handleSave} disabled={!ready || busy}>
            {busy ? t('imageCrop.saving') : t('imageCrop.save')}
          </MyButton>
        </div>
      </div>
    </div>
  );
}
