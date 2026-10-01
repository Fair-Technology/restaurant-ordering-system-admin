import { api } from './api';
import type { MenuLanguage } from './api';

export type LegalLanguage = MenuLanguage;

export const LEGAL_FORMS = ['sole_trader', 'ek', 'gbr', 'ohg', 'kg', 'gmbh', 'ug', 'other'] as const;
export type LegalForm = (typeof LEGAL_FORMS)[number];

export interface ImpressumFields {
  legalName: string;
  legalForm: LegalForm;
  representatives: string;
  street: string;
  postcode: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  registerCourt: string;
  registerNumber: string;
  vatId: string;
  supervisoryAuthority: string;
}
export type ImpressumFieldKey = keyof ImpressumFields;

export const LEGAL_TEXT_MAX_CHARS = { terms: 20000, withdrawal: 10000, privacyAddition: 5000 } as const;
export const MIN_LEGAL_TEXT_CHARS = 50;

export interface DpaAcceptance {
  version: string;
  acceptedAt: string;
  acceptedByUserId: string;
  shopNameAtAcceptance: string;
}

export interface LegalTextDto {
  text: string;
  revision: number;
  updatedAt: string;
}

export interface ShopLegalSettingsDto {
  impressum: ImpressumFields | null;
  terms: LegalTextDto | null;
  withdrawal: LegalTextDto | null;
  privacyAddition: LegalTextDto | null;
  missingImpressumFields: ImpressumFieldKey[];
  completeness: { dpa: boolean; impressum: boolean; terms: boolean; withdrawal: boolean; privacyNotice: boolean };
  dpa: { currentVersion: string; currentIsDraft: boolean; accepted: DpaAcceptance | null };
  platformIdentityComplete: boolean;
  callerIsOwner: boolean;
}

export interface UpdateShopLegalBody {
  impressum?: ImpressumFields;
  terms?: string;
  withdrawal?: string;
  privacyAddition?: string;
}

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface PlatformDocument {
  version: string;
  isDraft: boolean;
  publishedAt: string;
  title: Record<LegalLanguage, string>;
  sections: Record<LegalLanguage, LegalSection[]>;
}

export interface SubProcessor {
  id: 'azure' | 'entra' | 'acs';
  name: string;
  purpose: Record<LegalLanguage, string>;
  location: Record<LegalLanguage, string>;
}

export interface PlatformLegalPublicDto {
  platformName: string;
  salesSiteUrl: string | null;
  operator: { legalName: string; address: string; email: string };
  euRepresentative: { name: string; address: string; email: string } | null;
  subProcessors: SubProcessor[];
  currentDpaVersion: string;
  currentDpaIsDraft: boolean;
}

export interface ExportCustomer {
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
}

export interface ExportOrderItem {
  productName: string;
  quantity: number;
}

// The export mirrors the backend's stored order minus customerNotes. Only the
// fields the CSV needs are typed; the JSON download passes the rest through.
export interface ExportOrder {
  id: string;
  orderRef: string;
  createdAt: string;
  state: string;
  fulfilmentMode: string;
  payment: { method: string; status: string; stripePaymentIntentId: string | null };
  currency: string;
  subtotalCents: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: ExportOrderItem[];
}

export interface ShopDataExportDto {
  formatVersion: 1;
  exportedAt: string;
  shop: {
    id: string;
    slug: string;
    name: string;
    countryCode: string;
    currency: string;
    timezone: string;
    address: unknown;
    openingHours: unknown;
    menuLanguages: MenuLanguage[];
    impressum: ImpressumFields | null;
    terms: string | null;
    withdrawal: string | null;
    privacyAddition: string | null;
  };
  categories: unknown[];
  products: unknown[];
  orders: ExportOrder[];
  customers: ExportCustomer[];
}

export interface EraseCustomerResultDto {
  anonymisedOrderCount: number;
}

export const legalApi = api.injectEndpoints({
  endpoints: (build) => ({
    getShopLegal: build.query<ShopLegalSettingsDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/legal` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Legal' as const, id: shopId }],
    }),
    updateShopLegal: build.mutation<ShopLegalSettingsDto, { shopId: string; body: UpdateShopLegalBody }>({
      query: ({ shopId, body }) => ({ url: `/shops/${shopId}/legal`, method: 'PATCH', body }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Legal' as const, id: shopId },
        { type: 'Shops' as const, id: `golive-${shopId}` },
      ],
    }),
    acceptDpa: build.mutation<ShopLegalSettingsDto, { shopId: string; version: string }>({
      query: ({ shopId, version }) => ({
        url: `/shops/${shopId}/dpa-acceptance`,
        method: 'POST',
        body: { version },
      }),
      invalidatesTags: (_r, _e, { shopId }) => [
        { type: 'Legal' as const, id: shopId },
        { type: 'Shops' as const, id: `golive-${shopId}` },
      ],
    }),
    getDpaDocument: build.query<PlatformDocument, { version?: string }>({
      query: ({ version }) => ({ url: '/legal/dpa', params: version ? { version } : undefined }),
    }),
    getPlatformLegal: build.query<PlatformLegalPublicDto, void>({
      query: () => ({ url: '/legal/platform' }),
    }),
    getShopDataExport: build.query<ShopDataExportDto, { shopId: string }>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/data-export` }),
      keepUnusedDataFor: 0,
    }),
    eraseCustomer: build.mutation<EraseCustomerResultDto, { shopId: string; email: string }>({
      query: ({ shopId, email }) => ({
        url: `/shops/${shopId}/customer-erasure`,
        method: 'POST',
        body: { email },
      }),
    }),
  }),
});

export const {
  useGetShopLegalQuery,
  useUpdateShopLegalMutation,
  useAcceptDpaMutation,
  useGetDpaDocumentQuery,
  useGetPlatformLegalQuery,
  useLazyGetShopDataExportQuery,
  useEraseCustomerMutation,
} = legalApi;
