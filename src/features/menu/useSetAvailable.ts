import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateProductAvailabilityMutation } from '../../services/api';
import { failureMessage } from '../api/errorMessage';
import { useToast } from '../../contexts/ToastContext';

/**
 * The plain on/off availability switch for a dish. Writes through
 * PATCH /products/{productId}/availability and tracks a per-dish pending state.
 */
export function useSetAvailable(shopId: string) {
  const { t } = useTranslation();
  const toast = useToast();
  const [updateAvailability] = useUpdateProductAvailabilityMutation();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const setAvailable = useCallback(
    async (productId: string, isAvailable: boolean, onDone?: (ok: boolean) => void) => {
      if (pending[productId]) return;
      setPending((p) => ({ ...p, [productId]: true }));
      let ok = false;
      try {
        await updateAvailability({ productId, body: { shopId, isAvailable } }).unwrap();
        ok = true;
      } catch (err) {
        toast.error(failureMessage(t('products.failedToUpdate'), err));
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

  return { setAvailable, isPending: (id: string) => !!pending[id] };
}
