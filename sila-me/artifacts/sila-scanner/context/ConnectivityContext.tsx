import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getConnectivity,
  subscribeToConnectivity,
  type ConnectivitySnapshot,
} from '@/services/offline/connectivityService';
import {
  startReconnectOrchestrator,
  stopReconnectOrchestrator,
} from '@/services/offline/reconnectOrchestrator';

const ConnectivityContext = createContext<ConnectivitySnapshot | null>(null);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<ConnectivitySnapshot | null>(null);

  useEffect(() => {
    void getConnectivity().then(setSnapshot);
    const unsubscribe = subscribeToConnectivity(setSnapshot);
    startReconnectOrchestrator();
    return () => {
      unsubscribe();
      stopReconnectOrchestrator();
    };
  }, []);

  const value = useMemo(() => snapshot, [snapshot]);
  return <ConnectivityContext.Provider value={value}>{children}</ConnectivityContext.Provider>;
}

export function useConnectivity(): ConnectivitySnapshot {
  return (
    useContext(ConnectivityContext) ?? {
      isConnected: true,
      isInternetReachable: null,
      type: 'unknown',
      checkedAt: new Date(0).toISOString(),
    }
  );
}