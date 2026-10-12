import { useSyncExternalStore } from 'react';

const WIDE_QUERY = '(min-width: 1280px)';

/** True from Tailwind's `xl` up, where a page's right column sits next to its list. */
export function useIsWide(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(WIDE_QUERY);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => window.matchMedia(WIDE_QUERY).matches,
    () => true,
  );
}

/** Warm select field, matching MyInput. */
export const selectClass =
  'h-10 w-full rounded-[10px] border border-[#e3d9ce] bg-white px-3 text-sm text-ink focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink';
