import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const SESSION_TOKEN_KEY = 'sila_store_session_token';
const MOBILE_AUTH_MIGRATION_KEY = 'sila_store_mobile_auth_migration_v1';

export async function getSessionToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return typeof localStorage === 'undefined'
      ? null
      : localStorage.getItem(SESSION_TOKEN_KEY);
  }
  return SecureStore.getItemAsync(SESSION_TOKEN_KEY);
}

export async function saveSessionToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    return;
  }
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function clearSessionToken(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    return;
  }
  await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
}

export async function hasCompletedMobileAuthMigration(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(MOBILE_AUTH_MIGRATION_KEY) === 'complete';
  }
  return (await SecureStore.getItemAsync(MOBILE_AUTH_MIGRATION_KEY)) === 'complete';
}

export async function markMobileAuthMigrationComplete(): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(MOBILE_AUTH_MIGRATION_KEY, 'complete');
    return;
  }
  await SecureStore.setItemAsync(MOBILE_AUTH_MIGRATION_KEY, 'complete', {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}