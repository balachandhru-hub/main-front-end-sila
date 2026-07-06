import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './components/Login';
import SupplierRegistration from './components/SupplierRegistration';
import { Loader, Button } from '@vosox/shared-ui';

// Lazy loading remote apps
const BuyerApp = React.lazy(() => import('remoteBuyer/BuyerApp'));
const SupplierApp = React.lazy(() => import('remoteSupplier/SupplierApp'));
const PlatformUserApp = React.lazy(() => import('remotePlatformUser/PlatformUserApp'));

const Protected: React.FC<{ children: React.ReactNode; allowedRole: 'buyer' | 'supplier' | 'platform-user' }> = ({
  children,
  allowedRole,
}) => {
  const { isLoggedIn, userRole } = useAuth();

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  if (userRole !== allowedRole) {
    return <Navigate to={userRole === 'buyer' ? '/buyer' : '/supplier'} replace />;
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
          <>
            <li>
              <Link
                to="/buyer/dashboard"
                className={`nav-item ${location.pathname.includes('/buyer/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/buyer/purchase-orders"
                className={`nav-item ${location.pathname.includes('/buyer/purchase-orders') ? 'active' : ''}`}
              >
                Purchase Orders
              </Link>
            </li>
          </>
        )}
        {userRole === 'supplier' && (
          <>
            <li>
              <Link
                to="/supplier/dashboard"
                className={`nav-item ${location.pathname.includes('/supplier/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/supplier/quotations"
                className={`nav-item ${location.pathname.includes('/supplier/quotations') ? 'active' : ''}`}
              >
                Quotations & Bids
              </Link>
            </li>
          </>
        )}
        {userRole === 'platform-user' && (
          <>
            <li>
              <Link
                to="/platform-user/dashboard"
                className={`nav-item ${location.pathname.includes('/platform-user/dashboard') ? 'active' : ''}`}
              >
                Dashboard
              </Link>
            </li>
          </>
        )}
      </ul>

      <div style={{ marginTop: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-dark)', textAlign: 'center' }}>
            Logged in as {userRole?.toUpperCase()}
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
  const { isLoggedIn, userRole, login } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app-container">
      {isLoggedIn && <Sidebar />}
      <main className={`main-content ${!isLoggedIn ? 'no-padding' : ''}`}>
        <React.Suspense fallback={<Loader fullScreen={true} message="Loading modules..." />}>
          <Routes>
            <Route
              path="/"
              element={
                isLoggedIn ? (
                  <Navigate to={userRole === 'buyer' ? '/buyer' : userRole === 'supplier' ? '/supplier' : '/platform-user'} replace />
                ) : (
                  <Login 
                    onCreateAccount={() => navigate('/supplier-registration')} 
                    onLoginSuccess={(role) => login(role)}
                  />
                )
              }
            />

            <Route path="/supplier-registration" element={<SupplierRegistration />} />

            {/* Buyer Remote Routes */}
            <Route
              path="/buyer/*"
              element={
                <Protected allowedRole="buyer">
                  <BuyerApp />
                </Protected>
              }
            />

            {/* Supplier Remote Routes */}
            <Route
              path="/supplier/*"
              element={
                <Protected allowedRole="supplier">
                  <SupplierApp />
                </Protected>
              }
            />

            {/* Platform User Remote Routes */}
            <Route
              path="/platform-user/*"
              element={
                <Protected allowedRole="platform-user">
                  <PlatformUserApp />
                </Protected>
              }
            />

            {/* Catch-all */}
            <Route
              path="*"
              element={
                <Navigate to={isLoggedIn ? (userRole === 'buyer' ? '/buyer' : userRole === 'supplier' ? '/supplier' : '/platform-user') : '/'} replace />
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
