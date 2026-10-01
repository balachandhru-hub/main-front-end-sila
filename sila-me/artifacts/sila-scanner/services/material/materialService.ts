import {
  confirmMaterial as confirmMaterialRequest,
  getMaterialByBarcode as getMaterialByBarcodeRequest,
  getMaterialByCode as getMaterialByCodeRequest,
  recognizeMaterial as recognizeMaterialRequest,
  searchMaterials as searchMaterialsRequest,
  type MaterialConfirmationRequest,
  type MaterialRecognitionRequest,
} from '@workspace/api-client-react';
import { api, type VisionImageUpload } from '@/services/api';

export type Material = {
  materialCode: string;
  description: string;
  brand: string;
  packSize: string;
  baseUom: string;
  countUom: string;
  barcodes: string[];
  recognitionAliases: string[];
  purchaseUom: string;
  plantCode: string;
  storageLocation: string;
  batchManaged: boolean;
  expiryManaged: boolean;
};

export type MaterialMatch = Material & {
  confidence: number;
  matchedBy: 'BARCODE' | 'SEARCH' | 'RECOGNITION';
  matchReasons?: string[];
  recognitionRunId?: string;
};

function toMaterial(item: {
  materialCode: string;
  description: string;
  brand?: string | null;
  baseUom: string;
  purchaseUom: string;
  barcode?: string | null;
  barcodes?: string[];
  plantCode?: string | null;
  storageLocation?: string | null;
  batchManaged?: boolean;
  expiryManaged?: boolean;
}): Material {
  return {
    materialCode: item.materialCode,
    description: item.description,
    brand: item.brand ?? 'Unbranded',
    packSize: item.purchaseUom === item.baseUom ? item.baseUom : `1 ${item.purchaseUom}`,
    baseUom: item.baseUom,
    countUom: item.baseUom,
    barcodes: [...new Set([...(item.barcode ? [item.barcode] : []), ...(item.barcodes ?? [])])],
    recognitionAliases: [],
    purchaseUom: item.purchaseUom,
    plantCode: item.plantCode ?? '',
    storageLocation: item.storageLocation ?? '',
    batchManaged: item.batchManaged ?? false,
    expiryManaged: item.expiryManaged ?? false,
  };
}

export async function searchMaterials(query: string): Promise<MaterialMatch[]> {
  const response = await searchMaterialsRequest({
    q: query.trim() || undefined,
    limit: 20,
    offset: 0,
  });
  return response.items.map((item) => ({
    ...toMaterial(item),
    confidence: query.trim() ? 0.88 : 0.8,
    matchedBy: 'SEARCH',
  }));
}

export async function lookupMaterialByBarcode(barcode: string): Promise<MaterialMatch | null> {
  const response = await getMaterialByBarcodeRequest(barcode.trim());
  if (!response.match || !response.material) return null;
  return {
    ...toMaterial(response.material),
    confidence: 1,
    matchedBy: 'BARCODE',
  };
}

export async function recognizeMaterial(
  input: MaterialRecognitionRequest,
): Promise<MaterialMatch[]> {
  const response = await recognizeMaterialRequest(input);
  return response.matches.map((item) => ({
    ...toMaterial(item),
    confidence: item.confidence,
    matchedBy: 'RECOGNITION',
  }));
}

export async function recognizeMaterialFromImage(input: {
  image: VisionImageUpload;
  customerId: number;
  propertyId: number;
  storeId: number;
  supplierId?: number;
  poNumber?: string;
  context?: Record<string, string | number | null>;
}): Promise<{ runId: string; candidates: MaterialMatch[] }> {
  const response = await api.recognizeMaterialVision(input);
  const candidates = response.candidates ?? response.matches ?? [];
  return {
    runId: String(response.recognitionRunId),
    candidates: candidates.map((item) => ({
      ...toMaterial(item),
      confidence: item.confidence,
      matchedBy: 'RECOGNITION',
      matchReasons: item.matchReasons ?? (item.matchReason ? [item.matchReason] : []),
      recognitionRunId: String(response.recognitionRunId),
    })),
  };
}

export async function confirmMaterial(
  input: MaterialConfirmationRequest & { scanReference?: string | null },
): Promise<{ confirmed: boolean; materialCode: string }> {
  return confirmMaterialRequest(input);
}

export async function getMaterial(materialCode: string): Promise<Material | null> {
  try {
    return toMaterial(await getMaterialByCodeRequest(materialCode));
  } catch {
    return null;
  }
}