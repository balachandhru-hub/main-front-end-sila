import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, PrimaryButton, Screen } from '@/components/Screen';
import { api, type InvoiceApiResponse } from '@/services/api';
import { useColors } from '@/hooks/useColors';

export default function InvoiceTypeReviewScreen() {
  const colors = useColors();
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'MATERIAL' | 'SERVICE' | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!invoiceId) return;
    void api.getInvoice(Number(invoiceId))
      .then(setInvoice)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load the invoice.'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const choose = async (invoiceType: 'MATERIAL' | 'SERVICE') => {
    if (!invoice) return;
    setSaving(invoiceType);
    setError(null);
    try {
      const confirmed = await api.confirmInvoiceExtraction(invoice.id, { invoiceType });
      if (invoiceType === 'SERVICE') {
        router.replace(`/service-invoice?invoiceId=${invoice.id}`);
        return;
      }
      if (confirmed.matchedPoNumber && confirmed.poMatchStatus === 'EXACT_MATCH') {
        await api.confirmInvoicePurchaseOrder(invoice.id, confirmed.matchedPoNumber);
        router.replace(`/invoice-comparison?invoiceId=${invoice.id}`);
      } else {
        await api.matchInvoicePurchaseOrders(invoice.id);
        router.replace(`/invoice-candidates?invoiceId=${invoice.id}`);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Invoice type could not be confirmed.');
      setSaving(null);
    }
  };

  return (
    <Screen>
      <Header title="Confirm invoice type" subtitle="The invoice type needs storekeeper review" onBack={() => router.back()} right={<InfoPill icon="help-circle-outline" label="Review required" />} />
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.mutedForeground }]}>Checking extracted invoice data...</Text></View> : null}
      {invoice ? (
        <>
          <View style={[styles.banner, { backgroundColor: colors.lightBlue }]}><Ionicons name="alert-circle-outline" size={22} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.navy }]}>Invoice Type Could Not Be Confirmed</Text><Text style={[styles.muted, { color: colors.primary }]}>Choose the route that matches the invoice before processing continues.</Text></View></View>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[styles.label, { color: colors.mutedForeground }]}>SUPPLIER</Text><Text style={[styles.value, { color: colors.navy }]}>{invoice.supplier.name}</Text><Text style={[styles.label, { color: colors.mutedForeground }]}>INVOICE</Text><Text style={[styles.value, { color: colors.navy }]}>{invoice.invoiceNumber} · {invoice.invoiceDate}</Text><Text style={[styles.label, { color: colors.mutedForeground }]}>OCR TYPE</Text><Text style={[styles.value, { color: colors.navy }]}>{invoice.invoiceType}</Text></View>
          <PrimaryButton label="Material Invoice" icon="box" onPress={() => void choose('MATERIAL')} loading={saving === 'MATERIAL'} disabled={Boolean(saving)} />
          <PrimaryButton label="Service Invoice" icon="briefcase" onPress={() => void choose('SERVICE')} loading={saving === 'SERVICE'} disabled={Boolean(saving)} />
          {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  muted: { fontSize: 10, lineHeight: 16 },
  banner: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 18, padding: 15, gap: 8 },
  label: { fontSize: 9, letterSpacing: 1, fontWeight: '800', marginTop: 3 },
  value: { fontSize: 13, fontWeight: '800' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
});