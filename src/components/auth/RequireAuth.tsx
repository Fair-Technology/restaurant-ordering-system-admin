import { useIsAuthenticated, useMsal } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { readStaffSession } from '../../features/staff/staffSession';

export function RequireAuth() {
  const { inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const { t } = useTranslation();
  // Hooks must be called unconditionally, so useLocation runs even on the
  // Entra path below, which never reads `pathname`.
  const { pathname } = useLocation();

  const staff = readStaffSession();
  if (staff) {
    return pathname.startsWith(`/shops/${staff.shopId}`) ? (
      <Outlet />
    ) : (
      <Navigate to={`/shops/${staff.shopId}/orders`} replace />
    );
  }

  if (inProgress !== InteractionStatus.None) {
    return <div>{t('auth.loading')}</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
