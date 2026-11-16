import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useAcceptOrderMutation,
  useCompleteOrderMutation,
  useDispatchOrderMutation,
  useMarkOrderReadyMutation,
  useRejectOrderMutation,
  type IntakeOrder,
  type RejectReason,
} from '../../services/ordersApi';
import { useToast } from '../../contexts/ToastContext';
import { nextActionFor } from './intake';
import { isPaymentConfigConflict } from './paymentErrors';

interface Options {
  /** The list shows the order as accepted from the first tap */
  onAcceptStart: (orderId: string, prepMinutes: number) => void;
  onAcceptFailed: (orderId: string) => void;
  /** Something failed: reload the queue, the order may have changed meanwhile */
  onFailed: () => void;
  /** A request succeeded: refresh the queue now so the card moves at once */
  onSucceeded?: () => Promise<unknown> | void;
}

/** The kitchen's buttons for an order: accept, reject and the next step (ready, out, handed over). */
export function useOrderActions(shopId: string, { onAcceptStart, onAcceptFailed, onFailed, onSucceeded }: Options) {
  const { t } = useTranslation();
  const toast = useToast();
  const [acceptOrder] = useAcceptOrderMutation();
  const [rejectOrder] = useRejectOrderMutation();
  const [markReady] = useMarkOrderReadyMutation();
  const [dispatchOrder] = useDispatchOrderMutation();
  const [completeOrder] = useCompleteOrderMutation();
  // Orders with a request in flight, so their buttons can't be pressed twice
  const [working, setWorking] = useState<ReadonlySet<string>>(() => new Set());

  const track = useCallback(async (orderId: string, action: () => Promise<unknown>): Promise<boolean> => {
    setWorking((s) => new Set(s).add(orderId));
    try {
      await action();
      // The card must leave its column the moment the request lands, not on the next 10 s poll.
      // A failed refresh is not a failed action: the order did change, so the toast must stay quiet
      // and the queue's own poll is the backstop.
      try {
        await onSucceeded?.();
      } catch {
        // keep the queue's last state; the poll catches up
      }
      return true;
    } catch (error) {
      toast.error(t(isPaymentConfigConflict(error) ? 'orders.paymentConfigUnavailable' : 'orders.actionFailed'));
      onFailed();
      return false;
    } finally {
      setWorking((s) => {
        const next = new Set(s);
        next.delete(orderId);
        return next;
      });
    }
  }, [onFailed, onSucceeded, t, toast]);

  const accept = useCallback(
    async (order: IntakeOrder, prepMinutes: number) => {
      onAcceptStart(order.id, prepMinutes);
      const ok = await track(order.id, () => acceptOrder({ shopId, orderId: order.id, prepMinutes }).unwrap());
      if (!ok) onAcceptFailed(order.id);
      return ok;
    },
    [acceptOrder, onAcceptFailed, onAcceptStart, shopId, track],
  );

  const reject = useCallback(
    (order: IntakeOrder, reason: RejectReason) =>
      track(order.id, () => rejectOrder({ shopId, orderId: order.id, reason }).unwrap()),
    [rejectOrder, shopId, track],
  );

  const advance = useCallback(
    (order: IntakeOrder) => {
      const action = nextActionFor(order);
      if (!action) return Promise.resolve(false);
      const arg = { shopId, orderId: order.id };
      return track(order.id, () =>
        (action === 'markReady' ? markReady(arg) : action === 'dispatch' ? dispatchOrder(arg) : completeOrder(arg)).unwrap(),
      );
    },
    [completeOrder, dispatchOrder, markReady, shopId, track],
  );

  return { accept, reject, advance, isWorking: (orderId: string) => working.has(orderId) };
}

/** i18n key of the next step's button: "Fertig", "Unterwegs", "Übergeben"/"Serviert", "Geliefert". */
export function nextActionLabelKey(order: Pick<IntakeOrder, 'state' | 'fulfilmentMode'>): string | null {
  const action = nextActionFor(order);
  if (action === 'handOver') return order.fulfilmentMode === 'dine_in' ? 'orders.served' : 'orders.handOver';
  return action ? `orders.${action}` : null;
}
