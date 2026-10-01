import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, Screen, TabBar } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { canApprove } from '@/services/approvals/approvalService';

export default function MoreScreen() {
  const colors = useColors();
  const { user, approvals, mobileConfig, permissions } = useAppState();
  const scanEnabled = mobileConfig?.features.scanDocument === true && permissions.includes('SCAN_DOCUMENT');
  const pendingApprovals = approvals.filter((approval) => approval.status === 'PENDING').length;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="More" subtitle="Documents, transfers and workspace tools" />
        <View style={styles.grid}>
          {scanEnabled ? <MoreCard testID="more-scan-document" icon="file-text" title="Scan documents" description="Invoices, delivery notes and supporting documents" onPress={() => router.push('/scan')} /> : null}
          <MoreCard icon="repeat" title="Stock transfers" description="Move stock between stores when ERP support is enabled" onPress={() => router.push('/transfer')} />
          <MoreCard icon="archive" title="Goods issue" description="Issue stock to a configured consumption destination" onPress={() => router.push('/goods-issue')} />
          <MoreCard icon="upload-cloud" title="Pending uploads" description="Review documents waiting for cloud upload" onPress={() => router.push('/pending')} />
          <MoreCard icon="activity" title="Sync status" description="Connectivity, cached domains, drafts and failed items" onPress={() => router.push('/sync-status')} />
          <MoreCard icon="settings" title="Settings" description="Account, location, connections and privacy" onPress={() => router.push('/settings')} />
          {canApprove(user.role) ? <MoreCard icon="check-square" title="Approvals" description={`${pendingApprovals} requests waiting for review`} onPress={() => router.push('/approvals')} /> : null}
        </View>
        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="sparkles-outline" size={21} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={[styles.aboutTitle, { color: colors.navy }]}>SILA Store</Text><Text style={[styles.aboutText, { color: colors.mutedForeground }]}>AI-Powered Store & Inventory Operations</Text><Text style={[styles.aboutTagline, { color: colors.primary }]}>Scan. Receive. Count. Control.</Text></View>
        </View>
      </Screen>
      <TabBar active="more" />
    </View>
  );
}

function MoreCard({ icon, title, description, onPress, testID }: { icon: keyof typeof Feather.glyphMap; title: string; description: string; onPress: () => void; testID?: string }) {
  const colors = useColors();
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.icon, { backgroundColor: colors.lightBlue }]}><Feather name={icon} size={20} color={colors.primary} /></View>
      <Text style={[styles.title, { color: colors.navy }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>
      <Feather name="arrow-up-right" size={16} color={colors.primary} style={styles.arrow} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  card: { width: '48%', minHeight: 145, borderRadius: 19, borderWidth: 1, padding: 13, gap: 8 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 13, fontWeight: '800' },
  description: { fontSize: 11, lineHeight: 16, flex: 1 },
  arrow: { alignSelf: 'flex-end' },
  aboutCard: { borderRadius: 18, borderWidth: 1, padding: 15, flexDirection: 'row', gap: 11, alignItems: 'flex-start' },
  aboutTitle: { fontSize: 15, fontWeight: '800' },
  aboutText: { fontSize: 11, marginTop: 4 },
  aboutTagline: { fontSize: 11, fontWeight: '700', marginTop: 8 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});