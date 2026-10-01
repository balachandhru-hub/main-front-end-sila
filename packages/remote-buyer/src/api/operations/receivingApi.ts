import axiosInstance from "../axiosInstance";
import { OPERATIONS_BASE, cleanParams, fetchBlob, readError } from "./http";

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

export interface OperationsDocument {
  id: string;
  filename: string;
  contentType: string;
  fileSizeBytes: number;
  pageCount?: number | null;
  sourceChannel: string;
  status: string;
  createdAt: string;
  invoiceId: string;
  saveStatus?: string;
  nextStep?: string;
  message?: string | null;
}

export interface InvoiceUploadInput {
  file: File;
  operatingUnitId?: string | null;
  supplierName?: string | null;
  supplierId?: string | null;
  supplierTrn?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: string | null;
  purchaseOrderNumber?: string | null;
  noPurchaseOrder?: boolean;
  invoiceGross?: number | null;
  currency?: string | null;
}

export interface DocumentTransfer {
  documentId: string;
  destinationId: string;
  externalFileId?: string | null;
  provider: string;
  status: string;
  resolutionSource?: string | null;
  folderPath?: string | null;
  externalFileName?: string | null;
  externalWebUrl?: string | null;
  attemptCount: number;
  nextAttemptAt?: string | null;
  completedAt?: string | null;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
}

/* ------------------------------------------------------------------ */
/* Invoices                                                            */
/* ------------------------------------------------------------------ */

export interface InvoiceLine {
  id: string;
  lineNumber: number;
  supplierMaterialCode?: string | null;
  materialId?: string | null;
  description: string;
  quantity?: number | null;
  uom?: string | null;
  unitPrice?: number | null;
  taxRate?: number | null;
  taxAmount?: number | null;
  lineAmount?: number | null;
  confidence?: number | null;
  matchStatus: string;
  purchaseOrderItemId?: string | null;
}

export interface Invoice {
  id: string;
  documentId: string;
  invoiceNumber: string;
  invoiceDate?: string | null;
  supplierName?: string | null;
  supplierTaxNumber?: string | null;
  purchaseOrderNumber?: string | null;
  purchaseOrderId?: string | null;
  currency?: string | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  invoiceType: string;
  status: string;
  overallConfidence?: number | null;
  operatingUnitId?: string | null;
  operatingUnitName?: string | null;
  supplierId?: string | null;
  supplierCode?: string | null;
  goodsReceiptId?: string | null;
  lines: InvoiceLine[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceUpdateInput {
  invoiceNumber: string;
  invoiceDate?: string | null;
  supplierName?: string | null;
  supplierTaxNumber?: string | null;
  poNumber?: string | null;
  currency?: string | null;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  supplierId?: string | null;
  noPurchaseOrder?: boolean | null;
}

export interface InvoiceExtractionHeader {
  documentId: string;
  supplierName?: string | null;
  supplierTrn?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: string | null;
  purchaseOrderNumber?: string | null;
  invoiceGross?: number | null;
  invoiceNet?: number | null;
  currency?: string | null;
}

export interface InvoiceExtractionLine {
  itemSkuId?: string | null;
  itemAmount?: number | null;
  itemNet?: number | null;
  itemDescription?: string | null;
  lineItemNumber?: string | null;
  purchaseOrderItemId?: string | null;
}

export interface InvoiceExtraction {
  header: InvoiceExtractionHeader;
  lines: InvoiceExtractionLine[];
  provider: string;
  extractionMethod: string;
  confidence?: number | null;
  fallbackUsed: boolean;
  status: string;
  completedAt?: string | null;
}

export interface ExtractionHistoryItem {
  id: string;
  documentId: string;
  provider: string;
  status: string;
  trigger: string;
  ocrRequestId?: string | null;
  extractionMethod: string;
  confidence?: number | null;
  contentHash?: string | null;
  fallbackUsed: boolean;
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
  processingDurationMs?: number | null;
  createdAt: string;
}

export interface SupplierMatchCandidate {
  supplierId: string;
  supplierCode: string;
  name: string;
  taxNumber?: string | null;
  confidence: number;
  matchReason: string;
}

export interface SupplierMatchResponse {
  invoiceId: string;
  supplierId?: string | null;
  supplierName?: string | null;
  candidates: SupplierMatchCandidate[];
  requiresSelection: boolean;
}

export interface InvoiceLineMatch {
  invoiceLineId: string;
  purchaseOrderItemId: string | null;
}

/* ------------------------------------------------------------------ */
/* Purchase orders                                                     */
/* ------------------------------------------------------------------ */

export interface PurchaseOrderItem {
  id: string;
  lineNumber: number;
  itemNumber?: string | null;
  materialId?: string | null;
  materialCode: string;
  description: string;
  orderedQuantity: number;
  receivedQuantity: number;
  openQuantity: number;
  uom: string;
  unitPrice?: number | null;
  priceQuantity?: number | null;
  itemAmount?: number | null;
  taxCode?: string | null;
  taxAmount?: number | null;
  grossItemAmount?: number | null;
  currency?: string | null;
  materialGroup?: string | null;
  plant?: string | null;
  storageLocation?: string | null;
  itemCategory?: string | null;
  accountAssignmentCategory?: string | null;
  goodsReceiptExpected?: boolean;
  invoiceExpected?: boolean;
  deliveryCompleted?: boolean;
  deletionIndicator?: boolean;
  status: string;
}

export interface OperationsPurchaseOrder {
  id: string;
  poNumber: string;
  entityCode?: string | null;
  purchaseOrderType?: string | null;
  companyCode?: string | null;
  erpSupplierId?: string | null;
  purchasingOrganization?: string | null;
  purchasingGroup?: string | null;
  paymentTerms?: string | null;
  poCategory?: string | null;
  poDate?: string | null;
  deliveryDate?: string | null;
  currency: string;
  totalNetAmount?: number | null;
  totalTaxAmount?: number | null;
  totalAmount?: number | null;
  totalOrderedQuantity?: number | null;
  totalReceivedQuantity?: number | null;
  sourceSystem?: string | null;
  sourceLastChangedAt?: string | null;
  lastSyncedAt?: string | null;
  status: string;
  operatingUnitId?: string | null;
  operatingUnitName?: string | null;
  supplierId: string;
  supplierName: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderSearch {
  query?: string;
  entityCode?: string;
  operatingUnitId?: string;
  supplierId?: string;
  openOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/* Goods receipts                                                      */
/* ------------------------------------------------------------------ */

export interface GrnLineInput {
  purchaseOrderItemId: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  rejectedQuantity: number;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

export interface GrnInput {
  invoiceId: string;
  purchaseOrderId: string;
  operatingUnitId: string;
  receiptDate?: string | null;
  lines: GrnLineInput[];
}

export interface GrnValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GoodsReceiptLine {
  id: string;
  purchaseOrderItemId: string;
  purchaseOrderLineNumber: number;
  materialCode: string;
  description: string;
  openQuantityBefore: number;
  invoiceQuantity?: number | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  damagedQuantity: number;
  rejectedQuantity: number;
  uom: string;
  batchNumber?: string | null;
  expiryDate?: string | null;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  status: string;
  businessStatus?: string | null;
  erpPostingStatus?: string | null;
  erpMaterialDocument?: string | null;
  erpDocumentYear?: string | null;
  erpAttemptCount?: number;
  lastErpAttemptAt?: string | null;
  erpPostedAt?: string | null;
  failureCode?: string | null;
  failureMessage?: string | null;
  purchaseOrderId: string;
  purchaseOrderNumber: string;
  invoiceId?: string | null;
  invoiceNumber?: string | null;
  supplierId: string;
  supplierName: string;
  operatingUnitId: string;
  operatingUnitName: string;
  receiptDate: string;
  createdAt: string;
  postedAt?: string | null;
  lines: GoodsReceiptLine[];
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/* ------------------------------------------------------------------ */
/* Document calls                                                      */
/* ------------------------------------------------------------------ */

export const uploadInvoiceDocument = async (input: InvoiceUploadInput): Promise<OperationsDocument> => {
  const form = new FormData();
  form.append("sourceChannel", "CLOUD_UPLOAD");
  form.append("deferFullExtraction", "false");
  form.append("noPurchaseOrder", input.noPurchaseOrder ? "true" : "false");
  const optional: Record<string, string | number | null | undefined> = {
    operatingUnitId: input.operatingUnitId,
    supplierName: input.supplierName,
    supplierId: input.supplierId,
    supplierTrn: input.supplierTrn,
    supplierInvoiceNumber: input.supplierInvoiceNumber,
    invoiceDate: input.invoiceDate,
    purchaseOrderNumber: input.noPurchaseOrder ? null : input.purchaseOrderNumber,
    invoiceGross: input.invoiceGross,
    currency: input.currency,
  };
  Object.entries(optional).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") return;
    form.append(key, String(value));
  });
  form.append("file", input.file);
  try {
    const response = await axiosInstance.post<OperationsDocument>(`${OPERATIONS_BASE}/documents/invoices`, form, {
      headers: { "Content-Type": "multipart/form-data", "Idempotency-Key": crypto.randomUUID() },
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not upload the document."));
  }
};

export const getDocument = async (documentId: string): Promise<OperationsDocument> => {
  try {
    const response = await axiosInstance.get<OperationsDocument>(`${OPERATIONS_BASE}/documents/${documentId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the document."));
  }
};

/** The stored original file, fetched with the session cookie so it can be shown or saved. */
export const getDocumentContent = async (documentId: string): Promise<Blob> => {
  const { blob } = await fetchBlob(`${OPERATIONS_BASE}/documents/${documentId}/content`, {}, "Could not load the stored document.");
  return blob;
};

export const getDocumentTransfers = async (documentId: string): Promise<DocumentTransfer[]> => {
  try {
    const response = await axiosInstance.get<{ transfers?: DocumentTransfer[] }>(`${OPERATIONS_BASE}/documents/${documentId}/transfers`);
    return asArray<DocumentTransfer>(response.data?.transfers);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the document transfers."));
  }
};

export const retryDocumentTransfer = async (transferId: string): Promise<void> => {
  try {
    await axiosInstance.post(`${OPERATIONS_BASE}/document-transfers/${transferId}/retry`);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not retry the transfer."));
  }
};

/* ------------------------------------------------------------------ */
/* Invoice calls                                                       */
/* ------------------------------------------------------------------ */

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const response = await axiosInstance.get<Invoice[]>(`${OPERATIONS_BASE}/invoices`);
    return asArray<Invoice>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load invoices."));
  }
};

export const getInvoice = async (invoiceId: string): Promise<Invoice> => {
  try {
    const response = await axiosInstance.get<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the invoice."));
  }
};

export const updateInvoice = async (invoiceId: string, payload: InvoiceUpdateInput): Promise<Invoice> => {
  try {
    const response = await axiosInstance.put<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the invoice."));
  }
};

export const processInvoice = async (invoiceId: string): Promise<Invoice> => {
  try {
    const response = await axiosInstance.post<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}/process`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not process the invoice."));
  }
};

export const getInvoiceExtraction = async (invoiceId: string): Promise<InvoiceExtraction> => {
  try {
    const response = await axiosInstance.get<InvoiceExtraction>(`${OPERATIONS_BASE}/invoices/${invoiceId}/extraction`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the extraction result."));
  }
};

export const reprocessInvoice = async (invoiceId: string): Promise<InvoiceExtraction> => {
  try {
    const response = await axiosInstance.post<InvoiceExtraction>(`${OPERATIONS_BASE}/invoices/${invoiceId}/reprocess`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not re-run the extraction."));
  }
};

/** Re-reads the stored document with the backend advanced reader. The result is read back through the invoice. */
export const advancedRereadInvoice = async (invoiceId: string): Promise<void> => {
  try {
    await axiosInstance.post(`${OPERATIONS_BASE}/invoices/${invoiceId}/advanced-reread`);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not re-read the document."));
  }
};

export const getInvoiceExtractionHistory = async (invoiceId: string): Promise<ExtractionHistoryItem[]> => {
  try {
    const response = await axiosInstance.get<ExtractionHistoryItem[]>(`${OPERATIONS_BASE}/invoices/${invoiceId}/extraction-history`);
    return asArray<ExtractionHistoryItem>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the extraction history."));
  }
};

export const getInvoiceSupplierCandidates = async (invoiceId: string): Promise<SupplierMatchResponse> => {
  try {
    const response = await axiosInstance.get<SupplierMatchResponse>(`${OPERATIONS_BASE}/invoices/${invoiceId}/supplier-candidates`);
    return { ...response.data, candidates: asArray<SupplierMatchCandidate>(response.data?.candidates) };
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load supplier candidates."));
  }
};

export const matchInvoiceSupplier = async (invoiceId: string, supplierId: string | null): Promise<Invoice> => {
  try {
    const response = await axiosInstance.post<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}/match-supplier`, { supplierId });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not match the supplier."));
  }
};

export const matchInvoicePurchaseOrder = async (
  invoiceId: string,
  purchaseOrderId: string | null,
  poNumber: string | null,
): Promise<Invoice> => {
  try {
    const response = await axiosInstance.post<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}/match-po`, { purchaseOrderId, poNumber });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not match the purchase order."));
  }
};

export const matchInvoiceLines = async (invoiceId: string, lines: InvoiceLineMatch[]): Promise<Invoice> => {
  try {
    const response = await axiosInstance.post<Invoice>(`${OPERATIONS_BASE}/invoices/${invoiceId}/match-lines`, { lines });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not match the invoice lines."));
  }
};

/* ------------------------------------------------------------------ */
/* Purchase order calls                                                */
/* ------------------------------------------------------------------ */

export const searchPurchaseOrders = async (search: PurchaseOrderSearch = {}): Promise<OperationsPurchaseOrder[]> => {
  try {
    const response = await axiosInstance.get<OperationsPurchaseOrder[]>(`${OPERATIONS_BASE}/purchase-orders/search`, {
      params: cleanParams({
        query: search.query?.trim(),
        entityCode: search.entityCode?.trim(),
        operatingUnitId: search.operatingUnitId,
        supplierId: search.supplierId,
        openOnly: search.openOnly ? true : undefined,
      }),
    });
    return asArray<OperationsPurchaseOrder>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load purchase orders."));
  }
};

export const getPurchaseOrder = async (poNumber: string, entityCode?: string | null): Promise<OperationsPurchaseOrder> => {
  try {
    const response = await axiosInstance.get<OperationsPurchaseOrder>(
      `${OPERATIONS_BASE}/purchase-orders/${encodeURIComponent(poNumber)}`,
      { params: cleanParams({ entityCode }) },
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the purchase order."));
  }
};

/* ------------------------------------------------------------------ */
/* Goods receipt calls                                                 */
/* ------------------------------------------------------------------ */

export const getGoodsReceipts = async (): Promise<GoodsReceipt[]> => {
  try {
    const response = await axiosInstance.get<GoodsReceipt[]>(`${OPERATIONS_BASE}/grns`);
    return asArray<GoodsReceipt>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load goods receipts."));
  }
};

export const getGoodsReceipt = async (goodsReceiptId: string): Promise<GoodsReceipt> => {
  try {
    const response = await axiosInstance.get<GoodsReceipt>(`${OPERATIONS_BASE}/grns/${goodsReceiptId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the goods receipt."));
  }
};

export const validateGoodsReceipt = async (payload: GrnInput): Promise<GrnValidation> => {
  try {
    const response = await axiosInstance.post<GrnValidation>(`${OPERATIONS_BASE}/grns/validate`, payload);
    return {
      valid: Boolean(response.data?.valid),
      errors: asArray<string>(response.data?.errors),
      warnings: asArray<string>(response.data?.warnings),
    };
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not validate the goods receipt."));
  }
};

/** Posts a goods receipt. The same key must be sent again when the same receipt is retried. */
export const postGoodsReceipt = async (payload: GrnInput, idempotencyKey: string): Promise<GoodsReceipt> => {
  try {
    const response = await axiosInstance.post<GoodsReceipt>(`${OPERATIONS_BASE}/grns`, payload, {
      headers: { "Idempotency-Key": idempotencyKey },
    });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not post the goods receipt."));
  }
};

export const retryGoodsReceipt = async (goodsReceiptId: string): Promise<GoodsReceipt> => {
  try {
    const response = await axiosInstance.post<GoodsReceipt>(`${OPERATIONS_BASE}/grns/${goodsReceiptId}/retry`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not retry the ERP posting."));
  }
};
