import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { StockMaterialResponse } from '@workspace/api-client-react';
import { Header, InfoPill, PrimaryButton, Screen, TabBar } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { calculateVariance, inventoryLocations, saveInventoryCount, type InventoryCount } from '@/services/inventory/inventoryService';
import { confirmMaterial, lookupMaterialByBarcode, recognizeMaterialFromImage, type MaterialMatch, searchMaterials } from '@/services/material/materialService';
import { getMaterialStock, propertyCodeForName } from '@/services/stock/stockService';

export default function InventoryScreen() {
  const colors = useColors();
  const { property, department, user, customerId, propertyId, selectedStore, hasPermission, createApproval } = useAppState();
  const [locationId, setLocationId] = useState(inventoryLocations[0].id);
  const [blindCount, setBlindCount] = useState(false);
  const [material, setMaterial] = useState<MaterialMatch | null>(null);
  const [stock, setStock] = useState<StockMaterialResponse | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('');
  const [materialQuery, setMaterialQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MaterialMatch[]>([]);
  const [confirmedMaterialCode, setConfirmedMaterialCode] = useState<string | null>(null);
  const [identificationError, setIdentificationError] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [capturedImage, setCapturedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [submitted, setSubmitted] = useState(false);

  const location = inventoryLocations.find((item) => item.id === locationId) ?? inventoryLocations[0];
  const variance = material && stock ? calculateVariance(Number(quantity) || 0, blindCount ? undefined : stock.stock.onHand) : null;
  const alreadyCounted = Boolean(material && counts.some((item) => item.materialCode === material.materialCode));
  const visionEnabled = hasPermission('USE_VISION_RECOGNITION') && hasPermission('VIEW_MATERIALS');

  useEffect(() => {
    if (!material) {
      setStock(null);
      setStockError(null);
      return;
    }
    setStockLoading(true);
    setStockError(null);
    void getMaterialStock(material.materialCode, {
      propertyCode: propertyCodeForName(property),
      storeCode: 'MAIN_STORE',
      storageLocation: locationId,
    })
      .then(setStock)
      .catch((error: unknown) => {
        setStock(null);
        setStockError(error instanceof Error ? error.message : 'Current stock is unavailable.');
      })
      .finally(() => setStockLoading(false));
  }, [locationId, material, property]);

  const selectMaterial = (match: MaterialMatch) => {
    setSubmitted(false);
    setMaterial(match);
    setSearchResults([]);
    setConfirmedMaterialCode(null);
    setIdentificationError(null);
    setStockError(null);
    setQuantity('');
  };

  const identifyFromBarcode = async () => {
    const barcode = materialQuery.trim();
    if (!barcode) {
      setIdentificationError('Enter a barcode before scanning.');
      return;
    }
    setIsIdentifying(true);
    setIdentificationError(null);
    try {
      const match = await lookupMaterialByBarcode(barcode);
      if (!match) {
        setMaterial(null);
        setSearchResults([]);
        setIdentificationError(`No active material was found for barcode ${barcode}.`);
      } else {
        selectMaterial(match);
      }
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : 'Barcode lookup failed.');
    } finally {
      setIsIdentifying(false);
    }
  };

  const identifyFromSearch = async () => {
    setIsIdentifying(true);
    setIdentificationError(null);
    try {
      const results = await searchMaterials(materialQuery);
      if (!results.length) {
        setMaterial(null);
        setSearchResults([]);
        setIdentificationError('No active materials matched that search.');
      } else if (results.length === 1) {
        selectMaterial(results[0]);
      } else {
        setMaterial(null);
        setSearchResults(results);
      }
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : 'Material search failed.');
    } finally {
      setIsIdentifying(false);
    }
  };

  const identifyFromPhoto = async () => {
    if (isIdentifying) return;
    if (!visionEnabled) {
      Alert.alert('Photo recognition unavailable', 'Your SILA role does not have permission to use Vision material recognition.');
      return;
    }
    if (!customerId || !propertyId || !selectedStore) {
      setIdentificationError('A valid customer, property, and store context is required before photo recognition.');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setIdentificationError('Camera permission is required. You can continue with barcode lookup or manual search.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      exif: false,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const image = result.assets[0];
    if (image.mimeType && !image.mimeType.startsWith('image/')) {
      setIdentificationError('Please capture an image file.');
      return;
    }
    if (image.fileSize && image.fileSize > 8 * 1024 * 1024) {
      setIdentificationError('The image is larger than 8 MB. Retake the photo closer to the product.');
      return;
    }

    setCapturedImage(image);
    setMaterial(null);
    setSearchResults([]);
    setConfirmedMaterialCode(null);
    setIdentificationError(null);
    setIsIdentifying(true);
    try {
      const recognition = await recognizeMaterialFromImage({
        image: {
          uri: image.uri,
          name: image.fileName ?? `sila-vision-${Date.now()}.jpg`,
          type: image.mimeType ?? 'image/jpeg',
          file: image.file,
        },
        customerId,
        propertyId,
        storeId: selectedStore.id,
        context: {
          propertyCode: selectedStore.propertyCode,
          storeCode: selectedStore.code,
        },
      });
      if (!recognition.candidates.length) {
        setIdentificationError('MATERIAL_NOT_IDENTIFIED. Retake the photo, scan a barcode, or search the material master.');
      } else if (recognition.candidates.length === 1) {
        selectMaterial(recognition.candidates[0]);
      } else {
        setIdentificationError('Several materials matched this image. Select the correct material before confirming.');
        setSearchResults(recognition.candidates);
      }
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : 'Vision recognition failed. Use barcode lookup or manual search.');
    } finally {
      setIsIdentifying(false);
    }
  };

  const confirmSelectedMaterial = async () => {
    if (!material) return;
    setIsIdentifying(true);
    setIdentificationError(null);
    try {
      await confirmMaterial({
        materialCode: material.materialCode,
        source: material.matchedBy,
        scanReference: material.recognitionRunId ?? null,
      });
      setConfirmedMaterialCode(material.materialCode);
    } catch (error) {
      setIdentificationError(error instanceof Error ? error.message : 'Material confirmation failed.');
    } finally {
      setIsIdentifying(false);
    }
  };

  const saveCount = async () => {
    if (!material || confirmedMaterialCode !== material.materialCode || !quantity || Number(quantity) < 0 || !stock) return;
    const count: InventoryCount = {
      materialCode: material.materialCode,
      description: material.description,
      locationId,
      physicalQuantity: Number(quantity),
      bookQuantity: blindCount ? undefined : stock.stock.onHand,
      uom: stock.stock.uom,
    };
    await saveInventoryCount(count);
    setCounts((current) => [...current.filter((item) => item.materialCode !== count.materialCode), count]);
    setMaterial(null);
    setQuantity('');
  };

  const totalVarianceItems = useMemo(() => counts.filter((count) => calculateVariance(count.physicalQuantity, count.bookQuantity)?.quantity !== 0).length, [counts]);
  const submitCountForReview = () => {
    createApproval({
      type: 'INVENTORY_COUNT',
      title: `${location.label} inventory count`,
      description: `${counts.length} products submitted for manager review before any adjustment is posted.`,
      submittedBy: user.name,
      property,
      store: department,
      varianceItems: totalVarianceItems,
      totalItems: counts.length,
    });
    setSubmitted(true);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Screen>
        <Header title="Count inventory" subtitle="Physical stock count" right={<InfoPill icon="barcode-outline" label="No PO required" tone="green" />} />
        <View style={[styles.modeBanner, { backgroundColor: colors.lightGreen }]}>
          <Ionicons name="scan-outline" size={18} color={colors.success} />
          <View style={{ flex: 1 }}><Text style={[styles.modeTitle, { color: colors.navy }]}>Inventory Count Mode</Text><Text style={[styles.modeText, { color: colors.success }]}>Identify material, enter physical quantity, then review variance.</Text></View>
        </View>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.navy }]}>1. Select area</Text><Text style={[styles.property, { color: colors.mutedForeground }]}>{property}</Text></View>
        <View style={styles.locationList}>
          {inventoryLocations.slice(0, 5).map((item) => (
            <Pressable key={item.id} accessibilityRole="button" onPress={() => { setLocationId(item.id); setMaterial(null); }} style={[styles.locationChip, { backgroundColor: locationId === item.id ? colors.primary : colors.card, borderColor: locationId === item.id ? colors.primary : colors.border }]}>
              <Text style={[styles.locationText, { color: locationId === item.id ? colors.card : colors.navy }]}>{item.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={[styles.blindCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flex: 1 }}><Text style={[styles.blindTitle, { color: colors.navy }]}>Blind count</Text><Text style={[styles.blindText, { color: colors.mutedForeground }]}>Hide ERP book stock until the physical count is saved.</Text></View>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: blindCount }} onPress={() => setBlindCount((value) => !value)} style={[styles.switch, { backgroundColor: blindCount ? colors.primary : colors.muted }]}><View style={[styles.switchThumb, blindCount && styles.switchThumbOn]} /></Pressable>
        </View>
        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.navy }]}>2. Identify product</Text><Text style={[styles.property, { color: colors.mutedForeground }]}>{counts.length} counted</Text></View>
        <View style={styles.identifyRow}>
          <IdentifyButton icon="maximize" label="Barcode lookup" onPress={identifyFromBarcode} />
           <IdentifyButton icon="camera" label="Take picture" onPress={() => void identifyFromPhoto()} />
          <IdentifyButton icon="search" label="Search" onPress={identifyFromSearch} />
        </View>
        <TextInput
          accessibilityLabel="Barcode or material search"
          value={materialQuery}
          onChangeText={setMaterialQuery}
          placeholder="Enter barcode, material code, or description"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.materialSearchInput, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]}
          autoCapitalize="none"
          editable={!isIdentifying}
        />
        {identificationError ? <Text style={[styles.identificationError, { color: colors.warning }]}>{identificationError}</Text> : null}
        {searchResults.length ? (
          <View style={[styles.searchResults, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.searchResultsTitle, { color: colors.navy }]}>Select a material</Text>
            {searchResults.map((result) => (
              <Pressable key={`${result.materialCode}-${result.plantCode}`} onPress={() => selectMaterial(result)} style={[styles.searchResultRow, { borderTopColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.searchResultName, { color: colors.navy }]}>{result.description}</Text>
                  <Text style={[styles.searchResultMeta, { color: colors.mutedForeground }]}>{result.materialCode} · {result.baseUom}</Text>
                </View>
                <Feather name="chevron-right" size={17} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        ) : null}
        {capturedImage ? (
          <View style={[styles.captureCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Image source={{ uri: capturedImage.uri }} style={styles.capturePreview} accessibilityLabel="Captured product image" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.captureTitle, { color: colors.navy }]}>Captured product image</Text>
              <Text style={[styles.captureMeta, { color: colors.mutedForeground }]}>Retake if the label or packaging is not clear.</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={() => void identifyFromPhoto()} disabled={isIdentifying} style={[styles.retakeButton, { borderColor: colors.primary }]}>
              <Feather name="rotate-ccw" size={15} color={colors.primary} />
              <Text style={[styles.retakeText, { color: colors.primary }]}>Retake</Text>
            </Pressable>
          </View>
        ) : null}
        {material ? (
          <View style={[styles.materialCard, { backgroundColor: colors.card, borderColor: colors.primary }]}>
            <View style={styles.materialTop}><View style={[styles.materialIcon, { backgroundColor: colors.lightBlue }]}><Feather name="package" size={19} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.materialTitle, { color: colors.navy }]}>{material.description}</Text><Text style={[styles.materialMeta, { color: colors.mutedForeground }]}>{material.materialCode} · {material.packSize}</Text></View><InfoPill icon="checkmark-circle-outline" label={`${Math.round(material.confidence * 100)}% match`} tone="green" /></View>
             {material.matchReasons?.length ? <Text style={[styles.matchReasons, { color: colors.mutedForeground }]}>Matched by {material.matchReasons.join(' · ')}</Text> : null}
             {alreadyCounted ? <Text style={[styles.duplicate, { color: colors.warning }]}>Material already counted. Saving again will update the existing count.</Text> : null}
             <View style={styles.countRow}><View style={{ flex: 1 }}><Text style={[styles.countLabel, { color: colors.navy }]}>PHYSICAL QUANTITY</Text><Text style={[styles.countHint, { color: colors.mutedForeground }]}>{location.label} · {stock?.stock.uom ?? material.countUom}</Text></View><TextInput accessibilityLabel="Physical quantity" value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.mutedForeground} style={[styles.quantityInput, { color: colors.navy, borderColor: colors.primary, backgroundColor: colors.lightBlue }]} /><Text style={[styles.uom, { color: colors.navy }]}>{stock?.stock.uom ?? material.countUom}</Text></View>
             {stockLoading ? <Text style={[styles.stockHint, { color: colors.mutedForeground }]}>Loading current stock…</Text> : null}
             {stockError ? <Text style={[styles.stockHint, { color: colors.warning }]}>Current stock is unavailable. Material confirmation is still allowed.</Text> : null}
             {!blindCount && stock ? <View style={[styles.stockCard, { backgroundColor: colors.lightBlue }]}><View style={styles.stockHeader}><Text style={[styles.stockTitle, { color: colors.navy }]}>Current stock</Text><Text style={[styles.stockValue, { color: colors.primary }]}>{stock.stock.onHand} {stock.stock.uom}</Text></View><Text style={[styles.stockMeta, { color: colors.mutedForeground }]}>Available {stock.stock.available} · Blocked {stock.stock.blocked} · Quality check {stock.stock.qualityInspection}</Text><Text style={[styles.stockSource, { color: colors.mutedForeground }]}>{stock.sourceSystem} · Synced {new Date(stock.lastSyncedAt).toLocaleString()}</Text></View> : blindCount ? <Text style={[styles.blindHint, { color: colors.primary }]}>ERP stock is hidden until this count is saved.</Text> : null}
             {!blindCount && stock ? <View style={styles.varianceRow}><Text style={[styles.varianceText, { color: colors.mutedForeground }]}>ERP stock: {stock.stock.onHand} {stock.stock.uom}</Text><Text style={[styles.varianceText, { color: variance?.quantity === 0 ? colors.success : colors.warning }]}>{variance ? `${variance.quantity > 0 ? '+' : ''}${variance.quantity} variance` : 'Enter count to compare'}</Text></View> : null}
             {confirmedMaterialCode === material.materialCode ? (
               <PrimaryButton label="Save & next" icon="check" onPress={saveCount} disabled={!quantity || Number(quantity) < 0 || !stock || isIdentifying} />
             ) : (
               <PrimaryButton label={isIdentifying ? 'Confirming material…' : 'Confirm material'} icon="check" onPress={confirmSelectedMaterial} disabled={isIdentifying} />
             )}
          </View>
         ) : <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="barcode-outline" size={26} color={colors.mutedForeground} /><Text style={[styles.emptyTitle, { color: colors.navy }]}>Ready to identify a product</Text><Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Use an exact barcode, product photo, or material search. Vision results always require your confirmation.</Text></View>}
        {counts.length ? <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={styles.reviewHeader}><View><Text style={[styles.reviewTitle, { color: colors.navy }]}>Review count</Text><Text style={[styles.reviewMeta, { color: colors.mutedForeground }]}>{counts.length} products · {totalVarianceItems} variance items</Text></View><Ionicons name="clipboard-outline" size={21} color={colors.primary} /></View>{counts.map((count) => <View key={count.materialCode} style={styles.countedRow}><View style={{ flex: 1 }}><Text style={[styles.countedName, { color: colors.navy }]}>{count.description}</Text><Text style={[styles.countedMeta, { color: colors.mutedForeground }]}>{count.physicalQuantity} {count.uom} · {location.label}</Text></View><Text style={[styles.varianceValue, { color: calculateVariance(count.physicalQuantity, count.bookQuantity)?.quantity === 0 ? colors.success : colors.warning }]}>{count.bookQuantity === undefined ? 'Saved' : `${(calculateVariance(count.physicalQuantity, count.bookQuantity)?.quantity ?? 0) > 0 ? '+' : ''}${calculateVariance(count.physicalQuantity, count.bookQuantity)?.quantity}`}</Text></View>)}<PrimaryButton label={submitted ? 'Submitted for manager review' : 'Submit count for review'} icon="send" onPress={submitCountForReview} disabled={submitted} /></View> : null}
      </Screen>
      <TabBar active="inventory" />
    </View>
  );
}

function IdentifyButton({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const colors = useColors();
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.identifyButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name={icon} size={18} color={colors.primary} /><Text style={[styles.identifyLabel, { color: colors.navy }]}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  modeBanner: { borderRadius: 16, padding: 12, flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  modeTitle: { fontSize: 13, fontWeight: '800' },
  modeText: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  property: { fontSize: 10, fontWeight: '600' },
  locationList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  locationChip: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  locationText: { fontSize: 11, fontWeight: '700' },
  blindCard: { borderRadius: 16, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  blindTitle: { fontSize: 13, fontWeight: '800' },
  blindText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  switch: { width: 44, height: 26, borderRadius: 15, padding: 3, justifyContent: 'center' },
  switchThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFFFFF' },
  switchThumbOn: { alignSelf: 'flex-end' },
  captureCard: { borderRadius: 16, borderWidth: 1, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  capturePreview: { width: 54, height: 54, borderRadius: 12, backgroundColor: '#E9EEF2' },
  captureTitle: { fontSize: 12, fontWeight: '800' },
  captureMeta: { fontSize: 10, lineHeight: 14, marginTop: 2 },
  retakeButton: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 8, alignItems: 'center', gap: 3 },
  retakeText: { fontSize: 10, fontWeight: '800' },
  matchReasons: { fontSize: 10, lineHeight: 15, marginTop: 8 },
  identifyRow: { flexDirection: 'row', gap: 8 },
  identifyButton: { flex: 1, minHeight: 65, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 7 },
  identifyLabel: { fontSize: 10, fontWeight: '700', textAlign: 'center' },
  materialSearchInput: { minHeight: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, fontSize: 12 },
  identificationError: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  searchResults: { borderRadius: 16, borderWidth: 1, padding: 12, gap: 9 },
  searchResultsTitle: { fontSize: 13, fontWeight: '800' },
  searchResultRow: { borderTopWidth: 1, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchResultName: { fontSize: 12, fontWeight: '700' },
  searchResultMeta: { fontSize: 10, marginTop: 3 },
  materialCard: { borderRadius: 19, borderWidth: 1.5, padding: 13, gap: 13 },
  materialTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  materialIcon: { width: 39, height: 39, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  materialTitle: { fontSize: 13, fontWeight: '800' },
  materialMeta: { fontSize: 10, marginTop: 3 },
  duplicate: { fontSize: 11, lineHeight: 16, fontWeight: '600' },
  countRow: { borderTopWidth: 1, borderTopColor: '#DDE4E8', paddingTop: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  countLabel: { fontSize: 11, fontWeight: '800' },
  countHint: { fontSize: 10, marginTop: 3 },
  quantityInput: { width: 70, height: 42, borderRadius: 11, borderWidth: 1.5, textAlign: 'center', fontSize: 15, fontWeight: '800' },
  uom: { width: 30, fontSize: 12, fontWeight: '800' },
  varianceRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  varianceText: { fontSize: 10, fontWeight: '700' },
  blindHint: { fontSize: 10, fontWeight: '700' },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 24, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '800' },
  emptyText: { fontSize: 11, lineHeight: 17, textAlign: 'center' },
  reviewCard: { borderRadius: 19, borderWidth: 1, padding: 13, gap: 11 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewTitle: { fontSize: 16, fontWeight: '800' },
  reviewMeta: { fontSize: 10, marginTop: 3 },
  countedRow: { borderTopWidth: 1, borderTopColor: '#DDE4E8', paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  countedName: { fontSize: 12, fontWeight: '700' },
  countedMeta: { fontSize: 10, marginTop: 3 },
  varianceValue: { fontSize: 12, fontWeight: '800' },
  stockCard: { borderRadius: 14, padding: 11, gap: 5 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stockTitle: { fontSize: 12, fontWeight: '800' },
  stockValue: { fontSize: 15, fontWeight: '800' },
  stockMeta: { fontSize: 10, lineHeight: 15 },
  stockSource: { fontSize: 9, lineHeight: 14 },
  stockHint: { fontSize: 10, lineHeight: 15, fontWeight: '600' },
});