import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, PrimaryButton, Screen } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { getPurchaseOrder } from '@/services/erp/poService';
import { validateGrnLines } from '@/services/erp/grnService';
import { useColors } from '@/hooks/useColors';

export default function PurchaseOrderDetailScreen() {
  const colors = useColors();
  const { draft, selectedPurchaseOrder, purchaseOrderLines, property, selectPurchaseOrder, updatePurchaseOrderLine } = useAppState();
  const [loading, setLoading] = useState(!selectedPurchaseOrder);
  const [error, setError] = useState('');
  useEffect(() => {
    const poNumber = draft.poNumber || selectedPurchaseOrder?.poNumber;
    if (!poNumber) {
      setLoading(false);
      return;
    }
    getPurchaseOrder(poNumber).then((order) => {
      if (order) selectPurchaseOrder(order);
      else setError(`PO ${poNumber} could not be found or is not eligible for GRN.`);
      setLoading(false);
    });
  }, [draft.poNumber, selectedPurchaseOrder?.poNumber]);
  if (loading) {
    return <Screen scroll={false}><View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Checking PO eligibility...</Text></View></Screen>;
  }
  const order = selectedPurchaseOrder;
  if (!order) {
    return <Screen><Header title="Purchase order" onBack={() => router.back()} /><View style={styles.empty}><Ionicons name="alert-circle-outline" size={30} color={colors.destructive} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>PO unavailable</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text></View></Screen>;
  }
  const errors = validateGrnLines(order, purchaseOrderLines);
  return (
    <Screen>
       <Header title="Review PO lines" subtitle="Confirm the goods physically received" onBack={() => router.back()} right={<InfoPill icon="cube-outline" label={order.servicePo ? 'Service PO' : 'Material PO'} tone={order.servicePo ? 'orange' : 'green'} />} />
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryTop}><View><Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>PURCHASE ORDER</Text><Text style={[styles.summaryNumber, { color: colors.navy }]}>{order.poNumber}</Text></View><View style={[styles.status, { backgroundColor: colors.lightGreen }]}><Text style={[styles.statusText, { color: colors.success }]}>{order.status === 'PARTIALLY_RECEIVED' ? 'Partially received' : 'Open'}</Text></View></View>
        <View style={styles.summaryMeta}><Meta label="Supplier" value={order.supplierName} /><Meta label="Plant" value={property} /><Meta label="Storage" value="Main Store" /><Meta label="Currency" value={order.currency} /></View>
      </View>
       {order.servicePo ? <View style={[styles.serviceNotice, { backgroundColor: '#FFF4D6' }]}><Ionicons name="information-circle-outline" size={18} color={colors.warning} /><Text style={[styles.serviceText, { color: colors.navy }]}>{order.serviceMessage ?? 'Service PO — Goods receipt processing is not available in SILA Store.'}</Text></View> : null}
      <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: colors.navy }]}>Open line items</Text><Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>Receive Now is editable</Text></View>
      <View style={styles.lines}>{purchaseOrderLines.map((line) => (
        <View key={line.poItem} style={[styles.lineCard, { backgroundColor: colors.card, borderColor: line.included ? colors.primary : colors.border }]}>
          <View style={styles.lineTop}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: line.included }} onPress={() => updatePurchaseOrderLine(line.poItem, { included: !line.included })} style={[styles.checkbox, { backgroundColor: line.included ? colors.primary : colors.card, borderColor: line.included ? colors.primary : colors.border }]}>{line.included ? <Feather name="check" size={14} color={colors.card} /> : null}</Pressable><View style={{ flex: 1 }}><Text style={[styles.itemNumber, { color: colors.primary }]}>Item {line.poItem}</Text><Text style={[styles.description, { color: colors.navy }]}>{line.description}</Text><Text style={[styles.material, { color: colors.mutedForeground }]}>{line.materialCode}</Text></View><Text style={[styles.match, { color: colors.success }]}>Matched</Text></View>
          <View style={styles.quantityGrid}><Quantity label="Ordered" value={`${line.orderedQuantity} ${line.uom}`} /><Quantity label="Previously received" value={`${line.previouslyReceivedQuantity} ${line.uom}`} /><Quantity label="Open Qty" value={`${line.remainingQuantity} ${line.uom}`} /></View>
          <View style={styles.receiveRow}><View style={{ flex: 1 }}><Text style={[styles.receiveLabel, { color: colors.navy }]}>Accepted</Text><Text style={[styles.receiveHint, { color: colors.mutedForeground }]}>Available stock</Text></View><TextInput accessibilityLabel={`Accepted quantity for ${line.description}`} keyboardType="decimal-pad" value={String(line.receivedQuantity)} onChangeText={(value) => updatePurchaseOrderLine(line.poItem, { receivedQuantity: Number(value.replace(',', '.')) || 0 })} style={[styles.quantityInput, { color: colors.navy, borderColor: colors.primary, backgroundColor: colors.lightBlue }]} /><Text style={[styles.uom, { color: colors.navy }]}>{line.uom}</Text></View>
          <View style={styles.receiveRow}><View style={{ flex: 1 }}><Text style={[styles.receiveLabel, { color: colors.navy }]}>Damaged</Text><Text style={[styles.receiveHint, { color: colors.mutedForeground }]}>Keep out of available stock</Text></View><TextInput accessibilityLabel={`Damaged quantity for ${line.description}`} keyboardType="decimal-pad" value={String(line.damagedQuantity)} onChangeText={(value) => updatePurchaseOrderLine(line.poItem, { damagedQuantity: Number(value.replace(',', '.')) || 0 })} style={[styles.quantityInput, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} /><Text style={[styles.uom, { color: colors.navy }]}>{line.uom}</Text></View>
          <View style={styles.receiveRow}><View style={{ flex: 1 }}><Text style={[styles.receiveLabel, { color: colors.navy }]}>Rejected</Text><Text style={[styles.receiveHint, { color: colors.mutedForeground }]}>Supplier return / rejection</Text></View><TextInput accessibilityLabel={`Rejected quantity for ${line.description}`} keyboardType="decimal-pad" value={String(line.rejectedQuantity)} onChangeText={(value) => updatePurchaseOrderLine(line.poItem, { rejectedQuantity: Number(value.replace(',', '.')) || 0 })} style={[styles.quantityInput, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} /><Text style={[styles.uom, { color: colors.navy }]}>{line.uom}</Text></View>
        </View>
      ))}</View>
      {errors.length ? <View style={[styles.errorBox, { backgroundColor: '#FDECEC' }]}><Ionicons name="alert-circle-outline" size={18} color={colors.destructive} /><View style={{ flex: 1 }}>{errors.slice(0, 2).map((message) => <Text key={message} style={[styles.errorText, { color: colors.destructive }]}>{message}</Text>)}</View></View> : null}
      <PrimaryButton label="Review Goods Receipt" icon="arrow-right" onPress={() => router.push('/grn-review')} disabled={Boolean(errors.length)} />
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text><Text numberOfLines={1} style={[styles.metaValue, { color: colors.navy }]}>{value}</Text></View>;
}

function Quantity({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.quantityLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.quantityValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { fontSize: 12 },
  empty: { alignItems: 'center', gap: 9, paddingVertical: 55 },
  emptyTitle: { fontSize: 17, fontWeight: '700' },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 280 },
  summary: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 15 },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  summaryNumber: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  status: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  statusText: { fontSize: 10, fontWeight: '700' },
  summaryMeta: { flexDirection: 'row', gap: 8 },
  serviceNotice: { borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  serviceText: { flex: 1, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  metaLabel: { fontSize: 9 },
  metaValue: { fontSize: 11, fontWeight: '700' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  sectionHint: { fontSize: 10 },
  lines: { gap: 10 },
  lineCard: { borderRadius: 18, borderWidth: 1.5, padding: 13, gap: 14 },
  lineTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  itemNumber: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  description: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  material: { fontSize: 10, marginTop: 2 },
  match: { fontSize: 10, fontWeight: '700' },
  quantityGrid: { flexDirection: 'row', gap: 8, paddingLeft: 32 },
  quantityLabel: { fontSize: 9, lineHeight: 12 },
  quantityValue: { fontSize: 11, fontWeight: '700' },
  receiveRow: { borderTopWidth: 1, borderTopColor: '#DDE4E8', paddingTop: 11, paddingLeft: 32, flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiveLabel: { fontSize: 13, fontWeight: '800' },
  receiveHint: { fontSize: 10, marginTop: 2 },
  quantityInput: { width: 65, height: 40, borderRadius: 11, borderWidth: 1.5, textAlign: 'center', fontSize: 14, fontWeight: '800' },
  uom: { fontSize: 12, fontWeight: '700', width: 28 },
  errorBox: { borderRadius: 14, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  errorText: { fontSize: 11, lineHeight: 17, fontWeight: '600' },
});