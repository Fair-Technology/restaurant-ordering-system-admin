import type React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/** Sortable wiring for one row: the handle's props plus the row's ref and drag style. */
export function useDragHandleProps(id: string, { dragEnabled, pending }: { dragEnabled: boolean; pending: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !dragEnabled || pending,
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return { attributes, listeners, setNodeRef, style, isDragging };
}
