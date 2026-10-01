import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Header, Screen, InfoPill } from '@/components/Screen';
import { useColors } from '@/hooks/useColors';
import { api, type InvoiceApiResponse } from '@/services/api';

export default function InvoiceDetailScreen() {
  const colors = useColors();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!invoiceId) return;
    void api.getInvoice(Number(invoiceId)).then(setInvoice).catch((cause) => setError(cause instanceof Error ? cause.message : 'Invoice details could not be loaded.'));
  }, [invoiceId]);
  return (
    <Screen>
      <Header title="Invoice details" subtitle="Authoritative SILA Cloud record" onBack={() => router.back()} right={<InfoPill icon="document-text-outline" label={invoice ? invoice.processingStatus : 'Loading'} />} />
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      {invoice ? (
        <View style={styles.content}>
          <Detail label="Supplier" value={invoice.supplier.name} />
          <Detail label="Invoice number" value={invoice.invoiceNumber} />
          <Detail label="Invoice date" value={invoice.invoiceDate} />
          <Detail label="PO number" value={invoice.matchedPoNumber ?? invoice.poNumberExtracted ?? '—'} />
          <Detail label="Amount" value={`${invoice.currency} ${invoice.grossAmount ?? '—'}`} />
          <Detail label="Storage" value={`${invoice.document.storageStatus} · ${invoice.document.fileName}`} />
          <Detail label="Processing" value={`${invoice.processingStatus} · OCR ${invoice.ocrStatus}`} />
          <Text style={[styles.section, { color: colors.navy }]}>Line items</Text>
          {invoice.lines.map((line) => <View key={line.id} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.lineTitle, { color: colors.navy }]}>{line.description}</Text><Text style={[styles.lineText, { color: colors.mutedForeground }]}>{line.quantity ?? '—'} {line.uom ?? ''} · {line.lineGrossAmount}</Text></View>)}
        </View>
      ) : <Text style={[styles.loading, { color: colors.mutedForeground }]}>Loading invoice details…</Text>}
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={styles.detail}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.value, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { gap: 11 },
  detail: { borderBottomWidth: 1, borderBottomColor: '#E5EBEF', paddingBottom: 9, gap: 3 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.7 },
  value: { fontSize: 14, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', marginTop: 5 },
  line: { borderWidth: 1, borderRadius: 13, padding: 11, gap: 4 },
  lineTitle: { fontSize: 13, fontWeight: '700' },
  lineText: { fontSize: 11 },
  loading: { paddingVertical: 30, textAlign: 'center' },
  error: { fontSize: 12, lineHeight: 17 },
});