import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PlatformUserDashboard from './components/PlatformUserDashboard';

const PlatformUserApp: React.FC = () => {
  return (
    <Routes>
      <Route path="dashboard" element={<PlatformUserDashboard />} />
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};

export default PlatformUserApp;
