import NetInfo, { type NetInfoState, type NetInfoSubscription } from '@react-native-community/netinfo';

export type ConnectivitySnapshot = {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  checkedAt: string;
};

const listeners = new Set<(snapshot: ConnectivitySnapshot) => void>();
let subscription: NetInfoSubscription | null = null;
let currentSnapshot: ConnectivitySnapshot = {
  isConnected: true,
  isInternetReachable: null,
  type: 'unknown',
  checkedAt: new Date(0).toISOString(),
};

function toSnapshot(state: NetInfoState): ConnectivitySnapshot {
  return {
    isConnected: state.isConnected ?? false,
    isInternetReachable: state.isInternetReachable,
    type: state.type,
    checkedAt: new Date().toISOString(),
  };
}

function ensureListener(): void {
  if (subscription) return;
  subscription = NetInfo.addEventListener((state) => {
    currentSnapshot = toSnapshot(state);
    listeners.forEach((listener) => listener(currentSnapshot));
  });
}

export async function getConnectivity(): Promise<ConnectivitySnapshot> {
  ensureListener();
  currentSnapshot = toSnapshot(await NetInfo.fetch());
  return currentSnapshot;
}

export function subscribeToConnectivity(
  listener: (snapshot: ConnectivitySnapshot) => void,
): () => void {
  ensureListener();
  listeners.add(listener);
  listener(currentSnapshot);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && subscription) {
      subscription();
      subscription = null;
    }
  };
}