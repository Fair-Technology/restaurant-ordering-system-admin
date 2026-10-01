import type { AccountInfo } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { X, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AccountSettingsModalProps {
  user: AccountInfo;
  onClose: () => void;
}

export function AccountSettingsModal({ user, onClose }: AccountSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { instance } = useMsal();

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{t('account.title')}</p>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* User info */}
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-semibold text-white">
                {user.name?.charAt(0).toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-400 truncate">{user.username}</p>
            </div>
          </div>

          {/* Language + sign out */}
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex gap-1">
              {(['en', 'de'] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium uppercase transition-colors ${
                    i18n.resolvedLanguage === lng
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <button
              onClick={() => instance.logoutRedirect()}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
            >
              <LogOut size={14} />
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
