import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, PrimaryButton, Screen, SecondaryButton } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { validateGrnLines } from '@/services/erp/grnService';
import { useColors } from '@/hooks/useColors';

export default function GrnReviewScreen() {
  const colors = useColors();
  const { draft, selectedPurchaseOrder, purchaseOrderLines } = useAppState();
  if (!selectedPurchaseOrder) return null;
  const lines = purchaseOrderLines.filter((line) => line.included);
  const errors = validateGrnLines(selectedPurchaseOrder, purchaseOrderLines);
  return (
    <Screen>
      <Header title="Review goods receipt" subtitle="Confirm quantities before posting" onBack={() => router.back()} right={<InfoPill icon="cube-outline" label={`${lines.length} items`} tone="green" />} />
      <View style={[styles.hero, { backgroundColor: colors.lightBlue }]}><View style={[styles.heroIcon, { backgroundColor: colors.primary }]}><Ionicons name="cube-outline" size={22} color={colors.card} /></View><View style={{ flex: 1 }}><Text style={[styles.heroLabel, { color: colors.primary }]}>MATERIAL PO</Text><Text style={[styles.heroValue, { color: colors.navy }]}>{selectedPurchaseOrder.poNumber}</Text><Text style={[styles.heroSub, { color: colors.mutedForeground }]}>{selectedPurchaseOrder.supplierName}</Text></View><Feather name="check-circle" size={19} color={colors.green} /></View>
      <View style={styles.summary}><SummaryItem label="Items being received" value={`${lines.length}`} /><SummaryItem label="Plant" value={selectedPurchaseOrder.plant} /><SummaryItem label="Storage location" value={selectedPurchaseOrder.storageLocation} /></View>
      <Text style={[styles.sectionTitle, { color: colors.navy }]}>Receive now</Text>
      <View style={[styles.table, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}><Text style={[styles.tableHeading, { color: colors.mutedForeground, flex: 1.4 }]}>ITEM / MATERIAL</Text><Text style={[styles.tableHeading, { color: colors.mutedForeground }]}>OPEN</Text><Text style={[styles.tableHeading, { color: colors.primary }]}>RECEIVE</Text></View>
        {lines.map((line) => <View key={line.poItem} style={[styles.tableRow, { borderBottomColor: colors.border }]}><View style={{ flex: 1.4 }}><Text style={[styles.item, { color: colors.navy }]}>{line.poItem} · {line.description}</Text><Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{line.materialCode} · Accepted {line.receivedQuantity} · Damaged {line.damagedQuantity} · Rejected {line.rejectedQuantity} {line.uom}</Text></View><Text style={[styles.qty, { color: colors.mutedForeground }]}>{line.remainingQuantity} {line.uom}</Text><Text style={[styles.qty, { color: colors.navy }]}>{line.receivedQuantity + line.damagedQuantity + line.rejectedQuantity} {line.uom}</Text></View>)}
      </View>
      <View style={[styles.notice, { backgroundColor: colors.lightGreen }]}><Ionicons name="information-circle-outline" size={17} color={colors.success} /><Text style={[styles.noticeText, { color: colors.success }]}>The ERP will perform final quantity, UOM, PO status, and tolerance validation.</Text></View>
      {errors.length ? <Text style={[styles.errorText, { color: colors.destructive }]}>{errors[0]}</Text> : null}
      <View style={styles.actions}><PrimaryButton label="Post GRN" icon="upload-cloud" onPress={() => router.push('/grn-confirm')} disabled={Boolean(errors.length)} /><SecondaryButton label="Back to Edit" icon="edit-2" onPress={() => router.back()} /></View>
    </Screen>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, gap: 4 }}><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.summaryValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  heroValue: { fontSize: 17, fontWeight: '800', marginTop: 2 },
  heroSub: { fontSize: 11, marginTop: 2 },
  summary: { flexDirection: 'row', gap: 12 },
  summaryLabel: { fontSize: 9, lineHeight: 12 },
  summaryValue: { fontSize: 12, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  table: { borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, gap: 9 },
  tableHeading: { fontSize: 9, fontWeight: '800', flex: 0.8 },
  tableRow: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, gap: 9, alignItems: 'center' },
  item: { fontSize: 11, fontWeight: '700' },
  itemSub: { fontSize: 9, marginTop: 3 },
  qty: { flex: 0.8, fontSize: 10, fontWeight: '700' },
  notice: { borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  errorText: { fontSize: 12, fontWeight: '700' },
  actions: { gap: 10 },
});