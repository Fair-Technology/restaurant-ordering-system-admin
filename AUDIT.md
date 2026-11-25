# Pending-spinner audit (t_63c82dee)

Scope: every `use*Mutation(`, `useLazy*Query(`, `.unwrap()`, `refetch(`, `fetch(`, `onDragEnd` under `src/` (generated `src/services/api.ts` excluded).
"Spinner today" = state of `main` before this change. Pending style everywhere is the existing `PendingButton` / `isPending` / `MySpinner`.
Enforced from now on by the scan in `src/components/ui/pendingControls.test.ts`.

| file | control | mutation/query used | spinner today (yes/no) | fix applied |
|---|---|---|---|---|
| src/components/layout/AccountSettingsModal.tsx | language chips (en/de) | useUpdateMyLanguageMutation | no (fire-and-forget) | chips are `PendingButton` (`isPending`), `.unwrap()` + error toast |
| src/components/layout/AccountSettingsModal.tsx | sign out | msal `logoutRedirect` (network redirect) | no | `PendingButton` with local `signingOut`, cleared + toast on failure |
| src/components/layout/AutoPausedBanner.tsx | resume orders | useUpdateShopMutation | yes | none |
| src/components/layout/Sidebar.tsx | taking-orders switch | useUpdateShopMutation | yes | none |
| src/components/layout/Sidebar.tsx, Layout.tsx, FloatingActionButton.tsx, ShopLayout.tsx | nav, drawers, FAB, redirects | none (local state / navigate) | n/a, local | none, stays spinner-free |
| src/features/auth/AccountLanguageSync.tsx | auto-save language after sign-in | useUpdateMyLanguageMutation | n/a, not a click | exempt (reason in test) |
| src/features/menu/useSetAvailable.ts | dish availability (hook) | useUpdateProductAvailabilityMutation | yes (per-dish `isPending(id)`, rendered by ProductsPage switch) | none, hook exempt |
| src/features/menu/useUploadProductImage.ts | dish photo upload (hook) | useGenerateUploadUrlMutation, useAddProductImageMutation, fetch(PUT) | yes (DishEditor `isUploading` on save button) | none, hook exempt |
| src/features/orders/useOrderActions.ts | accept / reject / ready / dispatch / complete (hook) | useAccept/Reject/MarkReady/Dispatch/CompleteOrderMutation | yes (`isWorking(orderId)` to `PendingButton`) | none, hook exempt |
| src/pages/OrdersPage.tsx (also phone view via PhoneOrdersPage) | accept, next step, busy-mode chip, sound enable | useSetBusyModeMutation + actions hook | yes | none |
| src/pages/PhoneOrdersPage.tsx, PhoneHomePage.tsx | wraps OrdersPage; shop list | useGetMyShopsQuery (MySpinner) | yes | none |
| src/components/orders/OrderDetail.tsx | accept, reject confirm, next step | actions hook | yes | none |
| src/components/orders/OrderDetail.tsx | document download links | useLazyGetOrderDocumentQuery | **no** | `PendingButton` + `downloadingId`, cleared in `finally` |
| src/components/orders/OrderHistoryList.tsx | document download | useLazyGetOrderDocumentQuery | yes | none |
| src/components/orders/RefundPanel.tsx | confirm refund | useRefundOrderMutation | yes | none |
| src/components/orders/ReceiptsArchiveButton.tsx | receipts archive | useLazyGetInvoiceArchiveQuery | yes | none |
| src/pages/CategoriesPage.tsx | drag-reorder categories (saves on drop) | useUpdateCategoryMutation x N | **no** | `savingOrder`: handle spins, drag disabled and re-drop ignored until saved |
| src/pages/CategoriesPage.tsx | row icon picker | useUpdateCategoryMutation | **no** | `savingIcon`: dimmed + spinner, picker inert while saving |
| src/pages/CategoriesPage.tsx | row visibility switch, create category | useUpdateCategoryMutation, useCreateCategoryMutation | yes | none |
| src/pages/ProductsPage.tsx | drag-reorder dishes in a category | useSetCategoryDishOrderMutation | **no** | `savingOrderIds`: that category's handles spin, drag disabled, re-drop ignored |
| src/pages/ProductsPage.tsx | availability switch, create product wizard | useUpdateProductAvailabilityMutation (via hook), useCreateProductMutation | yes | none |
| src/pages/ProductsPage.tsx (BulkImportModal) | import products | useCreateProductMutation per row | yes (importing step shows progress panel) | none |
| src/pages/ReportsPage.tsx | retry report | `refetch()` | **no** | `isPending={isFetching}` |
| src/pages/ReportsPage.tsx | CSV download | none (formats loaded report) | n/a, instant | none |
| src/pages/OptionGroupsPage.tsx | save group, delete group, option switch, retry | create/update/delete group, setOptionAvailability, `refetch` | yes | none (no drag reorder exists on main) |
| src/components/menu/DishEditor.tsx | save dish (incl. photo upload), delete dish | useUpdateProductMutation, useDeleteProductMutation | yes | none. DishForm.tsx, DishPhotoField.tsx (no API), OptionGroupDialog.tsx are not on `main` yet |
| src/components/menu/ScheduleOfferModal.tsx | save schedule | useUpdateProductMutation | yes | none |
| src/components/ui/ImageCropDialog.tsx | crop save | none itself (caller uploads) | yes | none |
| src/components/categories/CategoryEditor.tsx | tax class, save, delete | update/delete/applyTaxClass mutations | yes | none |
| src/components/combos/ComboEditor.tsx, src/pages/CombosPage.tsx | save combo, active toggle, delete | create/update combo, useDeleteProductMutation | yes | none |
| src/components/shop/AutoAcceptCard, DeliveryCard, DineInCard, KitchenTimingCard, OrderAlertsCard, ScheduledOrdersCard | save settings | useUpdateOrderSettingsMutation | yes | none |
| src/components/shop/ClosuresCard.tsx | save closures | useUpdateShopMutation | yes | none |
| src/components/shop/ShopStatusCard.tsx, GoLiveModal.tsx, PauseOrdersDialog.tsx, DeleteShopCard.tsx | online/paused switches, go live, pause, delete | useUpdateShopMutation, useLazyGetGoLiveStatusQuery, useDeleteShopMutation | yes | none |
| src/components/shop/PaymentsCard.tsx | disconnect Stripe; status sync | useDisconnectStripeAccountMutation, useLazyGetGoLiveStatusQuery | yes (disconnect). Sync runs after the modal closes or on a timer, no control left | none |
| src/components/shop/StripeOnboardingModal.tsx | Stripe Connect form | useCreateStripeAccountSessionMutation (Stripe SDK calls it) | n/a, Stripe draws its own loading UI | exempt (reason in test) |
| src/components/promotions/DiscountCodesCard.tsx, LoyaltyCard.tsx | create/toggle code, save loyalty | discount code + loyalty mutations | yes | none |
| src/pages/ShopSettingsPage.tsx | name change, details, address, logo/banner/cover upload+remove, colours, languages, hours | many mutations + `fetch` PUT to blob + `refetch` | yes | none |
| src/pages/ShopsPage.tsx | create shop, online/paused switch, slug check | useCreateShopMutation, useUpdateShopMutation, useLazyCheckSlugAvailabilityQuery (debounced typing, not a click) | yes | none |
| src/pages/StaffPage.tsx | add, (de)activate, delete, reset password | staff mutations | yes | none |
| src/pages/StaffLoginPage.tsx | staff sign in (+ language save after login) | useStaffLoginMutation, useUpdateMyStaffLanguageMutation | yes (sign-in button; language save is automatic) | none |
| src/pages/SubscriptionPage.tsx | plan CTAs, keep plan, update card, pay now, resume | subscription mutations | yes | none |
| src/pages/LegalPage.tsx | accept DPA, save impressum/legal, export, erase | legal mutations, useLazyGetShopDataExportQuery | yes | none |
| src/pages/TablesPage.tsx | download all / per-table PNG+PDF | local rendering (+ shop data) | yes | none |
| src/pages/DashboardPage.tsx | refresh (two layouts) | `refetch()` | yes | none |
| src/pages/ProductWizardSteps.tsx | create category inline | useCreateCategoryMutation | yes | none |
| src/features/menu/productImage.ts | PUT image to blob (helper) | fetch | n/a, helper; callers covered above | none |
| src/pages/ActivityPage.tsx, PromotionsPage.tsx, EditCategoryPage.tsx, LoginPage.tsx, RouteErrorPage.tsx | read-only pages / login redirect | queries only, no click-triggered call | n/a | none |
| src/components/ui/CategoryPicker.tsx, IconPicker.tsx | pickers | none | n/a, local state | none, stays spinner-free |

Known limit of the automatic scan: it is per file, so a file that has one wired control passes even if a second control in it is not wired. The `ASYNC_CONTROLS` minimum counts in the same test still guard the per-control level for known files; for new files, review per control.
