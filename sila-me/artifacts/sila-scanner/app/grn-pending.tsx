import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Header, PrimaryButton, Screen } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function GrnPendingScreen() {
  const colors = useColors();
  const { grn } = useAppState();
  return (
    <Screen>
      <Header title="GRN submitted" subtitle="Approval is required before ERP posting" />
      <View style={styles.hero}>
        <View style={[styles.icon, { backgroundColor: '#FFF6E5' }]}>
          <Ionicons name="time-outline" size={42} color={colors.warning} />
        </View>
        <Text style={[styles.title, { color: colors.navy }]}>Pending approval</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          The receipt is saved safely, but inventory and the purchase order have not been updated yet.
        </Text>
      </View>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Row label="Purchase order" value={grn?.poNumber ?? ''} />
        <Row label="Receipt status" value="Pending approval" />
        <Row label="Lines" value={String(grn?.lineCount ?? 0)} />
      </View>
      <PrimaryButton label="View approvals" icon="list" onPress={() => router.replace('/approvals')} />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.navy }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  icon: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { maxWidth: 300, textAlign: 'center', fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12 },
  value: { fontSize: 12, fontWeight: '800' },
});