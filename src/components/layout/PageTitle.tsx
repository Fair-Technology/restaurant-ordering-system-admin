import { useEffect } from 'react';
import { useMatches, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../../services/api';

/**
 * Sets document.title to "<Page> · <Shop> · Admin" (WCAG 2.4.2). The page label
 * comes from the deepest matched route's `handle.titleKey`. Renders nothing.
 */
export function PageTitle() {
  const { t, i18n } = useTranslation();
  const matches = useMatches();
  const { shopId } = useParams<{ shopId: string }>();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId ?? '' }, { skip: !shopId });

  const titleKey = [...matches]
    .reverse()
    .map((m) => (m.handle as { titleKey?: string } | undefined)?.titleKey)
    .find(Boolean);
  const pageLabel = titleKey ? t(titleKey) : undefined;

  useEffect(() => {
    const parts = [pageLabel, shopId ? shop?.name : undefined, 'Admin'].filter(Boolean);
    document.title = parts.length ? parts.join(' · ') : 'Admin';
  }, [matches, pageLabel, shop?.name, shopId, i18n.language]);

  return null;
}
