import axiosInstance from "../axiosInstance";
import { OPERATIONS_BASE, readError } from "./http";

/* ------------------------------------------------------------------ */
/* Invoice OCR policy                                                  */
/* ------------------------------------------------------------------ */

export interface InvoiceOcrConfigurationWrite {
  mobileBasicOcrEnabled: boolean;
  automaticBackendFallbackEnabled: boolean;
  minimumMobileConfidence: number;
  requireSupplierName: boolean;
  requireInvoiceNumber: boolean;
  requirePurchaseOrderNumber: boolean;
  requireInvoiceAmount: boolean;
  requireInvoiceDate: boolean;
  requireCurrency: boolean;
  requireSupplierTrn: boolean;
  backendProvider: string;
  alwaysBackendOnReread: boolean;
  detailedLineExtractionEnabled: boolean;
  supplierMasterValidationEnabled: boolean;
  purchaseOrderValidationEnabled: boolean;
  financialReconciliationEnabled: boolean;
  amountTolerance: number;
  backendTimeoutSeconds: number;
  backendRetryCount: number;
  reuseCachedOcr: boolean;
}

export interface InvoiceOcrConfiguration extends InvoiceOcrConfigurationWrite {
  id: string;
  version: number;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* Extraction providers                                                */
/* ------------------------------------------------------------------ */

export const EXTRACTION_PROVIDER_TYPES = [
  "BUILT_IN",
  "AZURE_DOCUMENT_INTELLIGENCE",
  "GOOGLE_DOCUMENT_AI",
  "AWS_TEXTRACT",
  "CUSTOM_REST",
  "AI_AGENT",
  "OTHER",
] as const;

export const EXTRACTION_AUTH_TYPES = ["NONE", "API_KEY", "BEARER_TOKEN", "BASIC", "OAUTH2", "CUSTOM"] as const;

export interface ExtractionAgent {
  id: string;
  name: string;
  documentType: string;
  providerType: string;
  endpointUrl?: string | null;
  authenticationType: string;
  credentialMask?: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractionAgentWrite {
  name: string;
  documentType: string;
  providerType: string;
  endpointUrl?: string | null;
  authenticationType: string;
  /** A reference to a stored secret, never the secret itself. Null keeps the saved reference. */
  credentialReference?: string | null;
  priority: number;
  isActive: boolean;
  configurationJson?: string | null;
}

export interface ExtractionAgentTest {
  success: boolean;
  message: string;
}

/* ------------------------------------------------------------------ */
/* Document storage                                                    */
/* ------------------------------------------------------------------ */

export const STORAGE_PROVIDERS = ["MICROSOFT", "GOOGLE", "OTHER"] as const;

export interface StorageConnection {
  id: string;
  provider: string;
  name: string;
  connectionStatus: string;
  tenantIdentifier?: string | null;
  siteIdentifier?: string | null;
  driveIdentifier?: string | null;
  folderIdentifier?: string | null;
  displayUrl?: string | null;
  displayName?: string | null;
  validatedAt?: string | null;
}

export interface StorageConnectionWrite {
  provider: string;
  name: string;
  tenantIdentifier?: string | null;
  siteIdentifier?: string | null;
  driveIdentifier?: string | null;
  folderIdentifier?: string | null;
  displayUrl?: string | null;
}

export interface MicrosoftReadiness {
  tenantConfigured: boolean;
  clientIdConfigured: boolean;
  clientSecretConfigured: boolean;
  redirectUriConfigured: boolean;
  tokenEncryptionConfigured: boolean;
  graphIntegrationReady: boolean;
  redirectUri?: string | null;
}

export interface MicrosoftConnectResult {
  authorizationUrl: string;
  state: string;
  draftId: string;
}

export interface MicrosoftSite {
  id: string;
  displayName: string;
  webUrl: string;
}

export interface MicrosoftLibrary {
  id: string;
  name: string;
}

export interface MicrosoftFolder {
  id: string;
  name: string;
  path: string;
}

/** The SharePoint destination of a connection: site, document library and folder. */
export interface MicrosoftConnectionState {
  connectionId: string;
  status: string;
  tenantId?: string | null;
  siteId?: string | null;
  siteDisplayName?: string | null;
  siteWebUrl?: string | null;
  driveId?: string | null;
  driveName?: string | null;
  folderId?: string | null;
  folderPath?: string | null;
  validatedAt?: string | null;
  message?: string | null;
}

export interface MicrosoftDestinationWrite {
  siteUrl: string;
  driveId?: string | null;
  driveName?: string | null;
  folderId?: string | null;
  folderPath?: string | null;
}

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const MICROSOFT_BASE = `${OPERATIONS_BASE}/integrations/microsoft`;

export const getInvoiceOcrConfiguration = async (): Promise<InvoiceOcrConfiguration> => {
  try {
    const response = await axiosInstance.get<InvoiceOcrConfiguration>(`${OPERATIONS_BASE}/configuration/invoice-ocr`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the invoice OCR policy."));
  }
};

export const updateInvoiceOcrConfiguration = async (
  payload: InvoiceOcrConfigurationWrite,
): Promise<InvoiceOcrConfiguration> => {
  try {
    const response = await axiosInstance.put<InvoiceOcrConfiguration>(`${OPERATIONS_BASE}/configuration/invoice-ocr`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the invoice OCR policy."));
  }
};

export const getExtractionAgents = async (): Promise<ExtractionAgent[]> => {
  try {
    const response = await axiosInstance.get<ExtractionAgent[]>(`${OPERATIONS_BASE}/extraction-agents`);
    return asArray<ExtractionAgent>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the extraction providers."));
  }
};

export const saveExtractionAgent = async (
  agentId: string | null,
  payload: ExtractionAgentWrite,
): Promise<ExtractionAgent> => {
  try {
    const response = agentId
      ? await axiosInstance.put<ExtractionAgent>(`${OPERATIONS_BASE}/extraction-agents/${agentId}`, payload)
      : await axiosInstance.post<ExtractionAgent>(`${OPERATIONS_BASE}/extraction-agents`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the extraction provider."));
  }
};

export const testExtractionAgent = async (agentId: string): Promise<ExtractionAgentTest> => {
  try {
    const response = await axiosInstance.post<ExtractionAgentTest>(`${OPERATIONS_BASE}/extraction-agents/${agentId}/test`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The provider test could not be completed."));
  }
};

export const getStorageConnections = async (): Promise<StorageConnection[]> => {
  try {
    const response = await axiosInstance.get<StorageConnection[]>(`${OPERATIONS_BASE}/storage-connections`);
    return asArray<StorageConnection>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the storage connections."));
  }
};

export const createStorageConnection = async (payload: StorageConnectionWrite): Promise<StorageConnection> => {
  try {
    const response = await axiosInstance.post<StorageConnection>(`${OPERATIONS_BASE}/storage-connections`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not create the storage connection."));
  }
};

export const getMicrosoftReadiness = async (): Promise<MicrosoftReadiness> => {
  try {
    const response = await axiosInstance.get<MicrosoftReadiness>(`${MICROSOFT_BASE}/readiness`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not check the Microsoft integration."));
  }
};

/** Starts the Microsoft sign-in. The browser must be sent to the returned authorization URL. */
export const startMicrosoftConnect = async (returnUrl: string): Promise<MicrosoftConnectResult> => {
  try {
    const response = await axiosInstance.post<MicrosoftConnectResult>(`${MICROSOFT_BASE}/connect`, { returnUrl, draft: {} });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not start the Microsoft sign-in."));
  }
};

export const getMicrosoftConnection = async (connectionId: string): Promise<MicrosoftConnectionState> => {
  try {
    const response = await axiosInstance.get<MicrosoftConnectionState>(`${MICROSOFT_BASE}/connections/${connectionId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the Microsoft connection."));
  }
};

export const resolveMicrosoftSite = async (connectionId: string, siteUrl: string): Promise<MicrosoftSite> => {
  try {
    const response = await axiosInstance.post<MicrosoftSite>(`${MICROSOFT_BASE}/connections/${connectionId}/site`, { siteUrl });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The SharePoint site could not be found."));
  }
};

export const getMicrosoftLibraries = async (connectionId: string, siteId: string): Promise<MicrosoftLibrary[]> => {
  try {
    const response = await axiosInstance.post<MicrosoftLibrary[]>(
      `${MICROSOFT_BASE}/connections/${connectionId}/libraries`,
      null,
      { params: { siteId } },
    );
    return asArray<MicrosoftLibrary>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the document libraries."));
  }
};

export const getMicrosoftFolders = async (
  connectionId: string,
  driveId: string,
  folderPath: string | null,
): Promise<MicrosoftFolder[]> => {
  try {
    const response = await axiosInstance.post<MicrosoftFolder[]>(
      `${MICROSOFT_BASE}/connections/${connectionId}/folders`,
      { driveId, folderPath },
    );
    return asArray<MicrosoftFolder>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the folders."));
  }
};

/** Saves the destination and runs the read/write check against it. */
export const validateMicrosoftConnection = async (
  connectionId: string,
  payload: MicrosoftDestinationWrite,
): Promise<MicrosoftConnectionState> => {
  try {
    const response = await axiosInstance.post<MicrosoftConnectionState>(
      `${MICROSOFT_BASE}/connections/${connectionId}/validate`,
      payload,
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The destination could not be validated."));
  }
};

export const disconnectMicrosoftConnection = async (connectionId: string): Promise<void> => {
  try {
    await axiosInstance.post(`${MICROSOFT_BASE}/connections/${connectionId}/disconnect`);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not disconnect the Microsoft connection."));
  }
};
