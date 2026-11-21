import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetMeQuery, useUpdateMyLanguageMutation } from '../../services/api';
import { resolveLoginLanguage } from '../i18n/accountLanguage';

/** Mounted only on the authenticated owner route tree (see RequireAuth). Applies the signed-in
 * owner's saved UI language; if the account has none yet, defaults from the browser and saves it
 * so it sticks across devices/sessions — fixing the old browser-only-per-device language pick. */
export function AccountLanguageSync() {
  const { i18n } = useTranslation();
  const { data } = useGetMeQuery();
  const [updateMyLanguage] = useUpdateMyLanguageMutation();
  const persisted = useRef(false);

  useEffect(() => {
    if (!data) return;
    const { language, persist } = resolveLoginLanguage(data.language ?? null);
    if (i18n.language.split('-')[0] !== language) void i18n.changeLanguage(language);
    if (persist && !persisted.current) {
      persisted.current = true;
      void updateMyLanguage({ updateMyLanguageRequestDto: { language } });
    }
  }, [data, i18n, updateMyLanguage]);

  return null;
}
