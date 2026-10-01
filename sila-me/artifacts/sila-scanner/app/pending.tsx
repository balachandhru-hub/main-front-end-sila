import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Screen, Header, TabBar, InfoPill } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';

const pendingItems = [
  { name: 'Arabian Provisions', file: 'ArabianProvisions-UNKNOWN-2026-09-10.pdf', time: 'Saved 8 min ago', size: '1.2 MB', status: 'Pending' },
  { name: 'Kitchen Craft Supplies', file: 'KitchenCraft-INV44211-2026-09-10.pdf', time: 'Saved 22 min ago', size: '2.8 MB', status: 'Retry' },
  { name: 'Unknown supplier', file: 'UNKNOWN-UNKNOWN-2026-09-09.pdf', time: 'Saved yesterday', size: '904 KB', status: 'Failed' },
];

export default function PendingScreen() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Pending uploads" subtitle="Documents waiting for SharePoint" right={<InfoPill icon="cloud-upload-outline" label="3 waiting" tone="orange" />} />
        <View style={[styles.offline, { backgroundColor: '#FFF6E5' }]}>
          <View style={[styles.offlineIcon, { backgroundColor: '#FFE7B4' }]}><Ionicons name="cloud-offline-outline" size={19} color={colors.warning} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.offlineTitle, { color: colors.navy }]}>Offline Mode</Text><Text style={[styles.offlineText, { color: '#8D5C0C' }]}>You can continue capturing documents. Files stay on this device until the server validates the session and upload is confirmed.</Text></View>
        </View>
        <Text style={[styles.helper, { color: colors.mutedForeground }]}>No queued upload is replayed blindly. Review Sync Status before retrying.</Text>
        <View style={styles.list}>{pendingItems.map((item, index) => <PendingCard key={item.file} item={item} index={index} />)}</View>
      </Screen>
      <TabBar active="more" />
    </View>
  );
}

function PendingCard({ item, index }: { item: typeof pendingItems[number]; index: number }) {
  const colors = useColors();
  const isFailed = item.status === 'Failed';
  const isRetry = item.status === 'Retry';
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}><View style={[styles.docIcon, { backgroundColor: isFailed ? '#FDECEC' : colors.lightBlue }]}><Feather name="file-text" size={19} color={isFailed ? colors.destructive : colors.primary} /></View><View style={{ flex: 1, gap: 4 }}><Text numberOfLines={1} style={[styles.name, { color: colors.navy }]}>{item.name}</Text><Text numberOfLines={1} style={[styles.file, { color: colors.mutedForeground }]}>{item.file}</Text></View><InfoPill icon={isFailed ? 'alert-circle-outline' : isRetry ? 'refresh-outline' : 'time-outline'} label={item.status} tone={isFailed ? 'blue' : 'orange'} /></View>
      <View style={styles.meta}><Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.time}</Text><Text style={[styles.metaText, { color: colors.mutedForeground }]}>{item.size}</Text><Text style={[styles.metaText, { color: colors.mutedForeground }]}>FIVE Palm Jumeirah</Text></View>
      {index > 0 ? <Pressable accessibilityRole="button" onPress={() => router.push('/sync-status')} style={[styles.retry, { borderColor: colors.primary }]}><Ionicons name="refresh-outline" size={15} color={colors.primary} /><Text style={[styles.retryText, { color: colors.primary }]}>View sync status</Text></Pressable> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  offline: { borderRadius: 18, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  offlineIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  offlineTitle: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  offlineText: { fontSize: 11, lineHeight: 17, fontWeight: '500' },
  helper: { fontSize: 12, lineHeight: 18, marginTop: -5 },
  list: { gap: 10 },
  card: { borderRadius: 18, borderWidth: 1, padding: 13, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  docIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700' },
  file: { fontSize: 10 },
  meta: { paddingLeft: 48, flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  metaText: { fontSize: 10 },
  retry: { marginLeft: 48, height: 34, borderRadius: 11, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  retryText: { fontSize: 11, fontWeight: '700' },
});