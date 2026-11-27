import { useRef } from 'react';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useUpdateShopMutation } from '../../services/api';
import { MyButton } from '../ui/MyButton';

// ── Take-offline mode ─────────────────────────────────────────────────────────────

interface TakeOfflineProps {
  shopId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TakeShopOfflineModal({ shopId, onClose, onSuccess }: TakeOfflineProps) {
  const { t } = useTranslation();
  const [updateShop, { isLoading, error }] = useUpdateShopMutation();
  const containerRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef });

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
      <div
        role="dialog"
          aria-modal="true"
          aria-labelledby="take-offline-title"
          tabIndex={-1}
          onKeyDown={onKeyDown}
          ref={containerRef}
          className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 id="take-offline-title" className="text-base font-semibold text-gray-900">{t('shops.offlineTitle')}</h2>
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
