import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './components/Login';
import SupplierRegistration from './components/SupplierRegistration';
import BuyersRegistration from './components/BuyersRegistration';
import { Loader } from '@vosox/shared-ui';

const BuyerApp = React.lazy(() => import('remoteBuyer/BuyerApp'));
const SupplierApp = React.lazy(() => import('remoteSupplier/SupplierApp'));
const PlatformUserApp = React.lazy(() => import('remotePlatformUser/PlatformUserApp'));
const ExternalSupplierBid = React.lazy(() => import('remoteSupplier/ExternalSupplierBid'));

const Protected: React.FC<{
  children: React.ReactNode;
  allowedRoles: Array<'buyer' | 'supplier' | 'platform-user' | 'buyer-admin' | 'buyer-business-user' | 'supplier-admin' | 'supplier-business-user'>
}> = ({
  children,
  allowedRoles,
}) => {
  const { isLoggedIn, userRole } = useAuthStore();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(userRole as any)) {
    if (userRole === 'buyer-admin') {
      return <Navigate to="/platform-user/buyer-admin" replace />;
    } else if (userRole === 'supplier-admin') {
      return <Navigate to="/platform-user/supplier-admin" replace />;
    } else if (userRole === 'buyer-business-user' || userRole === 'buyer') {
      return <Navigate to="/buyer/dashboard" replace />;
    } else if (userRole === 'supplier-business-user' || userRole === 'supplier') {
      return <Navigate to="/supplier/dashboard" replace />;
    } else {
      return <Navigate to="/platform-user" replace />;
    }
  }

  return <>{children}</>;
};

const Shell = () => {
  const { isLoggedIn, userRole, logout } = useAuthStore();
  const { fetchAndSetAuth, setAuth, clearAuth } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  React.useEffect(() => {
    if (isLoggedIn) {
      fetchAndSetAuth();
    } else {
    }
  }, []);

  React.useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      clearAuth();
      navigate('/', { replace: true });
    };
    window.addEventListener('session:expired', handleSessionExpired);
    return () => window.removeEventListener('session:expired', handleSessionExpired);
  }, [logout, clearAuth, navigate]);

  const isAuthPage = location.pathname === '/';
  const isRegistration = location.pathname.includes('/registration');
  const isExternalBid = location.pathname.startsWith('/external-supplier/');

  const getRedirectUrl = () => {
    if (userRole === 'buyer-admin') {
      return '/platform-user/buyer-admin';
    } else if (userRole === 'supplier-admin') {
      return '/platform-user/supplier-admin';
    } else if (userRole === 'buyer-business-user' || userRole === 'buyer') {
      return '/buyer/dashboard';
    } else if (userRole === 'supplier-business-user' || userRole === 'supplier') {
      return '/supplier/dashboard';
    } else {
      return '/platform-user';
    }
  };

  return (
    <div className="app-container">
      <main className={`main-content ${!isLoggedIn || isAuthPage || isRegistration || isExternalBid ? 'no-padding' : ''}`}>
        <React.Suspense fallback={
          <Loader
            fullScreen={true}
            message="Loading modules..."
            theme="light"
            color="#1976d2"
          />
        }>
          <Routes>
            <Route
              path="/"
              element={
                isLoggedIn ? (
                  <Navigate to={getRedirectUrl()} replace />
                ) : (
                  <Login
                    onCreateAccount={() => navigate('/supplier-registration')}
                    onCreateBuyerAccount={() => navigate('/buyer-registration')}
                    onLoginSuccess={(details) => {
  useAuthStore.getState().login(details);
  setAuth({
    buyerId: details.buyerId ?? null,
    supplierId: details.supplierId ?? null,
  });
}}
                  />
                )
              }
            />

            <Route path="/supplier-registration" element={<SupplierRegistration />} />
            <Route path="/buyer-registration" element={<BuyersRegistration />} />

            {/* External Supplier Bid — unauthenticated, reached via a direct invitation link */}
            <Route path="/external-supplier/bid/:rfqId/:sessionToken" element={<ExternalSupplierBid />} />

            {/* Buyer Remote Routes */}
            <Route
              path="/buyer/*"
              element={
                <Protected allowedRoles={['buyer', 'buyer-business-user']}>
                  <BuyerApp />
                </Protected>
              }
            />

            {/* Supplier Remote Routes */}
            <Route
              path="/supplier/*"
              element={
                <Protected allowedRoles={['supplier', 'supplier-business-user']}>
                  <SupplierApp />
                </Protected>
              }
            />

            {/* Platform User Remote Routes - handles all platform admin roles */}
            {/* Includes: platform-user, buyer-admin, supplier-admin, buyer-network-admin, supplier-network-admin */}
            <Route
              path="/platform-user/*"
              element={
                <Protected allowedRoles={['platform-user', 'buyer-admin', 'supplier-admin']}>
                  <PlatformUserApp />
                </Protected>
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={
                <Navigate
                  to={isLoggedIn ? getRedirectUrl() : '/'}
                  replace
                />
              }
            />
          </Routes>
        </React.Suspense>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}