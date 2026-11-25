import type { AccountInfo } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import { X, LogOut } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateMyLanguageMutation } from '../../services/api';
import { useModalA11y } from '../../hooks/useModalA11y';
import { useToast } from '../../contexts/ToastContext';
import { PendingButton } from '../ui/PendingButton';
import { chipClass } from './pageStyles';

/** Each language named in itself, whatever the UI language is. */
const LANGUAGE_NAMES = { en: 'English', de: 'Deutsch' } as const;

interface AccountSettingsModalProps {
  user: AccountInfo;
  onClose: () => void;
}

export function AccountSettingsModal({ user, onClose }: AccountSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [updateMyLanguage, { isLoading: savingLanguage }] = useUpdateMyLanguageMutation();
  const [signingOut, setSigningOut] = useState(false);
  const { instance } = useMsal();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onKeyDown = useModalA11y({ onClose, containerRef: dialogRef });
  // `i18n.resolvedLanguage` stays undefined here (both buttons read as not pressed), so use the active language, region stripped.
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? '').split('-')[0];

  const chooseLanguage = async (lng: 'en' | 'de') => {
    void i18n.changeLanguage(lng);
    try {
      await updateMyLanguage({ updateMyLanguageRequestDto: { language: lng } }).unwrap();
    } catch {
      toast.error(t('common.genericError'));
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      await instance.logoutRedirect();
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-ink/30 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
        <div
          ref={dialogRef}
          tabIndex={-1}
          onKeyDown={onKeyDown}
          role="dialog"
          aria-modal="true"
          aria-labelledby="account-settings-title"
          className="flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-line bg-white text-ink shadow-xl outline-none"
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
              aria-label={t('account.close')}
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
              {(['en', 'de'] as const).map((lng) => {
                const selected = currentLanguage === lng;
                return (
                  <PendingButton
                    key={lng}
                    isPending={savingLanguage}
                    aria-pressed={selected}
                    // Endonym, not translated: a language picker names each language in itself
                    aria-label={LANGUAGE_NAMES[lng]}
                    lang={lng}
                    onClick={() => void chooseLanguage(lng)}
                    className={`${chipClass(selected)} uppercase`}
                  >
                    {lng}
                  </PendingButton>
                );
              })}
            </div>
            <PendingButton
              isPending={signingOut}
              onClick={() => void signOut()}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e3d9ce] bg-white px-3.5 text-[13px] font-bold text-ink transition-colors hover:bg-sand"
            >
              <LogOut size={14} />
              {t('nav.signOut')}
            </PendingButton>
          </div>
        </div>
      </div>
    </>
  );
}
