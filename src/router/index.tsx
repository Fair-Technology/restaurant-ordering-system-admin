import { createBrowserRouter } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { ShopLayout } from '../components/layout/ShopLayout';
import { ShopIndexRedirect } from '../components/layout/ShopIndexRedirect';
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
import { OptionGroupsPage } from '../pages/OptionGroupsPage';
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
  { path: '/login', element: <LoginPage />, handle: { titleKey: 'auth.adminPortal' }, errorElement: <RouteErrorPage /> },
  { path: '/:slug/staff', element: <StaffLoginPage />, handle: { titleKey: 'staffLogin.title' } },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      { path: '/phone', element: <PhoneHomePage /> },
      { path: '/shops/:shopId/phone', element: <PhoneOrdersPage /> },
      {
        element: <Layout />,
        children: [
          { path: '/', element: <DashboardPage />, handle: { titleKey: 'nav.dashboard' } },
          { path: '/shops', element: <ShopsPage />, handle: { titleKey: 'nav.shops' } },
          {
            path: '/shops/:shopId',
            element: <ShopLayout />,
            children: [
              { index: true, element: <ShopIndexRedirect /> },
              { path: 'products', element: <ProductsPage />, handle: { titleKey: 'nav.dishes' } },
              { path: 'combos', element: <CombosPage />, handle: { titleKey: 'nav.combos' } },
              { path: 'option-groups', element: <OptionGroupsPage />, handle: { titleKey: 'nav.optionGroups' } },
              { path: 'orders', element: <OrdersPage />, handle: { titleKey: 'nav.orders' } },
              { path: 'reports', element: <ReportsPage />, handle: { titleKey: 'nav.reports' } },
              { path: 'categories', element: <CategoriesPage />, handle: { titleKey: 'nav.categories' } },
              { path: 'tables', element: <TablesPage />, handle: { titleKey: 'nav.tables' } },
              { path: 'promotions', element: <PromotionsPage />, handle: { titleKey: 'nav.promotions' } },
              { path: 'subscription', element: <SubscriptionPage />, handle: { titleKey: 'nav.subscription' } },
              { path: 'settings', element: <ShopSettingsPage />, handle: { titleKey: 'nav.settings' } },
              { path: 'legal', element: <LegalPage />, handle: { titleKey: 'nav.legal' } },
              { path: 'staff', element: <StaffPage />, handle: { titleKey: 'nav.staff' } },
              { path: 'activity', element: <ActivityPage />, handle: { titleKey: 'nav.activity' } },
              { path: '*', element: <NotFoundPage />, handle: { titleKey: 'notFound.title' } },
            ],
          },
          { path: '/shops/:shopId/categories/:categoryId/edit', element: <EditCategoryPage />, handle: { titleKey: 'nav.categories' } },
          { path: '*', element: <NotFoundPage />, handle: { titleKey: 'notFound.title' } },
        ],
      },
    ],
  },
]);
