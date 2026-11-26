/**
 * Items in a category's menu order: items with a saved position for this category first (by
 * position), then the rest by name.
 */
export function sortByCategoryOrder<T>(
  items: T[],
  categoryId: string,
  orderOf: (item: T) => number | undefined,
  nameOf: (item: T) => string,
): T[] {
  void categoryId; // the position lookup is already scoped to the category by `orderOf`
  return [...items].sort((a, b) => {
    const pa = orderOf(a);
    const pb = orderOf(b);
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pa == null && pb != null) return 1;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

/** Applies a locally held id order; ids no longer present are skipped, unlisted items go last. */
export function applyOrder<T>(items: T[], ids: string[], idOf: (item: T) => string): T[] {
  const byId = new Map(items.map((item) => [idOf(item), item]));
  const ordered = ids.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const listed = new Set(ids);
  return [...ordered, ...items.filter((item) => !listed.has(idOf(item)))];
}
