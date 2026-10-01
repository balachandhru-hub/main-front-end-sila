import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Brand } from '@/components/Brand';
import { Screen, TabBar, InfoPill, SectionTitle } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function HomeScreen() {
  const colors = useColors();
  const { user, customer, property, department, invoices, approvals, permissions, mobileConfig } = useAppState();
  const pendingApprovals = approvals.filter((approval) => approval.status === 'PENDING').length;
  const enabled = (feature: string, ...requiredPermissions: string[]) =>
    mobileConfig?.features[feature] === true &&
    requiredPermissions.some((permission) => permissions.includes(permission));
  const approvalsEnabled =
    mobileConfig?.features.approvals === true &&
    ['APPROVALS', 'APPROVE_GOODS_RECEIPT', 'APPROVE_INVENTORY_COUNT', 'POST_STOCK_TRANSFER', 'POST_GOODS_ISSUE']
      .some((permission) => permissions.includes(permission));

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <View style={styles.header}>
          <Brand compact />
          <Pressable accessibilityRole="button" onPress={() => router.push('/settings')} style={[styles.avatar, { backgroundColor: colors.navy }]}>
            <Text style={styles.avatarText}>{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</Text>
          </Pressable>
        </View>
        <View style={styles.greeting}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>STORE OPERATIONS</Text>
          <Text style={[styles.title, { color: colors.navy }]}>Good morning, {user.name.split(' ')[0]}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Scan. Receive. Count. Control.</Text>
        </View>
        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contextHeader}>
            <View>
              <Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>CUSTOMER</Text>
              <Text style={[styles.contextValue, { color: colors.navy }]}>{customer}</Text>
            </View>
            <InfoPill icon="checkmark-circle-outline" label="Connected" tone="green" />
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={17} color={colors.primary} />
            <Text style={[styles.locationText, { color: colors.navy }]}>{property} · {department}</Text>
          </View>
        </View>

        <SectionTitle>Store operations</SectionTitle>
        <View style={styles.actionGrid}>
          {enabled('receiveGoods', 'RECEIVE_GOODS') ? <OperationCard icon="box" title="RECEIVE GOODS" description="Receive supplier deliveries and post GRN" tone="blue" onPress={() => router.push('/receive')} /> : null}
          {enabled('inventoryCount', 'INVENTORY_COUNT') ? <OperationCard icon="grid" title="COUNT INVENTORY" description="Scan products and perform physical stock counts" tone="green" onPress={() => router.push('/inventory')} /> : null}
          {enabled('scanDocument', 'SCAN_DOCUMENT') ? <OperationCard icon="file-text" title="SCAN DOCUMENT" description="Scan invoices and supporting documents" tone="orange" onPress={() => router.push('/scan')} /> : null}
          {enabled('stockTransfer', 'STOCK_TRANSFER') ? <OperationCard icon="repeat" title="STOCK TRANSFER" description="Transfer stock between stores or locations" tone="navy" onPress={() => router.push('/transfer')} /> : null}
          {enabled('goodsIssue', 'GOODS_ISSUE') ? <OperationCard icon="archive" title="GOODS ISSUE" description="Issue stock to a configured department or recipient" tone="orange" onPress={() => router.push('/goods-issue')} /> : null}
          {approvalsEnabled ? <OperationCard icon="check-square" title="APPROVALS" description={`${pendingApprovals} requests waiting for your review`} tone="green" onPress={() => router.push('/approvals')} /> : null}
        </View>

        <SectionTitle action="Live workspace">Today</SectionTitle>
        <View style={styles.metricsGrid}>
          <Metric label="Open POs" value="6" icon="cube-outline" tone="blue" />
          <Metric label="Pending GRNs" value="2" icon="document-text-outline" tone="orange" />
          <Metric label="Today's receipts" value="12" icon="checkmark-circle-outline" tone="green" />
          <Metric label="Pending uploads" value={String(3 + invoices.filter((invoice) => invoice.status === 'Pending').length)} icon="cloud-upload-outline" tone="blue" />
          <Metric label="Variances" value="7" icon="swap-vertical-outline" tone="red" />
          <Metric label="Low stock" value="4" icon="warning-outline" tone="orange" />
        </View>
        <View style={[styles.tip, { backgroundColor: colors.lightBlue }]}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
          <Text style={[styles.tipText, { color: colors.navy }]}>ERP remains the system of record. SILA Store helps your team capture and verify operations safely.</Text>
        </View>
      </Screen>
      <TabBar active="home" />
    </View>
  );
}

function OperationCard({
  icon,
  title,
  description,
  tone,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  description: string;
  tone: 'blue' | 'green' | 'orange' | 'navy';
  onPress: () => void;
}) {
  const colors = useColors();
  const palette = tone === 'green'
    ? { bg: colors.lightGreen, icon: colors.success }
    : tone === 'orange'
      ? { bg: '#FFF6E5', icon: colors.warning }
      : tone === 'navy'
        ? { bg: '#E9EEF2', icon: colors.navy }
        : { bg: colors.lightBlue, icon: colors.primary };
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.operationCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}
    >
      <View style={[styles.operationIcon, { backgroundColor: palette.bg }]}><Feather name={icon} size={21} color={palette.icon} /></View>
      <Text style={[styles.operationTitle, { color: colors.navy }]}>{title}</Text>
      <Text style={[styles.operationDescription, { color: colors.mutedForeground }]}>{description}</Text>
      <Feather name="arrow-up-right" size={16} color={palette.icon} style={styles.operationArrow} />
    </Pressable>
  );
}

function Metric({ label, value, icon, tone }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap; tone: 'green' | 'orange' | 'red' | 'blue' }) {
  const colors = useColors();
  const color = tone === 'green' ? colors.success : tone === 'orange' ? colors.warning : tone === 'red' ? colors.destructive : colors.primary;
  return (
    <View style={[styles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.metricTop}><Ionicons name={icon} size={16} color={color} /><Text style={[styles.metricValue, { color: colors.navy }]}>{value}</Text></View>
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatar: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  greeting: { gap: 5, marginTop: 3 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  title: { fontSize: 25, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  contextCard: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 13 },
  contextHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  contextLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1, marginBottom: 3 },
  contextValue: { fontSize: 14, fontWeight: '700' },
  locationRow: { borderTopWidth: 1, borderTopColor: '#DDE4E8', paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  locationText: { flex: 1, fontSize: 12, fontWeight: '600' },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  operationCard: { width: '48%', minHeight: 150, borderRadius: 20, borderWidth: 1, padding: 13, gap: 8 },
  operationIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  operationTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  operationDescription: { fontSize: 11, lineHeight: 16, flex: 1 },
  operationArrow: { alignSelf: 'flex-end' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { width: '31.5%', minHeight: 75, borderRadius: 16, borderWidth: 1, padding: 11, gap: 7 },
  metricTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricValue: { fontSize: 21, fontWeight: '700', letterSpacing: -0.6 },
  metricLabel: { fontSize: 10, fontWeight: '600', lineHeight: 13 },
  tip: { borderRadius: 16, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  tipText: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: '500' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});