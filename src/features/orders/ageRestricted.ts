/** True when any line is an 18+ dish (alcohol), so staff must check ID on handover. */
export function hasAgeRestrictedItem(order: { items: ReadonlyArray<{ ageRestricted?: boolean }> }): boolean {
  return order.items.some((i) => i.ageRestricted);
}
