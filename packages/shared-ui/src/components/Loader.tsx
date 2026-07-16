import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
  color?: string;
  size?: number;
  message?: string;
  theme?: 'light' | 'dark';
}

export const Loader: React.FC<LoaderProps> = ({
  fullScreen = false,
  color = '#6366f1',
  size = 50,
  message,
  theme = 'dark',
}) => {
  const containerStyle: React.CSSProperties = fullScreen
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: theme === 'light' ? '#ffffff' : 'var(--bg-color, #0f172a)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      };

  const spinnerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    border: theme === 'light' ? `4px solid rgba(0, 0, 0, 0.05)` : `4px solid rgba(255, 255, 255, 0.1)`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'vosox-spin 1s linear infinite',
    boxShadow: `0 0 15px ${color}33`,
  };

  const textStyle: React.CSSProperties = {
    marginTop: '16px',
    color: theme === 'light' ? '#1e293b' : 'var(--text-color, #f8fafc)',
    fontSize: '1rem',
    fontWeight: 500,
    fontFamily: 'inherit',
    letterSpacing: '0.05em',
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes vosox-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={spinnerStyle} />
      {message && <div style={textStyle}>{message}</div>}
    </div>
  );
};
