import { useCallback, useRef, useState } from 'react';
import type { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Per-category drag-to-reorder state and save flow: the new order is applied optimistically, saved
 * through `save` (which must reject on failure), and reverted if the save fails.
 */
export function useCategoryDragReorder(save: (categoryId: string, ids: string[]) => Promise<unknown>) {
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({});
  const reorderingRef = useRef<Set<string>>(new Set());
  const [reorderError, setReorderError] = useState(false);
  // Categories whose new order is being saved: their handles spin and refuse another drag
  const [savingOrderIds, setSavingOrderIds] = useState<ReadonlySet<string>>(new Set());

  /** Once fresh data arrives, the server's order replaces local overrides (except for a save still in flight). */
  const clearStaleOverrides = useCallback(() => {
    setOrderOverrides((o) => {
      const keep = Object.fromEntries(Object.entries(o).filter(([id]) => reorderingRef.current.has(id)));
      return Object.keys(keep).length === Object.keys(o).length ? o : keep;
    });
  }, []);

  const handleDragEnd =
    (groupId: string, currentIds: string[], onSaved?: () => void) => async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id || reorderingRef.current.has(groupId)) return;
      const current = orderOverrides[groupId] ?? currentIds;
      const oldIndex = current.indexOf(active.id as string);
      const newIndex = current.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      const snapshot = current;
      const reordered = arrayMove(current, oldIndex, newIndex);
      reorderingRef.current.add(groupId);
      setSavingOrderIds((ids) => new Set(ids).add(groupId));
      setOrderOverrides((o) => ({ ...o, [groupId]: reordered }));
      setReorderError(false);
      try {
        await save(groupId, reordered);
        onSaved?.();
      } catch {
        setOrderOverrides((o) => ({ ...o, [groupId]: snapshot }));
        setReorderError(true);
      } finally {
        reorderingRef.current.delete(groupId);
        setSavingOrderIds((ids) => {
          const next = new Set(ids);
          next.delete(groupId);
          return next;
        });
      }
    };

  return { orderOverrides, reorderError, setReorderError, savingOrderIds, handleDragEnd, clearStaleOverrides };
}
