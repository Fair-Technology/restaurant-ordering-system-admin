// True while a list that's already on screen is being reloaded — e.g. the
// refetch after a dish is created, edited or deleted. The old rows stay
// visible until the new ones arrive, so the page must say it's updating or
// the owner reads the stale rows as a save that didn't take.
export function isListRefreshing({ isLoading, isFetching }: { isLoading: boolean; isFetching: boolean }): boolean {
  return isFetching && !isLoading;
}
