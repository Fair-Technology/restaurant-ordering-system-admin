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
import { ProductsPage } from '../pages/ProductsPage';
import { OrdersPage } from '../pages/OrdersPage';
import { SubscriptionPage } from '../pages/SubscriptionPage';
import { ActivityPage } from '../pages/ActivityPage';
import { StaffPage } from '../pages/StaffPage';
import { StaffLoginPage } from '../pages/StaffLoginPage';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/:slug/staff', element: <StaffLoginPage /> },
  {
    element: <RequireAuth />,
    children: [
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
              { path: 'orders', element: <OrdersPage /> },
              { path: 'categories', element: <CategoriesPage /> },
              { path: 'subscription', element: <SubscriptionPage /> },
              { path: 'settings', element: <ShopSettingsPage /> },
              { path: 'staff', element: <StaffPage /> },
              { path: 'activity', element: <ActivityPage /> },
            ],
          },
          { path: '/shops/:shopId/categories/:categoryId/edit', element: <EditCategoryPage /> },
        ],
      },
    ],
  },
]);
