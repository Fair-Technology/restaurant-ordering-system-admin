import { useSyncExternalStore } from 'react';

/** Tracks a CSS media query. `fallback` is the server snapshot (mobile-first: false). */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}
