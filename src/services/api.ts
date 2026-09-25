import { baseApi as api } from "./baseApi";
const injectedRtkApi = api.injectEndpoints({
  endpoints: (build) => ({
    getShops: build.query<GetShopsApiResponse, GetShopsApiArg>({
      query: () => ({ url: `/shops` }),
    }),
    createShop: build.mutation<CreateShopApiResponse, CreateShopApiArg>({
      query: (queryArg) => ({
        url: `/shops`,
        method: "POST",
        body: queryArg.createShopRequest,
      }),
    }),
    getShopBySlug: build.query<GetShopBySlugApiResponse, GetShopBySlugApiArg>({
      query: (queryArg) => ({ url: `/shops/slug/${queryArg.slug}` }),
    }),
    getMyShops: build.query<GetMyShopsApiResponse, GetMyShopsApiArg>({
      query: () => ({ url: `/shops/me` }),
    }),
    getShopById: build.query<GetShopByIdApiResponse, GetShopByIdApiArg>({
      query: (queryArg) => ({ url: `/shops/${queryArg.shopId}` }),
    }),
    updateShop: build.mutation<UpdateShopApiResponse, UpdateShopApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}`,
        method: "PATCH",
        body: queryArg.updateShopRequest,
      }),
    }),
    deleteShop: build.mutation<DeleteShopApiResponse, DeleteShopApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}`,
        method: "DELETE",
      }),
    }),
    getCategoriesByShop: build.query<
      GetCategoriesByShopApiResponse,
      GetCategoriesByShopApiArg
    >({
      query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/categories` }),
      providesTags: (_result, _error, arg) => [{ type: 'Categories' as const, id: `LIST-${arg.shopId}` }],
    }),
    createCategory: build.mutation<
      CreateCategoryApiResponse,
      CreateCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/categories`,
        method: "POST",
        body: queryArg.createCategoryRequest,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Categories' as const, id: `LIST-${arg.shopId}` }],
    }),
    getCategoryById: build.query<
      GetCategoryByIdApiResponse,
      GetCategoryByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Categories', id: arg.categoryId }],
    }),
    updateCategory: build.mutation<
      UpdateCategoryApiResponse,
      UpdateCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
        method: "PATCH",
        body: queryArg.updateCategoryRequest,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Categories' as const, id: `LIST-${arg.shopId}` }],
    }),
    deleteCategory: build.mutation<
      DeleteCategoryApiResponse,
      DeleteCategoryApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Categories' as const, id: `LIST-${arg.shopId}` }],
    }),
    getProductsByShop: build.query<
      GetProductsByShopApiResponse,
      GetProductsByShopApiArg
    >({
      query: (queryArg) => ({
        url: `/products`,
        params: {
          shopId: queryArg.shopId,
          includeUncategorized: true,
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Products' as const, id: `LIST-${arg.shopId}` }],
    }),
    createProduct: build.mutation<
      CreateProductApiResponse,
      CreateProductApiArg
    >({
      query: (queryArg) => ({
        url: `/products`,
        method: "POST",
        body: queryArg.createProductRequest,
      }),
      invalidatesTags: ['Products'],
    }),
    getProductById: build.query<
      GetProductByIdApiResponse,
      GetProductByIdApiArg
    >({
      query: (queryArg) => ({
        url: `/products/${queryArg.productId}`,
        params: {
          shopId: queryArg.shopId,
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Products', id: arg.productId }],
    }),
    updateProduct: build.mutation<
      UpdateProductApiResponse,
      UpdateProductApiArg
    >({
      query: (queryArg) => ({
        url: `/products/${queryArg.productId}`,
        method: "PATCH",
        body: queryArg.updateProductRequest,
      }),
      invalidatesTags: (_result, _error, arg) =>
        arg.updateProductRequest.shopId
          ? [{ type: 'Products' as const, id: `LIST-${arg.updateProductRequest.shopId}` }]
          : [{ type: 'Products' as const, id: 'LIST' }],
    }),
    deleteProduct: build.mutation<
      DeleteProductApiResponse,
      DeleteProductApiArg
    >({
      query: (queryArg) => ({
        url: `/products/${queryArg.productId}`,
        method: "DELETE",
        params: {
          shopId: queryArg.shopId,
        },
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Products', id: arg.productId },
        'Products',
      ],
    }),
    generateUploadUrl: build.mutation<
      GenerateUploadUrlApiResponse,
      GenerateUploadUrlApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/products/${queryArg.productId}/images/upload-url`,
        method: "POST",
        body: queryArg.generateImageUploadUrlRequest,
      }),
    }),
    addProductImage: build.mutation<
      AddProductImageApiResponse,
      AddProductImageApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/products/${queryArg.productId}/images`,
        method: "POST",
        body: queryArg.addProductImageRequest,
      }),
      invalidatesTags: (_result, _error, arg) => [{ type: 'Products' as const, id: `LIST-${arg.shopId}` }],
    }),
    generateShopLogoUploadUrl: build.mutation<
      GenerateShopLogoUploadUrlApiResponse,
      GenerateShopLogoUploadUrlApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/logo/upload-url`,
        method: "POST",
        body: queryArg.generateShopLogoUploadUrlRequest,
      }),
    }),
    setShopLogo: build.mutation<SetShopLogoApiResponse, SetShopLogoApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/logo`,
        method: "POST",
        body: queryArg.setShopLogoRequest,
      }),
    }),
    addShopMember: build.mutation<AddShopMemberApiResponse, AddShopMemberApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/members`,
        method: "POST",
        body: { email: queryArg.email, role: queryArg.roleId },
      }),
    }),
    getMyInvitations: build.query<GetMyInvitationsApiResponse, void>({
      query: () => ({ url: `/users/me/invitations` }),
      providesTags: ['Invitations'],
    }),
    acceptShopInvitation: build.mutation<AcceptShopInvitationApiResponse, AcceptShopInvitationApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/invitations/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitations', 'Shops'],
    }),
    declineShopInvitation: build.mutation<DeclineShopInvitationApiResponse, DeclineShopInvitationApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/invitations/decline`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitations'],
    }),
    removeShopMember: build.mutation<RemoveShopMemberApiResponse, RemoveShopMemberApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/members/${queryArg.userId}`,
        method: "DELETE",
      }),
    }),
    createShopRole: build.mutation<CreateShopRoleApiResponse, CreateShopRoleApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/roles`,
        method: "POST",
        body: { name: queryArg.name, permissions: queryArg.permissions },
      }),
    }),
    updateShopRole: build.mutation<UpdateShopRoleApiResponse, UpdateShopRoleApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/roles/${queryArg.roleId}`,
        method: "PATCH",
        body: { name: queryArg.name, permissions: queryArg.permissions },
      }),
    }),
    deleteShopRole: build.mutation<DeleteShopRoleApiResponse, DeleteShopRoleApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/roles/${queryArg.roleId}`,
        method: "DELETE",
      }),
    }),
    requestShopNameChange: build.mutation<
      { id: string; pendingNameChange: { requestedName: string; requestedSlug: string; requestedBy: string; requestedAt: string } },
      { shopId: string; requestedName: string }
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/name-change-request`,
        method: 'POST',
        body: { requestedName: queryArg.requestedName },
      }),
    }),
    cancelShopNameChange: build.mutation<{ id: string; updatedAt: string }, { shopId: string }>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/name-change-request`,
        method: 'DELETE',
      }),
    }),
    getVisiblePlans: build.query<GetVisiblePlansApiResponse, void>({
      query: () => ({ url: '/plans' }),
      providesTags: ['Plans'],
    }),
    getShopSubscription: build.query<GetShopSubscriptionApiResponse, GetShopSubscriptionApiArg>({
      query: ({ shopId }) => ({ url: `/shops/${shopId}/subscription` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Subscriptions' as const, id: shopId }],
    }),
    getPlanPricing: build.query<GetPlanPricingApiResponse, GetPlanPricingApiArg>({
      query: ({ planId }) => ({ url: `/plans/${planId}/pricing` }),
      providesTags: (_r, _e, { planId }) => [{ type: 'Plans' as const, id: `pricing-${planId}` }],
    }),
    createSubscriptionCheckout: build.mutation<
      CreateSubscriptionCheckoutApiResponse,
      CreateSubscriptionCheckoutApiArg
    >({
      query: ({ shopId, planId, billingInterval }) => ({
        url: `/shops/${shopId}/subscription/checkout`,
        method: 'POST',
        body: { planId, billingInterval },
      }),
    }),
    cancelShopSubscription: build.mutation<CancelShopSubscriptionApiResponse, CancelShopSubscriptionApiArg>({
      query: ({ shopId }) => ({
        url: `/shops/${shopId}/subscription`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Subscriptions' as const, id: shopId }],
    }),
    resumeShopSubscription: build.mutation<ResumeShopSubscriptionApiResponse, ResumeShopSubscriptionApiArg>({
      query: ({ shopId }) => ({
        url: `/shops/${shopId}/subscription/resume`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Subscriptions' as const, id: shopId }],
    }),
    reactivateShop: build.mutation<ReactivateShopApiResponse, ReactivateShopApiArg>({
      query: ({ shopId }) => ({
        url: `/shops/${shopId}/reactivate`,
        method: 'POST',
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Shops' as const, id: shopId }],
    }),
    createOrder: build.mutation<CreateOrderApiResponse, CreateOrderApiArg>({
      query: (queryArg) => ({
        url: `/orders`,
        method: "POST",
        body: queryArg.checkoutRequest,
      }),
    }),
    stripeWebhook: build.mutation<
      StripeWebhookApiResponse,
      StripeWebhookApiArg
    >({
      query: (queryArg) => ({
        url: `/webhooks/stripe`,
        method: "POST",
        body: queryArg.body,
      }),
    }),
    getOrdersByShop: build.query<
      GetOrdersByShopApiResponse,
      GetOrdersByShopApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/orders`,
        params: {
          page: queryArg.page,
          pageSize: queryArg.pageSize,
        },
      }),
      providesTags: (_result, _error, arg) => [{ type: 'Orders' as const, id: `LIST-${arg.shopId}` }],
    }),
    getOrderByPaymentIntent: build.query<
      GetOrderByPaymentIntentApiResponse,
      GetOrderByPaymentIntentApiArg
    >({
      query: (queryArg) => ({
        url: `/orders/by-payment-intent/${queryArg.paymentIntentId}`,
      }),
    }),
    getGoLiveStatus: build.query<GetGoLiveStatusApiResponse, GetGoLiveStatusApiArg>({
      query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/go-live-status` }),
      providesTags: (_r, _e, { shopId }) => [{ type: 'Shops' as const, id: `golive-${shopId}` }],
    }),
    createStripeAccountSession: build.mutation<
      CreateStripeAccountSessionApiResponse,
      CreateStripeAccountSessionApiArg
    >({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/stripe/account-session`,
        method: 'POST',
        body: { purpose: queryArg.purpose },
      }),
    }),
    disconnectStripeAccount: build.mutation<void, DisconnectStripeAccountApiArg>({
      query: (queryArg) => ({
        url: `/shops/${queryArg.shopId}/stripe/account`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { shopId }) => [{ type: 'Shops' as const, id: shopId }],
    }),
  }),
  overrideExisting: false,
});
export { injectedRtkApi as api };
export type GetShopsApiResponse =
  /** status 200 List of all shops retrieved successfully */ GetAllShopsResponse;
export type GetShopsApiArg = void;
export type CreateShopApiResponse =
  /** status 200 Shop created successfully */ ShopResponse;
export type CreateShopApiArg = {
  createShopRequest: CreateShopRequest;
};
export type GetShopBySlugApiResponse =
  /** status 200 Shop retrieved successfully */ ShopResponse;
export type GetShopBySlugApiArg = {
  /** Shop slug (public identifier) */
  slug: string;
};
export type GetMyShopsApiResponse =
  /** status 200 Shops where the user is an active member (any role) */ GetAllShopsResponse;
export type GetMyShopsApiArg = void;
export type GetShopByIdApiResponse =
  /** status 200 Shop retrieved successfully */ ShopResponse;
export type GetShopByIdApiArg = {
  /** Shop ID */
  shopId: string;
};
export type UpdateShopApiResponse =
  /** status 200 Shop updated successfully */ ShopResponse;
export type UpdateShopApiArg = {
  /** Shop ID */
  shopId: string;
  updateShopRequest: UpdateShopRequest;
};
export type DeleteShopApiResponse =
  /** status 200 Shop deleted successfully */ DeleteResponse;
export type DeleteShopApiArg = {
  /** Shop ID */
  shopId: string;
};
export type GetCategoriesByShopApiResponse =
  /** status 200 Categories retrieved successfully */ CategoriesResponse;
export type GetCategoriesByShopApiArg = {
  /** Shop ID */
  shopId: string;
};
export type CreateCategoryApiResponse =
  /** status 200 Category created successfully */ CategoryResponse;
export type CreateCategoryApiArg = {
  /** Shop ID */
  shopId: string;
  createCategoryRequest: CreateCategoryRequest;
};
export type GetCategoryByIdApiResponse =
  /** status 200 Category retrieved successfully */ CategoryResponse;
export type GetCategoryByIdApiArg = {
  /** Shop ID */
  shopId: string;
  /** Category ID */
  categoryId: string;
};
export type UpdateCategoryApiResponse =
  /** status 200 Category updated successfully */ CategoryResponse;
export type UpdateCategoryApiArg = {
  /** Shop ID */
  shopId: string;
  /** Category ID */
  categoryId: string;
  updateCategoryRequest: UpdateCategoryRequest;
};
export type DeleteCategoryApiResponse =
  /** status 200 Category deleted successfully */ CategoryResponse;
export type DeleteCategoryApiArg = {
  /** Shop ID */
  shopId: string;
  /** Category ID */
  categoryId: string;
};
export type GetProductsByShopApiResponse =
  /** status 200 Products retrieved successfully */ ProductsResponse;
export type GetProductsByShopApiArg = {
  /** Shop ID to filter products */
  shopId: string;
};
export type CreateProductApiResponse =
  /** status 200 Product created successfully */ ProductResponse;
export type CreateProductApiArg = {
  createProductRequest: CreateProductRequest;
};
export type GetProductByIdApiResponse =
  /** status 200 Product retrieved successfully */ ProductResponse;
export type GetProductByIdApiArg = {
  /** Product ID */
  productId: string;
  /** Shop ID (required for partition key) */
  shopId: string;
};
export type UpdateProductApiResponse =
  /** status 200 Product updated successfully */ ProductResponse;
export type UpdateProductApiArg = {
  /** Product ID */
  productId: string;
  updateProductRequest: UpdateProductRequest;
};
export type DeleteProductApiResponse =
  /** status 200 Product deleted successfully */ DeleteResponse;
export type DeleteProductApiArg = {
  /** Product ID */
  productId: string;
  /** Shop ID (required for partition key) */
  shopId: string;
};
export type GenerateUploadUrlApiResponse =
  /** status 200 Upload URL generated successfully */ GenerateImageUploadUrlResponse;
export type GenerateUploadUrlApiArg = {
  /** Shop ID */
  shopId: string;
  /** Product ID */
  productId: string;
  generateImageUploadUrlRequest: GenerateImageUploadUrlRequest;
};
export type AddProductImageApiResponse =
  /** status 200 Product image added successfully */ ProductImageResponse;
export type AddProductImageApiArg = {
  /** Shop ID */
  shopId: string;
  /** Product ID */
  productId: string;
  addProductImageRequest: AddProductImageRequest;
};
export type GenerateShopLogoUploadUrlApiResponse =
  /** status 200 Upload URL generated successfully */ GenerateShopLogoUploadUrlResponse;
export type GenerateShopLogoUploadUrlApiArg = {
  /** Shop ID */
  shopId: string;
  generateShopLogoUploadUrlRequest: GenerateShopLogoUploadUrlRequest;
};
export type SetShopLogoApiResponse =
  /** status 200 Shop logo updated successfully */ ShopResponse;
export type SetShopLogoApiArg = {
  /** Shop ID */
  shopId: string;
  setShopLogoRequest: SetShopLogoRequest;
};
export type CreateOrderApiResponse =
  /** status 200 Order created and PaymentIntent initiated */ CheckoutResponse;
export type CreateOrderApiArg = {
  checkoutRequest: CheckoutRequest;
};
export type StripeWebhookApiResponse = /** status 200 Event received */ {
  received?: boolean;
};
export type StripeWebhookApiArg = {
  body: object;
};
export type GetOrdersByShopApiResponse =
  /** status 200 Orders retrieved successfully */ OrdersPageResponse;
export type GetOrdersByShopApiArg = {
  /** Shop ID */
  shopId: string;
  /** 1-based page number (default: 1) */
  page?: number;
  /** Number of orders per page (default: 20, max: 100) */
  pageSize?: number;
};
export type GetOrderByPaymentIntentApiResponse =
  /** status 200 Order found */ OrderByPaymentIntentResponse;
export type GetOrderByPaymentIntentApiArg = {
  /** Stripe PaymentIntent ID (starts with pi_) */
  paymentIntentId: string;
};
export type ProductSchedule = {
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[];
  /** Discounted price in cents during this window; must be less than the product base price */
  offerPrice?: number | null;
  /** Optional label shown during the offer window (e.g. "Happy Hour") */
  offerLabel?: string | null;
};
export type ShopMembersResponse = {
  members: {
    userId: string;
    role: string;
    isActive: boolean;
  }[];
};
export type ShopRolesResponse = {
  roles: { id: string; name: string; permissions: string[] }[];
};
export type AddShopMemberApiResponse =
  /** status 200 Member added successfully */ ShopMembersResponse;
export type AddShopMemberApiArg = {
  /** Shop ID */
  shopId: string;
  /** Email address of the user to invite */
  email: string;
  /** Role ID to assign ('owner' or a custom role id from shop.roles) */
  roleId: string;
};
export type InvitationResponse = {
  shopId: string;
  shopName: string;
  shopSlug: string;
  role: string;
};
export type GetMyInvitationsApiResponse = {
  invitations: InvitationResponse[];
};
export type AcceptShopInvitationApiResponse = {
  shopId: string;
  userId: string;
  role: string;
};
export type AcceptShopInvitationApiArg = {
  shopId: string;
};
export type DeclineShopInvitationApiResponse = {
  shopId: string;
  userId: string;
};
export type DeclineShopInvitationApiArg = {
  shopId: string;
};
export type CreateShopRoleApiResponse = /** status 200 Role created */ ShopRolesResponse;
export type CreateShopRoleApiArg = {
  shopId: string;
  name: string;
  permissions: string[];
};
export type UpdateShopRoleApiResponse = /** status 200 Role updated */ ShopRolesResponse;
export type UpdateShopRoleApiArg = {
  shopId: string;
  roleId: string;
  name?: string;
  permissions?: string[];
};
export type DeleteShopRoleApiResponse = /** status 200 Role deleted */ ShopRolesResponse;
export type DeleteShopRoleApiArg = {
  shopId: string;
  roleId: string;
};
export type RemoveShopMemberApiResponse =
  /** status 200 Member removed successfully */ ShopMembersResponse;
export type RemoveShopMemberApiArg = {
  /** Shop ID */
  shopId: string;
  /** Entra Object ID of the member to remove */
  userId: string;
};
export type ShopBranding = {
  /** Logo URL (must start with https://) */
  logoUrl?: string | null;
  /** Hero image URL (must start with https://) */
  heroImageUrl?: string | null;
  colors: {
    /** Primary brand color (hex) */
    primary: string;
    /** Secondary brand color (hex) */
    secondary: string;
    /** Tertiary brand color (hex) */
    tertiary: string;
    /** Background color (hex) */
    background: string;
  };
} | null;
export type ShopResponse = {
  /** Shop ID */
  id?: string;
  /** Shop slug */
  slug?: string;
  /** Shop name */
  name?: string;
  /** Whether shop is deleted */
  isDeleted?: boolean;
  /** Whether shop is accepting orders */
  acceptingOrders?: boolean;
  /** Whether shop is paused */
  isPaused?: boolean;
  /** Message shown when shop is paused */
  pausedMessage?: string;
  /** Whether shop is deactivated because active products exceed the free plan limit */
  isDeactivatedDueToLimits?: boolean;
  /** Shop currency (ISO code) */
  currency?: string;
  /** Shop timezone */
  timezone?: string;
  /** Minimum order amount in cents */
  minOrderAmountCents?: number;
  /** Shop address */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  /** Creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
  /** Shop members */
  members?: {
    userId?: string;
    role?: string;
    isActive?: boolean;
  }[];
  /** Custom roles defined for this shop */
  roles?: { id?: string; name?: string; permissions?: string[] }[];
  /** ISO 3166-1 alpha-2 country code (e.g. "AU", "DE") */
  countryCode?: string;
  /** Tax rates seeded from country on shop creation */
  taxRates?: { id?: string; label?: string; rate?: number }[];
  /** Industry / business type */
  industry?: string;
  /** Shop branding configuration, or null if not configured. */
  branding?: ShopBranding;
  /** Pending name change request submitted by the owner and awaiting superadmin approval. */
  pendingNameChange?: {
    requestedName: string;
    requestedSlug: string;
    requestedBy: string;
    requestedAt: string;
  } | null;
  /** Shop opening hours per day of the week. */
  openingHours?: {
    mon?: {
      open?: string;
      close?: string;
    }[];
    tue?: {
      open?: string;
      close?: string;
    }[];
    wed?: {
      open?: string;
      close?: string;
    }[];
    thu?: {
      open?: string;
      close?: string;
    }[];
    fri?: {
      open?: string;
      close?: string;
    }[];
    sat?: {
      open?: string;
      close?: string;
    }[];
    sun?: {
      open?: string;
      close?: string;
    }[];
  };
  /** Stripe Connect fields */
  stripe?: {
    connectAccountId?: string | null;
    connectOnboardingStatus?: 'not_started' | 'pending' | 'complete' | null;
  } | null;
};
export type GetAllShopsResponse = {
  /** Array of shops */
  shops: ShopResponse[];
  /** Total number of shops */
  total: number;
};
export type CreateShopRequest = {
  /** Shop name (slug will be auto-generated from this) */
  name: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "AU", "DE") */
  countryCode: string;
  /** Shop currency (ISO code) */
  currency: string;
  /** Shop timezone */
  timezone: string;
  /** Minimum order amount in cents */
  minOrderAmountCents: number;
  /** Payment policy */
  paymentPolicy: "pay_online";
  address: {
    /** Street address */
    street: string;
    /** City */
    city: string;
    /** State or territory */
    state: string;
    /** Postal code */
    postcode: string;
    /** Country */
    country: string;
  };
  /** Industry / business type */
  industry?: string;
  /** Message when shop is paused (optional) */
  pausedMessage?: string;
  /** Order acceptance mode (optional, defaults to auto) */
  orderAcceptanceMode?: "auto";
  /** Shop opening hours for each day of the week. At least one day must have opening hours. */
  openingHours: {
    /** Monday opening hours */
    mon?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Tuesday opening hours */
    tue?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Wednesday opening hours */
    wed?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Thursday opening hours */
    thu?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Friday opening hours */
    fri?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Saturday opening hours */
    sat?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
    /** Sunday opening hours */
    sun?: {
      /** Opening time in 24-hour format (HH:MM) */
      open?: string;
      /** Closing time in 24-hour format (HH:MM) */
      close?: string;
    }[];
  };
  closures?: {
    id?: string;
    start?: string;
    end?: string;
    reason?: string;
  }[];
  members?: {
    userId?: string;
    role?: "owner" | "staff";
    isActive?: boolean;
  }[];
  /** Shop branding configuration (optional). Set to null to disable branding. */
  branding?: ShopBranding;
};
export type UpdateShopRequest = {
  /** Whether shop is accepting orders */
  acceptingOrders?: boolean;
  /** Whether shop is paused */
  isPaused?: boolean;
  /** Message when shop is paused */
  pausedMessage?: string;
  /** Payment policy */
  paymentPolicy?: "pay_online";
  /** Minimum order amount in cents */
  minOrderAmountCents?: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  /** Shop branding configuration. Set to null to clear branding. */
  branding?: ShopBranding;
  /** Shop opening hours per day. At least one day must have opening hours. */
  openingHours?: {
    mon?: {
      /** Opening time (HH:mm) */
      open?: string;
      /** Closing time (HH:mm) */
      close?: string;
    }[];
    tue?: {
      open?: string;
      close?: string;
    }[];
    wed?: {
      open?: string;
      close?: string;
    }[];
    thu?: {
      open?: string;
      close?: string;
    }[];
    fri?: {
      open?: string;
      close?: string;
    }[];
    sat?: {
      open?: string;
      close?: string;
    }[];
    sun?: {
      open?: string;
      close?: string;
    }[];
  };
};
export type DeleteResponse = {
  /** Whether deletion was successful */
  success?: boolean;
};
export type CategoryResponse = {
  /** Category ID */
  id?: string;
  /** Shop ID */
  shopId?: string;
  /** Category name */
  name?: string;
  /** Sort order for display */
  sortOrder?: number;
  /** Lucide icon name */
  icon?: string;
  /** Whether category is deleted */
  isDeleted?: boolean;
  /** Creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
};
export type CategoriesResponse = CategoryResponse[];
export type CreateCategoryRequest = {
  /** Category name */
  name: string;
  /** Sort order for display */
  sortOrder?: number;
  /** Lucide icon name */
  icon?: string;
};
export type UpdateCategoryRequest = {
  /** Category name */
  name?: string;
  /** Sort order for display */
  sortOrder?: number;
  /** Lucide icon name, null to remove */
  icon?: string | null;
};
export type ProductResponse = {
  /** Product ID */
  id?: string;
  /** Shop ID */
  shopId?: string;
  /** Product name */
  name?: string;
  /** Product description */
  description?: string;
  /** Product price in cents */
  price?: number;
  /** Product categories with full details */
  categories?: {
    /** Category ID */
    id?: string;
    /** Category name */
    name?: string;
    /** Category sort order */
    sortOrder?: number;
  }[];
  /** Product images */
  images?: {
    /** Image ID */
    id?: string;
    /** Image URL */
    url?: string;
    /** Whether this is the primary image */
    isPrimary?: boolean;
  }[];
  /** Special info items (dietary labels, badges, etc.) */
  specialInfo?: { name: string; icon: string }[];
  /** Product variant groups (optional) */
  variantGroups?: {
    /** Variant group ID */
    id?: string;
    /** Variant group name */
    name?: string;
    options?: {
      /** Option ID */
      id?: string;
      /** Option name */
      name?: string;
      /** Price difference in cents */
      priceDelta?: number;
      /** Whether option is available */
      isAvailable?: boolean;
    }[];
  }[];
  /** Product addon groups (optional) */
  addonGroups?: {
    /** Addon group ID */
    id?: string;
    /** Addon group name */
    name?: string;
    /** Minimum selectable options */
    minSelectable?: number;
    /** Maximum selectable options */
    maxSelectable?: number;
    options?: {
      /** Option ID */
      id?: string;
      /** Option name */
      name?: string;
      /** Price difference in cents */
      priceDelta?: number;
      /** Whether option is available */
      isAvailable?: boolean;
    }[];
  }[];
  /** Whether product is available */
  isAvailable?: boolean;
  /** Whether product is deleted */
  isDeleted?: boolean;
  /** Tax rate ID from the shop's taxRates list, or null */
  taxRateId?: string | null;
  /** Optional availability schedule */
  schedule?: ProductSchedule | null;
  /** Creation timestamp */
  createdAt?: string;
  /** Last update timestamp */
  updatedAt?: string;
};
export type ProductsResponse = ProductResponse[];
export type CreateProductRequest = {
  /** Shop ID that owns this product */
  shopId: string;
  /** Product name */
  name: string;
  /** Product description */
  description: string;
  /** Product price in cents */
  price: number;
  /** Category IDs */
  categoryIds?: string[];
  images?: {
    id?: string;
    url?: string;
    isPrimary?: boolean;
  }[];
  /** Special info items (dietary labels, badges, etc.) */
  specialInfo?: { name: string; icon: string }[];
  /** Whether product is available */
  isAvailable?: boolean;
  /** Tax rate ID from the shop's taxRates list, or null to clear */
  taxRateId?: string | null;
  variantGroups?: {
    id: string;
    name: string;
    options: { id: string; name: string; priceDelta: number; isAvailable: boolean }[];
  }[];
  addonGroups?: {
    id: string;
    name: string;
    minSelectable: number;
    maxSelectable: number;
    options: { id: string; name: string; priceDelta: number; isAvailable: boolean }[];
  }[];
  /** Optional availability schedule; null = no time restriction */
  schedule?: ProductSchedule | null;
};
export type UpdateProductRequest = {
  /** Shop ID (required for partition key) */
  shopId?: string;
  /** Product name */
  name?: string;
  /** Product description */
  description?: string;
  /** Product price in cents */
  price?: number;
  /** Category IDs */
  categoryIds?: string[];
  images?: {
    id?: string;
    url?: string;
    isPrimary?: boolean;
  }[];
  /** Special info items (dietary labels, badges, etc.) */
  specialInfo?: { name: string; icon: string }[];
  /** Whether product is available */
  isAvailable?: boolean;
  /** Tax rate ID from the shop's taxRates list, or null to clear */
  taxRateId?: string | null;
  /** Variant groups (single-select per group, e.g. Size) */
  variantGroups?: {
    id: string;
    name: string;
    options: {
      id: string;
      name: string;
      /** Price delta in cents */
      priceDelta: number;
      isAvailable: boolean;
    }[];
  }[];
  /** Addon groups (multi-select per group, e.g. Extras) */
  addonGroups?: {
    id: string;
    name: string;
    minSelectable: number;
    maxSelectable: number;
    options: {
      id: string;
      name: string;
      /** Price delta in cents */
      priceDelta: number;
      isAvailable: boolean;
    }[];
  }[];
  /** Optional availability schedule; null = no time restriction */
  schedule?: ProductSchedule | null;
};
export type GenerateImageUploadUrlResponse = {
  /** Unique identifier for the image */
  imageId: string;
  /** Pre-signed URL for uploading the image to Azure Blob Storage */
  uploadUrl: string;
  /** Permanent URL of the blob (without SAS token) */
  blobUrl: string;
  /** Expiration time of the upload URL */
  expiresAt: string;
};
export type GenerateImageUploadUrlRequest = {
  /** MIME type of the image to upload */
  contentType: "image/jpeg" | "image/png" | "image/webp";
  /** Optional filename for the image */
  fileName?: string;
  /** Optional maximum file size in bytes */
  maxSizeBytes?: number;
};
export type ProductImageResponse = {
  /** Image ID */
  id: string;
  /** Image URL */
  url: string;
  /** Alternative text for the image */
  alt?: string;
  /** Sort order for displaying images */
  sortOrder: number;
  /** Whether this is the primary product image */
  isPrimary: boolean;
};
export type AddProductImageRequest = {
  /** Image ID returned from the upload URL generation */
  imageId: string;
  /** Blob URL of the uploaded image */
  url: string;
  /** Alternative text for the image */
  alt?: string;
  /** Sort order for displaying images */
  sortOrder?: number;
};
export type GenerateShopLogoUploadUrlResponse = {
  /** Unique identifier for the logo image */
  imageId: string;
  /** Pre-signed URL for uploading the logo to Azure Blob Storage */
  uploadUrl: string;
  /** Permanent URL of the logo blob (without SAS token) */
  blobUrl: string;
  /** Expiration time of the upload URL */
  expiresAt: string;
};
export type GenerateShopLogoUploadUrlRequest = {
  /** MIME type of the logo image to upload */
  contentType: "image/jpeg" | "image/png" | "image/webp";
};
export type SetShopLogoRequest = {
  /** Image ID returned from the logo upload URL generation */
  imageId: string;
  /** Blob URL of the uploaded logo */
  url: string;
};
export type CheckoutResponse = {
  /** Checkout session ID */
  sessionId: string;
  /** Stripe PaymentIntent client secret. Pass this to stripe.confirmPayment() on the frontend. */
  clientSecret: string;
  /** Server-computed order total in cents */
  subtotalCents: number;
  /** ISO currency code from the shop */
  currency: string;
};
export type CheckoutItem = {
  /** Product ID */
  productId: string;
  /** Quantity to order */
  quantity: number;
  /** ID of the selected variant option (e.g. size) */
  selectedVariantOptionId?: string;
  /** IDs of selected addon options */
  selectedAddonOptionIds?: string[];
};
export type CheckoutRequest = {
  /** ID of the shop to order from */
  shopId: string;
  /** Items to order */
  items: CheckoutItem[];
  /** Customer name */
  customerName: string;
  /** Customer email */
  customerEmail: string;
  /** Customer phone number */
  customerPhone: string;
  /** Optional notes for the order */
  customerNotes?: string;
};
export type OrderItemResponse = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  selectedVariantOptionId?: string | null;
  selectedVariantOptionName?: string | null;
  selectedAddonOptionIds?: string[] | null;
  selectedAddonOptionNames?: string[] | null;
  lineTotalCents: number;
};
export type OrderState = "PLACED" | "ACCEPTED" | "READY" | "OUT_FOR_DELIVERY" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type OrderDisplayState = OrderState | "IN_PREPARATION";
export type OrderPaymentMethod = "card" | "cash";
export type OrderPaymentStatus = "paid" | "refunded" | "partially_refunded" | "cash_due" | "cash_collected" | "refunded_in_cash";
export type OrderFulfilmentMode = "collection" | "delivery" | "dine_in";
export type OrderHistoryEntryResponse = {
  from: OrderState | null;
  to: OrderState;
  at: string;
  actor:
    | { type: "system" }
    | { type: "customer" }
    | { type: "owner" | "staff" | "superadmin"; id: string };
  reason?: string;
};
export type OrderResponse = {
  id: string;
  orderRef: string;
  state: OrderState;
  displayState: OrderDisplayState;
  fulfilmentMode: OrderFulfilmentMode;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  readyAt: string | null;
  items: OrderItemResponse[];
  subtotalCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  history: OrderHistoryEntryResponse[];
  createdAt: string;
};
export type OrdersPageResponse = {
  orders: OrderResponse[];
  total: number;
  page: number;
  pageSize: number;
};
export type OrderByPaymentIntentResponse = {
  orderId: string;
  orderRef: string;
  state: OrderState;
  displayState: OrderDisplayState;
  fulfilmentMode: OrderFulfilmentMode;
  paymentStatus: OrderPaymentStatus;
  readyAt: string | null;
  items: OrderItemResponse[];
  subtotalCents: number;
  currency: string;
  customerName: string;
  createdAt: string;
};
export type SubscriptionStatus = 'free' | 'active' | 'past_due' | 'canceled' | 'expired';
export type PlanSource = 'default' | 'billing' | 'superadmin_override';

export type PlanLimitResponse = {
  key: string;
  value: number;
};

export type PlanResponse = {
  id: string;
  name: string;
  internalKey: string;
  isDefault: boolean;
  isVisible: boolean;
  sortOrder: number;
  limits: PlanLimitResponse[];
  createdAt: string;
  updatedAt: string;
};

export type PlanPricingResponse = {
  id: string;
  planId: string;
  currency: string;
  monthlyAmountCents: number;
  yearlyAmountCents: number;
  billingPriceIdMonthly: string | null;
  billingPriceIdYearly: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShopSubscriptionResponse = {
  id: string;
  shopId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: 'monthly' | 'yearly' | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  planSource: PlanSource;
  overriddenBy: string | null;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GetShopSubscriptionApiResponse = {
  subscription: ShopSubscriptionResponse;
  plan: PlanResponse | null;
};
export type GetShopSubscriptionApiArg = { shopId: string };

export type GetVisiblePlansApiResponse = { plans: PlanResponse[] };

export type GetPlanPricingApiResponse = PlanPricingResponse[];
export type GetPlanPricingApiArg = { planId: string };

export type CreateSubscriptionCheckoutApiResponse = { url: string };
export type CreateSubscriptionCheckoutApiArg = {
  shopId: string;
  planId: string;
  billingInterval: 'monthly' | 'yearly';
};

export type CancelShopSubscriptionApiResponse = {
  id: string;
  shopId: string;
  planId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};
export type CancelShopSubscriptionApiArg = { shopId: string };

export type ResumeShopSubscriptionApiResponse = {
  id: string;
  shopId: string;
  planId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};
export type ResumeShopSubscriptionApiArg = { shopId: string };

export type ReactivateShopApiResponse = { id: string; isDeactivatedDueToLimits: boolean };
export type ReactivateShopApiArg = { shopId: string };

export type GoLiveCriterion = {
  key: string;
  met: boolean;
  description: string;
};
export type GoLiveStatusResponse = {
  allMet: boolean;
  criteria: GoLiveCriterion[];
};
export type GetGoLiveStatusApiResponse = GoLiveStatusResponse;
export type GetGoLiveStatusApiArg = { shopId: string };

export type CreateStripeAccountSessionApiResponse = { clientSecret: string };
export type CreateStripeAccountSessionApiArg = {
  shopId: string;
  purpose?: 'onboarding' | 'management';
};

export type DisconnectStripeAccountApiArg = { shopId: string };

export const {
  useGetShopsQuery,
  useCreateShopMutation,
  useGetShopBySlugQuery,
  useGetMyShopsQuery,
  useGetShopByIdQuery,
  useUpdateShopMutation,
  useDeleteShopMutation,
  useGetCategoriesByShopQuery,
  useCreateCategoryMutation,
  useGetCategoryByIdQuery,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
  useGetProductsByShopQuery,
  useCreateProductMutation,
  useGetProductByIdQuery,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGenerateUploadUrlMutation,
  useAddProductImageMutation,
  useGenerateShopLogoUploadUrlMutation,
  useSetShopLogoMutation,
  useCreateOrderMutation,
  useStripeWebhookMutation,
  useGetOrdersByShopQuery,
  useGetOrderByPaymentIntentQuery,
  useAddShopMemberMutation,
  useRemoveShopMemberMutation,
  useCreateShopRoleMutation,
  useUpdateShopRoleMutation,
  useDeleteShopRoleMutation,
  useRequestShopNameChangeMutation,
  useCancelShopNameChangeMutation,
  useGetVisiblePlansQuery,
  useGetShopSubscriptionQuery,
  useGetPlanPricingQuery,
  useCreateSubscriptionCheckoutMutation,
  useCancelShopSubscriptionMutation,
  useResumeShopSubscriptionMutation,
  useReactivateShopMutation,
  useGetMyInvitationsQuery,
  useAcceptShopInvitationMutation,
  useDeclineShopInvitationMutation,
  useGetGoLiveStatusQuery,
  useLazyGetGoLiveStatusQuery,
  useCreateStripeAccountSessionMutation,
  useDisconnectStripeAccountMutation,
} = injectedRtkApi;
