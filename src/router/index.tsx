/* eslint-disable react-refresh/only-export-components -- router config, not a fast-refresh boundary */
import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ShopLayout } from '../components/layout/ShopLayout';
import { ShopIndexRedirect } from '../components/layout/ShopIndexRedirect';
import { RequireAuth } from '../components/auth/RequireAuth';
import { RouteErrorPage } from '../pages/RouteErrorPage';
import { MySpinner } from '../components/ui/MySpinner';

// Route-level code splitting: each page is its own chunk.
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ShopsPage = lazy(() => import('../pages/ShopsPage').then((m) => ({ default: m.ShopsPage })));
const ShopSettingsPage = lazy(() => import('../pages/ShopSettingsPage').then((m) => ({ default: m.ShopSettingsPage })));
const CategoriesPage = lazy(() => import('../pages/CategoriesPage').then((m) => ({ default: m.CategoriesPage })));
const EditCategoryPage = lazy(() => import('../pages/EditCategoryPage').then((m) => ({ default: m.EditCategoryPage })));
const TablesPage = lazy(() => import('../pages/TablesPage').then((m) => ({ default: m.TablesPage })));
const PromotionsPage = lazy(() => import('../pages/PromotionsPage').then((m) => ({ default: m.PromotionsPage })));
const ProductsPage = lazy(() => import('../pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const OptionGroupsPage = lazy(() => import('../pages/OptionGroupsPage').then((m) => ({ default: m.OptionGroupsPage })));
const CombosPage = lazy(() => import('../pages/CombosPage').then((m) => ({ default: m.CombosPage })));
const OrdersPage = lazy(() => import('../pages/OrdersPage').then((m) => ({ default: m.OrdersPage })));
const ReportsPage = lazy(() => import('../pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const PhoneHomePage = lazy(() => import('../pages/PhoneHomePage').then((m) => ({ default: m.PhoneHomePage })));
const PhoneOrdersPage = lazy(() => import('../pages/PhoneOrdersPage').then((m) => ({ default: m.PhoneOrdersPage })));
const SubscriptionPage = lazy(() => import('../pages/SubscriptionPage').then((m) => ({ default: m.SubscriptionPage })));
const ActivityPage = lazy(() => import('../pages/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const LegalPage = lazy(() => import('../pages/LegalPage').then((m) => ({ default: m.LegalPage })));
const StaffPage = lazy(() => import('../pages/StaffPage').then((m) => ({ default: m.StaffPage })));
const StaffLoginPage = lazy(() => import('../pages/StaffLoginPage').then((m) => ({ default: m.StaffLoginPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Suspense sits inside the layouts, so the shell stays visible while a page chunk loads.
function Lazy({ page: Page }: { page: ComponentType }) {
  return (
    <Suspense fallback={<MySpinner />}>
      <Page />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  { path: '/login', element: <Lazy page={LoginPage} />, errorElement: <RouteErrorPage /> },
  { path: '/:slug/staff', element: <Lazy page={StaffLoginPage} /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/phone', element: <Lazy page={PhoneHomePage} /> },
      { path: '/shops/:shopId/phone', element: <Lazy page={PhoneOrdersPage} /> },
      {
        element: <Layout />,
        children: [
          { path: '/', element: <Navigate to="/shops" replace /> },
          { path: '/shops', element: <Lazy page={ShopsPage} /> },
          {
            path: '/shops/:shopId',
            element: <ShopLayout />,
            children: [
              { index: true, element: <ShopIndexRedirect /> },
              { path: 'products', element: <Lazy page={ProductsPage} /> },
              { path: 'combos', element: <Lazy page={CombosPage} /> },
              { path: 'option-groups', element: <Lazy page={OptionGroupsPage} /> },
              { path: 'orders', element: <Lazy page={OrdersPage} /> },
              { path: 'reports', element: <Lazy page={ReportsPage} /> },
              { path: 'categories', element: <Lazy page={CategoriesPage} /> },
              { path: 'tables', element: <Lazy page={TablesPage} /> },
              { path: 'promotions', element: <Lazy page={PromotionsPage} /> },
              { path: 'subscription', element: <Lazy page={SubscriptionPage} /> },
              { path: 'settings', element: <Lazy page={ShopSettingsPage} /> },
              { path: 'legal', element: <Lazy page={LegalPage} /> },
              { path: 'staff', element: <Lazy page={StaffPage} /> },
              { path: 'activity', element: <Lazy page={ActivityPage} /> },
              { path: '*', element: <Lazy page={NotFoundPage} /> },
            ],
          },
          { path: '/shops/:shopId/categories/:categoryId/edit', element: <Lazy page={EditCategoryPage} /> },
          { path: '*', element: <Lazy page={NotFoundPage} /> },
        ],
      },
    ],
  },
]);
