import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, Screen } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import type { PurchaseOrder } from '@/services/erp/poService';
import { searchOpenMaterialPOs } from '@/services/erp/poService';
import { useColors } from '@/hooks/useColors';

export default function PurchaseOrderSelectScreen() {
  const colors = useColors();
  const { draft, property, updateDraft, selectPurchaseOrder } = useAppState();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    searchOpenMaterialPOs({ supplierName: draft.supplierName, property, poType: 'ALL' }).then((result) => {
      setOrders(result);
      setLoading(false);
    });
  }, [draft.supplierName, property]);
  return (
    <Screen>
      <Header title="Select purchase order" subtitle="Only open POs are shown" onBack={() => router.back()} right={<InfoPill icon="cube-outline" label="Material + service" />} />
      <View style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.searchLabel, { color: colors.mutedForeground }]}>SUPPLIER SEARCH</Text>
        <TextInput
          accessibilityLabel="Search suppliers"
          value={draft.supplierName}
          onChangeText={(value) => updateDraft({ supplierName: value })}
          placeholder="Supplier name or code (optional)"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.background }]}
          autoCapitalize="none"
        />
      </View>
      <View style={[styles.supplier, { backgroundColor: colors.lightBlue }]}><Ionicons name="business-outline" size={18} color={colors.primary} /><View><Text style={[styles.supplierLabel, { color: colors.primary }]}>SUPPLIER</Text><Text style={[styles.supplierName, { color: colors.navy }]}>{draft.supplierName || 'Unknown supplier'}</Text></View></View>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>Select the PO that matches the goods physically received today.</Text>
      {loading ? <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Retrieving open material POs...</Text></View> : null}
      {!loading && !orders.length ? <View style={styles.empty}><Ionicons name="document-outline" size={28} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>No open POs found</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Check the supplier or continue without GRN posting.</Text></View> : null}
      <View style={styles.list}>{orders.map((order) => (
        <Pressable key={order.poNumber} accessibilityRole="button" onPress={() => { selectPurchaseOrder(order); router.push('/po-detail'); }} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
           <View style={styles.cardTop}><View style={[styles.poIcon, { backgroundColor: order.servicePo ? '#FFF4D6' : colors.lightGreen }]}><Feather name="file-text" size={19} color={order.servicePo ? colors.warning : colors.success} /></View><View style={{ flex: 1 }}><Text style={[styles.poNumber, { color: colors.navy }]}>PO {order.poNumber}</Text><Text style={[styles.poDate, { color: colors.mutedForeground }]}>PO date · {order.poDate}</Text></View><Feather name="chevron-right" size={18} color={colors.primary} /></View>
           <View style={styles.meta}><Meta label="Type" value={order.servicePo ? 'Service only' : 'Material'} /><Meta label="Open lines" value={`${order.items.length}`} /><Meta label="Status" value={order.status === 'PARTIALLY_RECEIVED' ? 'Partially received' : 'Open'} /></View>
        </Pressable>
      ))}</View>
    </Screen>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return <View style={{ flex: 1, gap: 3 }}><Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.metaValue, { color: colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  supplier: { borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchCard: { borderRadius: 18, borderWidth: 1, padding: 13, gap: 7 },
  searchLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, height: 42, fontSize: 13 },
  supplierLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 3 },
  supplierName: { fontSize: 14, fontWeight: '700' },
  helper: { fontSize: 13, lineHeight: 19, marginTop: -3 },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 40 },
  loadingText: { fontSize: 12 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 45 },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 12, textAlign: 'center' },
  list: { gap: 10 },
  card: { borderRadius: 19, borderWidth: 1, padding: 14, gap: 15 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  poIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  poNumber: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  poDate: { fontSize: 11 },
  meta: { flexDirection: 'row', gap: 8 },
  metaLabel: { fontSize: 9, fontWeight: '600' },
  metaValue: { fontSize: 12, fontWeight: '700' },
});