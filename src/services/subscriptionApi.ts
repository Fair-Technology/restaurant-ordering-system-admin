import { api } from './api';

export interface OrderLimitStatusDto {
  periodKey: string;
  acceptedOrderCount: number;
  /** null = unlimited */
  limit: number | null;
  warningLevel: 0 | 80 | 90 | 95 | 100;
  limitReached: boolean;
}

export const subscriptionApi = api.injectEndpoints({
  endpoints: (build) => ({
    getOrderLimit: build.query<OrderLimitStatusDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/order-limit` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Subscriptions' as const, id: `LIMIT-${shopId}` }],
    }),
  }),
});

export const { useGetOrderLimitQuery } = subscriptionApi;
