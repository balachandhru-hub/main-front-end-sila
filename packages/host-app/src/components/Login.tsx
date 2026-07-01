import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { Button } from '@vosox/shared-ui';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'buyer' | 'supplier'>('buyer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login(role);
    navigate(role === 'buyer' ? '/buyer' : '/supplier');
  };

  return (
    <div className="login-wrapper">
      <div className="glass-card login-card" style={{ textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem', marginBottom: '8px', fontWeight: 700 }}>
          Vosox Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px' }}>
          Select role and sign in to access your dashboard
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label">Role</label>
            <div className="role-selector">
              <button
                type="button"
                className={`role-btn ${role === 'buyer' ? 'active' : ''}`}
                onClick={() => setRole('buyer')}
              >
                Buyer
              </button>
              <button
                type="button"
                className={`role-btn ${role === 'supplier' ? 'active' : ''}`}
                onClick={() => setRole('supplier')}
              >
                Supplier
              </button>
            </div>
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="e.g. user@vosox.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ textAlign: 'left' }}>
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            fullWidth={true}
            style={{ marginTop: '16px' }}
          >
            Sign In as {role.charAt(0).toUpperCase() + role.slice(1)}
          </Button>
        </form>

        <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-dark)' }}>
          Tip: You can use any dummy email and password.
        </div>
      </div>
    </div>
  );
};

export default Login;
