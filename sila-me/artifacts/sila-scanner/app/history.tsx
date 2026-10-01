import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Screen, Header, TabBar, InfoPill } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { api } from '@/services/api';

export default function HistoryScreen() {
  const colors = useColors();
  const { invoices: localInvoices } = useAppState();
  const [invoices, setInvoices] = useState(localInvoices);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const filters = ['All', 'Today', 'Pending', 'Failed'];
  const refresh = async () => {
    setLoading(true);
    try {
      const result = await api.listInvoices();
      setInvoices(result.items.map((item) => ({
        id: String(item.id),
        fileName: item.document.fileName,
        supplierName: item.supplier.name,
        invoiceNumber: item.invoiceNumber,
        invoiceDate: item.invoiceDate,
        customer: '',
        property: '',
        department: '',
        uploadedBy: '',
        uploadedAt: item.uploadedAt ?? item.createdAt ?? item.invoiceDate,
        status: item.status === 'FAILED' || item.processingStatus === 'OCR_FAILED' ? 'Failed' : item.processingStatus === 'OCR_REVIEW_REQUIRED' ? 'Pending' : 'Uploaded',
        pageCount: item.document.pageCount,
        fileSize: '—',
        poNumber: item.matchedPoNumber ?? item.poNumberExtracted ?? '',
        serverInvoiceId: item.id,
        serverDocumentId: item.document.id,
        processingStatus: item.processingStatus,
      })));
    } catch {
      // Keep the last authoritative result visible when a refresh is interrupted.
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void refresh(); }, []);
  const visible = useMemo(() => invoices.filter((invoice) => {
    const matchesQuery = `${invoice.supplierName} ${invoice.invoiceNumber} ${invoice.fileName}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'All' || (filter === 'Today' && invoice.uploadedAt.includes('Today')) || invoice.status === filter;
    return matchesQuery && matchesFilter;
  }), [filter, invoices, query]);
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Upload history" subtitle="Every invoice captured by your team" right={<InfoPill icon="checkmark-circle-outline" label={`${invoices.length} total`} tone="green" />} />
        <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="search-outline" size={18} color={colors.mutedForeground} /><TextInput accessibilityLabel="Search upload history" value={query} onChangeText={setQuery} placeholder="Search supplier or invoice" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.navy }]} /></View>
        <View style={styles.filters}>{filters.map((item) => <Pressable testID={`history-filter-${item.toLowerCase()}`} accessibilityRole="button" key={item} onPress={() => setFilter(item)} style={[styles.filter, { backgroundColor: filter === item ? colors.primary : colors.card, borderColor: filter === item ? colors.primary : colors.border }]}><Text style={[styles.filterText, { color: filter === item ? colors.card : colors.mutedForeground }]}>{item}</Text></Pressable>)}<Pressable testID="history-refresh" accessibilityRole="button" onPress={() => void refresh()}><Text style={[styles.filterText, { color: colors.primary }]}>{loading ? 'Refreshing…' : 'Refresh'}</Text></Pressable></View>
        <View style={styles.list}>{visible.map((invoice) => <HistoryCard key={invoice.id} invoice={invoice} />)}</View>
        {!visible.length ? <View style={styles.empty}><Ionicons name="search-outline" size={26} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>No matching invoices</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Try a different supplier, invoice number, or filter.</Text></View> : null}
      </Screen>
      <TabBar active="history" />
    </View>
  );
}

function HistoryCard({ invoice }: { invoice: ReturnType<typeof useAppState>['invoices'][number] }) {
  const colors = useColors();
  return (
    <Pressable testID={`history-invoice-${invoice.id}`} accessibilityRole="button" onPress={() => router.push(`/invoice-detail?invoiceId=${invoice.serverInvoiceId ?? invoice.id}`)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}><View style={[styles.docIcon, { backgroundColor: colors.lightGreen }]}><Feather name="file-text" size={19} color={colors.success} /></View><View style={{ flex: 1, gap: 3 }}><Text numberOfLines={1} style={[styles.name, { color: colors.navy }]}>{invoice.supplierName}</Text><Text numberOfLines={1} style={[styles.file, { color: colors.mutedForeground }]}>{invoice.fileName}</Text></View><Ionicons name="checkmark-circle" size={19} color={colors.green} /></View>
      <View style={styles.detailLine}><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{invoice.uploadedAt}</Text><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{invoice.property}</Text><Text style={[styles.detailText, { color: colors.mutedForeground }]}>{invoice.pageCount} pages</Text></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  search: { minHeight: 49, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, fontSize: 13 },
  filters: { flexDirection: 'row', gap: 8 },
  filter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 11, borderWidth: 1 },
  filterText: { fontSize: 11, fontWeight: '700' },
  list: { gap: 10 },
  card: { borderRadius: 18, borderWidth: 1, padding: 13, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  docIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 13, fontWeight: '700' },
  file: { fontSize: 10 },
  detailLine: { paddingLeft: 48, flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  detailText: { fontSize: 10 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 45 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 12, textAlign: 'center', lineHeight: 17 },
});