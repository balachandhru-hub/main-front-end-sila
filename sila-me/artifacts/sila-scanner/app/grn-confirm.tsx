import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, PrimaryButton, Screen, SecondaryButton } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { postGrn } from '@/services/erp/grnService';
import { useColors } from '@/hooks/useColors';

export default function GrnConfirmScreen() {
  const colors = useColors();
  const { draft, selectedPurchaseOrder, purchaseOrderLines, setGrnPosted } = useAppState();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  if (!selectedPurchaseOrder) return null;
  const confirm = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await postGrn({
        poNumber: selectedPurchaseOrder.poNumber,
        supplierId: selectedPurchaseOrder.supplierId,
        plant: selectedPurchaseOrder.plant,
        storageLocation: selectedPurchaseOrder.storageLocation,
        invoiceNumber: draft.invoiceNumber,
        invoiceDate: draft.invoiceDate,
        documentId: draft.documentId,
        invoiceHeaderId: draft.invoiceHeaderId,
        items: purchaseOrderLines.filter((line) => line.included).map((line) => ({
          poItem: line.poItem,
          material: line.materialCode,
          receivedQuantity: line.receivedQuantity,
          uom: line.uom,
          damagedQuantity: line.damagedQuantity,
          rejectedQuantity: line.rejectedQuantity,
        })),
      });
      setGrnPosted(result);
      router.replace(result.pendingApproval ? '/grn-pending' : '/grn-success');
    } catch {
      setError('The ERP is currently unavailable. The invoice has not been posted as received. Please retry.');
      setLoading(false);
    }
  };
  return (
    <Screen>
      <Header title="Confirm goods receipt" subtitle="One final confirmation is required" onBack={() => router.back()} />
      <View style={styles.center}><View style={[styles.warningCircle, { backgroundColor: '#FFF6E5' }]}><Ionicons name="alert-outline" size={32} color={colors.warning} /></View><Text style={[styles.title, { color: colors.navy }]}>Post this goods receipt?</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>You are about to post the selected quantities into the ERP. Confirm that they represent the goods physically received.</Text></View>
      <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}><SummaryRow label="Purchase order" value={selectedPurchaseOrder.poNumber} /><SummaryRow label="Supplier" value={selectedPurchaseOrder.supplierName} /><SummaryRow label="Items" value={`${purchaseOrderLines.filter((line) => line.included).length}`} /><SummaryRow label="Posting date" value="10 Sep 2026" /></View>
      <View style={[styles.warning, { backgroundColor: '#FFF6E5' }]}><Ionicons name="shield-checkmark-outline" size={17} color={colors.warning} /><Text style={[styles.warningText, { color: '#8D5C0C' }]}>GRN posting changes ERP inventory and cannot be completed offline.</Text></View>
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Posting goods receipt...</Text></View> : <View style={styles.actions}><PrimaryButton label="Confirm & Post GRN" icon="check" onPress={confirm} /><SecondaryButton label="Cancel" onPress={() => router.back()} /></View>}
    </Screen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.summaryRow}><Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: 10, paddingVertical: 20 },
  warningCircle: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 310 },
  summary: { borderRadius: 19, borderWidth: 1, padding: 16, gap: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 12 },
  rowValue: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '700' },
  warning: { borderRadius: 14, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  warningText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  error: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  loading: { alignItems: 'center', gap: 9, paddingVertical: 10 },
  loadingText: { fontSize: 12 },
  actions: { gap: 10 },
});