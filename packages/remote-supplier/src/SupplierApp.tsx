import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SupplierDashboard from './components/SupplierDashboard';
import Invitations from './components/Invitations';

const SupplierApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<SupplierDashboard />} />
      <Route path="invitations" element={<Invitations />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default SupplierApp;