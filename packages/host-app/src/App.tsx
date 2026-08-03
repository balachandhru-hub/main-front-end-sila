import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './components/Login';
import SupplierRegistration from './components/SupplierRegistration';
import BuyersRegistration from './components/BuyersRegistration';
import { Loader, Button } from '@vosox/shared-ui';

// Lazy loading remote apps
const BuyerApp = React.lazy(() => import('remoteBuyer/BuyerApp'));
const SupplierApp = React.lazy(() => import('remoteSupplier/SupplierApp'));
const PlatformUserApp = React.lazy(() => import('remotePlatformUser/PlatformUserApp'));

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
      return <Navigate to="/platform-user?view=admin" replace />;
    } else if (userRole === 'supplier-admin') {
      return <Navigate to="/platform-user?view=supplier-admin" replace />;
    } else if (userRole === 'buyer-business-user' || userRole === 'buyer') {
      return <Navigate to="/buyer" replace />;
    } else if (userRole === 'supplier-business-user' || userRole === 'supplier') {
      return <Navigate to="/supplier" replace />;
    } else {
      return <Navigate to="/platform-user" replace />;
    }
  }

  return <>{children}</>;
};

const Sidebar = () => {
  const { userRole, logout } = useAuthStore();
  const location = useLocation();

  // Helper function to get dashboard link based on role
  const getDashboardLink = () => {
    if (userRole === 'buyer-admin') {
      return '/platform-user?view=admin';
    } else if (userRole === 'buyer-business-user' || userRole === 'buyer') {
      return '/buyer';
    } else if (userRole === 'supplier-admin') {
      return '/platform-user?view=supplier-admin';
    } else if (userRole === 'supplier-business-user' || userRole === 'supplier') {
      return '/supplier';
    } else {
      return '/platform-user';
    }
  };

  // Helper function to get display name
  const getRoleDisplayName = () => {
    const roleNames: Record<string, string> = {
      'buyer': 'Buyer',
      'buyer-admin': 'Buyer Admin',
      'buyer-business-user': 'Buyer User',
      'supplier': 'Supplier',
      'supplier-admin': 'Supplier Admin',
      'supplier-business-user': 'Supplier User',
      'platform-user': 'Platform Admin',
    };
    return roleNames[userRole || ''] || 'User';
  };

  const dashboardLink = getDashboardLink();
  const isActive = 
    (userRole?.includes('buyer') && location.pathname.includes('/buyer')) ||
    (userRole?.includes('supplier') && location.pathname.includes('/supplier')) ||
    (userRole?.includes('platform-user') && location.pathname.includes('/platform-user'));

  return (
    <aside className="sidebar">
      <div className="logo">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--primary-color)' }}
        >
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
        </svg>
        <span>VOSOX</span>
      </div>

      <ul className="nav-links">
        <li>
          <Link
            to={dashboardLink}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            Dashboard
          </Link>
        </li>
      </ul>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center' }}>
            Logged in as {getRoleDisplayName()}
          </div>
          <Button variant="secondary" size="sm" fullWidth={true} onClick={logout}>
            Log Out
          </Button>
        </div>
      </div>
    </aside>
  );
};

const Shell = () => {
  const { isLoggedIn, userRole, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  React.useEffect(() => {
    const handleSessionExpired = () => {
      logout();
      navigate('/', { replace: true });
    };
    window.addEventListener('session:expired', handleSessionExpired);
    return () => window.removeEventListener('session:expired', handleSessionExpired);
  }, [logout, navigate]);

  // ✅ Updated logic for sidebar visibility
  const isOnboarding = location.pathname.includes('/onboarding');
  const isAuthPage = location.pathname === '/';
  const isRegistration = location.pathname.includes('/registration');
  
  // Show sidebar for regular users (not admins or on auth pages)
  const showSidebar = 
    isLoggedIn && 
    !isOnboarding && 
    !isAuthPage && 
    !isRegistration &&
    userRole !== 'buyer-admin' &&
    userRole !== 'supplier-admin' &&
    userRole !== 'platform-user';

  // Helper function to get redirect URL based on role
  const getRedirectUrl = () => {
    if (userRole === 'buyer-admin') {
      return '/platform-user?view=admin';
    } else if (userRole === 'buyer-business-user' || userRole === 'buyer') {
      return '/buyer';
    } else if (userRole === 'supplier-admin') {
      return '/platform-user?view=supplier-admin';
    } else if (userRole === 'supplier-business-user' || userRole === 'supplier') {
      return '/supplier';
    } else {
      return '/platform-user';
    }
  };

  return (
    <div className="app-container">
      {showSidebar && <Sidebar />}
      <main className={`main-content ${!isLoggedIn || isOnboarding || isAuthPage || isRegistration ? 'no-padding' : ''}`}>
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
                      // ✅ Call login from useAuthStore
                      useAuthStore.getState().login(details);
                    }}
                  />
                )
              }
            />

            <Route path="/supplier-registration" element={<SupplierRegistration />} />
            <Route path="/buyer-registration" element={<BuyersRegistration />} />

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

            {/* Platform User Remote Routes - includes buyer-admin, supplier-admin, platform-user */}
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
      <Shell />
    </BrowserRouter>
  );
}