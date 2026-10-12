import type { AccountInfo } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { X, LogOut } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chipClass } from './pageStyles';

interface AccountSettingsModalProps {
  user: AccountInfo;
  onClose: () => void;
}

export function AccountSettingsModal({ user, onClose }: AccountSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const { instance } = useMsal();

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-settings-title"
          className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-line-soft px-5 pt-5 pb-4">
            <h2 id="account-settings-title" className="font-display text-[22px] leading-tight font-semibold">
              {t('account.title')}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-[#8a7f77] transition-colors hover:bg-sand hover:text-ink"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* User info */}
          <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-ink">
              <span className="text-sm font-bold text-white">{user.name?.charAt(0).toUpperCase() ?? '?'}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold">{user.name}</p>
              <p className="truncate text-[13px] text-muted">{user.username}</p>
            </div>
          </div>

          {/* Language + sign out */}
          <div className="flex items-center justify-between gap-3 px-5 py-4">
            <div className="flex gap-1.5">
              {(['en', 'de'] as const).map((lng) => (
                <button
                  key={lng}
                  type="button"
                  aria-pressed={i18n.resolvedLanguage === lng}
                  onClick={() => i18n.changeLanguage(lng)}
                  className={`${chipClass(i18n.resolvedLanguage === lng)} uppercase`}
                >
                  {lng}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => instance.logoutRedirect()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e3d9ce] bg-white px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-sand"
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
