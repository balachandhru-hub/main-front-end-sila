// src/components/context/AuthContext.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';
import { fetchAuthInfo } from './api/authApi';

export type AuthInfo = {
  buyerId: string | null;
  supplierId: string | null;
};

type AuthContextType = {
  auth: AuthInfo | null;
  loading: boolean;
  fetchAndSetAuth: (skipRefresh?: boolean) => Promise<void>;
  setAuth: (info: AuthInfo) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextType>({
  auth: null,
  loading: true,
  fetchAndSetAuth: async () => {},
  setAuth: () => {},
  clearAuth: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [auth, setAuthState] = useState<AuthInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAndSetAuth = useCallback(async (skipRefresh = false) => {
    setLoading(true);
    const result = await fetchAuthInfo(skipRefresh);
    setAuthState(result);
    setLoading(false);
  }, []);

  const setAuth = useCallback((info: AuthInfo) => {
    setAuthState(info);
    setLoading(false);
  }, []);

  const clearAuth = useCallback(() => {
    setAuthState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ auth, loading, fetchAndSetAuth, setAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);