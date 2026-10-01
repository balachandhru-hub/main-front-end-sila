import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { PrimaryButton, Screen } from '@/components/Screen';
import { Brand } from '@/components/Brand';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

export default function GrnSuccessScreen() {
  const colors = useColors();
  const { grn } = useAppState();
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.top}><Brand compact /><View style={[styles.status, { backgroundColor: colors.lightGreen }]}><Ionicons name="checkmark-circle-outline" size={15} color={colors.success} /><Text style={[styles.statusText, { color: colors.success }]}>ERP updated</Text></View></View>
      <View style={styles.hero}><View style={[styles.checkCircle, { backgroundColor: colors.lightGreen }]}><View style={[styles.checkInner, { backgroundColor: colors.green }]}><Feather name="check" size={31} color={colors.card} /></View></View><Text style={[styles.title, { color: colors.navy }]}>GRN Posted Successfully</Text><Text style={[styles.subtitle, { color: colors.mutedForeground }]}>The physically received quantities are recorded in the ERP.</Text></View>
      <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Row label="Material document" value={grn?.materialDocument ?? '5000123498'} /><Row label="Purchase order" value={grn?.poNumber ?? ''} /><Row label="Posting date" value={grn?.postingDate ?? '2026-09-10'} /><Row label="ERP status" value="Posted" green /></View>
      <View style={[styles.notice, { backgroundColor: colors.lightBlue }]}><Ionicons name="arrow-forward-circle-outline" size={19} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.navy }]}>Continue to upload the invoice to SharePoint and SILA Fatoora.</Text></View>
      <PrimaryButton label="Continue to Upload" icon="upload-cloud" onPress={() => router.replace('/review')} />
    </Screen>
  );
}

function Row({ label, value, green }: { label: string; value: string; green?: boolean }) {
  const colors = useColors();
  return <View style={styles.row}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.value, { color: green ? colors.success : colors.navy }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  content: { justifyContent: 'space-between' },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { borderRadius: 11, paddingHorizontal: 9, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusText: { fontSize: 11, fontWeight: '700' },
  hero: { alignItems: 'center', gap: 10, marginTop: 12 },
  checkCircle: { width: 105, height: 105, borderRadius: 53, alignItems: 'center', justifyContent: 'center' },
  checkInner: { width: 73, height: 73, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, lineHeight: 20, textAlign: 'center', maxWidth: 290 },
  detailCard: { borderRadius: 19, borderWidth: 1, padding: 16, gap: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12 },
  value: { flex: 1, textAlign: 'right', fontSize: 12, fontWeight: '800' },
  notice: { borderRadius: 15, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' },
  noticeText: { flex: 1, fontSize: 11, lineHeight: 17, fontWeight: '600' },
});