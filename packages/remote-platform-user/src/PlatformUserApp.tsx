import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformUserDashboard from './components/PlatformUserDashboard';
import Department from './components/departmentbuyer';
import DepartmentCostList from './components/DepartmentCostList';
import ItemMaster from './components/ItemMaster';

const PlatformUserApp: React.FC = () => {
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