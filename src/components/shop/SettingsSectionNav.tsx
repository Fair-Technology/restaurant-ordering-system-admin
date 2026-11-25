import type { SettingsSectionItem, SettingsSectionKey } from '../../features/shops/settingsSections';

interface Props {
  label: string;
  sections: SettingsSectionItem[];
  activeKey: SettingsSectionKey;
  onSelect: (key: SettingsSectionKey) => void;
}

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

/** Section picker for the settings page: a vertical list from `md`, a scrolling chip row below. */
export function SettingsSectionNav({ label, sections, activeKey, onSelect }: Props) {
  return (
    <nav aria-label={label} className="mb-4 md:mb-0 md:w-[232px] md:flex-shrink-0">
      <ul className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:mx-0 md:flex-col md:gap-0.5 md:overflow-visible md:px-0 md:pb-0">
        {sections.map((s) => {
          const active = s.key === activeKey;
          return (
            <li key={s.key} className="flex-shrink-0 md:flex-shrink">
              <button
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => onSelect(s.key)}
                className={`flex min-h-11 w-full flex-col justify-center rounded-full border px-4 text-left whitespace-nowrap transition-colors md:min-h-[52px] md:rounded-xl md:border-transparent md:px-3 md:py-2 md:whitespace-normal ${FOCUS} ${
                  active
                    ? 'border-ink bg-ink text-white md:bg-cream md:text-ink'
                    : 'border-[#e3d9ce] bg-white text-ink hover:bg-sand md:bg-transparent md:hover:bg-cream'
                }`}
              >
                <span className={`text-sm ${active ? 'font-bold' : 'font-medium'} ${s.danger ? (active ? 'text-white md:text-[#b42318]' : 'text-[#b42318]') : ''}`}>
                  {s.title}
                </span>
                {s.status && <span className="hidden truncate text-[13px] text-muted md:block">{s.status}</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
