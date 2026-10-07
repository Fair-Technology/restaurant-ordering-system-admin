import { api } from './api';
import type { GetShopSubscriptionApiResponse } from './api';

export interface OrderLimitStatusDto {
  periodKey: string;
  acceptedOrderCount: number;
  /** null = unlimited */
  limit: number | null;
  warningLevel: 0 | 80 | 90 | 95 | 100;
  limitReached: boolean;
  payment: { inGrace: boolean; graceEndsAt: string | null; droppedForNonPayment: boolean };
}

const subscriptionTags = (_r: unknown, _e: unknown, { shopId }: { shopId: string }) => [
  { type: 'Subscriptions' as const, id: shopId },
  { type: 'Subscriptions' as const, id: `LIMIT-${shopId}` },
];

export const subscriptionApi = api.injectEndpoints({
  endpoints: (build) => ({
    confirmSubscriptionCheckout: build.mutation<GetShopSubscriptionApiResponse, { shopId: string; sessionId: string }>({
      query: ({ shopId, sessionId }) => ({
        url: `/shops/${shopId}/subscription/checkout/confirm`,
        method: 'POST',
        body: { sessionId },
      }),
      invalidatesTags: subscriptionTags,
    }),
    cancelScheduledChange: build.mutation<GetShopSubscriptionApiResponse, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/subscription/scheduled-change`, method: 'DELETE' }),
      invalidatesTags: subscriptionTags,
    }),
    createBillingPortalSession: build.mutation<{ url: string }, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/subscription/portal`, method: 'POST' }),
    }),
    retrySubscriptionPayment: build.mutation<GetShopSubscriptionApiResponse, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/subscription/retry-payment`, method: 'POST' }),
      invalidatesTags: subscriptionTags,
    }),
    getOrderLimit: build.query<OrderLimitStatusDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/order-limit` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Subscriptions' as const, id: `LIMIT-${shopId}` }],
    }),
  }),
});

export const {
  useGetOrderLimitQuery,
  useConfirmSubscriptionCheckoutMutation,
  useCancelScheduledChangeMutation,
  useCreateBillingPortalSessionMutation,
  useRetrySubscriptionPaymentMutation,
} = subscriptionApi;
