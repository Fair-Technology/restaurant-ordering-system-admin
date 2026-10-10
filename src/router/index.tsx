import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ShopLayout } from '../components/layout/ShopLayout';
import { RequireAuth } from '../components/auth/RequireAuth';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { ShopsPage } from '../pages/ShopsPage';
import { ShopSettingsPage } from '../pages/ShopSettingsPage';
import { CategoriesPage } from '../pages/CategoriesPage';
import { EditCategoryPage } from '../pages/EditCategoryPage';
import { TablesPage } from '../pages/TablesPage';
import { PromotionsPage } from '../pages/PromotionsPage';
import { ProductsPage } from '../pages/ProductsPage';
import { CombosPage } from '../pages/CombosPage';
import { OrdersPage } from '../pages/OrdersPage';
import { ReportsPage } from '../pages/ReportsPage';
import { PhoneHomePage } from '../pages/PhoneHomePage';
import { PhoneOrdersPage } from '../pages/PhoneOrdersPage';
import { SubscriptionPage } from '../pages/SubscriptionPage';
import { ActivityPage } from '../pages/ActivityPage';
import { LegalPage } from '../pages/LegalPage';
import { StaffPage } from '../pages/StaffPage';
import { StaffLoginPage } from '../pages/StaffLoginPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { RouteErrorPage } from '../pages/RouteErrorPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage />, errorElement: <RouteErrorPage /> },
  { path: '/:slug/staff', element: <StaffLoginPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/phone', element: <PhoneHomePage /> },
      { path: '/shops/:shopId/phone', element: <PhoneOrdersPage /> },
      {
        element: <Layout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/shops', element: <ShopsPage /> },
          {
            path: '/shops/:shopId',
            element: <ShopLayout />,
            children: [
              { index: true, element: <ProductsPage /> },
              { path: 'combos', element: <CombosPage /> },
              { path: 'orders', element: <OrdersPage /> },
              { path: 'reports', element: <ReportsPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'tables', element: <TablesPage /> },
              { path: 'promotions', element: <PromotionsPage /> },
              { path: 'subscription', element: <SubscriptionPage /> },
              { path: 'settings', element: <ShopSettingsPage /> },
              { path: 'legal', element: <LegalPage /> },
              { path: 'staff', element: <StaffPage /> },
              { path: 'activity', element: <ActivityPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
          { path: '/shops/:shopId/categories/:categoryId/edit', element: <EditCategoryPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
