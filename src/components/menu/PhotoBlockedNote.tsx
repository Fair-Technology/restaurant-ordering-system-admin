import { useTranslation } from 'react-i18next';

/** The short inline hint under a list row whose switch was refused because the item has no photo, with a way to add one. */
export function PhotoBlockedNote({ message, onAddPhoto }: { message: string; onAddPhoto: () => void }) {
  const { t } = useTranslation();
  return (
    <span role="alert" className="flex flex-wrap items-center gap-x-2 text-xs font-semibold text-[#8a5a00]">
      {message}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onAddPhoto();
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="rounded-full bg-[#fff6e0] px-2 py-0.5 text-xs font-bold text-[#8a5a00] underline hover:bg-[#fbeac2] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink"
      >
        {t('dishForm.addPhoto')}
      </button>
    </span>
  );
}
