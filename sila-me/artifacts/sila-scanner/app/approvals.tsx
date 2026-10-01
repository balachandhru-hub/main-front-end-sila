import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, Screen, TabBar } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { canApprove, canApproveType, type ApprovalRequest } from '@/services/approvals/approvalService';

export default function ApprovalsScreen() {
  const colors = useColors();
  const { user, approvals, resolveApproval } = useAppState();
  const pending = useMemo(() => approvals.filter((approval) => approval.status === 'PENDING'), [approvals]);
  const completed = useMemo(() => approvals.filter((approval) => approval.status !== 'PENDING'), [approvals]);

  if (!canApprove(user.role)) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Screen>
          <Header title="Approvals" subtitle="Permission required" onBack={() => router.back()} />
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.navy }]}>Approval access is restricted</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Store Manager, Inventory Controller, Finance, or Admin access is required to review requests.</Text>
          </View>
        </Screen>
        <TabBar active="more" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Approvals" subtitle={`${user.role} review queue`} onBack={() => router.back()} right={<InfoPill icon="time-outline" label={`${pending.length} pending`} tone="orange" />} />
        <View style={[styles.banner, { backgroundColor: colors.lightBlue }]}>
          <Ionicons name="cloud-outline" size={19} color={colors.primary} />
          <View style={{ flex: 1 }}><Text style={[styles.bannerTitle, { color: colors.navy }]}>Cloud approval workflow</Text><Text style={[styles.bannerText, { color: colors.mutedForeground }]}>Requests submitted from SILA Store appear here for review. Final approval and ERP posting must be enforced by the cloud backend.</Text></View>
        </View>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Needs your review</Text><Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>{pending.length} requests</Text></View>
        {pending.length ? pending.map((approval) => <ApprovalCard key={approval.id} approval={approval} role={user.role} onResolve={resolveApproval} />) : <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="checkmark-circle-outline" size={28} color={colors.success} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>Nothing waiting for approval</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>New count and receiving exceptions will appear here after users submit them.</Text></View>}
        {completed.length ? <><View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Recently reviewed</Text></View>{completed.slice(0, 3).map((approval) => <ApprovalCard key={approval.id} approval={approval} role={user.role} onResolve={resolveApproval} readOnly />)}</> : null}
      </Screen>
      <TabBar active="more" />
    </View>
  );
}

function ApprovalCard({
  approval,
  role,
  onResolve,
  readOnly = false,
}: {
  approval: ApprovalRequest;
  role: Parameters<typeof canApprove>[0];
  onResolve: (id: string, status: 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED') => void;
  readOnly?: boolean;
}) {
  const colors = useColors();
  const eligible = canApproveType(role, approval.type);
  const statusTone = approval.status === 'APPROVED' ? colors.success : approval.status === 'REJECTED' ? colors.destructive : colors.warning;
  const statusLabel = approval.status === 'PENDING' ? 'Pending' : approval.status === 'CHANGES_REQUESTED' ? 'Changes requested' : approval.status === 'APPROVED' ? 'Approved' : 'Rejected';
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: approval.status === 'PENDING' ? colors.border : statusTone }]}>
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: approval.type === 'RECEIVING_EXCEPTION' ? '#FFF6E5' : colors.lightBlue }]}><Feather name={approval.type === 'RECEIVING_EXCEPTION' ? 'box' : 'clipboard'} size={19} color={approval.type === 'RECEIVING_EXCEPTION' ? colors.warning : colors.primary} /></View>
        <View style={{ flex: 1, gap: 3 }}><Text style={[styles.cardTitle, { color: colors.navy }]}>{approval.title}</Text><Text style={[styles.cardMeta, { color: colors.mutedForeground }]}>{approval.property} · {approval.store}</Text></View>
        <View style={[styles.status, { backgroundColor: approval.status === 'PENDING' ? '#FFF6E5' : approval.status === 'APPROVED' ? colors.lightGreen : '#FDECEC' }]}><Text style={[styles.statusText, { color: statusTone }]}>{statusLabel}</Text></View>
      </View>
      <Text style={[styles.description, { color: colors.mutedForeground }]}>{approval.description}</Text>
      <View style={styles.detailRow}><Text style={[styles.detail, { color: colors.mutedForeground }]}>Submitted by {approval.submittedBy}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{approval.submittedAt}</Text></View>
      {approval.varianceItems !== undefined ? <View style={[styles.metrics, { backgroundColor: colors.background }]}><Metric label="Products" value={String(approval.totalItems ?? 0)} /><Metric label="Variance items" value={String(approval.varianceItems)} /></View> : null}
      {!readOnly && approval.status === 'PENDING' ? eligible ? <View style={styles.actions}><Pressable accessibilityRole="button" onPress={() => onResolve(approval.id, 'REJECTED')} style={[styles.rejectButton, { borderColor: colors.destructive }]}><Ionicons name="close-outline" size={17} color={colors.destructive} /><Text style={[styles.rejectText, { color: colors.destructive }]}>Reject</Text></Pressable><Pressable accessibilityRole="button" onPress={() => onResolve(approval.id, 'APPROVED')} style={[styles.approveButton, { backgroundColor: colors.success }]}><Ionicons name="checkmark-outline" size={17} color={colors.card} /><Text style={styles.approveText}>Approve</Text></Pressable></View> : <Text style={[styles.permissionText, { color: colors.warning }]}>Your role cannot approve this request type.</Text> : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.metricValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  banner: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  bannerTitle: { fontSize: 13, fontWeight: '800' },
  bannerText: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionCount: { fontSize: 11, fontWeight: '600' },
  card: { borderRadius: 19, borderWidth: 1, padding: 13, gap: 11 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  typeIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 13, fontWeight: '800' },
  cardMeta: { fontSize: 10 },
  status: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 10, fontWeight: '800' },
  description: { fontSize: 11, lineHeight: 17 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  detail: { fontSize: 10 },
  metrics: { borderRadius: 12, padding: 10, flexDirection: 'row', gap: 16 },
  metricLabel: { fontSize: 9 },
  metricValue: { fontSize: 15, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 9 },
  rejectButton: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  rejectText: { fontSize: 12, fontWeight: '800' },
  approveButton: { flex: 1, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  approveText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  permissionText: { fontSize: 11, fontWeight: '700' },
  empty: { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '800' },
  emptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
});