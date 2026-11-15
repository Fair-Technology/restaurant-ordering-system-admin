// "Sold out today" — hide a dish for the rest of the service day without
// touching its permanent `isAvailable` switch (which needs a menu edit, not a
// stock action). The backend stores the window in `unavailableUntil`, an ISO
// instant: the dish counts as sold out while that instant is still in the
// future and comes back on its own once it passes. Nothing here edits the dish.

/** True while the dish's sold-out window is still open at `now`. A missing,
 *  malformed or past value means "not sold out". */
export function isSoldOutUntil(
  unavailableUntil: string | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!unavailableUntil) return false;
  const at = Date.parse(unavailableUntil);
  return Number.isFinite(at) && at > now;
}

/** The offset (ms east of UTC) the zone is at on `at`, so a wall-clock time can
 *  be mapped back to an absolute instant without a date library. */
function zoneOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at);
  const f: Record<string, string> = {};
  for (const p of parts) f[p.type] = p.value;
  const asUtc = Date.UTC(
    Number(f.year),
    Number(f.month) - 1,
    Number(f.day),
    Number(f.hour),
    Number(f.minute),
    Number(f.second),
  );
  return asUtc - at.getTime() + at.getMilliseconds();
}

/** The instant the shop's current day ends (its local midnight), ISO-8601. */
export function endOfServiceDayIso(timeZone: string, now: Date = new Date()): string {
  const offset = zoneOffsetMs(timeZone, now);
  // Today's date as the shop sees it, then midnight at the start of tomorrow.
  const wall = new Date(now.getTime() + offset);
  const nextMidnightWall = Date.UTC(
    wall.getUTCFullYear(),
    wall.getUTCMonth(),
    wall.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  // Re-read the offset at the target so a DST change on the boundary lands right.
  const firstTry = new Date(nextMidnightWall - offset);
  const target = nextMidnightWall - zoneOffsetMs(timeZone, firstTry);
  return new Date(target).toISOString();
}

/** The availability write that marks a dish sold out for the rest of today. */
export function soldOutTodayPatch(timeZone: string, now: Date = new Date()): { unavailableUntil: string } {
  return { unavailableUntil: endOfServiceDayIso(timeZone, now) };
}

/** The availability write that puts a dish back on sale now. */
export const clearSoldOutPatch = { unavailableUntil: null };
