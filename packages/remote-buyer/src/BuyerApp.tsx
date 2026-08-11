import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BuyerDashboard from './components/BuyerDashboard';
import BuyerProfilePage from './pages/BuyerProfilePage';

const BuyerApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<BuyerDashboard />} />
      <Route path="profile" element={<BuyerProfilePage />} />
      <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
    </Routes>
  );
};

export default BuyerApp;