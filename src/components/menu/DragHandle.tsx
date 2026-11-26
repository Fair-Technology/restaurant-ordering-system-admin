import type React from 'react';
import { GripVertical } from 'lucide-react';
import type { useDragHandleProps } from './useDragHandleProps';

/** Stops clicks on the handle from also opening the row's editor. */
const keepInside = (e: React.SyntheticEvent) => e.stopPropagation();

type HandleProps = Pick<ReturnType<typeof useDragHandleProps>, 'attributes' | 'listeners'>;

/** The grip (or spinner while saving). When `dragEnabled` is false it stays visible but inert. */
export function DragHandleButton({
  attributes,
  listeners,
  pending,
  dragEnabled,
  label,
  disabledHint,
}: HandleProps & { pending: boolean; dragEnabled: boolean; label: string; disabledHint: string }) {
  return (
    <button
      type="button"
      {...attributes}
      {...listeners}
      onClick={keepInside}
      aria-label={label}
      aria-disabled={!dragEnabled || undefined}
      aria-busy={pending ? true : undefined}
      data-pending={pending ? 'true' : undefined}
      disabled={pending}
      tabIndex={dragEnabled ? attributes.tabIndex : -1}
      title={dragEnabled ? undefined : disabledHint}
      className={`flex-shrink-0 touch-none ${
        pending
          ? 'cursor-progress text-[#b9ada2]'
          : dragEnabled
            ? 'cursor-grab text-[#b9ada2] hover:text-ink active:cursor-grabbing'
            : 'cursor-not-allowed text-[#d6cdc4]'
      }`}
    >
      {pending ? (
        <span
          data-pending-spinner=""
          aria-hidden="true"
          className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-current border-t-transparent text-ink"
        />
      ) : (
        <GripVertical size={18} aria-hidden="true" />
      )}
    </button>
  );
}
