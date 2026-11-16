/** localStorage key for the desktop sidebar's show/hide choice (below `lg` the sidebar is a drawer and ignores it). */
export const SIDEBAR_HIDDEN_KEY = 'ros.sidebarHidden';

/** True only for the stored "hidden" value; a missing or junk value means the sidebar is shown. */
export function parseSidebarHidden(raw: string | null): boolean {
  return raw === '1';
}

/** Read synchronously, so it can be used as a `useState` initialiser and the first render already knows. */
export function readSidebarHidden(): boolean {
  return parseSidebarHidden(localStorage.getItem(SIDEBAR_HIDDEN_KEY));
}

export function writeSidebarHidden(hidden: boolean): void {
  localStorage.setItem(SIDEBAR_HIDDEN_KEY, hidden ? '1' : '0');
}
