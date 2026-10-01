import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, Screen } from '@/components/Screen';
import { api, type InvoiceCandidatesResponse } from '@/services/api';
import { useColors } from '@/hooks/useColors';

export default function InvoiceCandidatesScreen() {
  const colors = useColors();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const [result, setResult] = useState<InvoiceCandidatesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    void api.getInvoiceCandidates(Number(invoiceId))
      .then(setResult)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load purchase order candidates.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const select = async (poNumber: string) => {
    setSelecting(poNumber);
    setError(null);
    try {
      await api.confirmInvoicePurchaseOrder(Number(invoiceId), poNumber);
      router.replace(`/invoice-comparison?invoiceId=${invoiceId}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The purchase order could not be confirmed.');
      setSelecting(null);
    }
  };

  return (
    <Screen>
      <Header title="Suggested purchase orders" subtitle="Confirm the invoice match before receiving" onBack={() => router.back()} right={<InfoPill icon="git-compare-outline" label="Review required" />} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Matching invoice lines to open supplier POs...</Text></View> : null}
      {!loading && result?.candidates.length === 0 ? <View style={[styles.empty, { borderColor: colors.border }]}><Ionicons name="document-outline" size={28} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>No open purchase order found</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>Save the invoice or contact Procurement. A material GRN cannot be posted without a valid open PO.</Text></View> : null}
      {result ? <View style={[styles.supplier, { backgroundColor: colors.lightBlue }]}><Ionicons name="business-outline" size={18} color={colors.primary} /><View><Text style={[styles.label, { color: colors.primary }]}>SUPPLIER</Text><Text style={[styles.supplierName, { color: colors.navy }]}>{result.supplier.name}</Text></View></View> : null}
      <View style={styles.list}>
        {result?.candidates.map((candidate, index) => (
          <Pressable key={candidate.poNumber} accessibilityRole="button" disabled={Boolean(selecting)} onPress={() => void select(candidate.poNumber)} style={[styles.card, { backgroundColor: colors.card, borderColor: index === 0 ? colors.primary : colors.border }]}>
            <View style={[styles.icon, { backgroundColor: index === 0 ? colors.lightBlue : colors.background }]}><Ionicons name="receipt-outline" size={18} color={colors.primary} /></View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.po, { color: colors.navy }]}>PO {candidate.poNumber}</Text>
              <Text style={[styles.muted, { color: colors.mutedForeground }]}>{candidate.matchedLineCount} of {candidate.invoiceLineCount} invoice lines matched · {candidate.status}</Text>
              <Text style={[styles.score, { color: candidate.matchConfidence >= 0.75 ? colors.success : colors.warning }]}>{Math.round(candidate.matchConfidence * 100)}% match</Text>
            </View>
            {selecting === candidate.poNumber ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />}
          </Pressable>
        ))}
      </View>
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  muted: { fontSize: 11, lineHeight: 17 },
  empty: { borderWidth: 1, borderRadius: 18, padding: 26, alignItems: 'center', gap: 9 },
  emptyTitle: { fontSize: 15, fontWeight: '800', textAlign: 'center' },
  supplier: { borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  supplierName: { fontSize: 13, fontWeight: '800', marginTop: 3 },
  list: { gap: 10 },
  card: { borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  po: { fontSize: 13, fontWeight: '800' },
  score: { fontSize: 11, fontWeight: '800' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
});