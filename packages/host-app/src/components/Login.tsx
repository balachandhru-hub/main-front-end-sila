import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Loader } from '@vosox/shared-ui';
import sila_logo2 from '../../public/assets/SILA_Logo2.png';
import supplier_logo from '../assets/Supplier.png'
import buyer_logo from '../assets/Buyer.png'
import Header from './Header';
import { FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import { login, getTokenClaims } from '../api/authApi';
import './Login.css';

type Role = 'supplier' | 'buyer' | 'platform-user';
type View = 'role-select' | 'sign-in';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const ROLE_IDS = {
  SUPPLIER: '937aab61-b505-4e1c-a5a3-cd63e29c6db9',
  BUYER: '5a72f81e-a2c5-4f4a-bd55-6376c3c9ed73',
  PLATFORM_ADMIN: '113d8ead-40c2-425a-bc60-5989e6cdabca',
  BUYER_NETWORK_ADMIN: '61eb9b97-1fca-4beb-beb8-dc4b379cfa3a',
  SUPPLIER_NETWORK_ADMIN: '22067509-af24-48f8-a7e9-416a0b6a439b',
  SUPPLIER_ADMIN: '735bb267-fec0-489f-8249-d3d65b3857ea',
  BUYER_ADMIN: 'c95f5a1b-4aec-4647-9328-895a58193ec4',
} as const;

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

interface LoginProps {
  onLoginSuccess?: (
    details?: {
      userId?: string;
      personId?: string;
      organizationId?: string;
      roleId?: string;
    }
  ) => void;
  onCreateAccount?: () => void;
  onCreateBuyerAccount?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onCreateAccount, onCreateBuyerAccount }) => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('sign-in');
  const [role, setRole] = useState<Role>('supplier');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (role === 'supplier') {
      onCreateAccount?.();
    } else if (role === 'buyer') {
      onCreateBuyerAccount?.();
    }
  };

  const getRedirectUrl = (roleId: string): string => {
    switch (roleId) {
      case ROLE_IDS.BUYER_ADMIN:
        return '/platform-user/buyer-admin';
      case ROLE_IDS.SUPPLIER_ADMIN:
        return '/platform-user/supplier-admin';
      case ROLE_IDS.BUYER_NETWORK_ADMIN:
        return '/platform-user/buyer-network-admin';
      case ROLE_IDS.SUPPLIER_NETWORK_ADMIN:
        return '/platform-user/supplier-network-admin';
      case ROLE_IDS.PLATFORM_ADMIN:
        return '/platform-user';
      case ROLE_IDS.SUPPLIER:
        return '/supplier/dashboard';
      case ROLE_IDS.BUYER:
        return '/buyer/dashboard';
      default:
        return '/supplier/dashboard';
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    setIsLoading(true);
    try {
      await login(username, password);
      await delay(1000);

      let details: any = {};
      try {
        const claims = await getTokenClaims(true);
        if (claims && claims.roleId) {
          details = {
            userId: claims.userId,
            personId: claims.personId,
            organizationId: claims.organizationId,
            roleId: claims.roleId,
          };

          sessionStorage.setItem('vosox_user_id', claims.userId || '');
          sessionStorage.setItem('vosox_person_id', claims.personId || '');
          sessionStorage.setItem('vosox_organization_id', claims.organizationId || '');
          sessionStorage.setItem('vosox_role_id', claims.roleId || '');
          sessionStorage.setItem('vosox_user_role', claims.role || '');
          sessionStorage.setItem('vosox_user_email', username);
          sessionStorage.setItem('vosox_user_name', claims.name || 'User');
          sessionStorage.setItem('vosox_buyer_id', claims.buyerId || '');
          sessionStorage.setItem('vosox_supplier_id', claims.supplierId || '');

          onLoginSuccess?.(details);

          const redirectUrl = getRedirectUrl(claims.roleId);
          navigate(redirectUrl, { replace: true });
        } else {
          setError('Failed to retrieve user claims. Role ID not found.');
        }
      } catch (claimsError: any) {
        setError(claimsError.message || 'Failed to retrieve user claims.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999
      }}>
        <Loader color="#2f7cf6" />
      </div>
    );
  }

  return (
    <div className="vx-page" style={{ ['--primary-color' as any]: '#2f7cf6', ['--accent-color' as any]: '#1554c9' }}>
      <Header />

      <main className="vx-main">
        <div className="vx-card">
          <div className="vx-left">
            <div className="vx-left-logo-box">
              <img src={sila_logo2} alt="SILA" className="vx-logo-img vx-logo-img--boxed" />
            </div>
            <h2 className="vx-left-title">Supplier Onboarding &amp; Sourcing Portal</h2>
            <p className="vx-left-text">
              A secure enterprise portal for supplier registration, qualification, sourcing and collaboration
            </p>
          </div>

          <div className="vx-right">
            <div className="vx-right-inner">
              {view === 'role-select' ? (
                <>
                  <h1 className="vx-title">Welcome</h1>
                  <p className="vx-subtitle">Select your role to continue</p>

                  <div className="vx-role-grid">
                    <button
                      type="button"
                      className={`vx-role-card ${role === 'supplier' ? 'vx-role-card--active' : ''}`}
                      onClick={() => setRole('supplier')}
                    >
                      <span className="vx-role-icon"><img src={supplier_logo} alt="Supplier" /></span>
                      <span className="vx-role-label">Supplier</span>
                    </button>
                    <button
                      type="button"
                      className={`vx-role-card ${role === 'buyer' ? 'vx-role-card--active' : ''}`}
                      onClick={() => setRole('buyer')}
                    >
                      <span className="vx-role-icon"><img src={buyer_logo} alt="Buyer" /></span>
                      <span className="vx-role-label">Buyer</span>
                    </button>
                  </div>

                  <Button variant="primary" size="lg" fullWidth onClick={handleContinue}>
                    Continue as {role === 'supplier' ? 'Supplier' : 'Buyer'}
                  </Button>
                </>
              ) : (
                <form onSubmit={handleSignIn}>
                  <h1 className="vx-title-sec">Sign In</h1>
                  <p className="vx-subtitle-sec">Enter your credentials to continue</p>
                  {error && (
                    <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '10px', borderRadius: '6px', marginBottom: '15px', fontSize: '0.9rem', border: '1px solid #f87171' }}>
                      {error}
                    </div>
                  )}
                  <div className="vx-field">
                    <label className="vx-label"><FaUser /> Username</label>
                    <input
                      className="vx-input"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>

                  <div className="vx-field">
                    <label className="vx-label"><FaLock /> Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="vx-input"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#6b7280',
                          padding: '5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '18px'
                        }}
                      >
                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                      </button>
                    </div>
                  </div>

                  <div className="vx-row-between">
                    <label className="vx-checkbox">
                      <span
                        className={`vx-checkbox-box ${rememberMe ? 'vx-checkbox-box--checked' : ''}`}
                        onClick={() => setRememberMe(!rememberMe)}
                      >
                        {rememberMe && <CheckIcon />}
                      </span>
                      Remember me
                    </label>
                    <a href="#" className="vx-link" onClick={(e) => e.preventDefault()}>
                      Forgot Password?
                    </a>
                  </div>

                  <Button type="submit" variant="primary" size="lg" fullWidth disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login'}
                  </Button>

                  <p className="vx-footer-text">
                    New User?{' '}
                    <a href="#" className="vx-link" onClick={(e) => {
                      e.preventDefault();
                      if (role === 'platform-user') {
                        setRole('supplier');
                      }
                      setView('role-select');
                    }}>
                      Create an Account
                    </a>
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Login;