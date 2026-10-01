import { api, type OpenPurchaseOrderLineApiResponse, type PurchaseOrderApiResponse } from '@/services/api';

export type PurchaseOrderCategory = 'MATERIAL' | 'SERVICE' | 'OTHER';
export type PurchaseOrderStatus =
  | 'OPEN'
  | 'PARTIALLY_RECEIVED'
  | 'FULLY_RECEIVED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'BLOCKED';

export type PurchaseOrderLine = {
  poItem: string;
  materialCode: string;
  description: string;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  remainingQuantity: number;
  uom: string;
  unitPrice: number;
  receivedQuantity: number;
  damagedQuantity: number;
  rejectedQuantity: number;
  included: boolean;
  storageLocation: string;
  deliveryCompleted: boolean;
  deleted: boolean;
  servicePo: boolean;
  overdeliveryTolerancePercent?: number | null;
};

export type PurchaseOrder = {
  poNumber: string;
  supplierId: string;
  supplierName: string;
  poDate: string;
  plant: string;
  storageLocation: string;
  currency: string;
  category: PurchaseOrderCategory;
  status: PurchaseOrderStatus;
  openValue: number;
  servicePo: boolean;
  serviceMessage?: string | null;
  items: PurchaseOrderLine[];
};

export type OpenPurchaseOrderQuery = {
  supplierId?: string;
  supplierName: string;
  property: string;
  poType: 'MATERIAL' | 'ALL';
};

type ApiPurchaseOrderLine =
  | OpenPurchaseOrderLineApiResponse
  | PurchaseOrderApiResponse['items'][number];

function mapLine(line: ApiPurchaseOrderLine): PurchaseOrderLine {
  const servicePo = line.servicePo || ('itemType' in line && line.itemType === 'SERVICE');
  const deliveryCompleted = 'deliveryCompleted' in line ? line.deliveryCompleted : false;
  const deleted = 'deleted' in line ? line.deleted : false;
  const tolerance = 'overdeliveryTolerancePercent' in line
    ? line.overdeliveryTolerancePercent
    : null;
  const materialCode = line.materialCode ?? '';
  return {
    poItem: line.poItem,
    materialCode,
    description: line.description,
    orderedQuantity: line.orderedQuantity,
    previouslyReceivedQuantity: line.previouslyReceivedQuantity,
    remainingQuantity: line.openQuantity,
    uom: line.uom,
    unitPrice: 'unitPrice' in line ? (line.unitPrice ?? 0) : 0,
    receivedQuantity: line.openQuantity,
    damagedQuantity: 0,
    rejectedQuantity: 0,
    included:
      !servicePo &&
      !deliveryCompleted &&
      !deleted &&
      line.openQuantity > 0,
    storageLocation: line.storageLocation ?? '',
    deliveryCompleted,
    deleted,
    servicePo,
    overdeliveryTolerancePercent: tolerance,
  };
}

function mapSummary(
  line: OpenPurchaseOrderLineApiResponse,
): PurchaseOrder {
  const item = mapLine(line);
  return {
    poNumber: line.poNumber,
    supplierId: line.supplier.supplierCode,
    supplierName: line.supplier.supplierName,
    poDate: line.deliveryDate ?? '',
    plant: line.plantCode,
    storageLocation: line.storageLocation ?? '',
    currency: '',
    category: line.poType,
    status: line.status,
    openValue: item.remainingQuantity * item.unitPrice,
    servicePo: line.servicePo,
    items: [item],
  };
}

export async function searchOpenMaterialPOs(
  query: OpenPurchaseOrderQuery,
): Promise<PurchaseOrder[]> {
  let supplierCode = query.supplierId;
  if (!supplierCode && query.supplierName.trim()) {
    const suppliers = await api.searchSuppliers(query.supplierName, 10);
    const exact = suppliers.items.find(
      (supplier) =>
        supplier.supplierName.toLowerCase() === query.supplierName.trim().toLowerCase(),
    );
    supplierCode = (exact ?? suppliers.items[0])?.supplierCode;
  }
  const response = await api.searchOpenPurchaseOrders({
    supplierCode,
    limit: 100,
  });
  const grouped = new Map<string, PurchaseOrder>();
  for (const line of response.items) {
    if (query.poType === 'MATERIAL' && line.poType !== 'MATERIAL') continue;
    const current = grouped.get(line.poNumber);
    if (current) {
      current.items.push(mapLine(line));
      current.openValue += line.openQuantity;
    } else {
      grouped.set(line.poNumber, mapSummary(line));
    }
  }
  return [...grouped.values()];
}

export async function getPurchaseOrder(poNumber: string): Promise<PurchaseOrder | null> {
  try {
    const order = await api.getPurchaseOrder(poNumber);
    return mapDetail(order);
  } catch (error) {
    if (error instanceof Error && 'status' in error && (error as { status?: number }).status === 404) {
      return null;
    }
    throw error;
  }
}

function mapDetail(order: PurchaseOrderApiResponse): PurchaseOrder {
  const items = order.items.map(mapLine);
  return {
    poNumber: order.poNumber,
    supplierId: order.supplier.supplierCode,
    supplierName: order.supplier.supplierName,
    poDate: order.documentDate,
    plant: order.plantCode,
    storageLocation: items.find((item) => item.storageLocation)?.storageLocation ?? '',
    currency: order.currency,
    category: order.poType,
    status: order.status as PurchaseOrderStatus,
    openValue: items.reduce(
      (total, item) => total + item.remainingQuantity * item.unitPrice,
      0,
    ),
    servicePo: order.servicePo,
    serviceMessage: order.serviceMessage,
    items,
  };
}