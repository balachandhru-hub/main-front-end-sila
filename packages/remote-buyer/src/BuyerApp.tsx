import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from '@vosox/shared-ui';
import BuyerDashboard from './components/BuyerDashboard';
import BuyerProfilePage from './pages/BuyerProfilePage';
import { useBuyerAuthStore } from './store/useBuyerAuthStore';

const BuyerApp: React.FC = () => {
  const fetchPersonDetail = useBuyerAuthStore((state) => state.fetchPersonDetail);

  // BuyerApp only mounts once per authenticated session (the host shell
  // unmounts it on logout and remounts a fresh instance on login), and once on
  // a full page reload - so this single call covers both cases.
  useEffect(() => {
    fetchPersonDetail();
  }, [fetchPersonDetail]);

  return (
    <>
      <Routes>
        <Route path="dashboard" element={<BuyerDashboard />} />
        <Route path="profile" element={<BuyerProfilePage />} />
        <Route path="*" element={<Navigate to="/buyer/dashboard" replace />} />
      </Routes>
      <ToastContainer />
    </>
  );
};

export default BuyerApp;