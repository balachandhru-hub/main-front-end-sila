import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, PrimaryButton, Screen, SecondaryButton, InfoPill } from '@/components/Screen';
import { useAppState, type DraftPage } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';

const MAX_FILE_BYTES = Number(process.env.EXPO_PUBLIC_MAX_INVOICE_BYTES) || 20 * 1024 * 1024;

function stableName(uri: string, index: number, mimeType = 'image/jpeg'): string {
  const extension = mimeType.includes('pdf') ? 'pdf' : mimeType.includes('png') ? 'png' : 'jpg';
  return uri.split('/').pop() || `invoice-page-${index + 1}.${extension}`;
}

async function localCopy(uri: string, name: string): Promise<string> {
  const target = `${FileSystem.Paths.document.uri}invoice-${Date.now()}-${name.replace(/[^a-z0-9._-]/gi, '-')}`;
  await FileSystem.copyAsync({ from: uri, to: target });
  return target;
}

async function fileSize(uri: string): Promise<number | undefined> {
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists && !info.isDirectory ? info.size : undefined;
}

export default function ScanScreen() {
  const colors = useColors();
  const { draft, updateDraft, resetDraft } = useAppState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addImages = async (assets: ImagePicker.ImagePickerAsset[], replace = false) => {
    const pages: DraftPage[] = [];
    for (const [index, asset] of assets.entries()) {
      const mimeType = asset.mimeType || 'image/jpeg';
      const size = asset.fileSize ?? await fileSize(asset.uri);
      if (size && size > MAX_FILE_BYTES) throw new Error('This invoice is larger than the 20 MB maximum.');
      pages.push({
        uri: await localCopy(asset.uri, stableName(asset.uri, index, mimeType)),
        name: stableName(asset.uri, index, mimeType),
        mimeType,
        size,
      });
    }
    updateDraft({
      pages: replace ? pages : [...draft.pages, ...pages],
      pageCount: replace ? pages.length : draft.pages.length + pages.length,
      fileUri: undefined,
      fileName: undefined,
      mimeType: undefined,
      fileSizeBytes: undefined,
      uploadStatus: 'PENDING',
      processingStatus: 'NOT_STARTED',
      lastError: undefined,
    });
  };

  const capture = async (replace = false) => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError('Camera access is required to capture an invoice.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
      allowsEditing: false,
    });
    if (!result.canceled) await addImages(result.assets, replace);
  };

  const gallery = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 20,
      quality: 0.9,
    });
    if (!result.canceled) await addImages(result.assets);
  };

  const importDocument = async () => {
    setError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const size = asset.size ?? await fileSize(asset.uri);
    if (size && size > MAX_FILE_BYTES) {
      setError('This invoice is larger than the 20 MB maximum.');
      return;
    }
    const mimeType = asset.mimeType || (asset.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
      setError('Unsupported file. Choose a PDF, JPEG, or PNG invoice.');
      return;
    }
    const uri = await localCopy(asset.uri, asset.name);
    if (mimeType === 'application/pdf') {
      updateDraft({
        pages: [{ uri, name: asset.name, mimeType, size }],
        pageCount: 1,
        fileUri: uri,
        fileName: asset.name,
        mimeType,
        fileSizeBytes: size,
        uploadStatus: 'PENDING',
        processingStatus: 'NOT_STARTED',
      });
    } else {
      await addImages([{ uri, fileName: asset.name, mimeType, fileSize: size, width: 0, height: 0 } as ImagePicker.ImagePickerAsset]);
    }
  };

  const finish = async () => {
    if (!draft.pages.length) {
      setError('Capture or import at least one invoice page first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (draft.pages.length === 1 && draft.pages[0].mimeType === 'application/pdf') {
        updateDraft({
          fileUri: draft.pages[0].uri,
          fileName: draft.pages[0].name,
          mimeType: draft.pages[0].mimeType,
          fileSizeBytes: draft.pages[0].size,
        });
      } else {
        const html = draft.pages
          .map((page) => `<img src="${page.uri}" style="width:100%;height:auto;display:block;page-break-after:always" />`)
          .join('');
        const printed = await Print.printToFileAsync({ html });
        const uri = await localCopy(printed.uri, `invoice-${draft.localId}.pdf`);
        const size = await fileSize(uri);
        if (size && size > MAX_FILE_BYTES) throw new Error('The generated PDF is larger than the 20 MB maximum.');
        updateDraft({
          fileUri: uri,
          fileName: `invoice-${draft.localId}.pdf`,
          mimeType: 'application/pdf',
          fileSizeBytes: size,
        });
      }
      router.replace('/review');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The invoice PDF could not be prepared.');
    } finally {
      setBusy(false);
    }
  };

  const deletePage = (index: number) => {
    const pages = draft.pages.filter((_, pageIndex) => pageIndex !== index);
    updateDraft({ pages, pageCount: pages.length });
  };

  return (
    <Screen>
      <Header title="Scan invoice" subtitle="Capture pages or import a file" onBack={() => router.back()} right={<InfoPill icon="wifi-outline" label="Online" tone="green" />} />
      <View style={[styles.scanner, { backgroundColor: colors.navy }]}>
        <Text style={styles.scannerHint}>INVOICE CAPTURE</Text>
        <Feather name="camera" size={44} color={colors.green} />
        <Text style={styles.scannerHintBottom}>One invoice can include up to 20 pages</Text>
      </View>
      <View style={styles.controls}>
        <View style={styles.actionRow}>
          <SecondaryButton label="Camera" icon="camera" onPress={() => void capture()} />
          <SecondaryButton label="Gallery" icon="image" onPress={() => void gallery()} />
          <SecondaryButton label="File" icon="file" onPress={() => void importDocument()} />
        </View>
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: colors.navy }]}>Pages captured</Text>
          <Text style={[styles.pageCount, { color: colors.primary }]}>{draft.pages.length} {draft.pages.length === 1 ? 'page' : 'pages'}</Text>
        </View>
        <View style={styles.thumbnails}>
          {draft.pages.map((page, index) => (
            <View key={`${page.uri}-${index}`} style={[styles.thumbnail, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {page.mimeType.startsWith('image/') ? <Image source={{ uri: page.uri }} style={styles.thumbnailImage} /> : <Feather name="file-text" size={25} color={colors.primary} />}
              <Text numberOfLines={1} style={[styles.thumbnailText, { color: colors.mutedForeground }]}>{page.mimeType === 'application/pdf' ? 'PDF' : `Page ${index + 1}`}</Text>
              <Pressable testID={`scan-delete-page-${index}`} accessibilityRole="button" onPress={() => deletePage(index)} style={styles.delete}>
                <Ionicons name="close-circle" size={20} color={colors.destructive} />
              </Pressable>
            </View>
          ))}
          {!draft.pages.length ? <Text style={[styles.empty, { color: colors.mutedForeground }]}>No pages yet. Use Camera, Gallery, or File.</Text> : null}
        </View>
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        <View style={styles.actions}>
          <SecondaryButton testID="scan-add-page" label="Add another page" icon="plus" onPress={() => void capture()} />
          <PrimaryButton testID="scan-finish" label="Finish invoice" icon="check" onPress={() => void finish()} loading={busy} />
        </View>
        {draft.pages.length ? <Pressable testID="scan-retake" accessibilityRole="button" onPress={() => { resetDraft(); void capture(true); }}><Text style={[styles.retake, { color: colors.primary }]}>Retake invoice</Text></Pressable> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scanner: { borderRadius: 24, height: 230, padding: 18, alignItems: 'center', justifyContent: 'center', gap: 16 },
  scannerHint: { color: '#B9D8E5', fontSize: 10, fontWeight: '700', letterSpacing: 1.4 },
  scannerHintBottom: { color: '#B9D8E5', fontSize: 12 },
  controls: { gap: 14 },
  actionRow: { flexDirection: 'row', gap: 8 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 3 },
  pageTitle: { fontSize: 16, fontWeight: '700' },
  pageCount: { fontSize: 12, fontWeight: '700' },
  thumbnails: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  thumbnail: { width: 82, height: 98, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 5, position: 'relative', overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: 67, resizeMode: 'cover' },
  thumbnailText: { fontSize: 10, fontWeight: '600', maxWidth: 65 },
  delete: { position: 'absolute', top: 4, right: 4 },
  empty: { fontSize: 12, paddingVertical: 10 },
  actions: { gap: 10 },
  retake: { textAlign: 'center', fontSize: 12, fontWeight: '700' },
  error: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});