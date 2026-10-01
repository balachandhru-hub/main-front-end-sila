import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, Screen, TabBar } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { useConnectivity } from '@/context/ConnectivityContext';
import {
  getSyncStatus,
  type SyncStatusSnapshot,
} from '@/services/offline/syncStatusService';
import { requestReconnectWork } from '@/services/offline/reconnectOrchestrator';

const domains = ['MATERIALS', 'SUPPLIERS', 'STOCK', 'PO', 'CONFIG'] as const;

export default function SyncStatusScreen() {
  const colors = useColors();
  const connectivity = useConnectivity();
  const [status, setStatus] = useState<SyncStatusSnapshot | null>(null);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    setStatus(await getSyncStatus());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const syncNow = async () => {
    setMessage('');
    await requestReconnectWork();
    await refresh();
    setMessage('Status refreshed. No background transaction replay is enabled.');
  };

  const retryFailed = async () => {
    await refresh();
    setMessage('Failed items remain queued until server revalidation is available.');
  };

  const isOnline =
    connectivity.isConnected && connectivity.isInternetReachable !== false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header
          title="Sync status"
          subtitle="Local queue and server-validation readiness"
          right={
            <View style={[styles.connectionPill, { backgroundColor: isOnline ? '#EAF8F0' : '#FFF6E5' }]}>
              <Ionicons
                name={isOnline ? 'cloud-done-outline' : 'cloud-offline-outline'}
                size={15}
                color={isOnline ? colors.success : colors.warning}
              />
              <Text style={[styles.connectionText, { color: isOnline ? colors.success : colors.warning }]}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          }
        />

        <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Metric label="Pending drafts" value={String(status?.pendingDrafts ?? 0)} colors={colors} />
          <Metric label="Pending uploads" value={String(status?.pendingUploads ?? 0)} colors={colors} />
          <Metric label="Failed items" value={String(status?.failedItems ?? 0)} colors={colors} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.navy }]}>Last successful sync</Text>
        <View style={[styles.domainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {domains.map((domain) => (
            <View key={domain} style={styles.domainRow}>
              <View style={[styles.domainIcon, { backgroundColor: colors.lightBlue }]}>
                <Feather name="database" size={15} color={colors.primary} />
              </View>
              <Text style={[styles.domainName, { color: colors.navy }]}>{domain}</Text>
              <Text style={[styles.domainTime, { color: colors.mutedForeground }]}>
                {formatSyncTime(status?.lastSuccessfulSync[domain])}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void syncNow()}
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="sync-outline" size={17} color="#fff" />
            <Text style={styles.primaryButtonText}>Sync now</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void retryFailed()}
            style={[styles.secondaryButton, { borderColor: colors.border }]}
          >
            <Ionicons name="refresh-outline" size={17} color={colors.primary} />
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Review failed</Text>
          </Pressable>
        </View>

        {message ? <Text style={[styles.message, { color: colors.mutedForeground }]}>{message}</Text> : null}
        <Text style={[styles.note, { color: colors.mutedForeground }]}>
          Offline data is cached or draft-only. Permissions, feature configuration, PO status,
          stock authority and final posting remain server-controlled.
        </Text>
      </Screen>
      <TabBar active="more" />
    </View>
  );
}

function Metric({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, { color: colors.navy }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function formatSyncTime(value?: string | null): string {
  if (!value) return 'Not synced';
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

const styles = StyleSheet.create({
  connectionPill: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  connectionText: { fontSize: 10, fontWeight: '800' },
  summary: { borderWidth: 1, borderRadius: 18, padding: 14, flexDirection: 'row', justifyContent: 'space-between' },
  metric: { flex: 1, gap: 3 },
  metricValue: { fontSize: 22, fontWeight: '800' },
  metricLabel: { fontSize: 10, lineHeight: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '800', marginTop: 4 },
  domainCard: { borderWidth: 1, borderRadius: 18, paddingHorizontal: 13 },
  domainRow: { minHeight: 49, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8EDF2' },
  domainIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  domainName: { flex: 1, fontSize: 12, fontWeight: '700' },
  domainTime: { fontSize: 10, maxWidth: 130, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 9 },
  primaryButton: { flex: 1, minHeight: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  primaryButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  secondaryButton: { flex: 1, minHeight: 42, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  secondaryButtonText: { fontSize: 12, fontWeight: '800' },
  message: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  note: { fontSize: 11, lineHeight: 17 },
});