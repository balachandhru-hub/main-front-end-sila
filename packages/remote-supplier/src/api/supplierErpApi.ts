import axios from "axios";
import supplierInstance from "./supplierInstance";

export const PO_CREATE_PROCESS = "PO_CREATE";

export interface SupplierErpConfiguration {
  id: string;
  process: string;
  erpType: string;
  payloadFormat: string;
  requestBody?: string | null;
  baseUrl: string;
  authPath?: string | null;
  orderPath: string;
  httpMethod: string;
  authType: string;
  tokenUrl?: string | null;
  username?: string | null;
  hasPassword: boolean;
  clientId?: string | null;
  hasClientSecret: boolean;
  scope?: string | null;
  apiKeyHeader?: string | null;
  hasApiKey: boolean;
  hasAccessToken: boolean;
  defaultShipTo?: string | null;
  orderDateFormat: string;
  headersJson?: string | null;
  timeoutSeconds: number;
  maxRetryCount: number;
  version: number;
  isActive: boolean;
}

export interface SupplierErpWrite {
  process: string;
  erpType: string;
  payloadFormat?: string | null;
  requestBody?: string | null;
  baseUrl: string;
  authPath?: string | null;
  orderPath: string;
  httpMethod: string;
  authType: string;
  tokenUrl?: string | null;
  username?: string | null;
  password?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  scope?: string | null;
  apiKeyHeader?: string | null;
  apiKey?: string | null;
  accessToken?: string | null;
  defaultShipTo?: string | null;
  orderDateFormat?: string | null;
  headersJson?: string | null;
  timeoutSeconds: number;
  maxRetryCount: number;
  isActive: boolean;
}

const readError = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; description?: string } | undefined;
    return data?.description || data?.message || fallback;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

export const getSupplierErpConfiguration = async (): Promise<SupplierErpConfiguration | null> => {
  try {
    const response = await supplierInstance.get<SupplierErpConfiguration | null>(
      "/api/v1/supplier/erp-integration",
    );
    if (!response.data || !response.data.id) return null;
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the purchase order API."));
  }
};

export const saveSupplierErpConfiguration = async (payload: SupplierErpWrite): Promise<void> => {
  try {
    await supplierInstance.put("/api/v1/supplier/erp-integration", payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the purchase order API."));
  }
};
