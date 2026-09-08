import React from 'react';
import { Navigate } from 'react-router-dom';
import { useNetworkAdminAuthStore } from '../store/useAuthStore';
import type { UserRole } from '../types';

const ROLE_HOME_ROUTE: Record<UserRole, string> = {
  BUYER_NETWORK_ADMIN: '/platform-user/network-admin',
  SUPPLIER_NETWORK_ADMIN: '/platform-user/network-admin',
  BUYER_ADMINISTRATOR: '/platform-user/buyer-admin',
  SUPPLIER_ADMINISTRATOR: '/platform-user/supplier-admin',
  BUYER_USER: '/buyer/dashboard',
  SUPPLIER_USER: '/supplier/dashboard',
  PLATFORM_ADMINISTRATOR: '/platform-user/dashboard',
};

interface RoleProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ allowedRoles, children }) => {
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);

  if (!currentUser) {
    return <Navigate to="/platform-user/dashboard" replace />;
  }

  if (!allowedRoles.includes(currentUser.userRole)) {
    return <Navigate to={ROLE_HOME_ROUTE[currentUser.userRole] || '/platform-user/dashboard'} replace />;
  }

  return <>{children}</>;
};

export default RoleProtectedRoute;
