import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BuyerDashboard from './components/BuyerDashboard';

const BuyerApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<BuyerDashboard />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default BuyerApp;
