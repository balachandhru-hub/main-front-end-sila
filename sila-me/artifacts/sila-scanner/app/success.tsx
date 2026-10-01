import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Brand } from '@/components/Brand';
import { PrimaryButton, Screen, SecondaryButton } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function SuccessScreen() {
  const colors = useColors();
  const { invoices, resetDraft } = useAppState();
  const invoice = invoices[0];
  const scanNext = () => {
    resetDraft();
    router.replace('/scan');
  };
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}><Brand compact /><View style={[styles.status, { backgroundColor: colors.lightGreen }]}><Ionicons name="checkmark-circle-outline" size={15} color={colors.success} /><Text style={[styles.statusText, { color: colors.success }]}>Uploaded</Text></View></View>
      <View style={styles.successHero}>
        <View style={[styles.checkCircle, { backgroundColor: colors.lightGreen }]}><View style={[styles.checkCircleInner, { backgroundColor: colors.green }]}><Feather name="check" size={32} color={colors.card} /></View></View>
        <Text style={[styles.title, { color: colors.navy }]}>Invoice Uploaded</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Your document is safely in the processing queue.</Text>
      </View>
      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>FILENAME</Text>
        <Text selectable style={[styles.fileName, { color: colors.navy }]}>{invoice.fileName}</Text>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <DetailRow label="Supplier" value={invoice.supplierName} />
        <DetailRow label="Invoice" value={invoice.invoiceNumber} />
        <DetailRow label="Invoice date" value="10 Sep 2026" />
        <DetailRow label="Destination" value={`${invoice.property} / ${invoice.department}`} />
        {invoice.grnNumber ? <DetailRow label="GRN / material document" value={invoice.grnNumber} /> : null}
      </View>
      <View style={styles.statusList}>
        <StatusRow label="SharePoint" value="Uploaded" icon="cloud-done-outline" />
        <StatusRow label="SILA Fatoora" value="Ready for processing" icon="sparkles-outline" />
        {invoice.grnNumber ? <StatusRow label="ERP GRN" value="Posted" icon="cube-outline" /> : null}
      </View>
      <View style={styles.actions}><PrimaryButton label="Scan Next Invoice" icon="camera" onPress={scanNext} /><SecondaryButton label="View Details" icon="file-text" onPress={() => router.replace('/history')} /></View>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.detailRow}><Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.navy }]}>{value}</Text></View>;
}

function StatusRow({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return <View style={[styles.statusRow, { backgroundColor: colors.lightGreen }]}><Ionicons name={icon} size={19} color={colors.success} /><View style={{ flex: 1 }}><Text style={[styles.statusLabel, { color: colors.navy }]}>{label}</Text><Text style={[styles.statusValue, { color: colors.success }]}>{value}</Text></View><Ionicons name="checkmark-circle" size={18} color={colors.green} /></View>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  status: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  successHero: { alignItems: 'center', gap: 10, marginTop: 10 },
  checkCircle: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  checkCircleInner: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 27, fontWeight: '700', letterSpacing: -0.7 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  detailCard: { borderRadius: 20, padding: 17, borderWidth: 1, gap: 11 },
  detailLabel: { fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  fileName: { fontSize: 13, lineHeight: 19, fontWeight: '700' },
  divider: { height: 1, marginVertical: 2 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  rowLabel: { fontSize: 12 },
  rowValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', flex: 1 },
  statusList: { gap: 8 },
  statusRow: { borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusLabel: { fontSize: 12, fontWeight: '700' },
  statusValue: { fontSize: 11, marginTop: 2 },
  actions: { gap: 10, marginTop: 4 },
});