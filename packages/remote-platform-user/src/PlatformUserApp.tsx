import React from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../host-app/src/store/useAuthStore';
import PlatformUserDashboard from './components/PlatformUserDashboard';
import Department from './components/departmentbuyer';
import DepartmentCostList from './components/DepartmentCostList';
import ItemMaster from './components/ItemMaster';
import UserAdmin from './UserAdmin'; 

const PlatformUserApp: React.FC = () => {
  const { userRole } = useAuthStore(); 
  const [searchParams] = useSearchParams(); 
  const view = searchParams.get('view'); 

  // ✅ Show UserAdmin for both buyer-admin and supplier-admin
  if (userRole === 'buyer-admin' && view === 'admin') {
    return <UserAdmin />;
  }

  if (userRole === 'supplier-admin' && view === 'supplier-admin') {
    return <UserAdmin />;
  }

  // ✅ Default to UserAdmin for buyer-admin and supplier-admin
  if (userRole === 'buyer-admin') {
    return <UserAdmin />;
  }

  if (userRole === 'supplier-admin') {
    return <UserAdmin />;
  }

  // ✅ Platform user routes
  return (
    <Routes>
      <Route path="dashboard" element={<PlatformUserDashboard />} />
      <Route path="settings" element={<Department />} />
      <Route path="departmentcostlist" element={<DepartmentCostList />} />
      <Route path="itemmaster" element={<ItemMaster />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default PlatformUserApp;