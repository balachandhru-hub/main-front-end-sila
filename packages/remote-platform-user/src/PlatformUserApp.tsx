import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useNetworkAdminAuthStore } from './store/useAuthStore';
import PlatformUserDashboard from './components/PlatformUserDashboard';
import Department from './components/departmentbuyer';
import DepartmentCostList from './components/DepartmentCostList';
import  NetworkAdminDashboard  from './components/NetworkAdminDashboard/NetworkAdminDashboard';

const NETWORK_ADMIN_ROLES = ['BUYER_NETWORK_ADMIN', 'SUPPLIER_NETWORK_ADMIN'];

const PlatformUserApp: React.FC = () => {
  const initializeFromSession = useNetworkAdminAuthStore((state) => state.initializeFromSession);
  const currentUser = useNetworkAdminAuthStore((state) => state.currentUser);
  const isLoading = useNetworkAdminAuthStore((state) => state.isLoading);

  useEffect(() => {
    initializeFromSession();
  }, [initializeFromSession]);
  if (isLoading) return null; 

  const isNetworkAdmin = currentUser ? NETWORK_ADMIN_ROLES.includes(currentUser.userRole) : false;
  const defaultRoute = isNetworkAdmin ? 'network-admin' : 'dashboard';

  return (
    <Routes>
      <Route path="dashboard" element={<PlatformUserDashboard />} />
      <Route path="settings" element={<Department />} />
      <Route path="departmentcostlist" element={<DepartmentCostList />} />

      <Route path="network-admin" element={<NetworkAdminDashboard />} />
      <Route path="network-admin/*" element={<NetworkAdminDashboard />} />
      <Route path="*" element={<Navigate to={defaultRoute} replace />} />
    </Routes>
  );
};

export default PlatformUserApp;