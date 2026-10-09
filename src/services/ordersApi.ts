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

export interface DeliveryZoneDto {
  postcode: string;
  feeCents: number;
  minOrderCents: number;
}

export interface DeliveryAddressDto {
  street: string;
  postcode: string;
  city: string;
}

export type IntakeOrder = Omit<OrderResponse, 'items'> & {
  // Lines sharing a comboInstanceId are the dishes of one combo; absent on dish lines and on an older backend
  items: Array<OrderResponse['items'][number] & { comboInstanceId?: string }>;
  // Absent when talking to a backend from before delivery
  totalCents?: number;
  deliveryFeeCents?: number | null;
  deliveryAddress?: DeliveryAddressDto | null;
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
  // Absent on a backend from before scheduled orders; null for as soon as possible
  scheduledFor?: string | null;
  // Absent on a backend from before discounts
  discount?: { kind: 'code' | 'voucher'; code: string; cents: number } | null;
  loyaltyVoucherSent?: boolean;
};

export type UpcomingOrder = IntakeOrder & { outsideHours: boolean };

export type FulfilmentModeKey = 'collection' | 'delivery' | 'dine_in';

export type WeekDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type WeeklyHoursDto = Record<WeekDayKey, { open: string; close: string }[]>;

export interface BusyStateDto {
  active: boolean;
  extraMinutes: number;
}

export interface OrderQueueDto {
  serverTime: string;
  timezone: string;
  defaultPrepMinutes: Record<FulfilmentModeKey, number>;
  // Absent when talking to a backend from before busy mode
  busy?: BusyStateDto;
  orders: IntakeOrder[];
  // Absent when talking to a backend from before scheduled orders
  upcoming?: UpcomingOrder[];
}

export interface OrderSettingsDto {
  autoRejectMinutes: number;
  alertEmail: string | null;
  autoAccept: boolean;
  dineIn: boolean;
  autoAcceptHours: WeeklyHoursDto | null;
  prepMinutes: Record<FulfilmentModeKey, number>;
  lastOrdersMinutes: number | null;
  busyExtraMinutes: number;
  delivery: boolean;
  deliveryHours: WeeklyHoursDto | null;
  deliveryZones: DeliveryZoneDto[];
  deliveryFeeTaxClassId: string | null;
  scheduledOrders: boolean;
}

// Every field is optional: the server keeps whatever is not sent
export type UpdateOrderSettingsBody = Partial<Omit<OrderSettingsDto, 'prepMinutes'>> & {
  prepMinutes?: Partial<Record<FulfilmentModeKey, number>>;
};

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
    dispatchOrder: build.mutation<IntakeOrder, OrderActionArg>({
      query: ({ shopId, orderId }) => ({
        url: `/shops/${shopId}/orders/${orderId}/dispatch`,
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
    updateOrderSettings: build.mutation<OrderSettingsDto, { shopId: string; body: UpdateOrderSettingsBody }>({
      query: ({ shopId, body }) => ({
        url: `/shops/${shopId}/order-settings`,
        method: 'PUT',
        body,
      }),
    }),
    setBusyMode: build.mutation<BusyStateDto, { shopId: string; on: boolean }>({
      query: ({ shopId, on }) => ({
        url: `/shops/${shopId}/busy-mode`,
        method: 'PUT',
        body: { on },
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Orders' as const, id: `QUEUE-${shopId}` }],
      onQueryStarted: async ({ shopId }, { dispatch, queryFulfilled }) => {
        try {
          const { data } = await queryFulfilled;
          dispatch(
            ordersApi.util.updateQueryData('getOrderQueue', { shopId }, (draft) => {
              draft.busy = data;
            }),
          );
        } catch {
          // The button shows the error
        }
      },
    }),
  }),
});

export const {
  useGetOrderQueueQuery,
  useAcceptOrderMutation,
  useRejectOrderMutation,
  useMarkOrderReadyMutation,
  useDispatchOrderMutation,
  useCompleteOrderMutation,
  useRefundOrderMutation,
  useGetOrderDocumentMutation,
  useUpdateOrderSettingsMutation,
  useSetBusyModeMutation,
} = ordersApi;

const BOARD_STATES = ['PLACED', 'ACCEPTED', 'READY', 'OUT_FOR_DELIVERY'];

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
        if (i === -1) {
          const u = draft.upcoming?.findIndex((o) => o.id === orderId) ?? -1;
          if (u !== -1) draft.upcoming!.splice(u, 1);
          return;
        }
        if (BOARD_STATES.includes(updated.state)) draft.orders[i] = updated;
        else draft.orders.splice(i, 1);
      }),
    );
  } catch {
    // The card's own error toast and refetch handle a failed action
  }
}
