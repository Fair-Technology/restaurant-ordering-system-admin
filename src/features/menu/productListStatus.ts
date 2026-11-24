// True while a list that's already on screen is being reloaded — e.g. the
// refetch after a dish is created, edited or deleted. The old rows stay
// visible until the new ones arrive, so the page must say it's updating or
// the owner reads the stale rows as a save that didn't take.
export function isListRefreshing({ isLoading, isFetching }: { isLoading: boolean; isFetching: boolean }): boolean {
  return isFetching && !isLoading;
}

/** A dish still missing something before it can be on the menu: allergens declared, a
 *  reachable photo, a category. `brokenImageIds` holds ids of dishes whose stored image URL
 *  failed to load client-side (see ImageHealthProbe in ProductsPage). */
export function isIncomplete(
  p: { id?: string; isDeclared?: boolean; images?: { url?: string }[]; categories?: unknown[] },
  brokenImageIds: ReadonlySet<string>,
): boolean {
  return (
    p.isDeclared === false ||
    !p.images?.length ||
    !p.categories?.length ||
    (!!p.id && brokenImageIds.has(p.id))
  );
}
