import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, InfoPill, Screen, TabBar } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function ReceiveScreen() {
  const colors = useColors();
  const { property, department, customer, updateDraft } = useAppState();
  const startWithInvoice = () => router.push('/scan');
  const startWithDeliveryNote = () => router.push('/scan');
  const selectSupplier = () => {
    updateDraft({ poNumber: '' });
    router.push('/po-select');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Receive goods" subtitle="New goods receipt" right={<InfoPill icon="cube-outline" label="Material PO + GRN" tone="green" />} />
        <View style={[styles.contextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.contextRow}><Ionicons name="business-outline" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>CUSTOMER</Text><Text style={[styles.contextValue, { color: colors.navy }]}>{customer}</Text></View></View>
          <View style={styles.contextRow}><Ionicons name="location-outline" size={17} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.contextLabel, { color: colors.mutedForeground }]}>PROPERTY / STORE</Text><Text style={[styles.contextValue, { color: colors.navy }]}>{property} · {department}</Text></View></View>
        </View>
        <View style={styles.intro}><Text style={[styles.title, { color: colors.navy }]}>How do you want to start?</Text><Text style={[styles.description, { color: colors.mutedForeground }]}>Establish the supplier and delivery context before matching products to an open Material PO.</Text></View>
        <StartCard icon="file-text" title="Scan invoice" description="Identify supplier, invoice number, date and PO number when available." onPress={startWithInvoice} />
        <StartCard icon="clipboard" title="Scan delivery note" description="Identify supplier, delivery number and PO number from the delivery document." onPress={startWithDeliveryNote} />
        <StartCard icon="users" title="Select supplier" description="Search open Material POs manually when the delivery document has no PO number." onPress={selectSupplier} />
        <View style={[styles.rule, { backgroundColor: colors.lightBlue }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
          <Text style={[styles.ruleText, { color: colors.navy }]}>Only physically received, accepted quantities can be posted to the GRN. Service POs are not eligible.</Text>
        </View>
      </Screen>
      <TabBar active="receive" />
    </View>
  );
}

function StartCard({ icon, title, description, onPress }: { icon: keyof typeof Feather.glyphMap; title: string; description: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.startCard, { backgroundColor: colors.card, borderColor: colors.border }, pressed && styles.pressed]}>
      <View style={[styles.startIcon, { backgroundColor: colors.lightBlue }]}><Feather name={icon} size={20} color={colors.primary} /></View>
      <View style={{ flex: 1, gap: 4 }}><Text style={[styles.startTitle, { color: colors.navy }]}>{title}</Text><Text style={[styles.startDescription, { color: colors.mutedForeground }]}>{description}</Text></View>
      <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  contextCard: { borderRadius: 20, borderWidth: 1, padding: 15, gap: 14 },
  contextRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  contextLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  contextValue: { fontSize: 13, fontWeight: '700', marginTop: 3 },
  intro: { gap: 5 },
  title: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  description: { fontSize: 13, lineHeight: 19 },
  startCard: { minHeight: 82, borderRadius: 18, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  startIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  startTitle: { fontSize: 14, fontWeight: '800' },
  startDescription: { fontSize: 11, lineHeight: 16 },
  rule: { borderRadius: 15, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  ruleText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '600' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});