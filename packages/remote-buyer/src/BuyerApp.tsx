import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BuyerDashboard from './components/BuyerDashboard';
import BuyerProfile from './components/BuyerProfile';

const BuyerApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<BuyerDashboard />} />
      <Route path="profile" element={<BuyerProfile />} />
      <Route path="*" element={<Navigate to="profile" replace />} />
    </Routes>
  );
};

export default BuyerApp;
