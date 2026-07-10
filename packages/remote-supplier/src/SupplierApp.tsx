import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import SupplierDashboard from './components/SupplierDashboard';
import SupplierOnboardingForm from './components/Supplieronboardingform';
import type { Step1Data } from './components/Step1businessinfo';
import type { Step2Data } from './components/Step2registrations';

const readIsProfileComplete = (): boolean => {
  return sessionStorage.getItem('vosox_profile_complete') === 'true';
};

const OnboardingRoute: React.FC = () => {
  const navigate = useNavigate();

  const handleOnboardingComplete = async (_data: { step1: Step1Data; step2: Step2Data }) => {
    sessionStorage.setItem('vosox_profile_complete', 'true');
    navigate('dashboard', { replace: true });  // RELATIVE path
  };

  return <SupplierOnboardingForm onComplete={handleOnboardingComplete} />;
};

const SupplierApp: React.FC = () => {
  const [profileComplete, setProfileComplete] = useState<boolean | null>(null);

  useEffect(() => {
    const isComplete = readIsProfileComplete();
    setProfileComplete(isComplete);
  }, []);

  if (profileComplete === null) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ color: '#6c757d', fontSize: '14px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <Routes>
      {/* RELATIVE paths - because this is mounted under /supplier/* */}
      <Route path="onboarding" element={<OnboardingRoute />} />
      <Route
        path="dashboard"
        element={profileComplete ? <SupplierDashboard /> : <Navigate to="onboarding" replace />}
      />
      <Route path="*" element={<Navigate to={profileComplete ? 'dashboard' : 'onboarding'} replace />} />
    </Routes>
  );
};

export default SupplierApp;