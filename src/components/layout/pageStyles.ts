/** Class names shared by the page building blocks and by pages that need the same look on their own elements. */

/** A filter chip: dark when on, white with a warm border when off. */
export const chipClass = (active: boolean) =>
  `inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[13px] font-semibold transition-colors ${
    active ? 'border-ink bg-ink text-white' : 'border-[#e3d9ce] bg-white text-[#4a413b] hover:bg-sand'
  }`;

/** A small pill button inside a list row: dark for the main action, outlined otherwise. */
export const pillClass = (dark: boolean) =>
  `h-[34px] rounded-full px-3.5 text-[13px] font-bold whitespace-nowrap disabled:opacity-50 ${
    dark ? 'bg-ink text-white' : 'border border-[#e3d9ce] bg-white text-ink hover:bg-sand'
  }`;

/** The search field next to the chips. */
export const searchBoxClass =
  'flex h-10 w-full items-center gap-2 rounded-[10px] border border-[#e3d9ce] bg-white px-3 sm:w-[220px]';

/** Status badges. */
export const badgeClass = {
  neutral: 'rounded-full bg-sand px-2 py-0.5 text-[11px] font-bold text-[#4a413b]',
  good: 'rounded-full bg-[#e6f3ea] px-2 py-0.5 text-[11px] font-bold text-[#1d5a32]',
  warn: 'rounded-full bg-[#fff6e0] px-2 py-0.5 text-[11px] font-bold text-[#8a5a00]',
  bad: 'rounded-full bg-[#fdeceb] px-2 py-0.5 text-[11px] font-bold text-[#b42318]',
} as const;
