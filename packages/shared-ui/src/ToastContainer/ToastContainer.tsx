import React, { useEffect, useState } from 'react';
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle, FaTimes } from 'react-icons/fa';
import { toastService, type Toast } from '../services/toastservice';
import './ToastContainer.css';

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastService.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle />;
      case 'error':
        return <FaExclamationCircle />;
      case 'warning':
        return <FaExclamationCircle />;
      case 'info':
      default:
        return <FaInfoCircle />;
    }
  };

  return (
    <div className="nad-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`nad-toast nad-toast-${toast.type}`}>
          <div className="nad-toast-icon">{getIcon(toast.type)}</div>
          <div className="nad-toast-message">{toast.message}</div>
          <button
            className="nad-toast-close"
            onClick={() => toastService.remove(toast.id)}
            aria-label="Close"
          >
            <FaTimes />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;