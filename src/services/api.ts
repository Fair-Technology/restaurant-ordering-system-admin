import { baseApi as api } from "./baseApi";
export const addTagTypes = [
  "Default",
  "Orders",
  "Products",
  "Shops",
  "Catalog",
  "Categories",
  "Combos",
  "Shop Cover Image",
  "Shop Logo",
  "Product Images",
] as const;
const injectedRtkApi = api
  .enhanceEndpoints({
    addTagTypes,
  })
  .injectEndpoints({
    endpoints: (build) => ({
      cancelCustomerOrder: build.mutation<
        CancelCustomerOrderApiResponse,
        CancelCustomerOrderApiArg
      >({
        query: (queryArg) => ({
          url: `/customer-orders/${queryArg.orderId}/cancel`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      viewCustomerDocument: build.mutation<
        ViewCustomerDocumentApiResponse,
        ViewCustomerDocumentApiArg
      >({
        query: (queryArg) => ({
          url: `/customer-orders/${queryArg.orderId}/documents/${queryArg.documentId}`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Orders"],
      }),
      viewCustomerOrder: build.mutation<
        ViewCustomerOrderApiResponse,
        ViewCustomerOrderApiArg
      >({
        query: (queryArg) => ({
          url: `/customer-orders/${queryArg.orderId}/view`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      getDpaDocument: build.query<
        GetDpaDocumentApiResponse,
        GetDpaDocumentApiArg
      >({
        query: (queryArg) => ({
          url: `/legal/dpa`,
          params: {
            version: queryArg.version,
          },
        }),
        providesTags: ["Default"],
      }),
      getPlatformLegal: build.query<
        GetPlatformLegalApiResponse,
        GetPlatformLegalApiArg
      >({
        query: () => ({ url: `/legal/platform` }),
        providesTags: ["Default"],
      }),
      createOrder: build.mutation<CreateOrderApiResponse, CreateOrderApiArg>({
        query: (queryArg) => ({
          url: `/orders`,
          method: "POST",
          body: queryArg.checkoutRequestDto,
        }),
        invalidatesTags: ["Orders"],
      }),
      getOrderByPaymentIntent: build.query<
        GetOrderByPaymentIntentApiResponse,
        GetOrderByPaymentIntentApiArg
      >({
        query: (queryArg) => ({
          url: `/orders/by-payment-intent/${queryArg.paymentIntentId}`,
        }),
        providesTags: ["Orders"],
      }),
      quoteBasket: build.mutation<QuoteBasketApiResponse, QuoteBasketApiArg>({
        query: (queryArg) => ({
          url: `/orders/quote`,
          method: "POST",
          body: queryArg.quoteBasketRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getOwnerOverview: build.query<
        GetOwnerOverviewApiResponse,
        GetOwnerOverviewApiArg
      >({
        query: () => ({ url: `/owner/overview` }),
        providesTags: ["Default"],
      }),
      createPlan: build.mutation<CreatePlanApiResponse, CreatePlanApiArg>({
        query: (queryArg) => ({
          url: `/plans`,
          method: "POST",
          body: queryArg.createPlanRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getPlans: build.query<GetPlansApiResponse, GetPlansApiArg>({
        query: () => ({ url: `/plans` }),
        providesTags: ["Default"],
      }),
      getPlan: build.query<GetPlanApiResponse, GetPlanApiArg>({
        query: (queryArg) => ({ url: `/plans/${queryArg.planId}` }),
        providesTags: ["Default"],
      }),
      updatePlan: build.mutation<UpdatePlanApiResponse, UpdatePlanApiArg>({
        query: (queryArg) => ({
          url: `/plans/${queryArg.planId}`,
          method: "PATCH",
          body: queryArg.updatePlanRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getPlanPricing: build.query<
        GetPlanPricingApiResponse,
        GetPlanPricingApiArg
      >({
        query: (queryArg) => ({ url: `/plans/${queryArg.planId}/pricing` }),
        providesTags: ["Default"],
      }),
      setPlanPricing: build.mutation<
        SetPlanPricingApiResponse,
        SetPlanPricingApiArg
      >({
        query: (queryArg) => ({
          url: `/plans/${queryArg.planId}/pricing`,
          method: "POST",
          body: queryArg.setPlanPricingRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getSystemConfig: build.query<
        GetSystemConfigApiResponse,
        GetSystemConfigApiArg
      >({
        query: () => ({ url: `/platform/config` }),
        providesTags: ["Default"],
      }),
      updateSystemConfig: build.mutation<
        UpdateSystemConfigApiResponse,
        UpdateSystemConfigApiArg
      >({
        query: (queryArg) => ({
          url: `/platform/config`,
          method: "PATCH",
          body: queryArg.updateSystemConfigRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getPlatformLegalIdentity: build.query<
        GetPlatformLegalIdentityApiResponse,
        GetPlatformLegalIdentityApiArg
      >({
        query: () => ({ url: `/platform/legal-identity` }),
        providesTags: ["Default"],
      }),
      updatePlatformLegalIdentity: build.mutation<
        UpdatePlatformLegalIdentityApiResponse,
        UpdatePlatformLegalIdentityApiArg
      >({
        query: (queryArg) => ({
          url: `/platform/legal-identity`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      updateReferenceLists: build.mutation<
        UpdateReferenceListsApiResponse,
        UpdateReferenceListsApiArg
      >({
        query: (queryArg) => ({
          url: `/platform/reference-lists/${queryArg.countryCode}`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      getRolePermissions: build.query<
        GetRolePermissionsApiResponse,
        GetRolePermissionsApiArg
      >({
        query: () => ({ url: `/platform/role-permissions` }),
        providesTags: ["Default"],
      }),
      updateRolePermissions: build.mutation<
        UpdateRolePermissionsApiResponse,
        UpdateRolePermissionsApiArg
      >({
        query: (queryArg) => ({
          url: `/platform/role-permissions`,
          method: "PUT",
          body: queryArg.updateRolePermissionsRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      updateUserLimits: build.mutation<
        UpdateUserLimitsApiResponse,
        UpdateUserLimitsApiArg
      >({
        query: (queryArg) => ({
          url: `/platform/users/${queryArg.userId}/limits`,
          method: "PATCH",
          body: queryArg.updateUserLimitsRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      createProduct: build.mutation<
        CreateProductApiResponse,
        CreateProductApiArg
      >({
        query: (queryArg) => ({
          url: `/products`,
          method: "POST",
          body: queryArg.createProductRequestDto,
        }),
        invalidatesTags: ["Products"],
      }),
      getProductsByShop: build.query<
        GetProductsByShopApiResponse,
        GetProductsByShopApiArg
      >({
        query: (queryArg) => ({
          url: `/products`,
          params: {
            shopId: queryArg.shopId,
          },
        }),
        providesTags: ["Products"],
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
        invalidatesTags: ["Products"],
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
        providesTags: ["Products"],
      }),
      updateProduct: build.mutation<
        UpdateProductApiResponse,
        UpdateProductApiArg
      >({
        query: (queryArg) => ({
          url: `/products/${queryArg.productId}`,
          method: "PATCH",
          body: queryArg.body,
        }),
        invalidatesTags: ["Products"],
      }),
      getReferenceLists: build.query<
        GetReferenceListsApiResponse,
        GetReferenceListsApiArg
      >({
        query: (queryArg) => ({
          url: `/reference-lists/${queryArg.countryCode}`,
        }),
        providesTags: ["Default"],
      }),
      createShop: build.mutation<CreateShopApiResponse, CreateShopApiArg>({
        query: (queryArg) => ({
          url: `/shops`,
          method: "POST",
          body: queryArg.createShopRequestDto,
        }),
        invalidatesTags: ["Shops"],
      }),
      getShops: build.query<GetShopsApiResponse, GetShopsApiArg>({
        query: () => ({ url: `/shops` }),
        providesTags: ["Shops"],
      }),
      deleteShop: build.mutation<DeleteShopApiResponse, DeleteShopApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Shops"],
      }),
      getShopById: build.query<GetShopByIdApiResponse, GetShopByIdApiArg>({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}` }),
        providesTags: ["Shops"],
      }),
      updateShop: build.mutation<UpdateShopApiResponse, UpdateShopApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}`,
          method: "PATCH",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shops"],
      }),
      getAuditEntries: build.query<
        GetAuditEntriesApiResponse,
        GetAuditEntriesApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/audit`,
          params: {
            page: queryArg.page,
            pageSize: queryArg.pageSize,
          },
        }),
        providesTags: ["Default"],
      }),
      setBusyMode: build.mutation<SetBusyModeApiResponse, SetBusyModeApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/busy-mode`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      getCatalog: build.query<GetCatalogApiResponse, GetCatalogApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/catalog`,
          params: {
            lang: queryArg.lang,
          },
        }),
        providesTags: ["Catalog"],
      }),
      createCategory: build.mutation<
        CreateCategoryApiResponse,
        CreateCategoryApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/categories`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Categories"],
      }),
      getCategoriesByShop: build.query<
        GetCategoriesByShopApiResponse,
        GetCategoriesByShopApiArg
      >({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/categories` }),
        providesTags: ["Categories"],
      }),
      deleteCategory: build.mutation<
        DeleteCategoryApiResponse,
        DeleteCategoryApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Categories"],
      }),
      getCategoryById: build.query<
        GetCategoryByIdApiResponse,
        GetCategoryByIdApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
        }),
        providesTags: ["Categories"],
      }),
      updateCategory: build.mutation<
        UpdateCategoryApiResponse,
        UpdateCategoryApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}`,
          method: "PATCH",
          body: queryArg.body,
        }),
        invalidatesTags: ["Categories"],
      }),
      applyCategoryTaxClass: build.mutation<
        ApplyCategoryTaxClassApiResponse,
        ApplyCategoryTaxClassApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/categories/${queryArg.categoryId}/apply-tax-class`,
          method: "POST",
        }),
        invalidatesTags: ["Categories"],
      }),
      createCombo: build.mutation<CreateComboApiResponse, CreateComboApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/combos`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Combos"],
      }),
      getCombos: build.query<GetCombosApiResponse, GetCombosApiArg>({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/combos` }),
        providesTags: ["Combos"],
      }),
      updateCombo: build.mutation<UpdateComboApiResponse, UpdateComboApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/combos/${queryArg.comboId}`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Combos"],
      }),
      removeShopCoverImage: build.mutation<
        RemoveShopCoverImageApiResponse,
        RemoveShopCoverImageApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/cover-image`,
          method: "DELETE",
        }),
        invalidatesTags: ["Shop Cover Image"],
      }),
      setShopCoverImage: build.mutation<
        SetShopCoverImageApiResponse,
        SetShopCoverImageApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/cover-image`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shop Cover Image"],
      }),
      generateShopCoverImageUploadUrl: build.mutation<
        GenerateShopCoverImageUploadUrlApiResponse,
        GenerateShopCoverImageUploadUrlApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/cover-image/upload-url`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shop Cover Image"],
      }),
      eraseCustomer: build.mutation<
        EraseCustomerApiResponse,
        EraseCustomerApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/customer-erasure`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      exportShopData: build.query<
        ExportShopDataApiResponse,
        ExportShopDataApiArg
      >({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/data-export` }),
        providesTags: ["Default"],
      }),
      createDiscountCode: build.mutation<
        CreateDiscountCodeApiResponse,
        CreateDiscountCodeApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/discount-codes`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      setDiscountCodeActive: build.mutation<
        SetDiscountCodeActiveApiResponse,
        SetDiscountCodeActiveApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/discount-codes/${queryArg.codeId}`,
          method: "PATCH",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      acceptDpa: build.mutation<AcceptDpaApiResponse, AcceptDpaApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/dpa-acceptance`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      getGoLiveStatus: build.query<
        GetGoLiveStatusApiResponse,
        GetGoLiveStatusApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/go-live-status`,
        }),
        providesTags: ["Default"],
      }),
      getShopLegal: build.query<GetShopLegalApiResponse, GetShopLegalApiArg>({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/legal` }),
        providesTags: ["Default"],
      }),
      updateShopLegal: build.mutation<
        UpdateShopLegalApiResponse,
        UpdateShopLegalApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/legal`,
          method: "PATCH",
          body: queryArg.updateShopLegalBody,
        }),
        invalidatesTags: ["Default"],
      }),
      setShopLogo: build.mutation<SetShopLogoApiResponse, SetShopLogoApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/logo`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shop Logo"],
      }),
      generateShopLogoUploadUrl: build.mutation<
        GenerateShopLogoUploadUrlApiResponse,
        GenerateShopLogoUploadUrlApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/logo/upload-url`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shop Logo"],
      }),
      updateLoyalty: build.mutation<
        UpdateLoyaltyApiResponse,
        UpdateLoyaltyApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/loyalty`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      setMissedOrdersPauseLimit: build.mutation<
        SetMissedOrdersPauseLimitApiResponse,
        SetMissedOrdersPauseLimitApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/missed-orders-pause`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shops"],
      }),
      rejectShopNameChange: build.mutation<
        RejectShopNameChangeApiResponse,
        RejectShopNameChangeApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/name-change-request`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      requestShopNameChange: build.mutation<
        RequestShopNameChangeApiResponse,
        RequestShopNameChangeApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/name-change-request`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      approveShopNameChange: build.mutation<
        ApproveShopNameChangeApiResponse,
        ApproveShopNameChangeApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/name-change-request/approve`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      getOrderLimit: build.query<GetOrderLimitApiResponse, GetOrderLimitApiArg>(
        {
          query: (queryArg) => ({
            url: `/shops/${queryArg.shopId}/order-limit`,
          }),
          providesTags: ["Default"],
        },
      ),
      getOrderQueue: build.query<GetOrderQueueApiResponse, GetOrderQueueApiArg>(
        {
          query: (queryArg) => ({
            url: `/shops/${queryArg.shopId}/order-queue`,
          }),
          providesTags: ["Default"],
        },
      ),
      updateOrderSettings: build.mutation<
        UpdateOrderSettingsApiResponse,
        UpdateOrderSettingsApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/order-settings`,
          method: "PUT",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
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
        providesTags: ["Orders"],
      }),
      acceptOrder: build.mutation<AcceptOrderApiResponse, AcceptOrderApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/accept`,
          method: "POST",
          body: queryArg.acceptOrderBody,
        }),
        invalidatesTags: ["Default"],
      }),
      completeOrder: build.mutation<
        CompleteOrderApiResponse,
        CompleteOrderApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/complete`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      dispatchOrder: build.mutation<
        DispatchOrderApiResponse,
        DispatchOrderApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/dispatch`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      getOrderDocument: build.query<
        GetOrderDocumentApiResponse,
        GetOrderDocumentApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/documents/${queryArg.documentId}`,
        }),
        providesTags: ["Orders"],
      }),
      markOrderReady: build.mutation<
        MarkOrderReadyApiResponse,
        MarkOrderReadyApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/ready`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      refundOrder: build.mutation<RefundOrderApiResponse, RefundOrderApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/refunds`,
          method: "POST",
          body: queryArg.refundOrderBody,
        }),
        invalidatesTags: ["Orders"],
      }),
      rejectOrder: build.mutation<RejectOrderApiResponse, RejectOrderApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/orders/${queryArg.orderId}/reject`,
          method: "POST",
          body: queryArg.rejectOrderBody,
        }),
        invalidatesTags: ["Default"],
      }),
      addProductImage: build.mutation<
        AddProductImageApiResponse,
        AddProductImageApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/products/${queryArg.productId}/images`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Product Images"],
      }),
      generateUploadUrl: build.mutation<
        GenerateUploadUrlApiResponse,
        GenerateUploadUrlApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/products/${queryArg.productId}/images/upload-url`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Product Images"],
      }),
      getPromotions: build.query<GetPromotionsApiResponse, GetPromotionsApiArg>(
        {
          query: (queryArg) => ({
            url: `/shops/${queryArg.shopId}/promotions`,
          }),
          providesTags: ["Default"],
        },
      ),
      getSalesReport: build.query<
        GetSalesReportApiResponse,
        GetSalesReportApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/reports/sales`,
          params: {
            from: queryArg["from"],
            to: queryArg.to,
          },
        }),
        providesTags: ["Default"],
      }),
      restoreShop: build.mutation<RestoreShopApiResponse, RestoreShopApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/restore`,
          method: "POST",
        }),
        invalidatesTags: ["Shops"],
      }),
      createStaff: build.mutation<CreateStaffApiResponse, CreateStaffApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/staff`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      listStaff: build.query<ListStaffApiResponse, ListStaffApiArg>({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/staff` }),
        providesTags: ["Default"],
      }),
      deleteStaff: build.mutation<DeleteStaffApiResponse, DeleteStaffApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/staff/${queryArg.staffId}`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      updateStaff: build.mutation<UpdateStaffApiResponse, UpdateStaffApiArg>({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/staff/${queryArg.staffId}`,
          method: "PATCH",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      resetStaffPassword: build.mutation<
        ResetStaffPasswordApiResponse,
        ResetStaffPasswordApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/staff/${queryArg.staffId}/password`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      disconnectStripeAccount: build.mutation<
        DisconnectStripeAccountApiResponse,
        DisconnectStripeAccountApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/stripe/account`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      createStripeAccountSession: build.mutation<
        CreateStripeAccountSessionApiResponse,
        CreateStripeAccountSessionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/stripe/account-session`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      cancelShopSubscription: build.mutation<
        CancelShopSubscriptionApiResponse,
        CancelShopSubscriptionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      getShopSubscription: build.query<
        GetShopSubscriptionApiResponse,
        GetShopSubscriptionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription`,
        }),
        providesTags: ["Default"],
      }),
      createSubscriptionCheckout: build.mutation<
        CreateSubscriptionCheckoutApiResponse,
        CreateSubscriptionCheckoutApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/checkout`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      confirmSubscriptionCheckout: build.mutation<
        ConfirmSubscriptionCheckoutApiResponse,
        ConfirmSubscriptionCheckoutApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/checkout/confirm`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
      clearLimitOverride: build.mutation<
        ClearLimitOverrideApiResponse,
        ClearLimitOverrideApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/limit-override`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      setLimitOverride: build.mutation<
        SetLimitOverrideApiResponse,
        SetLimitOverrideApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/limit-override`,
          method: "PUT",
          body: queryArg.setLimitOverrideRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      overrideShopSubscription: build.mutation<
        OverrideShopSubscriptionApiResponse,
        OverrideShopSubscriptionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/override`,
          method: "POST",
          body: queryArg.overrideShopSubscriptionRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      createBillingPortalSession: build.mutation<
        CreateBillingPortalSessionApiResponse,
        CreateBillingPortalSessionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/portal`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      resumeShopSubscription: build.mutation<
        ResumeShopSubscriptionApiResponse,
        ResumeShopSubscriptionApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/resume`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      retrySubscriptionPayment: build.mutation<
        RetrySubscriptionPaymentApiResponse,
        RetrySubscriptionPaymentApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/retry-payment`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      cancelScheduledChange: build.mutation<
        CancelScheduledChangeApiResponse,
        CancelScheduledChangeApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/subscription/scheduled-change`,
          method: "DELETE",
        }),
        invalidatesTags: ["Default"],
      }),
      setShopOfflineBySuperadmin: build.mutation<
        SetShopOfflineBySuperadminApiResponse,
        SetShopOfflineBySuperadminApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/superadmin-offline`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Shops"],
      }),
      getShopUsage: build.query<GetShopUsageApiResponse, GetShopUsageApiArg>({
        query: (queryArg) => ({ url: `/shops/${queryArg.shopId}/usage` }),
        providesTags: ["Default"],
      }),
      reconcileShopUsage: build.mutation<
        ReconcileShopUsageApiResponse,
        ReconcileShopUsageApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/${queryArg.shopId}/usage/reconcile`,
          method: "POST",
        }),
        invalidatesTags: ["Default"],
      }),
      getMyShops: build.query<GetMyShopsApiResponse, GetMyShopsApiArg>({
        query: () => ({ url: `/shops/me` }),
        providesTags: ["Shops"],
      }),
      listPublicShops: build.query<
        ListPublicShopsApiResponse,
        ListPublicShopsApiArg
      >({
        query: () => ({ url: `/shops/public` }),
        providesTags: ["Shops"],
      }),
      getShopBySlug: build.query<GetShopBySlugApiResponse, GetShopBySlugApiArg>(
        {
          query: (queryArg) => ({ url: `/shops/slug/${queryArg.slug}` }),
          providesTags: ["Shops"],
        },
      ),
      getPublicLegalPack: build.query<
        GetPublicLegalPackApiResponse,
        GetPublicLegalPackApiArg
      >({
        query: (queryArg) => ({
          url: `/shops/slug/${queryArg.slug}/legal`,
          params: {
            lang: queryArg.lang,
          },
        }),
        providesTags: ["Default"],
      }),
      staffLogin: build.mutation<StaffLoginApiResponse, StaffLoginApiArg>({
        query: (queryArg) => ({
          url: `/staff/login`,
          method: "POST",
          body: queryArg.staffLoginRequestDto,
        }),
        invalidatesTags: ["Default"],
      }),
      getRejectionWatch: build.query<
        GetRejectionWatchApiResponse,
        GetRejectionWatchApiArg
      >({
        query: () => ({ url: `/usage/rejection-watch` }),
        providesTags: ["Default"],
      }),
      getMe: build.query<GetMeApiResponse, GetMeApiArg>({
        query: () => ({ url: `/users/me` }),
        providesTags: ["Default"],
      }),
      stripeWebhook: build.mutation<
        StripeWebhookApiResponse,
        StripeWebhookApiArg
      >({
        query: (queryArg) => ({
          url: `/webhooks/stripe`,
          method: "POST",
          body: queryArg.handleCheckoutSessionCompletedInput,
        }),
        invalidatesTags: ["Orders"],
      }),
      stripeConnectWebhook: build.mutation<
        StripeConnectWebhookApiResponse,
        StripeConnectWebhookApiArg
      >({
        query: (queryArg) => ({
          url: `/webhooks/stripe-connect`,
          method: "POST",
          body: queryArg.body,
        }),
        invalidatesTags: ["Default"],
      }),
    }),
    overrideExisting: false,
  });
export { injectedRtkApi as api };
export type CancelCustomerOrderApiResponse =
  /** status 200 Success */ CustomerOrderDto;
export type CancelCustomerOrderApiArg = {
  orderId: string;
  body: {
    token: any;
  };
};
export type ViewCustomerDocumentApiResponse =
  /** status 200 The PDF as base64 */ {
    [key: string]: any;
  };
export type ViewCustomerDocumentApiArg = {
  orderId: string;
  documentId: string;
  body: {
    token: any;
  };
};
export type ViewCustomerOrderApiResponse =
  /** status 200 Success */ CustomerOrderDto;
export type ViewCustomerOrderApiArg = {
  orderId: string;
  body: {
    token: any;
  };
};
export type GetDpaDocumentApiResponse =
  /** status 200 Success */ PlatformDocument;
export type GetDpaDocumentApiArg = {
  version?: any;
};
export type GetPlatformLegalApiResponse =
  /** status 200 Success */ PlatformLegalPublicDto;
export type GetPlatformLegalApiArg = void;
export type CreateOrderApiResponse =
  /** status 200 Order created and PaymentIntent initiated */ CheckoutResultDto;
export type CreateOrderApiArg = {
  checkoutRequestDto: CheckoutRequestDto;
};
export type GetOrderByPaymentIntentApiResponse =
  /** status 200 Order found */ GetOrderByPaymentIntentResultDto;
export type GetOrderByPaymentIntentApiArg = {
  paymentIntentId: string;
};
export type QuoteBasketApiResponse = /** status 200 Success */ BasketQuoteDto;
export type QuoteBasketApiArg = {
  quoteBasketRequestDto: QuoteBasketRequestDto;
};
export type GetOwnerOverviewApiResponse =
  /** status 200 Success */ OwnerOverview;
export type GetOwnerOverviewApiArg = void;
export type CreatePlanApiResponse =
  /** status 200 Success */ CreatePlanResultDto;
export type CreatePlanApiArg = {
  createPlanRequestDto: CreatePlanRequestDto;
};
export type GetPlansApiResponse = /** status 200 Success */ GetPlansResultDto;
export type GetPlansApiArg = void;
export type GetPlanApiResponse = /** status 200 Success */ GetPlanResultDto;
export type GetPlanApiArg = {
  planId: string;
};
export type UpdatePlanApiResponse =
  /** status 200 Success */ UpdatePlanResultDto;
export type UpdatePlanApiArg = {
  planId: string;
  updatePlanRequestDto: UpdatePlanRequestDto;
};
export type GetPlanPricingApiResponse =
  /** status 200 Success */ GetPlanPricingResultDto;
export type GetPlanPricingApiArg = {
  planId: string;
};
export type SetPlanPricingApiResponse =
  /** status 200 Success */ SetPlanPricingResultDto;
export type SetPlanPricingApiArg = {
  planId: string;
  setPlanPricingRequestDto: SetPlanPricingRequestDto;
};
export type GetSystemConfigApiResponse =
  /** status 200 Success */ GetSystemConfigResultDto;
export type GetSystemConfigApiArg = void;
export type UpdateSystemConfigApiResponse =
  /** status 200 Success */ UpdateSystemConfigResultDto;
export type UpdateSystemConfigApiArg = {
  updateSystemConfigRequestDto: UpdateSystemConfigRequestDto;
};
export type GetPlatformLegalIdentityApiResponse =
  /** status 200 Success */ PlatformLegalIdentityDto;
export type GetPlatformLegalIdentityApiArg = void;
export type UpdatePlatformLegalIdentityApiResponse =
  /** status 200 Success */ PlatformLegalIdentityDto;
export type UpdatePlatformLegalIdentityApiArg = {
  body: {
    [key: string]: any;
  };
};
export type UpdateReferenceListsApiResponse =
  /** status 200 Success */ ReferenceListsResultDto;
export type UpdateReferenceListsApiArg = {
  countryCode: string;
  body: {
    [key: string]: any;
  };
};
export type GetRolePermissionsApiResponse =
  /** status 200 Success */ RolePermissionsResultDto;
export type GetRolePermissionsApiArg = void;
export type UpdateRolePermissionsApiResponse =
  /** status 200 Success */ RolePermissionsResultDto;
export type UpdateRolePermissionsApiArg = {
  updateRolePermissionsRequestDto: UpdateRolePermissionsRequestDto;
};
export type UpdateUserLimitsApiResponse =
  /** status 200 Success */ UpdateUserLimitsResultDto;
export type UpdateUserLimitsApiArg = {
  userId: string;
  updateUserLimitsRequestDto: UpdateUserLimitsRequestDto;
};
export type CreateProductApiResponse =
  /** status 200 Product created successfully */ CreateProductResultDto;
export type CreateProductApiArg = {
  createProductRequestDto: CreateProductRequestDto;
};
export type GetProductsByShopApiResponse =
  /** status 200 Products retrieved successfully */ GetProductsByShopResultDto;
export type GetProductsByShopApiArg = {
  /** Shop ID to filter products */
  shopId: string;
};
export type DeleteProductApiResponse =
  /** status 200 Product deleted successfully */ DeleteProductResultDto;
export type DeleteProductApiArg = {
  productId: string;
  /** Shop ID (required for partition key) */
  shopId: string;
};
export type GetProductByIdApiResponse =
  /** status 200 Product retrieved successfully */ GetProductResultDto;
export type GetProductByIdApiArg = {
  productId: string;
  /** Shop ID (required for partition key) */
  shopId: string;
};
export type UpdateProductApiResponse =
  /** status 200 Product updated successfully */ UpdateProductResultDto;
export type UpdateProductApiArg = {
  productId: string;
  body: {
    shopId: string;
    name?: string;
    description?: string;
    price?: number;
    categoryIds?: string[];
    images?: ProductImage[];
    nameTranslations?: TranslationMap;
    descriptionTranslations?: TranslationMap;
    allergenIds?: string[] | null;
    additiveIds?: string[] | null;
    dietaryTagIds?: string[];
    spiceLevel?: SpiceLevel | null;
    prepMinutes?: number | null;
    unavailableModes?: FulfilmentMode[];
    taxClassId?: string | null;
    variantGroups?: ProductVariantGroup[];
    addonGroups?: ProductAddonGroup[];
    isAvailable?: boolean;
    schedule?: ProductSchedule | null;
  };
};
export type GetReferenceListsApiResponse =
  /** status 200 Success */ ReferenceListsResultDto;
export type GetReferenceListsApiArg = {
  countryCode: string;
};
export type CreateShopApiResponse =
  /** status 200 Shop created successfully */ CreateShopResultDto;
export type CreateShopApiArg = {
  createShopRequestDto: CreateShopRequestDto;
};
export type GetShopsApiResponse =
  /** status 200 List of all shops retrieved successfully */ GetAllShopsResultDto;
export type GetShopsApiArg = void;
export type DeleteShopApiResponse =
  /** status 200 Shop deleted successfully */ DeleteShopResultDto;
export type DeleteShopApiArg = {
  shopId: string;
};
export type GetShopByIdApiResponse =
  /** status 200 Shop retrieved successfully */ GetShopResultDto;
export type GetShopByIdApiArg = {
  shopId: string;
};
export type UpdateShopApiResponse =
  /** status 200 Shop updated successfully */ UpdateShopResultDto;
export type UpdateShopApiArg = {
  shopId: string;
  body: {
    isPaused?: boolean;
    menuLanguages?: MenuLanguage[];
    pausedMessage?: string;
    ordersPaused?: boolean;
    ordersPausedFor?: OrdersPauseDuration;
    ordersPausedMessage?: string;
    minOrderAmountCents?: number;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
    branding?: ShopBranding | null;
    openingHours?: {
      mon: {
        open: string;
        close: string;
      }[];
      tue: {
        open: string;
        close: string;
      }[];
      wed: {
        open: string;
        close: string;
      }[];
      thu: {
        open: string;
        close: string;
      }[];
      fri: {
        open: string;
        close: string;
      }[];
      sat: {
        open: string;
        close: string;
      }[];
      sun: {
        open: string;
        close: string;
      }[];
    };
  };
};
export type GetAuditEntriesApiResponse =
  /** status 200 Success */ GetAuditEntriesResultDto;
export type GetAuditEntriesApiArg = {
  shopId: string;
  page?: number;
  pageSize?: number;
};
export type SetBusyModeApiResponse = /** status 200 Success */ BusyState;
export type SetBusyModeApiArg = {
  shopId: string;
  body: {
    on?: any;
  };
};
export type GetCatalogApiResponse =
  /** status 200 Catalog retrieved successfully */ GetCatalogResultDto;
export type GetCatalogApiArg = {
  shopId: string;
  /** Preferred menu language; falls back to the original */
  lang?: string;
};
export type CreateCategoryApiResponse =
  /** status 200 Category created successfully */ CreateCategoryResultDto;
export type CreateCategoryApiArg = {
  shopId: string;
  body: {
    name: string;
    nameTranslations?: TranslationMap;
    sortOrder?: number;
    icon?: string;
    taxClassId?: string;
  };
};
export type GetCategoriesByShopApiResponse =
  /** status 200 Categories retrieved successfully */ GetCategoriesByShopResultDto;
export type GetCategoriesByShopApiArg = {
  shopId: string;
};
export type DeleteCategoryApiResponse =
  /** status 200 Category deleted successfully */ DeleteCategoryResultDto;
export type DeleteCategoryApiArg = {
  shopId: string;
  categoryId: string;
};
export type GetCategoryByIdApiResponse =
  /** status 200 Category retrieved successfully */ GetCategoryResultDto;
export type GetCategoryByIdApiArg = {
  shopId: string;
  categoryId: string;
};
export type UpdateCategoryApiResponse =
  /** status 200 Category updated successfully */ UpdateCategoryResultDto;
export type UpdateCategoryApiArg = {
  shopId: string;
  categoryId: string;
  body: {
    name?: string;
    nameTranslations?: TranslationMap;
    sortOrder?: number;
    icon?: string;
    taxClassId?: string;
    isAvailable?: boolean;
    schedule?: CategorySchedule | null;
  };
};
export type ApplyCategoryTaxClassApiResponse =
  /** status 200 Applied */ ApplyCategoryTaxClassResultDto;
export type ApplyCategoryTaxClassApiArg = {
  shopId: string;
  categoryId: string;
};
export type CreateComboApiResponse = /** status 200 Success */ ComboDto;
export type CreateComboApiArg = {
  shopId: string;
  body: {
    [key: string]: any;
  };
};
export type GetCombosApiResponse = /** status 200 Combos */ ComboDto[];
export type GetCombosApiArg = {
  shopId: string;
};
export type UpdateComboApiResponse = /** status 200 Combo updated */ ComboDto;
export type UpdateComboApiArg = {
  shopId: string;
  comboId: string;
  body: {
    [key: string]: any;
  };
};
export type RemoveShopCoverImageApiResponse =
  /** status 200 Shop cover image removed successfully */ ShopCoverImageResultDto;
export type RemoveShopCoverImageApiArg = {
  shopId: string;
};
export type SetShopCoverImageApiResponse =
  /** status 200 Shop cover image updated successfully */ ShopCoverImageResultDto;
export type SetShopCoverImageApiArg = {
  shopId: string;
  body: {
    imageId: string;
    url: string;
  };
};
export type GenerateShopCoverImageUploadUrlApiResponse =
  /** status 200 Upload URL generated successfully */ {
    [key: string]: any;
  };
export type GenerateShopCoverImageUploadUrlApiArg = {
  shopId: string;
  body: {
    contentType: string;
  };
};
export type EraseCustomerApiResponse =
  /** status 200 Success */ EraseCustomerResultDto;
export type EraseCustomerApiArg = {
  shopId: string;
  body: {
    email: any;
  };
};
export type ExportShopDataApiResponse =
  /** status 200 Success */ ShopDataExportDto;
export type ExportShopDataApiArg = {
  shopId: string;
};
export type CreateDiscountCodeApiResponse =
  /** status 200 Success */ PromotionsDto;
export type CreateDiscountCodeApiArg = {
  shopId: string;
  body: {
    [key: string]: any;
  };
};
export type SetDiscountCodeActiveApiResponse =
  /** status 200 Success */ PromotionsDto;
export type SetDiscountCodeActiveApiArg = {
  shopId: string;
  codeId: string;
  body: {
    [key: string]: any;
  };
};
export type AcceptDpaApiResponse =
  /** status 200 Success */ ShopLegalSettingsDto;
export type AcceptDpaApiArg = {
  shopId: string;
  body: {
    version: string;
  };
};
export type GetGoLiveStatusApiResponse =
  /** status 200 Success */ GetGoLiveStatusResultDto;
export type GetGoLiveStatusApiArg = {
  shopId: string;
};
export type GetShopLegalApiResponse =
  /** status 200 Success */ ShopLegalSettingsDto;
export type GetShopLegalApiArg = {
  shopId: string;
};
export type UpdateShopLegalApiResponse =
  /** status 200 Success */ ShopLegalSettingsDto;
export type UpdateShopLegalApiArg = {
  shopId: string;
  updateShopLegalBody: UpdateShopLegalBody;
};
export type SetShopLogoApiResponse =
  /** status 200 Shop logo updated successfully */ SetShopLogoResultDto;
export type SetShopLogoApiArg = {
  shopId: string;
  body: {
    imageId: string;
    url: string;
  };
};
export type GenerateShopLogoUploadUrlApiResponse =
  /** status 200 Upload URL generated successfully */ {
    [key: string]: any;
  };
export type GenerateShopLogoUploadUrlApiArg = {
  shopId: string;
  body: {
    contentType: string;
  };
};
export type UpdateLoyaltyApiResponse = /** status 200 Success */ PromotionsDto;
export type UpdateLoyaltyApiArg = {
  shopId: string;
  body: {
    [key: string]: any;
  };
};
export type SetMissedOrdersPauseLimitApiResponse = /** status 200 Updated */ {
  missedOrdersPauseLimit: number;
};
export type SetMissedOrdersPauseLimitApiArg = {
  shopId: string;
  body: {
    limit: any;
  };
};
export type RejectShopNameChangeApiResponse =
  /** status 200 Success */ RejectShopNameChangeResultDto;
export type RejectShopNameChangeApiArg = {
  shopId: string;
};
export type RequestShopNameChangeApiResponse =
  /** status 200 Success */ RequestShopNameChangeResultDto;
export type RequestShopNameChangeApiArg = {
  shopId: string;
  body: {
    requestedName: string;
  };
};
export type ApproveShopNameChangeApiResponse =
  /** status 200 Success */ ApproveShopNameChangeResultDto;
export type ApproveShopNameChangeApiArg = {
  shopId: string;
};
export type GetOrderLimitApiResponse =
  /** status 200 Success */ OrderLimitWithPaymentDto;
export type GetOrderLimitApiArg = {
  shopId: string;
};
export type GetOrderQueueApiResponse = /** status 200 Success */ OrderQueueDto;
export type GetOrderQueueApiArg = {
  shopId: string;
};
export type UpdateOrderSettingsApiResponse =
  /** status 200 Success */ OrderSettings;
export type UpdateOrderSettingsApiArg = {
  shopId: string;
  body: {
    prepMinutes?: {
      collection?: number;
      delivery?: number;
      dine_in?: number;
    };
    autoRejectMinutes?: number;
    alertEmail?: string | null;
    autoAccept?: boolean;
    dineIn?: boolean;
    autoAcceptHours?: WeeklyHours | null;
    lastOrdersMinutes?: number | null;
    busyExtraMinutes?: number;
    delivery?: boolean;
    deliveryHours?: WeeklyHours | null;
    deliveryZones?: DeliveryZone[];
    deliveryFeeTaxClassId?: string | null;
    scheduledOrders?: boolean;
    slotCapacity?: number | null;
  };
};
export type GetOrdersByShopApiResponse =
  /** status 200 Orders retrieved successfully */ GetOrdersByShopResultDto;
export type GetOrdersByShopApiArg = {
  shopId: string;
  /** 1-based page number (default: 1) */
  page?: number;
  /** Number of orders per page (default: 20, max: 100) */
  pageSize?: number;
};
export type AcceptOrderApiResponse = /** status 200 Success */ OrderDto;
export type AcceptOrderApiArg = {
  shopId: string;
  orderId: string;
  acceptOrderBody: AcceptOrderBody;
};
export type CompleteOrderApiResponse = /** status 200 Success */ OrderDto;
export type CompleteOrderApiArg = {
  shopId: string;
  orderId: string;
};
export type DispatchOrderApiResponse = /** status 200 Success */ OrderDto;
export type DispatchOrderApiArg = {
  shopId: string;
  orderId: string;
};
export type GetOrderDocumentApiResponse =
  /** status 200 The PDF as base64 */ InvoiceFileDto;
export type GetOrderDocumentApiArg = {
  shopId: string;
  orderId: string;
  documentId: string;
};
export type MarkOrderReadyApiResponse = /** status 200 Success */ OrderDto;
export type MarkOrderReadyApiArg = {
  shopId: string;
  orderId: string;
};
export type RefundOrderApiResponse =
  /** status 200 Refund recorded; returns the updated order */ OrderDto;
export type RefundOrderApiArg = {
  shopId: string;
  orderId: string;
  refundOrderBody: RefundOrderBody;
};
export type RejectOrderApiResponse = /** status 200 Success */ OrderDto;
export type RejectOrderApiArg = {
  shopId: string;
  orderId: string;
  rejectOrderBody: RejectOrderBody;
};
export type AddProductImageApiResponse =
  /** status 200 Product image added successfully */ AddProductImageResultDto;
export type AddProductImageApiArg = {
  shopId: string;
  productId: string;
  body: {
    imageId: string;
    url: string;
    alt?: string;
    sortOrder?: number;
  };
};
export type GenerateUploadUrlApiResponse =
  /** status 200 Upload URL generated successfully */ GenerateImageUploadUrlResultDto;
export type GenerateUploadUrlApiArg = {
  shopId: string;
  productId: string;
  body: {
    contentType: string;
    fileName?: string;
    maxSizeBytes?: number;
  };
};
export type GetPromotionsApiResponse = /** status 200 Success */ PromotionsDto;
export type GetPromotionsApiArg = {
  shopId: string;
};
export type GetSalesReportApiResponse = /** status 200 Success */ SalesReport;
export type GetSalesReportApiArg = {
  shopId: string;
  from: any;
  to: any;
};
export type RestoreShopApiResponse = /** status 200 Shop restored */ {
  success: boolean;
};
export type RestoreShopApiArg = {
  shopId: string;
};
export type CreateStaffApiResponse = /** status 200 Success */ StaffAccountDto;
export type CreateStaffApiArg = {
  shopId: string;
  body: {
    username: string;
    password: string;
    role: StaffRole;
    displayName?: string | null;
  };
};
export type ListStaffApiResponse = /** status 200 Success */ ListStaffResultDto;
export type ListStaffApiArg = {
  shopId: string;
};
export type DeleteStaffApiResponse =
  /** status 200 Success */ DeleteStaffResultDto;
export type DeleteStaffApiArg = {
  shopId: string;
  staffId: string;
};
export type UpdateStaffApiResponse = /** status 200 Success */ StaffAccountDto;
export type UpdateStaffApiArg = {
  shopId: string;
  staffId: string;
  body: {
    role?: StaffRole;
    displayName?: string | null;
    isActive?: boolean;
  };
};
export type ResetStaffPasswordApiResponse =
  /** status 200 Success */ StaffAccountDto;
export type ResetStaffPasswordApiArg = {
  shopId: string;
  staffId: string;
  body: {
    password: string;
  };
};
export type DisconnectStripeAccountApiResponse =
  /** status 200 Success */ DisconnectStripeAccountResultDto;
export type DisconnectStripeAccountApiArg = {
  shopId: string;
};
export type CreateStripeAccountSessionApiResponse =
  /** status 200 Success */ CreateStripeAccountSessionResultDto;
export type CreateStripeAccountSessionApiArg = {
  shopId: string;
  body: {
    purpose?: "onboarding" | "management";
  };
};
export type CancelShopSubscriptionApiResponse =
  /** status 200 Success */ CancelShopSubscriptionResultDto;
export type CancelShopSubscriptionApiArg = {
  shopId: string;
};
export type GetShopSubscriptionApiResponse =
  /** status 200 Success */ GetShopSubscriptionResultDto;
export type GetShopSubscriptionApiArg = {
  shopId: string;
};
export type CreateSubscriptionCheckoutApiResponse =
  /** status 200 Success */ SubscriptionChangeResultDto;
export type CreateSubscriptionCheckoutApiArg = {
  shopId: string;
  body: {
    [key: string]: any;
  };
};
export type ConfirmSubscriptionCheckoutApiResponse =
  /** status 200 Success */ GetShopSubscriptionResultDto;
export type ConfirmSubscriptionCheckoutApiArg = {
  shopId: string;
  body: {
    [key: string]: any;
  };
};
export type ClearLimitOverrideApiResponse =
  /** status 200 Success */ LimitOverrideResultDto;
export type ClearLimitOverrideApiArg = {
  shopId: string;
};
export type SetLimitOverrideApiResponse =
  /** status 200 Success */ LimitOverrideResultDto;
export type SetLimitOverrideApiArg = {
  shopId: string;
  setLimitOverrideRequestDto: SetLimitOverrideRequestDto;
};
export type OverrideShopSubscriptionApiResponse =
  /** status 200 Success */ OverrideShopSubscriptionResultDto;
export type OverrideShopSubscriptionApiArg = {
  shopId: string;
  overrideShopSubscriptionRequestDto: OverrideShopSubscriptionRequestDto;
};
export type CreateBillingPortalSessionApiResponse = /** status 200 Success */ {
  url: string;
};
export type CreateBillingPortalSessionApiArg = {
  shopId: string;
};
export type ResumeShopSubscriptionApiResponse =
  /** status 200 Success */ ResumeShopSubscriptionResultDto;
export type ResumeShopSubscriptionApiArg = {
  shopId: string;
};
export type RetrySubscriptionPaymentApiResponse =
  /** status 200 Success */ GetShopSubscriptionResultDto;
export type RetrySubscriptionPaymentApiArg = {
  shopId: string;
};
export type CancelScheduledChangeApiResponse =
  /** status 200 Success */ GetShopSubscriptionResultDto;
export type CancelScheduledChangeApiArg = {
  shopId: string;
};
export type SetShopOfflineBySuperadminApiResponse = /** status 200 Updated */ {
  offlineBySuperadmin: boolean;
  offlineBySuperadminReason?: string;
};
export type SetShopOfflineBySuperadminApiArg = {
  shopId: string;
  body: {
    offline: boolean;
    reason?: string;
  };
};
export type GetShopUsageApiResponse =
  /** status 200 Success */ GetShopUsageResultDto;
export type GetShopUsageApiArg = {
  shopId: string;
};
export type ReconcileShopUsageApiResponse =
  /** status 200 Success */ ReconcileShopUsageResultDto;
export type ReconcileShopUsageApiArg = {
  shopId: string;
};
export type GetMyShopsApiResponse =
  /** status 200 Shops where the user is an active owner member */ GetMyShopsResultDto;
export type GetMyShopsApiArg = void;
export type ListPublicShopsApiResponse =
  /** status 200 Listed shops, sorted by name */ GetPublicShopsResultDto;
export type ListPublicShopsApiArg = void;
export type GetShopBySlugApiResponse =
  /** status 200 Shop retrieved successfully */ GetShopBySlugResultDto;
export type GetShopBySlugApiArg = {
  slug: string;
};
export type GetPublicLegalPackApiResponse =
  /** status 200 Success */ PublicLegalPackDto;
export type GetPublicLegalPackApiArg = {
  slug: string;
  lang?: any;
};
export type StaffLoginApiResponse =
  /** status 200 Success */ StaffLoginResultDto;
export type StaffLoginApiArg = {
  staffLoginRequestDto: StaffLoginRequestDto;
};
export type GetRejectionWatchApiResponse =
  /** status 200 Success */ RejectionWatchDto;
export type GetRejectionWatchApiArg = void;
export type GetMeApiResponse = /** status 200 Success */ GetMeResultDto;
export type GetMeApiArg = void;
export type StripeWebhookApiResponse = /** status 200 Event received */ {
  received?: boolean;
};
export type StripeWebhookApiArg = {
  handleCheckoutSessionCompletedInput: HandleCheckoutSessionCompletedInput;
};
export type StripeConnectWebhookApiResponse = /** status 200 Success */ {
  received?: boolean;
};
export type StripeConnectWebhookApiArg = {
  body: {
    sessionId: string;
    paymentIntentId: string;
    connectAccountId?: any;
  };
};
export type MenuLanguage = "de" | "en";
export type StoredOrderState =
  | "PLACED"
  | "ACCEPTED"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";
export type OrderState =
  | "PLACED"
  | "ACCEPTED"
  | "IN_PREPARATION"
  | "READY"
  | "OUT_FOR_DELIVERY"
  | "COMPLETED"
  | "REJECTED"
  | "CANCELLED"
  | "REFUNDED";
export type FulfilmentMode = "collection" | "delivery" | "dine_in";
export type PaymentStatus =
  "authorized" | "paid" | "partially_refunded" | "refunded" | "canceled";
export type DisplayPaymentStatus = PaymentStatus | "not_paid_online";
export type InvoiceDocumentType = "invoice" | "cancellation" | "correction";
export type OrderDocumentDto = {
  id: string;
  kind: InvoiceDocumentType;
  number: string;
};
export type DeliveryAddress = {
  street: string;
  postcode: string;
  city: string;
};
export type OrderDiscountKind = "code" | "voucher";
export type StaffRejectReason =
  "too_busy" | "item_unavailable" | "closing_soon" | "other";
export type RejectReason =
  StaffRejectReason | "no_response" | "payment_failed" | "shop_unavailable";
export type CustomerOrderDto = {
  orderId: string;
  orderRef: string;
  shopSlug: string;
  shopName: string;
  sellerPhone: string | null;
  timezone: string;
  language: MenuLanguage;
  state: StoredOrderState;
  displayState: OrderState;
  fulfilmentMode: FulfilmentMode;
  table: {
    label: string;
  } | null;
  scheduledFor: string | null;
  paymentStatus: DisplayPaymentStatus;
  refundedCents: number;
  refundFailed: boolean;
  documents: OrderDocumentDto[];
  readyAt: string | null;
  items: {
    productName: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    selectedVariantOptionName: string | null;
    selectedAddonOptionNames: string[];
  }[];
  subtotalCents: number;
  totalCents: number;
  deliveryFeeCents: number | null;
  deliveryAddress: DeliveryAddress | null;
  discount: {
    kind: OrderDiscountKind;
    code: string;
    cents: number;
  } | null;
  currency: string;
  createdAt: string;
  canCancel: boolean;
  rejectionReason: RejectReason | null;
};
export type ErrorResponse = {
  ok: boolean;
  code: string;
  error: string;
};
export type LegalSection = {
  heading: string;
  paragraphs: string[];
};
export type PlatformDocument = {
  version: string;
  isDraft: boolean;
  publishedAt: string;
  title: {
    de: string;
    en: string;
  };
  sections: {
    de: LegalSection[];
    en: LegalSection[];
  };
};
export type SubProcessor = {
  id: "azure" | "entra" | "acs";
  name: string;
  purpose: {
    de: string;
    en: string;
  };
  location: {
    de: string;
    en: string;
  };
};
export type PlatformLegalPublicDto = {
  platformName: string;
  salesSiteUrl: string | null;
  operator: {
    legalName: string;
    address: string;
    email: string;
  };
  euRepresentative: {
    name: string;
    address: string;
    email: string;
  } | null;
  subProcessors: SubProcessor[];
  currentDpaVersion: string;
  currentDpaIsDraft: boolean;
};
export type CardCheckoutResultDto = {
  kind: "card";
  sessionId: string;
  orderId: string;
  accessToken: string;
  clientSecret: string;
  subtotalCents: number;
  totalCents: number;
  currency: string;
  stripeConnectAccountId: string;
};
export type PlacedCheckoutResultDto = {
  kind: "placed";
  orderId: string;
  orderRef: string;
  accessToken: string;
  subtotalCents: number;
  totalCents: number;
  currency: string;
};
export type CheckoutResultDto = CardCheckoutResultDto | PlacedCheckoutResultDto;
export type ComboChoiceInput = {
  groupId: string;
  productId: string;
  selectedVariantOptionId?: string;
  selectedAddonOptionIds?: string[];
};
export type CheckoutItemDto = {
  productId: string;
  quantity: number;
  selectedVariantOptionId?: string;
  selectedAddonOptionIds?: string[];
  expectedUnitPriceCents?: number;
  comboChoices?: ComboChoiceInput[];
};
export type PaymentMethod = "card";
export type CustomerAddress = {
  street: string;
  postcode: string;
  city: string;
  country: string;
};
export type LegalRevisions = {
  terms: number;
  withdrawal: number;
};
export type CheckoutRequestDto = {
  shopId: string;
  items: CheckoutItemDto[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  fulfilmentMode?: FulfilmentMode;
  paymentMethod?: PaymentMethod;
  customerAddress?: CustomerAddress;
  deliveryAddress?: DeliveryAddress;
  expectedDeliveryFeeCents?: number;
  table?: string;
  scheduledFor?: string;
  discountCode?: string;
  expectedDiscountCents?: number;
  loyaltyOptIn?: boolean;
  replacesOrderId?: string;
  replacesAccessToken?: string;
  idempotencyKey?: string;
  language?: string;
  legalRevisions?: LegalRevisions;
};
export type GetOrderByPaymentIntentResultDto = {
  orderId: string;
  orderRef: string;
  state: StoredOrderState;
  displayState: OrderState;
  fulfilmentMode: FulfilmentMode;
  paymentStatus: PaymentStatus;
  readyAt: string | null;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    selectedVariantOptionId?: string;
    selectedVariantOptionName?: string;
    selectedAddonOptionIds?: string[];
    selectedAddonOptionNames?: string[];
    lineTotalCents: number;
  }[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
  customerName: string;
  createdAt: string;
};
export type LineStatus =
  "ok" | "price_changed" | "unavailable" | "invalid_options";
export type QuoteLineDto = {
  index: number;
  productId: string;
  name: string | null;
  quantity: number;
  status: LineStatus;
  unitPriceCents: number | null;
  expectedUnitPriceCents: number | null;
  lineTotalCents: number | null;
};
export type TimeLimitedLineDto = {
  index: number;
  servedNow: boolean;
  servedLater: boolean;
};
export type DiscountProblem =
  | "unknown"
  | "not_started"
  | "expired"
  | "used_up"
  | "already_used"
  | "minimum"
  | "too_small";
export type BasketQuoteDto = {
  currency: string;
  fulfilmentMode: FulfilmentMode;
  lines: QuoteLineDto[];
  subtotalCents: number;
  deliveryFeeCents: number | null;
  totalCents: number;
  postcodeServed: boolean | null;
  taxCents: number;
  minOrderAmountCents: number;
  belowMinimum: boolean;
  openNow: boolean;
  paymentMethods: PaymentMethod[];
  addressRequired: boolean;
  prepMinutes: number;
  orderLimitReached: boolean;
  slots: string[];
  scheduledFor: string | null;
  slotAvailable: boolean | null;
  servedNow: boolean;
  timeLimited: TimeLimitedLineDto[];
  acceptsCodes: boolean;
  discount: {
    kind: OrderDiscountKind;
    code: string;
    cents: number;
  } | null;
  discountProblem: DiscountProblem | null;
  discountMinSubtotalCents: number | null;
  loyalty: {
    everyOrders: number;
    rewardCents: number;
  } | null;
};
export type QuoteBasketRequestDto = {
  shopId: string;
  items: CheckoutItemDto[];
  fulfilmentMode?: FulfilmentMode;
  language?: string;
  postcode?: string;
  scheduledFor?: string;
  discountCode?: string;
};
export type WarningLevel = 0 | 80 | 90 | 95 | 100;
export type OrderLimitStatus = {
  periodKey: string;
  acceptedOrderCount: number;
  limit: number | null;
  warningLevel: WarningLevel;
  limitReached: boolean;
};
export type OwnerOverviewShop = {
  shopId: string;
  name: string;
  slug: string;
  isPaused: boolean;
  currency: string;
  timezone: string;
  today: {
    date: string;
    orderCount: number;
    takingsCents: number;
  };
  waitingCount: number;
  orderLimit: OrderLimitStatus;
};
export type OwnerOverview = {
  generatedAt: string;
  shops: OwnerOverviewShop[];
  truncated: boolean;
  combinedToday: {
    currency: string;
    orderCount: number;
    takingsCents: number;
  } | null;
};
export type PlanLimit = {
  key: string;
  value: number;
};
export type Plan = {
  id: string;
  name: string;
  internalKey: string;
  isDefault: boolean;
  isVisible: boolean;
  sortOrder: number;
  limits: PlanLimit[];
  createdAt: string;
  updatedAt: string;
};
export type CreatePlanResultDto = {
  plan: Plan;
};
export type CreatePlanRequestDto = {
  name: string;
  internalKey: string;
  isDefault?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  limits?: {
    key: string;
    value: number;
  }[];
};
export type GetPlansResultDto = {
  plans: Plan[];
};
export type PlanPricing = {
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
export type GetPlanResultDto = {
  plan: Plan;
  pricing: PlanPricing[];
};
export type UpdatePlanResultDto = {
  plan: Plan;
};
export type UpdatePlanRequestDto = {
  name?: string;
  isVisible?: boolean;
  sortOrder?: number;
  limits?: {
    key: string;
    value: number;
  }[];
};
export type GetPlanPricingResultDto = PlanPricing[];
export type SetPlanPricingResultDto = {
  pricing: PlanPricing;
};
export type SetPlanPricingRequestDto = {
  currency: string;
  monthlyAmountCents: number;
  yearlyAmountCents: number;
  billingPriceIdMonthly?: string | null;
  billingPriceIdYearly?: string | null;
};
export type GetSystemConfigResultDto = {
  maxShopsDefault: number;
};
export type UpdateSystemConfigResultDto = {
  maxShopsDefault: number;
};
export type UpdateSystemConfigRequestDto = {
  maxShopsDefault: number;
};
export type PlatformLegalIdentityDto = {
  platformName: string;
  salesSiteUrl: string | null;
  operator: {
    legalName: string;
    address: string;
    email: string;
  };
  euRepresentative: {
    name: string;
    address: string;
    email: string;
  } | null;
  updatedAt: string | null;
  updatedBy: string | null;
};
export type LocalizedLabel = {
  de: string;
  en: string;
};
export type AllergenDef = {
  id: string;
  labels: LocalizedLabel;
  isActive: boolean;
};
export type AdditiveDef = {
  id: string;
  code: number;
  labels: LocalizedLabel;
  isActive: boolean;
};
export type TaxClassDef = {
  id: string;
  labels: LocalizedLabel;
  isActive: boolean;
};
export type TaxRateRow = {
  taxClassId: string;
  fulfilmentMode: FulfilmentMode;
  rateBasisPoints: number;
  effectiveFrom: string;
};
export type CurrentTaxRate = {
  taxClassId: string;
  rates: {
    collection: number | null;
    delivery: number | null;
    dine_in: number | null;
  };
};
export type DietaryTagId =
  "vegetarian" | "vegan" | "halal" | "gluten_free" | "lactose_free";
export type SpiceLevel = "mild" | "medium" | "hot";
export type ReferenceListsResultDto = {
  countryCode: string;
  allergens: AllergenDef[];
  additives: AdditiveDef[];
  taxClasses: TaxClassDef[];
  defaultTaxClassId: string | null;
  taxRates: TaxRateRow[];
  currentTaxRates: CurrentTaxRate[];
  taxRatesUniformAcrossModes: boolean;
  dietaryTags: {
    id: DietaryTagId;
    labels: LocalizedLabel;
  }[];
  spiceLevels: {
    id: SpiceLevel;
    labels: LocalizedLabel;
  }[];
  updatedAt: string | null;
};
export type ShopPermission =
  | "view_orders"
  | "manage_menu"
  | "manage_shop"
  | "manage_staff"
  | "manage_billing"
  | "view_audit"
  | "refund_orders"
  | "view_reports";
export type RolePermissionsResultDto = {
  owner: ShopPermission[];
  manager: ShopPermission[];
  staff: ShopPermission[];
  updatedAt: string | null;
};
export type UpdateRolePermissionsRequestDto = {
  manager: ShopPermission[];
  staff: ShopPermission[];
};
export type UpdateUserLimitsResultDto = {
  userId: string;
  maxShops: number | null;
};
export type UpdateUserLimitsRequestDto = {
  maxShops: number | null;
};
export type TranslationMap = {
  de?: string;
  en?: string;
};
export type ProductSchedule = {
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  daysOfWeek?: number[];
  offerPrice?: number | null;
  offerLabel?: string | null;
};
export type CreateProductResultDto = {
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  unavailableModes: FulfilmentMode[];
  taxClassId: string | null;
  isDeclared: boolean;
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isDeleted: boolean;
  schedule?: ProductSchedule | null;
  createdAt: string;
  updatedAt: string;
};
export type ProductImage = {
  id: string;
  url: string;
  alt?: string;
  sortOrder?: number;
  createdAt: string;
};
export type ProductOption = {
  id: string;
  name: string;
  nameTranslations?: TranslationMap;
  priceDelta: number;
  isAvailable: boolean;
  allergenIds?: string[];
  additiveIds?: string[];
};
export type ProductVariantGroup = {
  id: string;
  name: string;
  nameTranslations?: TranslationMap;
  options: ProductOption[];
};
export type ProductAddonGroup = {
  id: string;
  name: string;
  nameTranslations?: TranslationMap;
  minSelectable: number;
  maxSelectable: number;
  options: ProductOption[];
};
export type CreateProductRequestDto = {
  shopId: string;
  name: string;
  description: string;
  price: number;
  categoryIds?: string[];
  images?: ProductImage[];
  nameTranslations?: TranslationMap;
  descriptionTranslations?: TranslationMap;
  allergenIds?: string[] | null;
  additiveIds?: string[] | null;
  dietaryTagIds?: string[];
  spiceLevel?: SpiceLevel | null;
  prepMinutes?: number | null;
  unavailableModes?: FulfilmentMode[];
  taxClassId?: string | null;
  variantGroups?: ProductVariantGroup[];
  addonGroups?: ProductAddonGroup[];
  isAvailable?: boolean;
  schedule?: ProductSchedule | null;
};
export type ProductDto = {
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  unavailableModes: FulfilmentMode[];
  taxClassId: string | null;
  isDeclared: boolean;
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  categories: {
    id: string;
    name: string;
    sortOrder: number;
    icon?: string;
  }[];
  images: ProductImage[];
  variantGroups?: ProductVariantGroup[];
  addonGroups?: ProductAddonGroup[];
  schedule?: ProductSchedule | null;
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type GetProductsByShopResultDto = ProductDto[];
export type DeleteProductResultDto = {
  success: boolean;
};
export type GetProductResultDto = {
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  unavailableModes: FulfilmentMode[];
  taxClassId: string | null;
  isDeclared: boolean;
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  images: ProductImage[];
  categories: {
    id: string;
    name: string;
    sortOrder: number;
    icon?: string;
  }[];
  variantGroups?: ProductVariantGroup[];
  addonGroups?: ProductAddonGroup[];
  schedule?: ProductSchedule | null;
};
export type UpdateProductResultDto = {
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  unavailableModes: FulfilmentMode[];
  taxClassId: string | null;
  isDeclared: boolean;
  id: string;
  shopId: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  isDeleted: boolean;
  schedule?: ProductSchedule | null;
  createdAt: string;
  updatedAt: string;
};
export type CreateShopResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ShopBranding = {
  logoUrl: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  showHero?: boolean;
};
export type CreateShopRequestDto = {
  name: string;
  countryCode: string;
  currency: string;
  timezone: string;
  minOrderAmountCents: number;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  openingHours: {
    mon: {
      open: string;
      close: string;
    }[];
    tue: {
      open: string;
      close: string;
    }[];
    wed: {
      open: string;
      close: string;
    }[];
    thu: {
      open: string;
      close: string;
    }[];
    fri: {
      open: string;
      close: string;
    }[];
    sat: {
      open: string;
      close: string;
    }[];
    sun: {
      open: string;
      close: string;
    }[];
  };
  industry: string;
  pausedMessage?: string;
  orderAcceptanceMode?: "auto";
  closures?: {
    id: string;
    start: string;
    end: string;
    reason?: string;
  }[];
  branding?: ShopBranding | null;
  menuLanguage?: MenuLanguage;
  acceptDpaVersion?: string;
};
export type OrdersAutoPaused = {
  missedOrders: number;
  at: string;
};
export type ShopSummaryDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  deletedAt?: string;
  isPaused: boolean;
  pausedMessage?: string;
  ordersPaused: boolean;
  ordersPausedUntil: string | null;
  ordersAutoPaused: OrdersAutoPaused | null;
  missedOrdersPauseLimit: number;
  ordersPausedMessage?: string;
  isOffline: boolean;
  offlineBySuperadmin: boolean;
  offlineBySuperadminReason?: string;
  orderAcceptanceMode: string;
  currency: string;
  timezone: string;
  minOrderAmountCents: number;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  openingHours: {
    mon: {
      open: string;
      close: string;
    }[];
    tue: {
      open: string;
      close: string;
    }[];
    wed: {
      open: string;
      close: string;
    }[];
    thu: {
      open: string;
      close: string;
    }[];
    fri: {
      open: string;
      close: string;
    }[];
    sat: {
      open: string;
      close: string;
    }[];
    sun: {
      open: string;
      close: string;
    }[];
  };
  closures: {
    id: string;
    start: string;
    end: string;
    reason?: string;
  }[];
  branding: ShopBranding | null;
  pendingNameChange: {
    requestedName: string;
    requestedSlug: string;
    requestedBy: string;
    requestedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};
export type GetAllShopsResultDto = {
  shops: ShopSummaryDto[];
  total: number;
};
export type DeleteShopResultDto = {
  success: boolean;
};
export type ShopRoleKey = "owner" | "manager" | "staff";
export type WeeklyHours = {
  mon: {
    open: string;
    close: string;
  }[];
  tue: {
    open: string;
    close: string;
  }[];
  wed: {
    open: string;
    close: string;
  }[];
  thu: {
    open: string;
    close: string;
  }[];
  fri: {
    open: string;
    close: string;
  }[];
  sat: {
    open: string;
    close: string;
  }[];
  sun: {
    open: string;
    close: string;
  }[];
};
export type DeliveryZone = {
  postcode: string;
  feeCents: number;
  minOrderCents: number;
};
export type OrderSettings = {
  autoRejectMinutes: number;
  alertEmail: string | null;
  autoAccept: boolean;
  dineIn: boolean;
  autoAcceptHours: WeeklyHours | null;
  prepMinutes: {
    collection: number;
    delivery: number;
    dine_in: number;
  };
  lastOrdersMinutes: number | null;
  busyExtraMinutes: number;
  delivery: boolean;
  deliveryHours: WeeklyHours | null;
  deliveryZones: DeliveryZone[];
  deliveryFeeTaxClassId: string | null;
  scheduledOrders: boolean;
  slotCapacity: number | null;
};
export type GetShopResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  deletedAt?: string;
  isPaused: boolean;
  pausedMessage?: string;
  ordersPaused: boolean;
  ordersPausedUntil: string | null;
  ordersAutoPaused: OrdersAutoPaused | null;
  ordersPausedMessage?: string;
  isOffline: boolean;
  offlineBySuperadmin: boolean;
  offlineBySuperadminReason?: string;
  orderAcceptanceMode: string;
  currency: string;
  timezone: string;
  minOrderAmountCents: number;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  openingHours: {
    mon: {
      open: string;
      close: string;
    }[];
    tue: {
      open: string;
      close: string;
    }[];
    wed: {
      open: string;
      close: string;
    }[];
    thu: {
      open: string;
      close: string;
    }[];
    fri: {
      open: string;
      close: string;
    }[];
    sat: {
      open: string;
      close: string;
    }[];
    sun: {
      open: string;
      close: string;
    }[];
  };
  closures: {
    id: string;
    start: string;
    end: string;
    reason?: string;
  }[];
  callerRole: (ShopRoleKey | "superadmin") | null;
  callerPermissions: ShopPermission[];
  countryCode: string;
  menuLanguages: MenuLanguage[];
  branding: ShopBranding | null;
  pendingNameChange: {
    requestedName: string;
    requestedSlug: string;
    requestedBy: string;
    requestedAt: string;
  } | null;
  stripe: {
    connectAccountId: string | null;
    connectOnboardingStatus: ("not_started" | "pending" | "complete") | null;
  } | null;
  orderSettings: OrderSettings;
  createdAt: string;
  updatedAt: string;
};
export type UpdateShopResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type OrdersPauseDuration =
  "minutes_30" | "rest_of_day" | "until_switched_back";
export type AuditActorType = "owner" | "staff" | "superadmin" | "system";
export type AuditChange = {
  field: string;
  from: any;
  to: any;
};
export type AuditEntry = {
  id: string;
  shopId: string;
  timestamp: string;
  actorType: AuditActorType;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  changes?: AuditChange[];
};
export type GetAuditEntriesResultDto = {
  entries: AuditEntry[];
  total: number;
  page: number;
  pageSize: number;
  actorLabels: {
    [key: string]: string;
  };
};
export type BusyState = {
  active: boolean;
  extraMinutes: number;
};
export type CatalogCategoryScheduleDto = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};
export type CatalogLabelDto = {
  id: string;
  label: string;
};
export type CatalogAdditiveDto = {
  id: string;
  code: number;
  label: string;
};
export type CatalogOptionDto = {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
  allergens: CatalogLabelDto[];
  additives: CatalogAdditiveDto[];
};
export type CatalogVariantGroupDto = {
  id: string;
  name: string;
  options: CatalogOptionDto[];
};
export type CatalogAddonGroupDto = {
  id: string;
  name: string;
  minSelectable: number;
  maxSelectable: number;
  options: CatalogOptionDto[];
};
export type CatalogComboDto = {
  groups: {
    id: string;
    name: string;
    productIds: string[];
  }[];
};
export type CatalogProductDto = {
  id: string;
  name: string;
  description: string;
  price: number;
  offerPrice?: number | null;
  offerLabel?: string | null;
  images: {
    id: string;
    url: string;
    alt?: string;
    sortOrder: number;
  }[];
  variants: CatalogVariantGroupDto[];
  addons: CatalogAddonGroupDto[];
  isAvailable: boolean;
  allergens: CatalogLabelDto[];
  additives: CatalogAdditiveDto[];
  dietaryTags: CatalogLabelDto[];
  spice: CatalogLabelDto | null;
  unavailableModes: FulfilmentMode[];
  availableNow: boolean;
  combo: CatalogComboDto | null;
  createdAt: string;
  updatedAt: string;
};
export type CatalogCategoryDto = {
  id: string;
  name: string;
  sortOrder: number;
  icon?: string;
  availableNow: boolean;
  schedule: CatalogCategoryScheduleDto | null;
  products: CatalogProductDto[];
};
export type GetCatalogResultDto = {
  language: MenuLanguage;
  languages: MenuLanguage[];
  categories: CatalogCategoryDto[];
};
export type CategorySchedule = {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
};
export type CreateCategoryResultDto = {
  id: string;
  shopId: string;
  name: string;
  nameTranslations: TranslationMap;
  sortOrder: number;
  icon?: string;
  taxClassId: string | null;
  isAvailable: boolean;
  schedule: CategorySchedule | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type CategoryDto = {
  id: string;
  shopId: string;
  name: string;
  nameTranslations: TranslationMap;
  sortOrder: number;
  icon?: string;
  taxClassId: string | null;
  isAvailable: boolean;
  schedule: CategorySchedule | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type GetCategoriesByShopResultDto = CategoryDto[];
export type DeleteCategoryResultDto = {
  id: string;
  shopId: string;
  name: string;
  sortOrder: number;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type GetCategoryResultDto = {
  id: string;
  shopId: string;
  name: string;
  nameTranslations: TranslationMap;
  sortOrder: number;
  icon?: string;
  taxClassId: string | null;
  isAvailable: boolean;
  schedule: CategorySchedule | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type UpdateCategoryResultDto = {
  id: string;
  shopId: string;
  name: string;
  nameTranslations: TranslationMap;
  sortOrder: number;
  icon?: string;
  taxClassId: string | null;
  isAvailable: boolean;
  schedule: CategorySchedule | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ApplyCategoryTaxClassResultDto = {
  taxClassId: string;
  updatedCount: number;
};
export type ComboDto = {
  id: string;
  name: string;
  description: string;
  nameTranslations: TranslationMap;
  descriptionTranslations: TranslationMap;
  images: ProductImage[];
  priceCents: number;
  categoryId: string | null;
  isAvailable: boolean;
  bmfDrinkShare: boolean;
  groups: {
    nameTranslations: TranslationMap;
    id: string;
    name: string;
    productIds: string[];
  }[];
  createdAt: string;
  updatedAt: string;
};
export type ShopCoverImageResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  branding: ShopBranding | null;
};
export type EraseCustomerResultDto = {
  anonymisedOrderCount: number;
};
export type LegalForm =
  "sole_trader" | "ek" | "gbr" | "ohg" | "kg" | "gmbh" | "ug" | "other";
export type ImpressumFields = {
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
};
export type Category = {
  id: string;
  shopId: string;
  name: string;
  nameTranslations?: TranslationMap;
  sortOrder: number;
  icon?: string;
  taxClassId: string | null;
  isAvailable?: boolean;
  schedule?: CategorySchedule | null;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ComboGroup = {
  id: string;
  name: string;
  nameTranslations?: TranslationMap;
  productIds: string[];
};
export type ProductCombo = {
  groups: ComboGroup[];
  bmfDrinkShare: boolean;
};
export type Product = {
  id: string;
  shopId: string;
  name: string;
  description: string;
  nameTranslations?: TranslationMap;
  descriptionTranslations?: TranslationMap;
  price: number;
  categoryIds: string[];
  images: ProductImage[];
  variantGroups?: ProductVariantGroup[];
  addonGroups?: ProductAddonGroup[];
  allergenIds: string[] | null;
  additiveIds: string[] | null;
  dietaryTagIds: string[];
  spiceLevel: SpiceLevel | null;
  prepMinutes: number | null;
  unavailableModes?: FulfilmentMode[];
  taxClassId: string | null;
  schedule?: ProductSchedule | null;
  combo?: ProductCombo | null;
  isAvailable: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};
export type OrderPayment = {
  method: PaymentMethod;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
};
export type OrderItemCombo = {
  line: number;
  productId: string;
  name: string;
};
export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  selectedVariantOptionId?: string;
  selectedVariantOptionName?: string;
  selectedAddonOptionIds?: string[];
  selectedAddonOptionNames?: string[];
  lineTotalCents: number;
  taxClassId?: string | null;
  taxRateBasisPoints?: number;
  taxCents?: number;
  discountCents?: number;
  combo?: OrderItemCombo;
};
export type OrderChargeKind = "delivery_fee";
export type OrderCharge = {
  kind: OrderChargeKind;
  grossCents: number;
  taxClassId: string | null;
  taxRateBasisPoints: number;
  taxCents: number;
};
export type TaxBreakdownEntry = {
  rateBasisPoints: number;
  grossCents: number;
  taxCents: number;
};
export type OrderDiscount = {
  kind: OrderDiscountKind;
  code: string;
  cents: number;
  byRate: TaxBreakdownEntry[];
};
export type OrderTable = {
  label: string;
};
export type OrderActor =
  | {
      type: "system";
    }
  | {
      type: "customer";
    }
  | {
      type: "owner" | "staff" | "superadmin";
      id: string;
    };
export type RefundLine = {
  lineIndex: number;
  quantity: number;
  grossCents: number;
  taxRateBasisPoints: number;
};
export type CorrectionKind = "cancellation" | "correction";
export type OrderRefund = {
  id: string;
  amountCents: number;
  reason: string;
  at: string;
  actor: OrderActor;
  stripeRefundId: string;
  reversesIndex?: number;
  lines?: RefundLine[];
  correctionNumber?: string;
  correctionKind?: CorrectionKind;
  correctionEmailedAt?: string;
};
export type PaymentReleaseFailure = {
  at: string;
  message: string;
  notifiedAt: string | null;
  attempts?: number;
};
export type OrderHistoryEntry = {
  from: StoredOrderState | null;
  to: StoredOrderState;
  at: string;
  actor: OrderActor;
  reason?: string;
};
export type PickOrderExcludeIdShopIdOrderRefSt3A0C561D = {
  id: string;
  shopId: string;
  orderRef: string;
  state: StoredOrderState;
  fulfilmentMode: FulfilmentMode;
  payment: OrderPayment;
  items: OrderItem[];
  subtotalCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress?: CustomerAddress;
  deliveryAddress?: DeliveryAddress;
  charges?: OrderCharge[];
  totalCents?: number;
  discount?: OrderDiscount;
  loyaltyOptIn?: true;
  loyaltyVoucher?: {
    code: string;
    issuedAt: string;
  };
  table?: OrderTable;
  scheduledFor?: string;
  queuedAt?: string;
  refunds?: OrderRefund[];
  releaseFailure?: PaymentReleaseFailure;
  invoiceNumber?: string;
  invoiceEmailedAt?: string;
  captureStartedAt?: string;
  captureAttempts?: number;
  anonymisedAt?: string;
  acceptedAt?: string;
  readyAt?: string;
  prepMinutes?: number;
  usagePeriodKey?: string;
  taxBreakdown?: TaxBreakdownEntry[];
  language?: MenuLanguage;
  legalRevisions?: LegalRevisions;
  autoRejectAt?: string;
  escalatedAt?: string;
  rejectionNote?: string;
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
};
export type ExportCustomer = {
  name: string;
  email: string;
  phone: string;
  orderCount: number;
  firstOrderAt: string;
  lastOrderAt: string;
};
export type ShopDataExportDto = {
  formatVersion: 1;
  exportedAt: string;
  shop: {
    id: string;
    slug: string;
    name: string;
    countryCode: string;
    currency: string;
    timezone: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
    };
    openingHours: {
      mon: {
        open: string;
        close: string;
      }[];
      tue: {
        open: string;
        close: string;
      }[];
      wed: {
        open: string;
        close: string;
      }[];
      thu: {
        open: string;
        close: string;
      }[];
      fri: {
        open: string;
        close: string;
      }[];
      sat: {
        open: string;
        close: string;
      }[];
      sun: {
        open: string;
        close: string;
      }[];
    };
    menuLanguages: MenuLanguage[];
    impressum: ImpressumFields | null;
    terms: string | null;
    withdrawal: string | null;
    privacyAddition: string | null;
  };
  categories: Category[];
  products: Product[];
  orders: PickOrderExcludeIdShopIdOrderRefSt3A0C561D[];
  customers: ExportCustomer[];
};
export type DiscountCodeKind = "percent" | "amount";
export type DiscountCodeDto = {
  uses: number;
  id: string;
  code: string;
  kind: DiscountCodeKind;
  percent: number | null;
  amountCents: number | null;
  minSubtotalCents: number;
  validFrom: string | null;
  validUntil: string | null;
  totalLimit: number | null;
  perEmailLimit: number | null;
  active: boolean;
  createdAt: string;
};
export type LoyaltyRule = {
  enabled: boolean;
  everyOrders: number;
  rewardCents: number;
  validDays: number;
  since: string | null;
};
export type PromotionsDto = {
  codes: DiscountCodeDto[];
  loyalty: LoyaltyRule;
};
export type LegalTextDto = {
  text: string;
  revision: number;
  updatedAt: string;
};
export type ImpressumFieldKey =
  | "legalName"
  | "legalForm"
  | "representatives"
  | "street"
  | "postcode"
  | "city"
  | "country"
  | "phone"
  | "email"
  | "registerCourt"
  | "registerNumber"
  | "vatId"
  | "supervisoryAuthority";
export type DpaAcceptance = {
  version: string;
  acceptedAt: string;
  acceptedByUserId: string;
  shopNameAtAcceptance: string;
};
export type ShopLegalSettingsDto = {
  impressum: ImpressumFields | null;
  terms: LegalTextDto | null;
  withdrawal: LegalTextDto | null;
  privacyAddition: LegalTextDto | null;
  missingImpressumFields: ImpressumFieldKey[];
  completeness: {
    dpa: boolean;
    impressum: boolean;
    terms: boolean;
    withdrawal: boolean;
    privacyNotice: boolean;
  };
  dpa: {
    currentVersion: string;
    currentIsDraft: boolean;
    accepted: DpaAcceptance | null;
  };
  platformIdentityComplete: boolean;
  callerIsOwner: boolean;
  taxNumber: string;
};
export type GoLiveCriterion = {
  key: string;
  met: boolean;
  description: string;
};
export type GetGoLiveStatusResultDto = {
  allMet: boolean;
  criteria: GoLiveCriterion[];
};
export type UpdateShopLegalBody = {
  impressum?: any;
  terms?: string;
  withdrawal?: string;
  privacyAddition?: string;
  taxNumber?: string;
};
export type SetShopLogoResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  branding: ShopBranding | null;
};
export type RejectShopNameChangeResultDto = {
  id: string;
  updatedAt: string;
};
export type RequestShopNameChangeResultDto = {
  id: string;
  pendingNameChange: {
    requestedName: string;
    requestedSlug: string;
    requestedBy: string;
    requestedAt: string;
  };
};
export type ApproveShopNameChangeResultDto = {
  id: string;
  name: string;
  slug: string;
  updatedAt: string;
};
export type OrderLimitWithPaymentDto = {
  periodKey: string;
  acceptedOrderCount: number;
  limit: number | null;
  warningLevel: WarningLevel;
  limitReached: boolean;
  payment: {
    inGrace: boolean;
    graceEndsAt: string | null;
    droppedForNonPayment: boolean;
  };
};
export type OrderItemDto = {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  selectedVariantOptionId?: string | null;
  selectedVariantOptionName?: string | null;
  selectedAddonOptionIds?: string[] | null;
  selectedAddonOptionNames?: string[] | null;
  lineTotalCents: number;
  discountCents: number;
  combo: {
    line: number;
    productId: string;
    name: string;
  } | null;
};
export type OrderDto = {
  id: string;
  orderRef: string;
  state: StoredOrderState;
  displayState: OrderState;
  fulfilmentMode: FulfilmentMode;
  table: {
    label: string;
  } | null;
  scheduledFor: string | null;
  paymentStatus: DisplayPaymentStatus;
  readyAt: string | null;
  items: OrderItemDto[];
  subtotalCents: number;
  totalCents: number;
  deliveryFeeCents: number | null;
  deliveryAddress: DeliveryAddress | null;
  discount: {
    kind: OrderDiscountKind;
    code: string;
    cents: number;
  } | null;
  loyaltyVoucherSent: boolean;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  history: OrderHistoryEntry[];
  createdAt: string;
  autoRejectAt: string | null;
  acceptedAt: string | null;
  prepMinutes: number | null;
  taxBreakdown: TaxBreakdownEntry[];
  rejectionNote: string | null;
  customerAddress: CustomerAddress | null;
  refundedCents: number;
  refunds: {
    amountCents: number;
    reason: string;
    at: string;
    lines: {
      lineIndex: number;
      quantity: number;
    }[];
    reversal: boolean;
    reversed: boolean;
  }[];
  releaseFailure: {
    at: string;
    message: string;
  } | null;
  documents: OrderDocumentDto[];
  autoAccepted: boolean;
};
export type UpcomingOrderDto = {
  outsideHours: boolean;
  id: string;
  orderRef: string;
  state: StoredOrderState;
  displayState: OrderState;
  fulfilmentMode: FulfilmentMode;
  table: {
    label: string;
  } | null;
  scheduledFor: string | null;
  paymentStatus: DisplayPaymentStatus;
  readyAt: string | null;
  items: OrderItemDto[];
  subtotalCents: number;
  totalCents: number;
  deliveryFeeCents: number | null;
  deliveryAddress: DeliveryAddress | null;
  discount: {
    kind: OrderDiscountKind;
    code: string;
    cents: number;
  } | null;
  loyaltyVoucherSent: boolean;
  currency: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNotes?: string;
  history: OrderHistoryEntry[];
  createdAt: string;
  autoRejectAt: string | null;
  acceptedAt: string | null;
  prepMinutes: number | null;
  taxBreakdown: TaxBreakdownEntry[];
  rejectionNote: string | null;
  customerAddress: CustomerAddress | null;
  refundedCents: number;
  refunds: {
    amountCents: number;
    reason: string;
    at: string;
    lines: {
      lineIndex: number;
      quantity: number;
    }[];
    reversal: boolean;
    reversed: boolean;
  }[];
  releaseFailure: {
    at: string;
    message: string;
  } | null;
  documents: OrderDocumentDto[];
  autoAccepted: boolean;
};
export type SlotCapacityDto = {
  perSlot: number;
  taken: {
    [key: string]: number;
  };
};
export type OrdersPauseFields = {
  ordersPaused: boolean;
  ordersPausedUntil: string | null;
  ordersAutoPaused: OrdersAutoPaused | null;
};
export type OrderQueueDto = {
  serverTime: string;
  timezone: string;
  defaultPrepMinutes: {
    collection: number;
    delivery: number;
    dine_in: number;
  };
  busy: BusyState;
  orders: OrderDto[];
  upcoming: UpcomingOrderDto[];
  capacity: SlotCapacityDto | null;
  ordersPause: OrdersPauseFields;
};
export type GetOrdersByShopResultDto = {
  orders: OrderDto[];
  total: number;
  page: number;
  pageSize: number;
};
export type AcceptOrderBody = {
  prepMinutes?: number;
};
export type InvoiceFileDto = {
  fileName: string;
  contentType: "application/pdf";
  contentBase64: string;
};
export type RefundItemRequest = {
  lineIndex: number;
  quantity: number;
};
export type RefundOrderBody = {
  items?: RefundItemRequest[];
  amountCents?: number;
  reason: string;
};
export type RejectOrderBody = {
  reason: StaffRejectReason;
  note?: string;
};
export type AddProductImageResultDto = {
  id: string;
  url: string;
  alt?: string;
  sortOrder?: number;
  createdAt: string;
};
export type GenerateImageUploadUrlResultDto = {
  imageId: string;
  uploadUrl: string;
  blobUrl: string;
  expiresAt: string;
};
export type RateTotals = {
  rateBasisPoints: number;
  grossCents: number;
  taxCents: number;
  netCents: number;
};
export type ReportTotals = {
  orderCount: number;
  grossCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  refundCents: number;
  takingsCents: number;
  byRate: RateTotals[];
};
export type ReportDay = {
  orderCount: number;
  grossCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  refundCents: number;
  takingsCents: number;
  byRate: RateTotals[];
  date: string;
};
export type ReportModeTotals = {
  mode: FulfilmentMode;
  orderCount: number;
  grossCents: number;
};
export type ReportDish = {
  productId: string;
  name: string;
  quantity: number;
  grossCents: number;
};
export type SalesReport = {
  shopId: string;
  from: string;
  to: string;
  timezone: string;
  currency: string;
  totals: ReportTotals;
  days: ReportDay[];
  byHour: number[];
  byMode: ReportModeTotals[];
  topDishes: ReportDish[];
};
export type StaffRole = "manager" | "staff";
export type StaffAccountDto = {
  id: string;
  username: string;
  displayName: string | null;
  role: StaffRole;
  isActive: boolean;
  isLocked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};
export type ListStaffResultDto = {
  staff: StaffAccountDto[];
  limit: number | null;
  activeCount: number;
};
export type DeleteStaffResultDto = {
  id: string;
  deleted: true;
};
export type DisconnectStripeAccountResultDto = {
  shopId: string;
};
export type CreateStripeAccountSessionResultDto = {
  clientSecret: string;
};
export type CancelShopSubscriptionResultDto = {
  id: string;
  shopId: string;
  planId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};
export type SubscriptionStatus =
  "free" | "active" | "past_due" | "canceled" | "expired";
export type PlanSource = "default" | "billing" | "superadmin_override";
export type LimitOverride = {
  limits: PlanLimit[];
  reason: string;
  expiresAt: string | null;
  setBy: string;
  setAt: string;
};
export type ScheduledPlanChange = {
  planId: string;
  billingInterval: "monthly" | "yearly";
  effectiveAt: string;
};
export type ShopSubscription = {
  id: string;
  shopId: string;
  planId: string;
  status: SubscriptionStatus;
  billingInterval: ("monthly" | "yearly") | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  billingCustomerId: string | null;
  billingSubscriptionId: string | null;
  cancelAtPeriodEnd: boolean;
  planSource: PlanSource;
  overriddenBy: string | null;
  overrideReason: string | null;
  overrideExpiresAt: string | null;
  limitOverride?: LimitOverride | null;
  planBeforeOverride?: string | null;
  scheduledChange?: ScheduledPlanChange | null;
  paymentFailedAt?: string | null;
  graceWarningsSent?: number;
  createdAt: string;
  updatedAt: string;
};
export type Entitlements = {
  planId: string;
  limits: {
    [key: string]: number;
  };
  limitOverrideActive: boolean;
  planOverrideExpired: boolean;
  graceEndsAt: string | null;
  droppedForNonPayment: boolean;
};
export type GetShopSubscriptionResultDto = {
  subscription: ShopSubscription;
  plan: Plan | null;
  entitlements: Entitlements;
};
export type SubscriptionChangeResultDto =
  | {
      kind: "checkout";
      url: string;
    }
  | {
      kind: "applied";
      planId: string;
    }
  | {
      kind: "scheduled";
      planId: string;
      effectiveAt: string;
    };
export type LimitOverrideResultDto = {
  subscription: ShopSubscription;
};
export type SetLimitOverrideRequestDto = {
  limits: {
    key: string;
    value: number;
  }[];
  reason: string;
  expiresAt?: string | null;
};
export type OverrideShopSubscriptionResultDto = {
  subscription: ShopSubscription;
};
export type OverrideShopSubscriptionRequestDto = {
  planId: string;
  overrideReason: string;
  overrideExpiresAt?: string | null;
};
export type ResumeShopSubscriptionResultDto = {
  id: string;
  shopId: string;
  planId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
};
export type ShopUsageDto = {
  shopId: string;
  periodKey: string;
  acceptedOrderCount: number;
  lastReconciled: string | null;
  updatedAt: string;
};
export type RejectionFlag = "high_rate" | "spike_near_limit";
export type RejectionStats = {
  windowDays: number;
  accepted: number;
  rejectedByRestaurant: number;
  rate: number | null;
  recentRejections: number;
  flags: RejectionFlag[];
};
export type GetShopUsageResultDto = {
  usage: ShopUsageDto;
  ordersPerMonthLimit: number | null;
  orderLimit: OrderLimitStatus;
  rejections: RejectionStats;
};
export type ReconcileShopUsageResultDto = {
  usage: ShopUsageDto;
  reconciledCount: number;
};
export type GetMyShopsResultDto = {
  shops: ShopSummaryDto[];
  total: number;
};
export type PublicShopBrandingDto = {
  logoUrl: string | null;
  heroImageUrl: string | null;
  accentColor: string | null;
  showHero: boolean;
};
export type PublicShopSummaryDto = {
  id: string;
  slug: string;
  name: string;
  address: {
    city: string | null;
    postcode: string | null;
  };
  branding: PublicShopBrandingDto | null;
  openingHours: {
    mon?: {
      open: string;
      close: string;
    }[];
    tue?: {
      open: string;
      close: string;
    }[];
    wed?: {
      open: string;
      close: string;
    }[];
    thu?: {
      open: string;
      close: string;
    }[];
    fri?: {
      open: string;
      close: string;
    }[];
    sat?: {
      open: string;
      close: string;
    }[];
    sun?: {
      open: string;
      close: string;
    }[];
  };
  timezone: string;
  ordersPaused: boolean;
};
export type GetPublicShopsResultDto = {
  shops: PublicShopSummaryDto[];
};
export type GetShopBySlugResultDto = {
  id: string;
  slug: string;
  name: string;
  isDeleted: boolean;
  isPaused: boolean;
  pausedMessage?: string;
  ordersPaused: boolean;
  ordersPausedUntil: string | null;
  ordersPausedMessage?: string;
  isOffline: boolean;
  orderAcceptanceMode: string;
  currency: string;
  timezone: string;
  minOrderAmountCents: number;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  phone: string | null;
  openingHours: {
    mon: {
      open: string;
      close: string;
    }[];
    tue: {
      open: string;
      close: string;
    }[];
    wed: {
      open: string;
      close: string;
    }[];
    thu: {
      open: string;
      close: string;
    }[];
    fri: {
      open: string;
      close: string;
    }[];
    sat: {
      open: string;
      close: string;
    }[];
    sun: {
      open: string;
      close: string;
    }[];
  };
  closures: {
    id: string;
    start: string;
    end: string;
    reason?: string;
  }[];
  branding: ShopBranding | null;
  countryCode: string;
  fulfilment: {
    modes: FulfilmentMode[];
    prepMinutes: {
      collection: number;
      delivery: number;
      dine_in: number;
    };
    delivery: {
      zones: DeliveryZone[];
      hours: WeeklyHours | null;
    } | null;
  };
  orderLimitReached: boolean;
  createdAt: string;
  updatedAt: string;
};
export type ImpressumLine = {
  label: string;
  value: string;
};
export type PrivacyNotice = {
  templateVersion: string;
  isDraft: boolean;
  sections: LegalSection[];
};
export type PublicLegalPackDto = {
  slug: string;
  shopName: string;
  language: MenuLanguage;
  impressum: {
    lines: ImpressumLine[];
  } | null;
  terms: LegalTextDto | null;
  withdrawal: LegalTextDto | null;
  privacyNotice: PrivacyNotice | null;
  seller: {
    legalName: string;
    phone: string | null;
  };
  platform: {
    name: string;
    salesSiteUrl: string | null;
  };
};
export type StaffLoginResultDto = {
  token: string;
  expiresAt: string;
  shopId: string;
  shopSlug: string;
  staffId: string;
  username: string;
  role: StaffRole;
};
export type StaffLoginRequestDto = {
  shopSlug: string;
  username: string;
  password: string;
};
export type RejectionWatchRowDto = {
  shopId: string;
  name: string;
  slug: string;
  orderLimit: OrderLimitStatus;
  rejections: RejectionStats;
};
export type RejectionWatchDto = {
  shops: RejectionWatchRowDto[];
};
export type SystemRole = "user" | "superadmin";
export type GetMeResultDto = {
  id: string;
  email?: string;
  name?: string;
  systemRole: SystemRole;
  createdAt: string;
  updatedAt: string;
};
export type HandleCheckoutSessionCompletedInput = {
  shopId: string;
  planId: string;
  billingInterval: "monthly" | "yearly";
  billingSubscriptionId: string;
  billingCustomerId: string;
};
export const {
  useCancelCustomerOrderMutation,
  useViewCustomerDocumentMutation,
  useViewCustomerOrderMutation,
  useGetDpaDocumentQuery,
  useLazyGetDpaDocumentQuery,
  useGetPlatformLegalQuery,
  useLazyGetPlatformLegalQuery,
  useCreateOrderMutation,
  useGetOrderByPaymentIntentQuery,
  useLazyGetOrderByPaymentIntentQuery,
  useQuoteBasketMutation,
  useGetOwnerOverviewQuery,
  useLazyGetOwnerOverviewQuery,
  useCreatePlanMutation,
  useGetPlansQuery,
  useLazyGetPlansQuery,
  useGetPlanQuery,
  useLazyGetPlanQuery,
  useUpdatePlanMutation,
  useGetPlanPricingQuery,
  useLazyGetPlanPricingQuery,
  useSetPlanPricingMutation,
  useGetSystemConfigQuery,
  useLazyGetSystemConfigQuery,
  useUpdateSystemConfigMutation,
  useGetPlatformLegalIdentityQuery,
  useLazyGetPlatformLegalIdentityQuery,
  useUpdatePlatformLegalIdentityMutation,
  useUpdateReferenceListsMutation,
  useGetRolePermissionsQuery,
  useLazyGetRolePermissionsQuery,
  useUpdateRolePermissionsMutation,
  useUpdateUserLimitsMutation,
  useCreateProductMutation,
  useGetProductsByShopQuery,
  useLazyGetProductsByShopQuery,
  useDeleteProductMutation,
  useGetProductByIdQuery,
  useLazyGetProductByIdQuery,
  useUpdateProductMutation,
  useGetReferenceListsQuery,
  useLazyGetReferenceListsQuery,
  useCreateShopMutation,
  useGetShopsQuery,
  useLazyGetShopsQuery,
  useDeleteShopMutation,
  useGetShopByIdQuery,
  useLazyGetShopByIdQuery,
  useUpdateShopMutation,
  useGetAuditEntriesQuery,
  useLazyGetAuditEntriesQuery,
  useSetBusyModeMutation,
  useGetCatalogQuery,
  useLazyGetCatalogQuery,
  useCreateCategoryMutation,
  useGetCategoriesByShopQuery,
  useLazyGetCategoriesByShopQuery,
  useDeleteCategoryMutation,
  useGetCategoryByIdQuery,
  useLazyGetCategoryByIdQuery,
  useUpdateCategoryMutation,
  useApplyCategoryTaxClassMutation,
  useCreateComboMutation,
  useGetCombosQuery,
  useLazyGetCombosQuery,
  useUpdateComboMutation,
  useRemoveShopCoverImageMutation,
  useSetShopCoverImageMutation,
  useGenerateShopCoverImageUploadUrlMutation,
  useEraseCustomerMutation,
  useExportShopDataQuery,
  useLazyExportShopDataQuery,
  useCreateDiscountCodeMutation,
  useSetDiscountCodeActiveMutation,
  useAcceptDpaMutation,
  useGetGoLiveStatusQuery,
  useLazyGetGoLiveStatusQuery,
  useGetShopLegalQuery,
  useLazyGetShopLegalQuery,
  useUpdateShopLegalMutation,
  useSetShopLogoMutation,
  useGenerateShopLogoUploadUrlMutation,
  useUpdateLoyaltyMutation,
  useSetMissedOrdersPauseLimitMutation,
  useRejectShopNameChangeMutation,
  useRequestShopNameChangeMutation,
  useApproveShopNameChangeMutation,
  useGetOrderLimitQuery,
  useLazyGetOrderLimitQuery,
  useGetOrderQueueQuery,
  useLazyGetOrderQueueQuery,
  useUpdateOrderSettingsMutation,
  useGetOrdersByShopQuery,
  useLazyGetOrdersByShopQuery,
  useAcceptOrderMutation,
  useCompleteOrderMutation,
  useDispatchOrderMutation,
  useGetOrderDocumentQuery,
  useLazyGetOrderDocumentQuery,
  useMarkOrderReadyMutation,
  useRefundOrderMutation,
  useRejectOrderMutation,
  useAddProductImageMutation,
  useGenerateUploadUrlMutation,
  useGetPromotionsQuery,
  useLazyGetPromotionsQuery,
  useGetSalesReportQuery,
  useLazyGetSalesReportQuery,
  useRestoreShopMutation,
  useCreateStaffMutation,
  useListStaffQuery,
  useLazyListStaffQuery,
  useDeleteStaffMutation,
  useUpdateStaffMutation,
  useResetStaffPasswordMutation,
  useDisconnectStripeAccountMutation,
  useCreateStripeAccountSessionMutation,
  useCancelShopSubscriptionMutation,
  useGetShopSubscriptionQuery,
  useLazyGetShopSubscriptionQuery,
  useCreateSubscriptionCheckoutMutation,
  useConfirmSubscriptionCheckoutMutation,
  useClearLimitOverrideMutation,
  useSetLimitOverrideMutation,
  useOverrideShopSubscriptionMutation,
  useCreateBillingPortalSessionMutation,
  useResumeShopSubscriptionMutation,
  useRetrySubscriptionPaymentMutation,
  useCancelScheduledChangeMutation,
  useSetShopOfflineBySuperadminMutation,
  useGetShopUsageQuery,
  useLazyGetShopUsageQuery,
  useReconcileShopUsageMutation,
  useGetMyShopsQuery,
  useLazyGetMyShopsQuery,
  useListPublicShopsQuery,
  useLazyListPublicShopsQuery,
  useGetShopBySlugQuery,
  useLazyGetShopBySlugQuery,
  useGetPublicLegalPackQuery,
  useLazyGetPublicLegalPackQuery,
  useStaffLoginMutation,
  useGetRejectionWatchQuery,
  useLazyGetRejectionWatchQuery,
  useGetMeQuery,
  useLazyGetMeQuery,
  useStripeWebhookMutation,
  useStripeConnectWebhookMutation,
} = injectedRtkApi;
