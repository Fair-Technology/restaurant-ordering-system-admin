import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { XCircle, X } from 'lucide-react';
import type { GoLiveStatusResponse } from '../../services/api';
import { useUpdateShopMutation } from '../../services/api';
import { goLiveFixLink } from '../../features/shops/goLiveFixLink';
import { MyButton } from '../ui/MyButton';

// ── Criteria-not-met mode ──────────────────────────────────────────────────

interface CriteriaProps {
  shopId: string;
  status: GoLiveStatusResponse;
  onClose: () => void;
}

export function GoLiveCriteriaModal({ shopId, status, onClose }: CriteriaProps) {
  const { t } = useTranslation();

  const unmet = status.criteria.filter((c) => !c.met);
  const current = unmet[0];
  const remaining = unmet.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">{t('shops.goLiveTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">
            {t('shops.goLiveNotReady')}
            {remaining > 1 && (
              <span className="ml-1 text-xs text-gray-400">({remaining} {t('shops.goLiveRemaining')})</span>
            )}
          </p>
          {current && (
            <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <XCircle size={16} className="text-red-400 shrink-0" />
                <span className="text-sm text-gray-800">{current.description}</span>
              </div>
              <Link
                to={goLiveFixLink(shopId, current.key)}
                onClick={onClose}
                className="text-xs font-medium text-blue-600 hover:underline shrink-0"
              >
                {t('shops.goLiveFix')}
              </Link>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <MyButton variant="secondary" size="sm" onClick={onClose}>
            {t('shops.goLiveClose')}
          </MyButton>
        </div>
      </div>
    </div>
  );
}

// ── Pause mode ─────────────────────────────────────────────────────────────

interface PauseProps {
  shopId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PauseShopModal({ shopId, onClose, onSuccess }: PauseProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState('');
  const [updateShop, { isLoading, error }] = useUpdateShopMutation();

  const handleConfirm = async () => {
    if (!message.trim()) return;
    try {
      await updateShop({
        shopId,
        updateShopRequest: { isPaused: true, pausedMessage: message.trim() },
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
          <h2 className="text-base font-semibold text-gray-900">{t('shops.pauseTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 mb-1.5 block">
              {t('shops.pauseMessageLabel')}
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('shops.pauseMessagePlaceholder')}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-400"
            />
          </label>
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
            disabled={!message.trim() || isLoading}
          >
            {isLoading ? t('shops.pausePausing') : t('shops.pauseConfirm')}
          </MyButton>
        </div>
      </div>
    </div>
  );
}
