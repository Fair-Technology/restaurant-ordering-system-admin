import type React from 'react';
import { useTranslation } from 'react-i18next';
import type { ComboDto } from '../../services/combosApi';
import { comboPhotoUrl } from '../../features/combos/combos';
import { badgeClass } from '../layout/pageStyles';
import { AvailabilitySwitch } from '../menu/AvailabilitySwitch';
import { PhotoBlockedNote } from '../menu/PhotoBlockedNote';

/** One combo in a category list: same row shell as a dish row, with a switch. Deleting lives in the editor's footer, not here. */
export function ComboRow({
  combo,
  selected,
  switching,
  money,
  dishCount,
  onOpen,
  onToggle,
  photoBlockedMessage,
  dragHandle,
  rowRef,
  rowStyle,
}: {
  combo: ComboDto;
  selected: boolean;
  switching: boolean;
  money: (cents: number) => string;
  dishCount: (ids: string[]) => number;
  onOpen: () => void;
  onToggle: () => void;
  /** Shown under the name right after the switch was refused because the combo has no photo. */
  photoBlockedMessage?: string;
  dragHandle?: React.ReactNode;
  rowRef?: (node: HTMLElement | null) => void;
  rowStyle?: React.CSSProperties;
}) {
  const { t } = useTranslation();
  const c = combo;
  const photo = comboPhotoUrl(c);
  return (
    <div ref={rowRef} style={rowStyle}>
      <div
        role="button"
        tabIndex={0}
        aria-current={selected ? 'true' : undefined}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onOpen();
          }
        }}
        className={`flex cursor-pointer items-center gap-2.5 border-b border-[#f6f1eb] px-3 py-2.5 transition-colors last:border-b-0 hover:bg-cream focus:outline-none focus-visible:bg-cream focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink sm:gap-3.5 sm:px-4 ${
          selected ? 'bg-cream shadow-[inset_3px_0_0_#1f1a17]' : ''
        }`}
      >
        {dragHandle}
        {photo ? (
          <img src={photo} alt="" className={`h-[42px] w-14 flex-shrink-0 rounded-lg object-cover ${c.isAvailable ? '' : 'opacity-50'}`} />
        ) : (
          <span className="flex h-[42px] w-14 flex-shrink-0 items-center justify-center rounded-lg border border-[#f1dfae] bg-[#fff6e0] text-center text-[11px] leading-tight font-semibold text-[#8a5a00]">
            {t('combos.noPhoto')}
          </span>
        )}
        <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${c.isAvailable ? '' : 'opacity-55'}`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[15px] font-bold break-words">{c.name}</span>
            <span className={c.isAvailable ? badgeClass.good : badgeClass.neutral}>
              {c.isAvailable ? t('combos.statusOn') : t('combos.statusOff')}
            </span>
            {!photo && <span className={badgeClass.warn}>{t('combos.missingPhoto')}</span>}
            {c.bmfDrinkShare && (
              <span className={badgeClass.neutral} title={t('combos.bmfHelp')}>
                {t('combos.bmfBadge')}
              </span>
            )}
          </div>
          <span className="text-[13px] text-[#6b6058]">
            {c.groups.map((g) => t('combos.groupSummary', { name: g.name, count: dishCount(g.productIds) })).join(' · ')}
          </span>
          {photoBlockedMessage && <PhotoBlockedNote message={photoBlockedMessage} onAddPhoto={onOpen} />}
        </div>
        <span className="min-w-14 flex-shrink-0 text-right text-[15px] font-bold sm:w-20">{money(c.priceCents)}</span>
        <AvailabilitySwitch
          available={c.isAvailable}
          pending={switching}
          ariaLabel={t('dishes.availableFor', { name: c.name })}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}
