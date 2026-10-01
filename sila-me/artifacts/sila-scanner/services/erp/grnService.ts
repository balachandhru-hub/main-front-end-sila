import type { PurchaseOrder, PurchaseOrderLine } from '@/services/erp/poService';
import { api, type GoodsReceiptApiResponse } from '@/services/api';

export type GrnPostRequest = {
  poNumber: string;
  supplierId: string;
  plant: string;
  storageLocation: string;
  invoiceNumber: string;
  invoiceDate: string;
  documentId?: number;
  invoiceHeaderId?: number;
  items: Array<{
    poItem: string;
    material: string;
    receivedQuantity: number;
    uom: string;
    damagedQuantity?: number;
    rejectedQuantity?: number;
  }>;
};

export type GrnPostResponse = {
  success: true;
  materialDocument: string | null;
  postingDate: string;
  poNumber: string;
  lineCount: number;
  status: string;
  pendingApproval: boolean;
  goodsReceiptId: number;
};

export function validateGrnLines(
  purchaseOrder: PurchaseOrder,
  lines: PurchaseOrderLine[],
): string[] {
  const errors: string[] = [];
  const included = lines.filter((line) => line.included);
  if (!included.length) errors.push('Select at least one line to receive.');
  for (const line of included) {
    if (line.receivedQuantity <= 0) {
      errors.push(`${line.description}: Receive Now must be greater than 0.`);
    }
    const total = line.receivedQuantity + line.damagedQuantity + line.rejectedQuantity;
    if (total > line.remainingQuantity) {
      errors.push(`${line.description}: Received quantity exceeds the remaining PO quantity.`);
    }
  }
  if (purchaseOrder.category !== 'MATERIAL') {
    errors.push('Service PO — GRN posting is not available in SILA Store.');
  }
  return errors;
}

export async function postGrn(request: GrnPostRequest): Promise<GrnPostResponse> {
  const idempotencyKey = `mobile-grn-${request.poNumber}-${request.invoiceNumber || 'no-invoice'}-${request.invoiceDate}`;
  const draft = await api.createGoodsReceipt({
    poNumber: request.poNumber,
    invoiceNumber: request.invoiceNumber || undefined,
    documentDate: request.invoiceDate || undefined,
    documentId: request.documentId,
    invoiceHeaderId: request.invoiceHeaderId,
    idempotencyKey,
  });
  for (const item of request.items) {
    await api.addGoodsReceiptItem(draft.id, {
      poItem: item.poItem,
      acceptedQuantity: item.receivedQuantity,
      damagedQuantity: item.damagedQuantity,
      rejectedQuantity: item.rejectedQuantity,
    });
  }
  const validation = await api.validateGoodsReceipt(draft.id);
  if (!validation.valid) {
    throw new Error(validation.errors.map((item) => item.message).join(' '));
  }
  const result: GoodsReceiptApiResponse = await api.submitGoodsReceipt(draft.id);
  return {
    success: true,
    materialDocument: result.materialDocumentNumber,
    postingDate: result.postingDate ?? request.invoiceDate,
    poNumber: result.poNumber,
    lineCount: result.items.length,
    status: result.status,
    pendingApproval: result.status === 'PENDING_APPROVAL',
    goodsReceiptId: result.id,
  };
}