import { api } from './api';
import type { OrderResponse } from './api';

export type RejectReason = 'too_busy' | 'item_unavailable' | 'closing_soon' | 'other' | 'no_response' | 'payment_failed';

export interface TaxBreakdownEntry {
  rateBasisPoints: number;
  grossCents: number;
  taxCents: number;
}

export interface OrderDocument {
  id: string;
  kind: 'invoice' | 'cancellation' | 'correction';
  number: string;
}

export interface InvoiceFileDto {
  fileName: string;
  contentType: 'application/pdf';
  contentBase64: string;
}

export interface OrderRefundLine {
  lineIndex: number;
  quantity: number;
}

export type IntakeOrder = OrderResponse & {
  autoRejectAt: string | null;
  acceptedAt: string | null;
  prepMinutes: number | null;
  taxBreakdown: TaxBreakdownEntry[];
  rejectionNote: string | null;
  customerAddress: { street: string; postcode: string; city: string; country: string } | null;
  refundedCents: number;
  // lines is [] for a free-amount refund
  refunds: Array<{ amountCents: number; reason: string; at: string; lines: OrderRefundLine[] }>;
  releaseFailure: { at: string; message: string } | null;
  documents: OrderDocument[];
  autoAccepted: boolean;
};

export type FulfilmentModeKey = 'collection' | 'delivery' | 'dine_in';

export interface OrderQueueDto {
  serverTime: string;
  timezone: string;
  defaultPrepMinutes: Record<FulfilmentModeKey, number>;
  orders: IntakeOrder[];
}

export interface OrderSettingsDto {
  autoRejectMinutes: number;
  alertEmail: string | null;
  autoAccept?: boolean;
  dineIn?: boolean;
}

interface OrderActionArg {
  shopId: string;
  orderId: string;
}

// Either tick items or give a free amount, never both
export type RefundRequest = { shopId: string; orderId: string; reason: string } & (
  | { amountCents: number; items?: never }
  | { items: OrderRefundLine[]; amountCents?: never }
);

export const ordersApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrderQueue: build.query<OrderQueueDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/order-queue` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Orders' as const, id: `QUEUE-${shopId}` }],
    }),
    acceptOrder: build.mutation<IntakeOrder, OrderActionArg & { prepMinutes: number }>({
      query: ({ shopId, orderId, prepMinutes }) => ({
        url: `/shops/${shopId}/orders/${orderId}/accept`,
        method: 'POST',
        body: { prepMinutes },
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Orders' as const, id: `QUEUE-${shopId}` },
        { type: 'Orders' as const, id: `LIST-${shopId}` },
      ],
      onQueryStarted: applyActionToQueue,
    }),
    rejectOrder: build.mutation<IntakeOrder, OrderActionArg & { reason: RejectReason; note?: string }>({
      query: ({ shopId, orderId, reason, note }) => ({
        url: `/shops/${shopId}/orders/${orderId}/reject`,
        method: 'POST',
        body: { reason, note },
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Orders' as const, id: `QUEUE-${shopId}` },
        { type: 'Orders' as const, id: `LIST-${shopId}` },
      ],
      onQueryStarted: applyActionToQueue,
    }),
    markOrderReady: build.mutation<IntakeOrder, OrderActionArg>({
      query: ({ shopId, orderId }) => ({
        url: `/shops/${shopId}/orders/${orderId}/ready`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Orders' as const, id: `QUEUE-${shopId}` },
        { type: 'Orders' as const, id: `LIST-${shopId}` },
      ],
      onQueryStarted: applyActionToQueue,
    }),
    completeOrder: build.mutation<IntakeOrder, OrderActionArg>({
      query: ({ shopId, orderId }) => ({
        url: `/shops/${shopId}/orders/${orderId}/complete`,
        method: 'POST',
        body: {},
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Orders' as const, id: `QUEUE-${shopId}` },
        { type: 'Orders' as const, id: `LIST-${shopId}` },
      ],
      onQueryStarted: applyActionToQueue,
    }),
    refundOrder: build.mutation<IntakeOrder, RefundRequest>({
      query: ({ shopId, orderId, reason, amountCents, items }) => ({
        url: `/shops/${shopId}/orders/${orderId}/refunds`,
        method: 'POST',
        body: items ? { reason, items } : { reason, amountCents },
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Orders' as const, id: `QUEUE-${shopId}` },
        { type: 'Orders' as const, id: `LIST-${shopId}` },
      ],
      onQueryStarted: applyActionToQueue,
    }),
    getOrderDocument: build.mutation<InvoiceFileDto, OrderActionArg & { documentId: string }>({
      query: ({ shopId, orderId, documentId }) => ({
        url: `/shops/${shopId}/orders/${orderId}/documents/${documentId}`,
      }),
    }),
    updateOrderSettings: build.mutation<OrderSettingsDto, { shopId: string; body: OrderSettingsDto }>({
      query: ({ shopId, body }) => ({
        url: `/shops/${shopId}/order-settings`,
        method: 'PUT',
        body,
      }),
    }),
  }),
});

export const {
  useGetOrderQueueQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderReadyMutation,
  useCompleteOrderMutation,
  useRefundOrderMutation,
  useGetOrderDocumentMutation,
  useUpdateOrderSettingsMutation,
} = ordersApi;

const BOARD_STATES = ['PLACED', 'ACCEPTED', 'READY'];

/**
 * Moves the card on the kitchen board as soon as the server confirms an action, instead of
 * waiting for the refetch (which can lag a full 10 s poll behind). The refetch still follows.
 */
async function applyActionToQueue(
  { shopId, orderId }: OrderActionArg,
  { dispatch, queryFulfilled }: { dispatch: (action: unknown) => unknown; queryFulfilled: Promise<{ data: IntakeOrder }> },
): Promise<void> {
  try {
    const { data: updated } = await queryFulfilled;
    dispatch(
      ordersApi.util.updateQueryData('getOrderQueue', { shopId }, (draft) => {
        const i = draft.orders.findIndex((o) => o.id === orderId);
        if (i === -1) return;
        if (BOARD_STATES.includes(updated.state)) draft.orders[i] = updated;
        else draft.orders.splice(i, 1);
      }),
    );
  } catch {
    // The card's own error toast and refetch handle a failed action
  }
}
