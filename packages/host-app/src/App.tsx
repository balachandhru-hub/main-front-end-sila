import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
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
  allowedRoles: ('buyer' | 'supplier' | 'platform-user' | 'buyer-admin' | 'buyer-business-user')[] 
}> = ({
  children,
  allowedRoles,
}) => {
  const { isLoggedIn, userRole } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(userRole as any)) {
    // Redirect based on user's actual role
    if (userRole === 'buyer-admin') {
      return <Navigate to="/platform-user?view=admin" replace />;
    } else if (userRole === 'buyer-business-user') {
      return <Navigate to="/buyer" replace />;
    } else if (userRole === 'buyer') {
      return <Navigate to="/buyer" replace />;
    } else if (userRole === 'supplier') {
      return <Navigate to="/supplier" replace />;
    } else {
      return <Navigate to="/platform-user" replace />;
    }
  }

  return <>{children}</>;
};

const Sidebar = () => {
  const { userRole, logout } = useAuth();
  const location = useLocation();

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
        {userRole === 'buyer' && (
          <li>
            <Link
              to="/buyer"
              className={`nav-item ${location.pathname.includes('/buyer') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
        )}
        {userRole === 'buyer-admin' && (
          <li>
            <Link
              to="/platform-user?view=admin"
              className={`nav-item ${location.pathname.includes('/platform-user') ? 'active' : ''}`}
            >
              Admin Dashboard
            </Link>
          </li>
        )}
        {userRole === 'buyer-business-user' && (
          <li>
            <Link
              to="/buyer"
              className={`nav-item ${location.pathname.includes('/buyer') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
        )}
        {userRole === 'supplier' && (
          <li>
            <Link
              to="/supplier"
              className={`nav-item ${location.pathname.includes('/supplier') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
        )}
        {userRole === 'platform-user' && (
          <li>
            <Link
              to="/platform-user"
              className={`nav-item ${location.pathname.includes('/platform-user') ? 'active' : ''}`}
            >
              Dashboard
            </Link>
          </li>
        )}
      </ul>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center' }}>
            Logged in as {userRole?.toUpperCase().replace('-', ' ')}
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
  const { isLoggedIn, userRole, login, logout } = useAuth();
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
  const isPlatformUser = userRole === 'platform-user';
  const isBuyerAdmin = userRole === 'buyer-admin';
  const isBuyerBusinessUser = userRole === 'buyer-business-user';
  const isSupplier = userRole === 'supplier';
  const isBuyer = userRole === 'buyer';
  
  const showSidebar = isLoggedIn && !isOnboarding && !isPlatformUser && !isBuyerAdmin && !isBuyerBusinessUser && !isSupplier && !isBuyer;

  return (
    <div className="app-container">
      {showSidebar && <Sidebar />}
      <main className={`main-content ${!isLoggedIn || isOnboarding || isPlatformUser || isBuyerAdmin || isBuyerBusinessUser || isSupplier || isBuyer ? 'no-padding' : ''} ${isPlatformUser ? 'bg-white' : ''}`}>
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
                  <Navigate 
                    to={
                      userRole === 'buyer-admin' 
                        ? '/platform-user?view=admin'
                        : userRole === 'buyer-business-user' 
                        ? '/buyer'
                        : userRole === 'buyer' 
                        ? '/buyer' 
                        : userRole === 'supplier' 
                        ? '/supplier' 
                        : '/platform-user'
                    } 
                    replace 
                  />
                ) : (
                  <Login 
                    onCreateAccount={() => navigate('/supplier-registration')} 
                    onCreateBuyerAccount={() => navigate('/buyer-registration')}
                    onLoginSuccess={(details) => login(details)}
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
                <Protected allowedRoles={['supplier']}>
                  <SupplierApp />
                </Protected>
              }
            />

            {/* Platform User Remote Routes - includes buyer-admin */}
            <Route
              path="/platform-user/*"
              element={
                <Protected allowedRoles={['platform-user', 'buyer-admin']}>
                  <PlatformUserApp />
                </Protected>
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={
                <Navigate 
                  to={
                    isLoggedIn 
                      ? userRole === 'buyer-admin'
                        ? '/platform-user?view=admin'
                        : userRole === 'buyer-business-user'
                        ? '/buyer'
                        : userRole === 'buyer'
                        ? '/buyer'
                        : userRole === 'supplier'
                        ? '/supplier'
                        : '/platform-user'
                      : '/'
                  } 
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