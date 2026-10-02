import { api } from './api';
import type { OrderResponse } from './api';

export type RejectReason = 'too_busy' | 'item_unavailable' | 'closing_soon' | 'other' | 'no_response';

export interface TaxBreakdownEntry {
  rateBasisPoints: number;
  grossCents: number;
  taxCents: number;
}

export type IntakeOrder = OrderResponse & {
  autoRejectAt: string | null;
  acceptedAt: string | null;
  prepMinutes: number | null;
  taxBreakdown: TaxBreakdownEntry[];
  rejectionNote: string | null;
};

export type FulfilmentModeKey = 'collection' | 'delivery' | 'dine_in';

export interface OrderQueueDto {
  serverTime: string;
  defaultPrepMinutes: Record<FulfilmentModeKey, number>;
  orders: IntakeOrder[];
}

export interface OrderSettingsDto {
  autoRejectMinutes: number;
  alertEmail: string | null;
}

interface OrderActionArg {
  shopId: string;
  orderId: string;
}

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
  useUpdateOrderSettingsMutation,
} = ordersApi;
