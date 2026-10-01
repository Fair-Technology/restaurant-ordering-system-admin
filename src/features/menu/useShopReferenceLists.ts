import { useGetShopByIdQuery, useGetReferenceListsQuery } from '../../services/api';
import type { ReferenceListsResponse } from '../../services/api';

/** Loads the platform reference lists (allergens, additives, tax classes) for a shop's country. */
export function useShopReferenceLists(shopId: string): { refs: ReferenceListsResponse | undefined; isError: boolean } {
  const { data: shop } = useGetShopByIdQuery({ shopId });
  const { data, isError } = useGetReferenceListsQuery(
    { countryCode: shop?.countryCode || 'DE' },
    { skip: !shop },
  );
  return { refs: data, isError };
}
