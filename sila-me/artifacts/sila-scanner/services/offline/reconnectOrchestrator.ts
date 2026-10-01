import {
  subscribeToConnectivity,
  type ConnectivitySnapshot,
} from './connectivityService';

export type ReconnectHandler = () => Promise<void>;

let reconnectHandler: ReconnectHandler | null = null;
let unsubscribe: (() => void) | null = null;
let wasOnline: boolean | null = null;
let isRunning = false;

export function setReconnectHandler(handler: ReconnectHandler | null): void {
  reconnectHandler = handler;
}

export function startReconnectOrchestrator(): () => void {
  if (unsubscribe) return () => stopReconnectOrchestrator();
  unsubscribe = subscribeToConnectivity(handleConnectivityChange);
  return () => stopReconnectOrchestrator();
}

export function stopReconnectOrchestrator(): void {
  unsubscribe?.();
  unsubscribe = null;
  wasOnline = null;
}

export async function requestReconnectWork(): Promise<void> {
  if (!reconnectHandler || isRunning) return;
  isRunning = true;
  try {
    await reconnectHandler();
  } finally {
    isRunning = false;
  }
}

function handleConnectivityChange(snapshot: ConnectivitySnapshot): void {
  const online = snapshot.isConnected && snapshot.isInternetReachable !== false;
  const reconnected = wasOnline === false && online;
  wasOnline = online;
  if (reconnected) void requestReconnectWork();
}