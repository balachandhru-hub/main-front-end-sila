import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SupplierDashboard from './components/SupplierDashboard';
import Quotations from './components/Quotations';

const SupplierApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<SupplierDashboard />} />
      <Route path="quotations" element={<Quotations />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default SupplierApp;
