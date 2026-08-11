import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SupplierDashboard from './components/SupplierDashboard';
import SupplierProfilePage from './pages/SupplierProfilePage';

const SupplierApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<SupplierDashboard />} />
      <Route path="profile" element={<SupplierProfilePage />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default SupplierApp;