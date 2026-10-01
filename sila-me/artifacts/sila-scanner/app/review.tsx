import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Header, PrimaryButton, Screen, InfoPill } from '@/components/Screen';
import { useAppState } from '@/context/AppStateContext';
import { useColors } from '@/hooks/useColors';
import { api, type InvoiceApiResponse } from '@/services/api';
import { ApiRequestError } from '@/services/api';

function readableError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 413) return 'Upload failed: the invoice is larger than the 20 MB limit.';
    if (error.status === 403) return 'You do not have permission to upload to this store.';
    if (error.status === 415) return 'Upload failed: only PDF, JPEG, and PNG files are supported.';
    if (error.status === 401) return 'Your session expired. Please sign in again.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'The invoice could not be uploaded. Please retry.';
}

export default function ReviewScreen() {
  const colors = useColors();
  const {
    draft, updateDraft, property, department, selectedStore, selectedPurchaseOrder, grn,
  } = useAppState();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(draft.lastError ?? null);
  const [invoice, setInvoice] = useState<InvoiceApiResponse | null>(null);

  const upload = async () => {
    if (loading || confirming) return;
    if (!draft.fileUri || !draft.fileName || !draft.mimeType) {
      setError('Prepare the invoice PDF before uploading.');
      return;
    }
    setLoading(true);
    setError(null);
    updateDraft({ uploadStatus: 'UPLOADING', processingStatus: 'UPLOADING', lastError: undefined });
    try {
      let documentId = draft.serverDocumentId;
      if (!documentId) {
        const document = await api.createDocument({
          idempotencyKey: draft.idempotencyKey,
          fileName: draft.fileName,
          mimeType: draft.mimeType,
          pageCount: draft.pageCount,
          fileSizeBytes: draft.fileSizeBytes,
          propertyCode: selectedStore?.propertyCode,
          storeCode: selectedStore?.code,
        });
        documentId = document.id;
        updateDraft({ serverDocumentId: documentId });
      }
      await api.attachDocumentFile(documentId, {
        uri: draft.fileUri,
        name: draft.fileName,
        mimeType: draft.mimeType,
        size: draft.fileSizeBytes,
        propertyCode: selectedStore?.propertyCode,
        storeCode: selectedStore?.code,
        idempotencyKey: draft.idempotencyKey,
      });
      updateDraft({ uploadStatus: 'UPLOADED', processingStatus: 'EXTRACTING' });
      const extracted = await api.extractDocument(documentId);
      setInvoice(extracted);
      updateDraft({
        serverDocumentId: documentId,
        serverInvoiceId: extracted.id,
        uploadStatus: 'UPLOADED',
        processingStatus: 'REVIEW_REQUIRED',
        supplierName: extracted.supplier.name,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: extracted.invoiceDate,
        poNumber: extracted.matchedPoNumber ?? extracted.poNumberExtracted ?? '',
        currency: extracted.currency,
        netAmount: extracted.netAmount,
        taxAmount: extracted.taxAmount,
        grossAmount: extracted.grossAmount,
      });
    } catch (cause) {
      const message = readableError(cause);
      updateDraft({ uploadStatus: 'FAILED', processingStatus: 'FAILED', lastError: message });
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const retryExtraction = async () => {
    if (!draft.serverDocumentId || loading) return;
    setLoading(true);
    setError(null);
    updateDraft({ processingStatus: 'EXTRACTING' });
    try {
      const extracted = await api.extractDocument(draft.serverDocumentId);
      setInvoice(extracted);
      updateDraft({
        serverInvoiceId: extracted.id,
        processingStatus: 'REVIEW_REQUIRED',
        supplierName: extracted.supplier.name,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: extracted.invoiceDate,
        poNumber: extracted.matchedPoNumber ?? extracted.poNumberExtracted ?? '',
      });
    } catch (cause) {
      const message = readableError(cause);
      updateDraft({ processingStatus: 'FAILED', lastError: message });
      setError(`Invoice uploaded, extraction failed: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async () => {
    if (!invoice || confirming || loading) return;
    setConfirming(true);
    setError(null);
    try {
      const result = await api.confirmInvoiceExtraction(invoice.id, {
        supplierName: draft.supplierName,
        invoiceNumber: draft.invoiceNumber,
        invoiceDate: draft.invoiceDate,
        poNumber: draft.poNumber || undefined,
        invoiceType: invoice.invoiceType as 'MATERIAL' | 'SERVICE' | 'MIXED' | 'UNKNOWN',
        currency: draft.currency,
        netAmount: draft.netAmount ?? undefined,
        taxAmount: draft.taxAmount ?? undefined,
        grossAmount: draft.grossAmount ?? undefined,
        lines: invoice.lines as unknown as Array<Record<string, unknown>>,
      });
      setInvoice(result);
      updateDraft({ processingStatus: 'COMPLETED', serverInvoiceId: result.id });
      if (result.invoiceType === 'SERVICE') router.replace(`/service-invoice?invoiceId=${result.id}`);
      else if (result.invoiceType !== 'MATERIAL') router.replace(`/invoice-type-review?invoiceId=${result.id}`);
      else if (result.matchedPoNumber && result.poMatchStatus === 'EXACT_MATCH') {
        await api.confirmInvoicePurchaseOrder(result.id, result.matchedPoNumber);
        router.push(`/invoice-comparison?invoiceId=${result.id}`);
      } else {
        await api.matchInvoicePurchaseOrders(result.id);
        router.push(`/invoice-candidates?invoiceId=${result.id}`);
      }
    } catch (cause) {
      setError(readableError(cause));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Screen>
      <Header title="Review invoice" subtitle="Upload first, then confirm extracted details" onBack={() => router.back()} right={<InfoPill icon="document-text-outline" label={`${draft.pageCount} pages`} />} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.status, { backgroundColor: colors.lightBlue }]}>
          <Ionicons name={draft.processingStatus === 'FAILED' ? 'warning-outline' : 'cloud-upload-outline'} size={20} color={draft.processingStatus === 'FAILED' ? colors.destructive : colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.statusTitle, { color: colors.navy }]}>{statusLabel(draft.processingStatus, Boolean(invoice))}</Text>
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{draft.fileName || 'Invoice document'} · {draft.fileSizeBytes ? `${Math.round(draft.fileSizeBytes / 1024)} KB` : 'size pending'}</Text>
          </View>
        </View>
        {!invoice ? (
          <View style={[styles.destination, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}><Text style={[styles.label, { color: colors.mutedForeground }]}>UPLOAD CONTEXT</Text><Text style={[styles.value, { color: colors.navy }]}>{property} / {department}</Text></View>
          </View>
        ) : (
          <>
            <Text style={[styles.section, { color: colors.navy }]}>Extracted invoice details</Text>
            <Field label="SUPPLIER" value={draft.supplierName} onChangeText={(value) => updateDraft({ supplierName: value })} />
            <Field label="INVOICE NUMBER" value={draft.invoiceNumber} onChangeText={(value) => updateDraft({ invoiceNumber: value })} />
            <Field label="INVOICE DATE" value={draft.invoiceDate} onChangeText={(value) => updateDraft({ invoiceDate: value })} />
            <Field label="PO NUMBER (OPTIONAL)" value={draft.poNumber} onChangeText={(value) => updateDraft({ poNumber: value })} />
            <Field label="CURRENCY" value={draft.currency} onChangeText={(value) => updateDraft({ currency: value })} />
            <View style={styles.amountRow}>
              <Field label="NET" value={String(draft.netAmount ?? '')} onChangeText={(value) => updateDraft({ netAmount: Number(value) || 0 })} />
              <Field label="TAX" value={String(draft.taxAmount ?? '')} onChangeText={(value) => updateDraft({ taxAmount: Number(value) || 0 })} />
              <Field label="GROSS" value={String(draft.grossAmount ?? '')} onChangeText={(value) => updateDraft({ grossAmount: Number(value) || 0 })} />
            </View>
            <Text style={[styles.section, { color: colors.navy }]}>Line items</Text>
            {invoice.lines.map((line) => (
              <View key={line.id} style={[styles.line, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.lineTitle, { color: colors.navy }]}>{line.description || 'Item'}</Text>
                <Text style={[styles.lineText, { color: colors.mutedForeground }]}>{line.quantity ?? '—'} {line.uom ?? ''} · Net {line.lineNetAmount} · Gross {line.lineGrossAmount}</Text>
              </View>
            ))}
          </>
        )}
        {error ? <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
        {draft.processingStatus === 'FAILED' && draft.uploadStatus === 'UPLOADED' && draft.serverDocumentId ? <PrimaryButton testID="review-retry-extraction" label="Retry extraction" icon="refresh-cw" onPress={() => void retryExtraction()} loading={loading} /> : null}
        {!invoice ? <PrimaryButton testID="review-upload" label="Upload invoice" icon="upload-cloud" onPress={() => void upload()} loading={loading} /> : null}
        {invoice ? <PrimaryButton testID="review-confirm" label="Confirm extracted invoice" icon="check" onPress={() => void confirm()} loading={confirming} /> : null}
      </ScrollView>
    </Screen>
  );
}

function statusLabel(status: string, hasInvoice: boolean): string {
  if (hasInvoice || status === 'REVIEW_REQUIRED') return 'Review required';
  if (status === 'UPLOADING') return 'Uploading invoice';
  if (status === 'EXTRACTING') return 'Extracting invoice';
  if (status === 'FAILED') return 'Upload or extraction failed';
  return 'Ready to upload';
}

function Field({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} style={[styles.input, { color: colors.navy, borderColor: colors.border, backgroundColor: colors.card }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 30 },
  status: { borderRadius: 17, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusTitle: { fontSize: 14, fontWeight: '800' },
  statusText: { fontSize: 11, marginTop: 3 },
  destination: { borderWidth: 1, borderRadius: 17, padding: 13, flexDirection: 'row', gap: 10, alignItems: 'center' },
  label: { fontSize: 9, letterSpacing: 0.8, fontWeight: '700', marginBottom: 5 },
  value: { fontSize: 13, fontWeight: '700' },
  section: { fontSize: 16, fontWeight: '800', marginTop: 5 },
  field: { flex: 1, gap: 5 },
  input: { minHeight: 47, borderWidth: 1, borderRadius: 13, paddingHorizontal: 12, fontSize: 14 },
  amountRow: { flexDirection: 'row', gap: 8 },
  line: { borderWidth: 1, borderRadius: 14, padding: 11, gap: 4 },
  lineTitle: { fontSize: 13, fontWeight: '700' },
  lineText: { fontSize: 11 },
  error: { fontSize: 12, lineHeight: 17, fontWeight: '700' },
});