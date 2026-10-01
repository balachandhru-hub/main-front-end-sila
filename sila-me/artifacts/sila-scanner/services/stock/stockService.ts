import {
  getBatchStock as getBatchStockRequest,
  getMaterialStock as getMaterialStockRequest,
  getMaterialStockLocations as getMaterialStockLocationsRequest,
  getStoreStock as getStoreStockRequest,
  type GetBatchStockParams,
  type GetMaterialStockLocationsParams,
  type GetMaterialStockParams,
  type GetStoreStockParams,
  type StockBatchesResponse,
  type StockLocationsResponse,
  type StockMaterialResponse,
  type StockStoreResponse,
} from '@workspace/api-client-react';

export type StockLookupScope = {
  propertyCode?: string;
  storeCode?: string;
  plantCode?: string;
  storageLocation?: string;
};

const propertyCodes: Record<string, string> = {
  'FIVE Palm Jumeirah': 'FIVE_PALM',
  'FIVE Jumeirah Village': 'FIVE_JVC',
  'FIVE LUXE': 'FIVE_LUXE',
};

export function propertyCodeForName(propertyName: string): string {
  return propertyCodes[propertyName] ?? propertyName.trim().toUpperCase().replace(/\s+/g, '_');
}

export async function getMaterialStock(
  materialCode: string,
  scope: GetMaterialStockParams,
): Promise<StockMaterialResponse> {
  return getMaterialStockRequest(materialCode, scope);
}

export async function getMaterialStockLocations(
  materialCode: string,
  scope: GetMaterialStockLocationsParams,
): Promise<StockLocationsResponse> {
  return getMaterialStockLocationsRequest(materialCode, scope);
}

export async function getStoreStock(
  storeCode: string,
  params: GetStoreStockParams,
): Promise<StockStoreResponse> {
  return getStoreStockRequest(storeCode, params);
}

export async function getBatchStock(
  materialCode: string,
  scope: GetBatchStockParams,
): Promise<StockBatchesResponse> {
  return getBatchStockRequest(materialCode, scope);
}
