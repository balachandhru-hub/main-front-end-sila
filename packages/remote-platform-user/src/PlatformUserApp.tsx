import React from 'react';
import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../host-app/src/AuthContext'; 
import PlatformUserDashboard from './components/PlatformUserDashboard';
import Department from './components/departmentbuyer';
import DepartmentCostList from './components/DepartmentCostList';
import ItemMaster from './components/ItemMaster';
import BuyerAdmin from './buyeradmin'; 

const PlatformUserApp: React.FC = () => {
  const { userRole } = useAuth(); 
  const [searchParams] = useSearchParams(); 
  const view = searchParams.get('view'); 


  if (view === 'admin' && userRole === 'buyer-admin') {
    return <BuyerAdmin />;
  }

  if (userRole === 'buyer-admin') {
    return <BuyerAdmin />;
  }

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