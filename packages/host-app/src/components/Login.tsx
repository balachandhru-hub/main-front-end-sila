import React, { useState } from 'react';
import { Button } from '@vosox/shared-ui';
import vosx_logo from '../assets/vosx-logo.png'
import supplier_logo from '../assets/Supplier.png'
import buyer_logo from '../assets/Buyer.png'
import Header from './Header';
import { FaUser, FaLock } from 'react-icons/fa';
import { login, getTokenClaims } from '../api/authApi';
import './Login.css';


type Role = 'supplier' | 'buyer' | 'platform-user';
type View = 'role-select' | 'sign-in';

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 12.5l5 5L20 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
interface LoginProps {
  onLoginSuccess?: (role: Role, username: string) => void;
  onCreateAccount?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess, onCreateAccount }) => {
  const [view, setView] = useState<View>('sign-in');
  const [role, setRole] = useState<Role>('supplier');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    if (role === 'supplier') {
      onCreateAccount?.();
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
      
      // Fetch token claims to determine user role
      let resolvedRole: Role = role;
      try {
        const claims = await getTokenClaims();
        if (claims) {
          const rawRole = claims.role || claims.userRole || claims.roles?.[0];
          if (typeof rawRole === 'string') {
            const normalized = rawRole.toLowerCase();
            if (normalized.includes('supplier')) resolvedRole = 'supplier';
            else if (normalized.includes('buyer')) resolvedRole = 'buyer';
            else if (normalized.includes('platform') || normalized.includes('admin') || normalized.includes('staff')) resolvedRole = 'platform-user';
          }
        }
      } catch (claimsError) {
        console.error('Failed to fetch token claims, falling back to local state:', claimsError);
      }

      onLoginSuccess?.(resolvedRole, username);
      // setView('role-select');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="vx-page" style={{ ['--primary-color' as any]: '#2f7cf6', ['--accent-color' as any]: '#1554c9' }}>
      <Header />

      <main className="vx-main">
        <div className="vx-card">
          <div className="vx-left">
            <div className="vx-left-logo-box">
              <img src={vosx_logo} alt="VOSX" className="vx-logo-img vx-logo-img--boxed" />
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
                    <input
                      className="vx-input"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
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
                    <a
                      href="#"
                      className="vx-link"
                      onClick={(e) => {
                        e.preventDefault();
                        if (role === 'platform-user') {
                          setRole('supplier');
                        }
                        setView('role-select');
                      }}
                    >
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