import { api } from './api';

export type ReportMode = 'collection' | 'delivery' | 'dine_in';

export interface RateTotalsDto {
  rateBasisPoints: number;
  grossCents: number;
  taxCents: number;
  netCents: number;
}

export interface ReportTotalsDto {
  orderCount: number;
  grossCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  refundCents: number;
  takingsCents: number;
  byRate: RateTotalsDto[];
}

export interface ReportDayDto extends ReportTotalsDto {
  date: string;
}

export interface SalesReportDto {
  shopId: string;
  from: string;
  to: string;
  timezone: string;
  currency: string;
  totals: ReportTotalsDto;
  days: ReportDayDto[];
  byHour: number[];
  byMode: Array<{ mode: ReportMode; orderCount: number; grossCents: number }>;
  topDishes: Array<{ productId: string; name: string; quantity: number; grossCents: number }>;
}

export interface OwnerOverviewShopDto {
  shopId: string;
  name: string;
  slug: string;
  isPaused: boolean;
  currency: string;
  timezone: string;
  today: { date: string; orderCount: number; takingsCents: number };
  waitingCount: number;
  orderLimit: {
    periodKey: string;
    acceptedOrderCount: number;
    limit: number | null;
    warningLevel: 0 | 80 | 90 | 95 | 100;
    limitReached: boolean;
  };
}

export interface OwnerOverviewDto {
  generatedAt: string;
  shops: OwnerOverviewShopDto[];
  truncated: boolean;
  combinedToday: { currency: string; orderCount: number; takingsCents: number } | null;
}

export const reportsApi = api.injectEndpoints({
  endpoints: (build) => ({
    getSalesReport: build.query<SalesReportDto, { shopId: string; from: string; to: string }>({
      query: ({ shopId, from, to }) => ({ url: `/shops/${shopId}/reports/sales`, params: { from, to } }),
    }),
    getOwnerOverview: build.query<OwnerOverviewDto, void>({ query: () => ({ url: '/owner/overview' }) }),
  }),
});

export const { useGetSalesReportQuery, useGetOwnerOverviewQuery } = reportsApi;
