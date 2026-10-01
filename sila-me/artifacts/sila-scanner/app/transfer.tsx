import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Header, InfoPill, PrimaryButton, Screen, SecondaryButton, SectionTitle } from '@/components/Screen';
import { api, type AuthUserResponse, type StockAvailabilityResponse, type StockTransferApiResponse } from '@/services/api';
import { useColors } from '@/hooks/useColors';

type DraftLine = {
  materialCode: string;
  quantity: number;
  uom: string;
  available: number;
  sourceStorageLocation?: string;
  destinationStorageLocation?: string;
  batchNumber?: string;
};

export default function TransferScreen() {
  const colors = useColors();
  const [account, setAccount] = useState<AuthUserResponse | null>(null);
  const [sourceIndex, setSourceIndex] = useState(0);
  const [destinationIndex, setDestinationIndex] = useState(1);
  const [transferType, setTransferType] = useState<'STORE_TO_STORE' | 'LOCATION_TO_LOCATION' | 'PROPERTY_TO_PROPERTY'>('STORE_TO_STORE');
  const [materialCode, setMaterialCode] = useState('');
  const [quantity, setQuantity] = useState('');
  const [uom, setUom] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [stock, setStock] = useState<StockAvailabilityResponse | null>(null);
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [created, setCreated] = useState<StockTransferApiResponse | null>(null);
  const [working, setWorking] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.getMe().then(setAccount).catch((cause) => setError(cause instanceof Error ? cause.message : 'Could not load store access.'));
  }, []);

  const stores = account?.stores ?? [];
  const source = stores[sourceIndex];
  const destination = stores[destinationIndex];
  const canAdd = Boolean(materialCode.trim() && Number(quantity) > 0 && uom.trim() && stock);

  const checkAvailability = async () => {
    if (!source || !materialCode.trim()) return;
    setChecking(true);
    setError(null);
    try {
      setStock(await api.getMaterialStock(materialCode.trim(), { storeCode: source.code, propertyCode: source.propertyCode }));
      if (!uom) setUom((await api.getMaterialStock(materialCode.trim(), { storeCode: source.code, propertyCode: source.propertyCode })).stock.uom);
    } catch (cause) {
      setStock(null);
      setError(cause instanceof Error ? cause.message : 'Stock could not be loaded.');
    } finally {
      setChecking(false);
    }
  };

  const addLine = () => {
    if (!canAdd || !stock) return;
    const nextQuantity = Number(quantity);
    if (nextQuantity > stock.stock.available) {
      setError(`Only ${stock.stock.available} ${stock.stock.uom} is currently available.`);
      return;
    }
    setLines((current) => [...current, {
      materialCode: materialCode.trim().toUpperCase(),
      quantity: nextQuantity,
      uom: uom.trim().toUpperCase(),
      available: stock.stock.available,
      batchNumber: batchNumber.trim() || undefined,
    }]);
    setMaterialCode('');
    setQuantity('');
    setUom('');
    setBatchNumber('');
    setStock(null);
    setError(null);
  };

  const submit = async () => {
    if (!source || !destination || !lines.length) {
      setError('Choose different stores and add at least one material.');
      return;
    }
    setWorking(true);
    setError(null);
    try {
      const draft = await api.createStockTransfer({
        sourceStoreCode: source.code,
        destinationStoreCode: destination.code,
        transferType,
        idempotencyKey: `mobile-transfer-${Date.now()}`,
      });
      for (const line of lines) {
        await api.addStockTransferItem(draft.id, line);
      }
      const validation = await api.validateStockTransfer(draft.id);
      if (!validation.valid) throw new Error(validation.errors.map((item) => item.message).join(' '));
      setCreated(await api.submitStockTransfer(draft.id));
      setLines([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Transfer could not be submitted.');
    } finally {
      setWorking(false);
    }
  };

  const typeLabel = useMemo(() => transferType === 'LOCATION_TO_LOCATION' ? 'Location to location' : transferType === 'PROPERTY_TO_PROPERTY' ? 'Property to property' : 'Store to store', [transferType]);

  return (
    <Screen>
      <Header title="Stock transfer" subtitle="Move stock between authorized locations" onBack={() => router.back()} right={<InfoPill icon="repeat-outline" label="Step 9" />} />
      <View style={[styles.hero, { backgroundColor: colors.lightBlue }]}>
        <Text style={[styles.heroTitle, { color: colors.navy }]}>Source stock → destination stock</Text>
        <Text style={[styles.heroText, { color: colors.mutedForeground }]}>Stock is revalidated before execution. Goods Issue is a separate consumption flow.</Text>
      </View>
      <SectionTitle>Transfer type</SectionTitle>
      <View style={styles.chips}>{(['STORE_TO_STORE', 'LOCATION_TO_LOCATION', 'PROPERTY_TO_PROPERTY'] as const).map((type) => <Chip key={type} label={type.replaceAll('_', ' ')} selected={transferType === type} onPress={() => setTransferType(type)} />)}</View>
      <SectionTitle>Locations</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <LocationPicker label="FROM" values={stores.map((item) => `${item.name} · ${item.code}`)} index={sourceIndex} onNext={() => setSourceIndex(stores.length ? (sourceIndex + 1) % stores.length : 0)} />
        <LocationPicker label="TO" values={stores.map((item) => `${item.name} · ${item.code}`)} index={destinationIndex} onNext={() => setDestinationIndex(stores.length ? (destinationIndex + 1) % stores.length : 0)} />
        <Text style={[styles.typeText, { color: colors.mutedForeground }]}>{typeLabel}</Text>
      </View>
      <SectionTitle action={`${lines.length} added`}>Materials</SectionTitle>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Field label="Material code" value={materialCode} onChangeText={setMaterialCode} placeholder="Search or scan material code" />
        <View style={styles.inline}><View style={{ flex: 1 }}><Field label="Quantity" value={quantity} onChangeText={setQuantity} placeholder="0" keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="UOM" value={uom} onChangeText={setUom} placeholder="EA / KG / CASE" /></View></View>
        <Field label="Batch (when required)" value={batchNumber} onChangeText={setBatchNumber} placeholder="Optional batch number" />
        {stock ? <View style={[styles.stock, { backgroundColor: colors.lightGreen }]}><Text style={[styles.stockLabel, { color: colors.success }]}>AVAILABLE STOCK</Text><Text style={[styles.stockValue, { color: colors.navy }]}>{stock.stock.available} {stock.stock.uom}</Text></View> : null}
        <SecondaryButton label={checking ? 'Checking stock...' : 'Show available stock'} icon="search" onPress={() => void checkAvailability()} />
        <PrimaryButton label="Add material" icon="plus" onPress={addLine} disabled={!canAdd} />
      </View>
      {lines.map((line, index) => <View key={`${line.materialCode}-${index}`} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={{ flex: 1 }}><Text style={[styles.lineTitle, { color: colors.navy }]}>{line.materialCode}</Text><Text style={[styles.lineMeta, { color: colors.mutedForeground }]}>Available {line.available} · {line.uom}</Text></View><Text style={[styles.lineQuantity, { color: colors.primary }]}>{line.quantity} {line.uom}</Text></View>)}
      {created ? <View style={[styles.success, { backgroundColor: colors.lightGreen }]}><Text style={[styles.successTitle, { color: colors.success }]}>Transfer {created.transferNumber} · {created.status}</Text><Text style={[styles.lineMeta, { color: colors.navy }]}>Source stock decreased and destination stock increased through the development provider.</Text></View> : null}
      {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
      <PrimaryButton label="Submit transfer" icon="send" onPress={() => void submit()} loading={working} disabled={!lines.length || !source || !destination} />
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onPress} style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.card, borderColor: selected ? colors.primary : colors.border }]}><Text style={{ color: selected ? colors.primaryForeground : colors.navy, fontSize: 10, fontWeight: '800' }}>{label}</Text></Pressable>;
}

function LocationPicker({ label, values, index, onNext }: { label: string; values: string[]; index: number; onNext: () => void }) {
  const colors = useColors();
  return <Pressable onPress={onNext} style={styles.location}><Text style={[styles.locationLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.locationValue, { color: colors.navy }]}>{values[index] ?? 'No authorized store'}</Text><Text style={[styles.change, { color: colors.primary }]}>Change</Text></Pressable>;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; keyboardType?: 'default' | 'decimal-pad' }) {
  const colors = useColors();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} keyboardType={keyboardType} autoCapitalize="characters" style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.background }]} /></View>;
}

const styles = StyleSheet.create({
  hero: { borderRadius: 20, padding: 18, gap: 8 },
  heroTitle: { fontSize: 19, fontWeight: '800' },
  heroText: { fontSize: 12, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 9 },
  card: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 12 },
  location: { borderBottomWidth: 1, borderBottomColor: '#DDE4E8', paddingBottom: 11, gap: 3 },
  locationLabel: { fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  locationValue: { fontSize: 13, fontWeight: '800' },
  change: { position: 'absolute', right: 0, top: 15, fontSize: 10, fontWeight: '800' },
  typeText: { fontSize: 10, fontWeight: '700' },
  field: { gap: 5 },
  fieldLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  input: { borderWidth: 1, borderRadius: 12, minHeight: 42, paddingHorizontal: 12, fontSize: 13 },
  inline: { flexDirection: 'row', gap: 10 },
  stock: { borderRadius: 13, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockLabel: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  stockValue: { fontSize: 14, fontWeight: '800' },
  line: { borderRadius: 15, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineTitle: { fontSize: 13, fontWeight: '800' },
  lineMeta: { fontSize: 10, lineHeight: 15 },
  lineQuantity: { fontSize: 13, fontWeight: '800' },
  success: { borderRadius: 16, padding: 14, gap: 5 },
  successTitle: { fontSize: 12, fontWeight: '800' },
  error: { fontSize: 11, lineHeight: 16, fontWeight: '700' },
});