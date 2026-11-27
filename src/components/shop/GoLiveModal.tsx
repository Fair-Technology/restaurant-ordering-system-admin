import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import type { GetGoLiveStatusApiResponse } from '../../services/api';
import { useUpdateShopMutation } from '../../services/api';
import { useModalA11y } from '../../hooks/useModalA11y';
import { MyButton } from '../ui/MyButton';
import { GoLiveChecklist } from './GoLiveChecklist';

// ── Go-live checklist ──────────────────────────────────────────────────────

interface CriteriaProps {
  shopId: string;
  status: GetGoLiveStatusApiResponse;
  onClose: () => void;
  onSuccess: () => void;
}

export function GoLiveCriteriaModal({ shopId, status, onClose, onSuccess }: CriteriaProps) {
  const { t } = useTranslation();
  const [updateShop, { isLoading }] = useUpdateShopMutation();
  const [failed, setFailed] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef: dialogRef });

  const criteria = status.criteria;
  const open = criteria.filter((c) => !c.met).length;

  const handleSwitchOnline = async () => {
    setFailed(false);
    try {
      await updateShop({ shopId, body: { isPaused: false } }).unwrap();
      onSuccess();
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="golive-title"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl bg-white shadow-xl outline-none sm:max-w-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id="golive-title" className="text-base font-semibold text-gray-900">
              {t('shops.goLive.title')}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {open === 0 ? t('shops.goLive.leadDone') : t('shops.goLive.lead')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('shops.goLive.close')}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <GoLiveChecklist shopId={shopId} status={status} onNavigate={onClose} />

        <div className="border-t border-gray-100 px-5 py-4 sm:px-6">
          {failed && (
            <p role="alert" className="mb-3 text-xs text-red-500">
              {t('shops.goLive.error')}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-gray-600">
              {open === 0 ? t('shops.goLive.openCountZero') : t('shops.goLive.openCount', { count: open })}
            </span>
            <div className="flex gap-2">
              <MyButton variant="secondary" size="sm" onClick={onClose}>
                {t('shops.goLive.close')}
              </MyButton>
              <MyButton
                variant="primary"
                size="sm"
                onClick={handleSwitchOnline}
                disabled={open > 0 || isLoading}
                isPending={isLoading}
              >
                {isLoading ? t('shops.goLive.switchingOnline') : t('shops.goLive.switchOnline')}
              </MyButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Take-offline mode ─────────────────────────────────────────────────────────────

interface TakeOfflineProps {
  shopId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TakeShopOfflineModal({ shopId, onClose, onSuccess }: TakeOfflineProps) {
  const { t } = useTranslation();
  const [updateShop, { isLoading, error }] = useUpdateShopMutation();

  // Offline: the storefront shows no menu and a notice that can't be closed, so there is no message to ask for
  const handleConfirm = async () => {
    try {
      await updateShop({
        shopId,
        body: { isPaused: true },
      }).unwrap();
      onSuccess();
    } catch {
      // error shown via mutation state
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{t('shops.offlineTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600">{t('shops.offlineConfirmText')}</p>
          {error && (
            <p className="text-xs text-red-500">{t('common.genericError')}</p>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
          <MyButton variant="secondary" size="sm" onClick={onClose} disabled={isLoading}>
            {t('common.cancel')}
          </MyButton>
          <MyButton
            variant="danger"
            size="sm"
            onClick={handleConfirm}
            isPending={isLoading}
          >
            {isLoading ? t('shops.offlineTaking') : t('shops.offlineConfirm')}
          </MyButton>
        </div>
      </div>
    </div>
  );
}
