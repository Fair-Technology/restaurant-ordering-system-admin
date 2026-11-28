import { api } from './api';

export interface DiscountCodeDto {
  id: string;
  code: string;
  kind: 'percent' | 'amount';
  percent: number | null;
  amountCents: number | null;
  minSubtotalCents: number;
  validFrom: string | null;
  validUntil: string | null;
  totalLimit: number | null;
  perEmailLimit: number | null;
  active: boolean;
  createdAt: string;
  uses: number;
}

export interface LoyaltyRuleDto {
  enabled: boolean;
  everyOrders: number;
  rewardCents: number;
  validDays: number;
  since: string | null;
}

export interface LoyaltyVoucherDto {
  code: string;
  amountCents: number;
  issuedAt: string;
  expiresOn: string;
  used: boolean;
  orderRef: string | null;
}

export interface LoyaltyVouchersResultDto {
  vouchers: LoyaltyVoucherDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface PromotionsDto {
  codes: DiscountCodeDto[];
  loyalty: LoyaltyRuleDto;
}

export interface CreateDiscountCodeBody {
  code: string;
  kind: 'percent' | 'amount';
  percent?: number;
  amountCents?: number;
  minSubtotalCents?: number;
  validFrom?: string | null;
  validUntil?: string | null;
  totalLimit?: number | null;
  perEmailLimit?: number | null;
}

const promotionsTags = (_r: unknown, _e: unknown, { shopId }: { shopId: string }) => [
  { type: 'Shops' as const, id: `PROMOTIONS-${shopId}` },
];

export const promotionsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getPromotions: build.query<PromotionsDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/promotions` }),
      providesTags: promotionsTags,
    }),
    getLoyaltyVouchers: build.query<
      LoyaltyVouchersResultDto,
      { shopId: string; page?: number; pageSize?: number }
    >({
      query: ({ shopId, page, pageSize }) => ({
        url: `/shops/${shopId}/loyalty-vouchers`,
        params: { page, pageSize },
      }),
      providesTags: promotionsTags,
    }),
    createDiscountCode: build.mutation<PromotionsDto, { shopId: string; body: CreateDiscountCodeBody }>({
      query: ({ shopId, body }) => ({ url: `/shops/${shopId}/discount-codes`, method: 'POST', body }),
      invalidatesTags: promotionsTags,
    }),
    setDiscountCodeActive: build.mutation<PromotionsDto, { shopId: string; codeId: string; active: boolean }>({
      query: ({ shopId, codeId, active }) => ({
        url: `/shops/${shopId}/discount-codes/${codeId}`,
        method: 'PATCH',
        body: { active },
      }),
      invalidatesTags: promotionsTags,
    }),
    updateLoyalty: build.mutation<
      PromotionsDto,
      { shopId: string; body: Partial<Omit<LoyaltyRuleDto, 'since'>> }
    >({
      query: ({ shopId, body }) => ({ url: `/shops/${shopId}/loyalty`, method: 'PUT', body }),
      invalidatesTags: promotionsTags,
    }),
  }),
  // The generated client (api.ts) already registers these names with
  // OpenAPI body shapes (queryArg.body / queryArg.<name>Body). Without
  // overrideExisting RTK keeps the generated definition and our payloads
  // are dropped, so the request goes out with an empty body.
  overrideExisting: true,
});

export const {
  useGetPromotionsQuery,
  useGetLoyaltyVouchersQuery,
  useCreateDiscountCodeMutation,
  useSetDiscountCodeActiveMutation,
  useUpdateLoyaltyMutation,
} = promotionsApi;
