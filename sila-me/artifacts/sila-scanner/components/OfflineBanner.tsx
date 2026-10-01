import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useConnectivity } from '@/context/ConnectivityContext';
import { useColors } from '@/hooks/useColors';

export function OfflineBanner() {
  const colors = useColors();
  const connectivity = useConnectivity();
  const isOffline =
    !connectivity.isConnected || connectivity.isInternetReachable === false;
  if (!isOffline) return null;

  return (
    <View style={[styles.container, { backgroundColor: '#FFF6E5' }]}>
      <Ionicons name="cloud-offline-outline" size={16} color={colors.warning} />
      <Text style={[styles.text, { color: '#8D5C0C' }]}>
        Offline mode: drafts stay on this device. Server transactions are paused until reconnect.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 36,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
});