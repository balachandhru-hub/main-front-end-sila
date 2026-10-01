import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Header, InfoPill, PrimaryButton, Screen, SecondaryButton, SectionTitle } from '@/components/Screen';
import { api, type AuthUserResponse, type ConsumptionDestination, type GoodsIssueApiResponse, type StockAvailabilityResponse } from '@/services/api';
import { useColors } from '@/hooks/useColors';

type Line = { materialCode: string; quantity: number; uom: string; available: number };
const issueTypes = ['DEPARTMENT_CONSUMPTION', 'OUTLET_CONSUMPTION', 'KITCHEN_CONSUMPTION', 'HOUSEKEEPING', 'ENGINEERING', 'EVENT', 'PROJECT', 'EMPLOYEE_ISSUE', 'OTHER'];

export default function GoodsIssueScreen() {
  const colors = useColors();
  const [account, setAccount] = useState<AuthUserResponse | null>(null);
  const [issueType, setIssueType] = useState(issueTypes[0]);
  const [destinations, setDestinations] = useState<ConsumptionDestination[]>([]);
  const [destinationIndex, setDestinationIndex] = useState(0);
  const [materialCode, setMaterialCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('');
  const [reason, setReason] = useState('');
  const [stock, setStock] = useState<StockAvailabilityResponse | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [created, setCreated] = useState<GoodsIssueApiResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const source = account?.stores?.[0];
  const destination = destinations[destinationIndex];

  useEffect(() => {
    void api.getMe().then(setAccount).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load store access.'));
  }, []);
  useEffect(() => {
    if (!account?.properties[0]?.code) return;
    setDestinationIndex(0);
    void api.getGoodsIssueDestinations(account.properties[0].code, issueType).then(setDestinations).catch((cause) => setError(cause instanceof Error ? cause.message : 'Consumption destinations could not be loaded.'));
  }, [account, issueType]);

  const checkAvailability = async () => {
    if (!source || !materialCode.trim()) return;
    try {
      const result = await api.getMaterialStock(materialCode.trim(), { storeCode: source.code, propertyCode: source.propertyCode });
      setStock(result);
      if (!uom) setUom(result.stock.uom);
      setError(null);
    } catch (cause) {
      setStock(null);
      setError(cause instanceof Error ? cause.message : 'Stock could not be loaded.');
    }
  };

  const addLine = () => {
    if (!stock || !materialCode.trim() || Number(quantity) <= 0 || Number(quantity) > stock.stock.available) {
      setError(stock ? `Issue quantity must be between 0 and ${stock.stock.available} ${stock.stock.uom}.` : 'Check available stock before adding the material.');
      return;
    }
    setLines((current) => [...current, { materialCode: materialCode.trim().toUpperCase(), quantity: Number(quantity), uom: uom.trim().toUpperCase() || stock.stock.uom, available: stock.stock.available }]);
    setMaterialCode('');
    setQuantity('');
    setUom('');
    setStock(null);
    setError(null);
  };

  const submit = async () => {
    if (!source || !destination || !reason.trim() || !lines.length) {
      setError('Choose a configured destination, enter a purpose, and add at least one material.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const draft = await api.createGoodsIssue({
        sourceStoreCode: source.code,
        issueType,
        destinationCode: destination.destinationCode,
        reasonCode: reason.trim(),
        idempotencyKey: `mobile-goods-issue-${Date.now()}`,
      });
      for (const line of lines) await api.addGoodsIssueItem(draft.id, line);
      const validation = await api.validateGoodsIssue(draft.id);
      if (!validation.valid) throw new Error(validation.errors.map((item) => item.message).join(' '));
      setCreated(await api.submitGoodsIssue(draft.id));
      setLines([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Goods issue could not be submitted.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Screen>
      <Header title="Goods issue" subtitle="Issue source stock to a configured destination" onBack={() => router.back()} right={<InfoPill icon="archive-outline" label="Step 9" />} />
      <View style={[styles.hero, { backgroundColor: '#FFF6E5' }]}><Text style={[styles.heroTitle, { color: colors.navy }]}>Source stock → business consumption</Text><Text style={[styles.heroText, { color: colors.mutedForeground }]}>Goods Issue never creates destination inventory. Stock decreases only after provider execution.</Text></View>
      <SectionTitle>Issue type</SectionTitle>
      <View style={styles.chips}>{issueTypes.map((type) => <Chip key={type} label={type.replaceAll('_', ' ')} selected={issueType === type} onPress={() => setIssueType(type)} />)}</View>
      <SectionTitle>Destination</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={() => setDestinationIndex(destinations.length ? (destinationIndex + 1) % destinations.length : 0)}><Text style={[styles.label, { color: colors.mutedForeground }]}>CONFIGURED DESTINATION</Text><Text style={[styles.destination, { color: colors.navy }]}>{destination ? `${destination.destinationName} · ${destination.destinationCode}` : 'No configured destination available'}</Text><Text style={[styles.change, { color: colors.primary }]}>Change</Text></Pressable>
        <Field label="Purpose / reason" value={reason} onChangeText={setReason} placeholder="Daily production, maintenance, event..." />
      </View>
      <SectionTitle action={`${lines.length} added`}>Materials</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Field label="Material code" value={materialCode} onChangeText={setMaterialCode} placeholder="Search or scan material code" />
        <View style={styles.inline}><View style={{ flex: 1 }}><Field label="Quantity" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="UOM" value={uom} onChangeText={setUom} placeholder="EA / KG / CASE" /></View></View>
        {stock ? <View style={[styles.stock, { backgroundColor: colors.lightGreen }]}><Text style={[styles.label, { color: colors.success }]}>AVAILABLE {stock.stock.uom}</Text><Text style={[styles.stockValue, { color: colors.navy }]}>{stock.stock.available}</Text></View> : null}
        <SecondaryButton label="Show available stock" icon="search" onPress={() => void checkAvailability()} />
        <PrimaryButton label="Add material" icon="plus" onPress={addLine} disabled={!stock} />
      </View>
      {lines.map((line, index) => <View key={`${line.materialCode}-${index}`} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.lineTitle, { color: colors.navy }]}>{line.materialCode}</Text><Text style={[styles.lineMeta, { color: colors.mutedForeground }]}>Available {line.available} · {line.uom}</Text></View><Text style={[styles.lineQuantity, { color: colors.warning }]}>{line.quantity} {line.uom}</Text></View>)}
      {created ? <View style={[styles.success, { backgroundColor: colors.lightGreen }]}><Text style={[styles.successTitle, { color: colors.success }]}>Goods Issue {created.goodsIssueNumber} · {created.status}</Text><Text style={[styles.lineMeta, { color: colors.navy }]}>Source stock was decreased without creating destination inventory.</Text></View> : null}
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton label="Submit goods issue" icon="send" onPress={() => void submit()} loading={working} disabled={!lines.length || !destination || !reason.trim()} />
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}><Text style={{ color: selected ? colors.primaryForeground : colors.navy, fontSize: 9, fontWeight: '800' }}>{label}</Text></Pressable>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType} style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.background }]} /></View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18, gap: 8 },
  heroTitle: { fontSize: 19, fontWeight: '800' },
  heroText: { fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  label: { fontSize: 9, letterSpacing: 0.8, fontWeight: '800' },
  destination: { fontSize: 14, fontWeight: '800', marginTop: 5 },
  change: { position: 'absolute', right: 0, top: 10, fontSize: 10, fontWeight: '800' },
  field: { gap: 5 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 42, paddingHorizontal: 12, fontSize: 13 },
  inline: { flexDirection: 'row', gap: 10 },
  stock: { borderRadius: 13, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockValue: { fontSize: 14, fontWeight: '800' },
  line: { borderRadius: 15, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineTitle: { fontSize: 13, fontWeight: '800' },
  lineMeta: { fontSize: 10, lineHeight: 15 },
  lineQuantity: { fontSize: 13, fontWeight: '800' },
  success: { borderRadius: 16, padding: 14, gap: 5 },
  successTitle: { fontSize: 12, fontWeight: '800' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
});