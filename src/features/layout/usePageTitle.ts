import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGetShopByIdQuery } from '../../services/api';

const BRAND = 'Admin';

/**
 * Sets document.title to "<Page> · <Shop name> · Admin" when a shop is in context
 * (reads :shopId from the route params) or "<Page> · Admin" otherwise.
 * `pageNameKey` is an i18n key (e.g. 'nav.orders') resolved via useTranslation.
 * Restores the previous title on unmount so a quick route flash doesn't leave a stale title.
 */
export function usePageTitle(pageNameKey: string) {
  const { t } = useTranslation();
  const { shopId } = useParams<{ shopId?: string }>();
  const { data: shop } = useGetShopByIdQuery({ shopId: shopId! }, { skip: !shopId });
  const pageName = t(pageNameKey);
  const shopName = shop?.name;
  useEffect(() => {
    const previous = document.title;
    document.title = shopName ? `${pageName} · ${shopName} · ${BRAND}` : `${pageName} · ${BRAND}`;
    return () => {
      document.title = previous;
    };
  }, [pageName, shopName]);
}
