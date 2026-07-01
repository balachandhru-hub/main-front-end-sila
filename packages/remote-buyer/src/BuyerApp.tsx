import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import BuyerDashboard from './components/BuyerDashboard';
import PurchaseOrders from './components/PurchaseOrders';

const BuyerApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<BuyerDashboard />} />
      <Route path="purchase-orders" element={<PurchaseOrders />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default BuyerApp;
