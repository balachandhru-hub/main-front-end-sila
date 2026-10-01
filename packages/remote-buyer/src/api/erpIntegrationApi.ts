import axios from "axios";
import axiosInstance from "./axiosInstance";

export const PO_CREATE_PROCESS = "PO_CREATE";

export const ERP_SYSTEMS = ["SAP S/4", "Ariba"] as const;

export const PAYLOAD_FORMATS = ["JSON", "SOAP", "CXML"] as const;

export const AUTH_TYPES = [
  "NONE",
  "BASIC",
  "API_KEY",
  "BEARER",
  "OAUTH2_CLIENT_CREDENTIALS",
] as const;

export const DOCUMENT_TYPES = ["PO", "PR"] as const;

export interface ErpIntegration {
  id: string;
  apiName: string;
  process: string;
  erpType: string;
  supplierOrganizationId?: string | null;
  payloadFormat: string;
  requestBody?: string | null;
  documentType: string;
  baseUrl: string;
  createDocumentPath: string;
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
  headersJson?: string | null;
  timeoutSeconds: number;
  maxRetryCount: number;
  version: number;
  isActive: boolean;
}

export interface ErpIntegrationWrite {
  apiName: string;
  process: string;
  erpType: string;
  supplierOrganizationId?: string | null;
  payloadFormat?: string | null;
  requestBody?: string | null;
  documentType: string;
  baseUrl: string;
  createDocumentPath: string;
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

export const getBuyerErpIntegrations = async (): Promise<ErpIntegration[]> => {
  try {
    const response = await axiosInstance.get<ErpIntegration[]>("/api/v1/buyer/erp-integration");
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the purchase order API."));
  }
};

export const createBuyerErpIntegration = async (payload: ErpIntegrationWrite): Promise<void> => {
  try {
    await axiosInstance.post("/api/v1/buyer/erp-integration", payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the purchase order API."));
  }
};

export const updateBuyerErpIntegration = async (
  configurationId: string,
  payload: ErpIntegrationWrite,
): Promise<void> => {
  try {
    await axiosInstance.put(`/api/v1/buyer/erp-integration/${configurationId}`, payload);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not update the purchase order API."));
  }
};
