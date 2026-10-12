import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink } from 'lucide-react';
import {
  isPreviewMessage,
  previewOrigin,
  previewUrl,
  toPreview,
  type AdminMessage,
  type PreviewDish,
} from '../../features/menu/previewBridge';

interface Props {
  slug: string | undefined;
  /** The dish being edited, with its unsaved changes (null on the list) */
  dish: PreviewDish | null;
  /** Dish to outline and scroll to */
  focusId: string | null;
  /** Show the dish's popup instead of the menu */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A dish was clicked in the preview */
  onSelect: (productId: string) => void;
  /** Menu language to show (the editor's language tab) */
  language?: string;
  /** Bump after a save so the preview reloads the menu */
  refreshKey: number;
}

const DESKTOP_WIDTH = 1280;
const DESKTOP_HEIGHT = 820;

/**
 * LivePreview — the real storefront next to the editor, in a phone frame or as a scaled desktop.
 *
 * It is the customer page itself (in preview mode), so it can never drift from what guests see.
 * Unsaved edits are sent over as they are typed; clicking a dish in it opens that dish here.
 */
export function LivePreview({ slug, dish, focusId, open, onOpenChange, onSelect, language, refreshKey }: Props) {
  const { t } = useTranslation();
  const base = import.meta.env.VITE_SHOP_BASE_URL as string | undefined;
  const src = previewUrl(base, slug);
  const origin = previewOrigin(base);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [device, setDevice] = useState<'phone' | 'desktop'>('phone');

  const send = useCallback(
    (message: AdminMessage) => {
      if (!origin) return;
      frameRef.current?.contentWindow?.postMessage(toPreview(message), origin);
    },
    [origin],
  );

  // A new frame (other device or shop) has to say "ready" again before it gets messages
  const frameKey = `${src}-${device}`;
  const [readyFor, setReadyFor] = useState<string | null>(null);
  const ready = readyFor === frameKey;

  // Messages from the storefront: ready → send the current state; select → open that dish here
  const frameKeyRef = useRef('');
  const latest = useRef({ dish, focusId, open, language, onSelect });
  useEffect(() => {
    frameKeyRef.current = frameKey;
    latest.current = { dish, focusId, open, language, onSelect };
  });
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== origin || event.source !== frameRef.current?.contentWindow) return;
      if (!isPreviewMessage(event.data)) return;
      if (event.data.type === 'ready') {
        setReadyFor(frameKeyRef.current);
        const s = latest.current;
        if (s.language) send({ type: 'language', lang: s.language });
        send({ type: 'dish', dish: s.dish });
        send({ type: 'focus', productId: s.focusId, open: s.open });
      } else {
        latest.current.onSelect(event.data.productId);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [origin, send]);

  useEffect(() => {
    if (ready) send({ type: 'dish', dish });
  }, [ready, send, dish]);
  useEffect(() => {
    if (ready) send({ type: 'focus', productId: focusId, open });
  }, [ready, send, focusId, open]);
  useEffect(() => {
    if (ready && language) send({ type: 'language', lang: language });
  }, [ready, send, language]);
  useEffect(() => {
    if (ready && refreshKey > 0) send({ type: 'refresh' });
  }, [ready, send, refreshKey]);

  // Desktop view: the 1280px page scaled down to the column's width
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, el.clientWidth / DESKTOP_WIDTH));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [device]);

  const toggle = (on: boolean) =>
    `h-7 rounded-full px-3 text-xs font-semibold transition-colors ${on ? 'bg-ink text-white' : 'text-[#4a413b] hover:bg-sand'}`;

  return (
    <aside
      className="hidden w-[452px] flex-shrink-0 flex-col border-l border-line bg-[#efebe6] xl:flex"
      aria-label={t('dishes.preview.title')}
    >
      <div className="flex items-center gap-2.5 px-[18px] py-3.5">
        <span className="flex items-center gap-2 text-[13px] font-bold">
          <span className="h-2 w-2 rounded-full bg-[#2563eb] shadow-[0_0_0_3px_rgba(37,99,235,0.18)]" aria-hidden="true" />
          {t('dishes.preview.title')}
        </span>
        <span className="text-xs text-[#6b6058]">{t('dishes.preview.subtitle')}</span>
        <div role="group" aria-label={t('dishes.preview.device')} className="ml-auto flex rounded-full bg-white p-[3px]">
          <button type="button" aria-pressed={device === 'phone'} className={toggle(device === 'phone')} onClick={() => setDevice('phone')}>
            {t('dishes.preview.phone')}
          </button>
          <button type="button" aria-pressed={device === 'desktop'} className={toggle(device === 'desktop')} onClick={() => setDevice('desktop')}>
            {t('dishes.preview.desktop')}
          </button>
        </div>
      </div>

      <div ref={boxRef} className="flex min-h-0 flex-1 justify-center px-[18px] pb-3">
        {!src ? (
          <p className="self-center px-6 text-center text-sm text-[#6b6058]">{t('dishes.preview.notConfigured')}</p>
        ) : device === 'phone' ? (
          <div className="h-full max-h-[780px] w-[340px] rounded-[34px] bg-ink p-[9px] shadow-[0_18px_40px_rgba(31,26,23,0.22)]">
            <iframe
              ref={frameRef}
              key={`${src}-phone`}
              src={src}
              title={t('dishes.preview.title')}
              className="h-full w-full rounded-[26px] border-0 bg-white"
            />
          </div>
        ) : (
          <div className="w-full self-start overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_30px_rgba(31,26,23,0.16)]" style={{ height: DESKTOP_HEIGHT * scale }}>
            <iframe
              ref={frameRef}
              key={`${src}-desktop`}
              src={src}
              title={t('dishes.preview.title')}
              className="origin-top-left border-0 bg-white"
              style={{ width: DESKTOP_WIDTH, height: DESKTOP_HEIGHT, transform: `scale(${scale})` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2.5 px-[18px] pb-3.5">
        <div role="group" aria-label={t('dishes.preview.view')} className="flex rounded-full bg-white p-[3px]">
          <button type="button" aria-pressed={!open} className={toggle(!open)} onClick={() => onOpenChange(false)}>
            {t('dishes.preview.menu')}
          </button>
          <button
            type="button"
            aria-pressed={open}
            disabled={!focusId}
            className={`${toggle(open)} disabled:opacity-40`}
            onClick={() => onOpenChange(true)}
          >
            {t('dishes.preview.dishOpen')}
          </button>
        </div>
        <span className="hidden text-xs text-[#6b6058] 2xl:inline">{t('dishes.preview.hint')}</span>
        {src && (
          <a
            href={src.replace('?preview=1', '')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink underline underline-offset-2"
          >
            {t('dishes.preview.openShop')}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </aside>
  );
}
