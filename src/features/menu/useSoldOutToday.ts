import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateProductAvailabilityMutation } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { clearSoldOutPatch, soldOutTodayPatch } from './soldOut';

/**
 * The stock-only write both the dish list and the order board share: mark a dish
 * sold out for the rest of the shop's day, or put it back. Writes through
 * PATCH /products/{productId}/availability (gated manage_stock OR manage_menu
 * server-side), so a counter hand can do it without menu rights.
 */
export function useSoldOutToday(shopId: string, timeZone: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateAvailability] = useUpdateProductAvailabilityMutation();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const run = useCallback(
    async (
      productId: string,
      body: { unavailableUntil: string | null } | { isAvailable: boolean },
      onDone?: (ok: boolean) => void,
    ) => {
      if (pending[productId]) return;
      setPending((p) => ({ ...p, [productId]: true }));
      let ok = false;
      try {
        await updateAvailability({ productId, body: { shopId, ...body } }).unwrap();
        ok = true;
      } catch {
        toast.error(t('dishes.soldOutFailed'));
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[productId];
          return next;
        });
      }
      onDone?.(ok);
    },
    [pending, shopId, toast, t, updateAvailability],
  );

  const markSoldOutToday = useCallback(
    (productId: string, onDone?: (ok: boolean) => void) =>
      run(productId, soldOutTodayPatch(timeZone), onDone),
    [run, timeZone],
  );

  const clearSoldOut = useCallback(
    (productId: string, onDone?: (ok: boolean) => void) => run(productId, clearSoldOutPatch, onDone),
    [run],
  );

  /** The plain on/off switch, same stock-only endpoint. */
  const setAvailable = useCallback(
    (productId: string, isAvailable: boolean, onDone?: (ok: boolean) => void) =>
      run(productId, { isAvailable }, onDone),
    [run],
  );

  return { markSoldOutToday, clearSoldOut, setAvailable, isPending: (id: string) => !!pending[id] };
}
