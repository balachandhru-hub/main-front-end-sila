import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, PrimaryButton, Screen, SecondaryButton } from '@/components/Screen';
import { api, type InvoiceApiResponse } from '@/services/api';
import { useColors } from '@/hooks/useColors';

export default function ServiceInvoiceScreen() {
  const colors = useColors();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [archiveStatus, setArchiveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    void api.getInvoice(Number(invoiceId))
      .then(setInvoice)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load the service invoice.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const confirm = async () => {
    if (!invoice) return;
    setConfirming(true);
    setError(null);
    try {
      setInvoice(await api.confirmInvoiceExtraction(invoice.id, {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        supplierName: invoice.supplier.name,
        poNumber: invoice.poNumberExtracted ?? undefined,
        invoiceType: 'SERVICE',
      }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invoice confirmation failed.');
    } finally {
      setConfirming(false);
    }
  };

  const archive = async () => {
    if (!invoice) return;
    setArchiving(true);
    setError(null);
    try {
      const result = await api.archiveDocument(invoice.document.id);
      setArchiveStatus(result.storageStatus);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Archive upload failed. Retry when connected.');
    } finally {
      setArchiving(false);
    }
  };

  return (
    <Screen>
      <Header title="Service invoice" subtitle="Stored and archived without goods receiving" onBack={() => router.back()} right={<InfoPill icon="briefcase-outline" label="SERVICE" tone="green" />} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading structured service invoice...</Text></View> : null}
      {invoice ? (
        <>
          <View style={[styles.banner, { backgroundColor: colors.lightGreen }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.success} /><View style={{ flex: 1 }}><Text style={[styles.bannerTitle, { color: colors.navy }]}>SERVICE INVOICE</Text><Text style={[styles.muted, { color: colors.success }]}>Goods Receipt and inventory posting are not applicable.</Text></View></View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Row label="Supplier" value={invoice.supplier.name} />
            <Row label="Supplier TRN" value={invoice.supplier.trn ?? 'Not identified'} />
            <Row label="Invoice number" value={invoice.invoiceNumber} />
            <Row label="Invoice date" value={invoice.invoiceDate} />
            <Row label="PO number" value={invoice.matchedPoNumber ?? invoice.poNumberExtracted ?? 'No PO provided'} />
            <Row label="Net amount" value={`${invoice.currency} ${invoice.netAmount ?? 0}`} />
            <Row label="Tax amount" value={`${invoice.currency} ${invoice.taxAmount ?? 0}`} />
            <Row label="Gross amount" value={`${invoice.currency} ${invoice.grossAmount ?? 0}`} />
            <Row label="Processing" value={invoice.processingStatus.replaceAll('_', ' ')} />
          </View>
          <Text style={[styles.sectionTitle, { color: colors.navy }]}>Service lines</Text>
          {invoice.lines.map((line) => <View key={line.id} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.lineTitle, { color: colors.navy }]}>{line.description}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>{line.quantity ?? '—'} {line.uom ?? ''} · {invoice.currency} {line.unitPrice ?? '—'}</Text></View><Text style={[styles.lineType, { color: colors.primary }]}>{line.lineType}</Text></View>)}
          <View style={[styles.confidence, { backgroundColor: colors.lightBlue }]}><Ionicons name="sparkles-outline" size={16} color={colors.primary} /><Text style={[styles.muted, { color: colors.primary }]}>OCR confidence {Math.round((invoice.ocrConfidence ?? 0) * 100)}% · {invoice.grnStatus ?? 'NOT_APPLICABLE'}</Text></View>
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
          {archiveStatus ? <Text style={[styles.archived, { color: colors.success }]}>Archive status: {archiveStatus.replaceAll('_', ' ')}</Text> : null}
          <PrimaryButton label="Confirm Invoice Data" icon="check" onPress={() => void confirm()} loading={confirming} disabled={invoice.processingStatus === 'SERVICE_COMPLETE'} />
          <PrimaryButton label="Upload / Archive" icon="upload-cloud" onPress={() => void archive()} loading={archiving} disabled={invoice.processingStatus !== 'SERVICE_COMPLETE'} />
          <SecondaryButton label="View Document" icon="file-text" onPress={() => setError(`Document: ${invoice.document.fileName} · ${invoice.document.pageCount} pages`)} />
        </>
      ) : null}
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.row}><Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.rowValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  muted: { fontSize: 10, lineHeight: 16 },
  banner: { borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, gap: 11 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  rowLabel: { fontSize: 11 },
  rowValue: { flex: 1, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  line: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineTitle: { fontSize: 12, fontWeight: '800', marginBottom: 3 },
  lineType: { fontSize: 9, fontWeight: '800' },
  confidence: { borderRadius: 14, padding: 11, flexDirection: 'row', gap: 8, alignItems: 'center' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
  archived: { fontSize: 11, fontWeight: '800' },
});