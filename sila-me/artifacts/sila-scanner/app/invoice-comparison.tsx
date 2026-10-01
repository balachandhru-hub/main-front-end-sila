import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, PrimaryButton, Screen, InfoPill } from '@/components/Screen';
import { api } from '@/services/api';
import { useAppState } from '@/context/AppStateContext';
import { getPurchaseOrder } from '@/services/erp/poService';
import { useColors } from '@/hooks/useColors';

type Comparison = Awaited<ReturnType<typeof api.getInvoiceComparison>>;

export default function InvoiceComparisonScreen() {
  const colors = useColors();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { selectPurchaseOrder, updateDraft } = useAppState();
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    void api.getInvoiceComparison(Number(invoiceId))
      .then(setComparison)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load invoice comparison.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const continueToReceive = async () => {
    if (!comparison?.poNumber) return;
    setStarting(true);
    setError(null);
    try {
      const start = await api.startReceivingFromInvoice(Number(invoiceId));
      const po = await getPurchaseOrder(start.poNumber);
      if (!po) throw new Error('The confirmed purchase order could not be loaded.');
      selectPurchaseOrder(po);
      updateDraft({ documentId: start.documentId, invoiceHeaderId: Number(invoiceId), poNumber: start.poNumber, invoiceNumber: start.invoiceNumber });
      await api.archiveDocument(start.documentId);
      router.replace('/po-detail');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Receiving could not be started.');
      setStarting(false);
    }
  };

  return (
    <Screen>
      <Header title="Invoice vs purchase order" subtitle="Invoice quantities are comparison data only" onBack={() => router.back()} right={<InfoPill icon="git-compare-outline" label={comparison?.poNumber ? `PO ${comparison.poNumber}` : 'Review'} />} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Loading line comparison...</Text></View> : null}
      {comparison?.lines.map((item, index) => {
        const line = item.invoiceLine as { description: string; quantity: string | null; uom: string | null; unitPrice: string | null; lineGrossAmount: string };
        const po = item.poLine as { materialDescription?: string; openQuantity?: string; uom?: string; unitPrice?: string | null } | null;
        const matched = Boolean(item.matched);
        return (
          <View key={index} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardTop}><Text style={[styles.description, { color: colors.navy }]}>{line.description}</Text><Ionicons name={matched ? 'checkmark-circle' : 'alert-circle'} size={18} color={matched ? colors.success : colors.warning} /></View>
            <View style={styles.columns}>
              <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.mutedForeground }]}>INVOICE</Text><Text style={[styles.value, { color: colors.navy }]}>{line.quantity ?? '—'} {line.uom ?? ''}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>AED {line.unitPrice ?? '—'} · {line.lineGrossAmount}</Text></View>
              <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.mutedForeground }]}>PO OPEN</Text><Text style={[styles.value, { color: colors.navy }]}>{po?.openQuantity ?? '—'} {po?.uom ?? ''}</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>AED {po?.unitPrice ?? '—'}</Text></View>
            </View>
            <Text style={[styles.flag, { color: matched ? colors.success : colors.warning }]}>{(item.flags as string[]).join(' · ').replaceAll('_', ' ')}</Text>
          </View>
        );
      })}
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton label="Continue to Receive Goods" icon="arrow-right" onPress={() => void continueToReceive()} loading={starting} disabled={!comparison?.poNumber || loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  muted: { fontSize: 10, lineHeight: 16 },
  card: { borderWidth: 1, borderRadius: 18, padding: 13, gap: 10 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  description: { flex: 1, fontSize: 13, fontWeight: '800' },
  columns: { flexDirection: 'row', gap: 16 },
  label: { fontSize: 9, letterSpacing: 1, fontWeight: '800', marginBottom: 3 },
  value: { fontSize: 14, fontWeight: '800' },
  flag: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
});