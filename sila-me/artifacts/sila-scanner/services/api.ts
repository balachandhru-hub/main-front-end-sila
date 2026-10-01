import { getSessionToken } from '@/services/auth';

export interface HealthResponse {
  status: "OK";
  service?: "SILA Store Backend";
  database?: string;
}

export interface VersionResponse {
  application: "SILA Store";
  backendVersion: string;
}

export interface AuthUserResponse {
  userId: string;
  displayName: string;
  email: string;
  userType?: string;
  authentication?: { providerType: string; userType?: string };
  customer: { id: number; code: string; name: string } | null;
  properties: Array<{ id: number; code: string; name: string }>;
  stores: Array<{ id: number; code: string; name: string; propertyCode: string }>;
  roles: string[];
  permissions: string[];
}

export interface MobileConfigResponse {
  configurationVersion: number;
  updatedAt: string;
  features: Record<string, boolean>;
}

export interface VisionImageUpload {
  uri: string;
  name: string;
  type: string;
  file?: Blob;
}

export interface VisionRecognitionCandidate {
  materialId?: number | string;
  materialCode: string;
  description: string;
  brand?: string | null;
  category?: string | null;
  baseUom: string;
  purchaseUom: string;
  barcode?: string | null;
  supplierMaterialCode?: string | null;
  confidence: number;
  matchReasons?: string[];
  matchReason?: string;
  plantCode?: string | null;
  storageLocation?: string | null;
  batchManaged?: boolean;
  expiryManaged?: boolean;
}

export interface VisionRecognitionResponse {
  recognitionRunId: string | number;
  status?: "COMPLETED" | "NO_MATCH" | "FAILED" | string;
  extractedAttributes?: Record<string, unknown>;
  candidates?: VisionRecognitionCandidate[];
  matches?: VisionRecognitionCandidate[];
}

export interface SupplierApiResponse {
  supplierCode: string;
  supplierName: string;
  supplierShortName: string | null;
  taxRegistrationNumber: string | null;
  countryCode: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  sourceSystem: string;
}

export interface OpenPurchaseOrderLineApiResponse {
  poNumber: string;
  poType: "MATERIAL" | "SERVICE" | "OTHER";
  status: "OPEN" | "PARTIALLY_RECEIVED";
  supplier: SupplierApiResponse;
  poItem: string;
  materialCode: string | null;
  description: string;
  orderedQuantity: number;
  previouslyReceivedQuantity: number;
  openQuantity: number;
  uom: string;
  plantCode: string;
  storageLocation: string | null;
  deliveryDate: string | null;
  servicePo: boolean;
}

export interface PurchaseOrderItemApiResponse extends OpenPurchaseOrderLineApiResponse {
  itemType: "MATERIAL" | "SERVICE" | "OTHER";
  unitPrice: number | null;
  currency: string | null;
  deliveryCompleted: boolean;
  deleted: boolean;
  overdeliveryTolerancePercent: number | null;
  underdeliveryTolerancePercent: number | null;
}

export interface PurchaseOrderApiResponse {
  poNumber: string;
  poType: "MATERIAL" | "SERVICE" | "OTHER";
  status: string;
  supplier: SupplierApiResponse;
  documentDate: string;
  currency: string;
  plantCode: string;
  deliveryDate: string | null;
  items: PurchaseOrderItemApiResponse[];
  servicePo: boolean;
  serviceMessage: string | null;
  sourceSystem: string;
  lastSyncedAt: string;
}

export interface PaginatedSuppliersResponse {
  items: SupplierApiResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface OpenPurchaseOrdersResponse {
  items: OpenPurchaseOrderLineApiResponse[];
  total: number;
  limit: number;
  offset: number;
}

export interface StockAvailabilityResponse {
  material: { materialCode: string; description: string; baseUom: string };
  context: { customerCode: string; propertyCode: string | null; storeCode: string | null; plantCode: string | null; storageLocation: string | null };
  stock: { onHand: number; available: number; blocked: number; qualityInspection: number; reserved: number; uom: string };
  sourceSystem: string;
  lastSyncedAt: string;
}

export interface StockTransferApiResponse {
  id: number;
  transferNumber: string;
  transactionId: number;
  sourceStore: { code: string; name: string } | null;
  destinationStore: { code: string; name: string } | null;
  sourceStoreId: number;
  destinationStoreId: number;
  transferType: string;
  status: string;
  approvalStatus: string;
  items: Array<{
    id: number;
    materialCode: string;
    materialDescription: string;
    quantity: string;
    uom: string;
    availableQuantitySnapshot: string;
    sourceStorageLocation: string;
    destinationStorageLocation: string;
    batchNumber: string | null;
  }>;
  approvalRequest: Record<string, unknown> | null;
}

export interface GoodsIssueApiResponse {
  id: number;
  goodsIssueNumber: string;
  transactionId: number;
  issueType: string;
  reasonCode: string;
  status: string;
  approvalStatus: string;
  storeId: number;
  destination: { destinationCode: string; destinationName: string; destinationType: string } | null;
  items: Array<{
    id: number;
    materialCode: string;
    materialDescription: string;
    quantity: string;
    uom: string;
    availableQuantitySnapshot: string;
    storageLocation: string;
    batchNumber: string | null;
  }>;
  approvalRequest: Record<string, unknown> | null;
}

export interface TransactionValidationResponse {
  valid: boolean;
  errors: Array<{ code: string; message: string; itemId?: number }>;
  warnings: Array<{ code: string; message: string; itemId?: number }>;
  approvalRequired: boolean;
}

export interface ConsumptionDestination {
  id: number;
  destinationType: string;
  destinationCode: string;
  destinationName: string;
}

export interface GoodsReceiptApiResponse {
  id: number;
  poNumber: string;
  grnNumber: string | null;
  materialDocumentNumber: string | null;
  supplierId: number;
  propertyId: number;
  storeId: number;
  status: string;
  approvalStatus: string;
  documentDate: string;
  postingDate: string | null;
  invoiceNumber: string | null;
  deliveryNoteNumber: string | null;
  items: Array<{
    id: number;
    poItemNumber: string;
    materialCode: string | null;
    acceptedQuantity: string;
    damagedQuantity: string;
    rejectedQuantity: string;
    receivedTotalQuantity: string;
    poUom: string;
  }>;
  exceptions: Array<{ exceptionType: string; severity: string; actualValue: string | null }>;
}

export interface GoodsReceiptValidationResponse {
  valid: boolean;
  errors: Array<{ code: string; message: string; itemId?: number }>;
  warnings: Array<{ code: string; message: string; itemId?: number }>;
  approvalRequired: boolean;
}

export interface DocumentCreateResponse {
  id: number;
  processingStatus: string;
  storageStatus: string;
  invoiceId?: number;
}

export interface InvoiceHistoryResponse {
  items: Array<InvoiceApiResponse & {
    createdAt?: string;
    uploadedAt?: string;
    status?: string;
  }>;
  total: number;
  limit: number;
  offset: number;
}

export interface InvoiceLineApiResponse {
  id: number;
  lineNumber: number;
  lineType: string;
  description: string;
  materialCodeExtracted: string | null;
  matchedMaterialCode: string | null;
  quantity: string | null;
  uom: string | null;
  unitPrice: string | null;
  lineNetAmount: string;
  taxAmount: string;
  lineGrossAmount: string;
  poNumber: string | null;
  poItemNumber: string | null;
  matchStatus: string;
}

export interface InvoiceApiResponse {
  id: number;
  document: {
    id: number;
    fileName: string;
    mimeType?: string;
    pageCount: number;
    fileSizeBytes?: number | null;
    processingStatus: string;
    storageStatus: string;
    storageProvider: string | null;
    storagePath: string | null;
  };
  invoiceType: string;
  supplier: { id: number | null; code: string | null; name: string; trn: string | null };
  invoiceNumber: string;
  invoiceDate: string;
  poNumberExtracted: string | null;
  matchedPoNumber: string | null;
  currency: string;
  grossAmount: number | null;
  netAmount: number | null;
  taxAmount: number | null;
  taxCode: string | null;
  ocrProvider: string;
  ocrConfidence: number | null;
  ocrStatus: string;
  poMatchStatus: string;
  grnStatus: string | null;
  processingStatus: string;
  lines: InvoiceLineApiResponse[];
}

export interface InvoiceCandidatesResponse {
  supplier: { id: number | null; code: string | null; name: string };
  candidates: Array<{
    poNumber: string;
    purchaseOrderId: number;
    status: string;
    deliveryDate: string | null;
    matchConfidence: number;
    matchedLineCount: number;
    invoiceLineCount: number;
  }>;
}

export type AuthErrorCode =
  | "MOBILE_USER_REQUIRED"
  | "USER_NOT_REGISTERED"
  | "USER_INACTIVE"
  | "INVALID_CREDENTIALS";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

const authErrorMessages: Record<AuthErrorCode, string> = {
  MOBILE_USER_REQUIRED: "This account is not enabled for SILA Store mobile access.",
  USER_NOT_REGISTERED:
    "Your account is not registered for SILA Store. Please contact your administrator.",
  USER_INACTIVE:
    "Your SILA Store access is inactive. Please contact your administrator.",
  INVALID_CREDENTIALS: "The SILA user ID or password is incorrect.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError && error.message.trim()) {
    return error.message;
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }
  if (error instanceof ApiRequestError && error.code && error.code in authErrorMessages) {
    return authErrorMessages[error.code as AuthErrorCode];
  }
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code in authErrorMessages
  ) {
    return authErrorMessages[error.code as AuthErrorCode];
  }
  return error instanceof Error ? error.message : "Authentication could not be completed.";
}

interface AuthResponse {
  accessToken: string;
  tokenType?: "Bearer" | string;
  expiresIn: number;
  user?: AuthUserResponse;
  userType?: string;
}

export function assertMobileIdentity(identity: {
  userType?: string;
  authentication?: { userType?: string };
}): void {
  const userType = identity.userType ?? identity.authentication?.userType;
  if (userType && userType.toUpperCase() !== "MOBILE") {
    throw new ApiRequestError(
      "The authenticated account is not a SILA Store mobile account.",
      "MOBILE_USER_REQUIRED",
      403,
    );
  }
}

const configuredApiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  "https://sila-cloud-administration.replit.app/api"
).replace(/\/+$/, "");
const apiBaseUrl = configuredApiBaseUrl.endsWith("/api")
  ? configuredApiBaseUrl
  : `${configuredApiBaseUrl}/api`;

function requestUrl(path: string): string {
  const route = path.startsWith("/") ? path : `/${path}`;
  if (apiBaseUrl.endsWith("/api") && route.startsWith("/api/")) {
    return `${apiBaseUrl}${route.slice("/api".length)}`;
  }
  return `${apiBaseUrl}${route}`;
}

let authExpiredHandler: (() => void | Promise<void>) | null = null;

export function setAuthExpiredHandler(handler: (() => void | Promise<void>) | null): void {
  authExpiredHandler = handler;
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
  includeToken = true,
): Promise<T> => {
  if (!apiBaseUrl) {
    throw new Error("API_BASE_URL is not configured.");
  }

  const token = includeToken ? await getSessionToken() : null;
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  const isFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(requestUrl(path), { ...options, headers, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiRequestError("The SILA service did not respond in time.", "NETWORK_TIMEOUT");
    }
    throw new ApiRequestError("The SILA service could not be reached.", "NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.toLowerCase().includes("application/json")) {
    const rawBody = await response.text().catch(() => "");
    const body = (() => {
      try {
        return JSON.parse(rawBody) as {
          error?: unknown;
          message?: unknown;
          detail?: unknown;
          errors?: unknown;
        };
      } catch {
        return null;
      }
    })() as {
      error?: unknown;
      message?: unknown;
      detail?: unknown;
      errors?: unknown;
    } | null;
    if (
      response.redirected ||
      response.url.includes("/__replshield") ||
      contentType.toLowerCase().includes("text/html")
    ) {
      throw new ApiRequestError(
        "Invalid SILA API configuration.",
        "API_AUTH_REDIRECT",
        response.status,
      );
    }
    if (response.status === 401 && includeToken) {
      await authExpiredHandler?.();
    }
    const bodyMessage =
      typeof body?.message === "string" && body.message.trim()
        ? body.message
        : typeof body?.detail === "string" && body.detail.trim()
          ? body.detail
          : typeof body?.error === "string" && body.error.trim() && !(body.error in authErrorMessages)
            ? body.error
            : Array.isArray(body?.errors)
              ? body.errors
                  .map((item) =>
                    typeof item === "string"
                      ? item
                      : typeof item === "object" &&
                          item !== null &&
                          "message" in item &&
                          typeof item.message === "string"
                        ? item.message
                        : null,
                  )
                  .filter((item): item is string => Boolean(item))
                  .join("\n")
              : undefined;
    throw new ApiRequestError(
      bodyMessage ?? `API request failed with status ${response.status}.`,
      typeof body?.error === "string" && body.error in authErrorMessages ? body.error : undefined,
      response.status,
    );
  }

  return response.json() as Promise<T>;
};

export const api = {
  getHealth: () => request<HealthResponse>("/api/health"),
  getVersion: () => request<VersionResponse>("/api/version"),
  getMe: async () => {
    try {
      const result = await request<AuthUserResponse>("/api/me");
      if (__DEV__) {
        console.info("[SILA Mobile Auth] /me response", { httpStatus: 200 });
      }
      return result;
    } catch (error) {
      if (__DEV__) {
        console.warn("[SILA Mobile Auth] /me failed", {
          httpStatus: error instanceof ApiRequestError ? error.status : undefined,
          code: error instanceof ApiRequestError ? error.code : undefined,
          message: getAuthErrorMessage(error),
        });
      }
      throw error;
    }
  },
  getMobileConfig: () => request<MobileConfigResponse>("/api/mobile/config"),
  recognizeMaterialVision: (input: {
    image: VisionImageUpload;
    customerId: number;
    propertyId: number;
    storeId: number;
    supplierId?: number;
    poNumber?: string;
    context?: Record<string, string | number | null>;
  }) => {
    const form = new FormData();
    if (input.image.file) {
      form.append("image", input.image.file);
    } else {
      form.append("image", {
        uri: input.image.uri,
        name: input.image.name,
        type: input.image.type,
      } as unknown as Blob);
    }
    form.append("customerId", String(input.customerId));
    form.append("propertyId", String(input.propertyId));
    form.append("storeId", String(input.storeId));
    if (input.supplierId !== undefined) form.append("supplierId", String(input.supplierId));
    if (input.poNumber) form.append("poNumber", input.poNumber);
    if (input.context) form.append("context", JSON.stringify(input.context));
    return request<VisionRecognitionResponse>("/api/materials/vision/recognize", {
      method: "POST",
      body: form,
    });
  },
  loginMobile: async (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    if (__DEV__) {
      console.info("[SILA Mobile Auth] login request", {
        baseUrl: apiBaseUrl,
        endpoint: "/auth/mobile/login",
        email: normalizedEmail,
      });
    }
    try {
      const result = await request<AuthResponse>(
        "/auth/mobile/login",
        { method: "POST", body: JSON.stringify({ email: normalizedEmail, password }) },
        false,
      );
      assertMobileIdentity({
        userType: result.userType,
        authentication: result.user
          ? { userType: result.user.userType ?? result.user.authentication?.userType }
          : undefined,
      });
      if (__DEV__) {
        console.info("[SILA Mobile Auth] login response", {
          httpStatus: 200,
          tokenReceived: Boolean(result.accessToken),
          userType: result.userType ?? result.user?.userType ?? result.user?.authentication?.userType,
        });
      }
      return result;
    } catch (error) {
      if (__DEV__) {
        console.warn("[SILA Mobile Auth] login failed", {
          httpStatus: error instanceof ApiRequestError ? error.status : undefined,
          code: error instanceof ApiRequestError ? error.code : undefined,
          message: getAuthErrorMessage(error),
        });
      }
      throw error;
    }
  },
  searchSuppliers: (query?: string, limit = 20, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (query?.trim()) params.set("q", query.trim());
    return request<PaginatedSuppliersResponse>(`/api/suppliers/search?${params.toString()}`);
  },
  searchOpenPurchaseOrders: (filters: {
    supplierCode?: string;
    materialCode?: string;
    propertyCode?: string;
    storeCode?: string;
    plantCode?: string;
    storageLocation?: string;
    poNumber?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    return request<OpenPurchaseOrdersResponse>(
      `/api/purchase-orders/open?${params.toString()}`,
    );
  },
  getPurchaseOrder: (
    poNumber: string,
    filters: { propertyCode?: string; storeCode?: string } = {},
  ) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== undefined && value !== "") params.set(key, String(value));
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<PurchaseOrderApiResponse>(
      `/api/purchase-orders/${encodeURIComponent(poNumber)}${suffix}`,
    );
  },
  getMaterialStock: (materialCode: string, filters: { storeCode?: string; propertyCode?: string; storageLocation?: string } = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value) params.set(key, value);
    }
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<StockAvailabilityResponse>(`/api/stock/materials/${encodeURIComponent(materialCode)}${suffix}`);
  },
  createStockTransfer: (input: {
    sourceStoreCode: string;
    destinationStoreCode: string;
    transferType: "STORE_TO_STORE" | "LOCATION_TO_LOCATION" | "PROPERTY_TO_PROPERTY";
    reasonCode?: string;
    notes?: string;
    idempotencyKey: string;
  }) => request<StockTransferApiResponse>("/api/stock-transfers", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(input),
  }),
  addStockTransferItem: (id: number, input: {
    materialCode: string;
    quantity: number;
    uom: string;
    sourceStorageLocation?: string;
    destinationStorageLocation?: string;
    batchNumber?: string;
    expiryDate?: string;
  }) => request<StockTransferApiResponse>(`/api/stock-transfers/${id}/items`, { method: "POST", body: JSON.stringify(input) }),
  validateStockTransfer: (id: number) => request<TransactionValidationResponse>(`/api/stock-transfers/${id}/validate`, { method: "POST" }),
  submitStockTransfer: (id: number) => request<StockTransferApiResponse>(`/api/stock-transfers/${id}/submit`, { method: "POST" }),
  getStockTransfer: (id: number) => request<StockTransferApiResponse>(`/api/stock-transfers/${id}`),
  createGoodsIssue: (input: {
    sourceStoreCode: string;
    issueType: string;
    destinationCode: string;
    reasonCode: string;
    notes?: string;
    idempotencyKey: string;
  }) => request<GoodsIssueApiResponse>("/api/goods-issues", {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(input),
  }),
  getGoodsIssueDestinations: (propertyCode?: string, destinationType?: string) => {
    const params = new URLSearchParams();
    if (propertyCode) params.set("propertyCode", propertyCode);
    if (destinationType) params.set("destinationType", destinationType);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return request<ConsumptionDestination[]>(`/api/goods-issues/destinations${suffix}`);
  },
  addGoodsIssueItem: (id: number, input: {
    materialCode: string;
    quantity: number;
    uom: string;
    storageLocation?: string;
    batchNumber?: string;
    expiryDate?: string;
  }) => request<GoodsIssueApiResponse>(`/api/goods-issues/${id}/items`, { method: "POST", body: JSON.stringify(input) }),
  validateGoodsIssue: (id: number) => request<TransactionValidationResponse>(`/api/goods-issues/${id}/validate`, { method: "POST" }),
  submitGoodsIssue: (id: number) => request<GoodsIssueApiResponse>(`/api/goods-issues/${id}/submit`, { method: "POST" }),
  getGoodsIssue: (id: number) => request<GoodsIssueApiResponse>(`/api/goods-issues/${id}`),
  createGoodsReceipt: (input: {
    poNumber: string;
    invoiceNumber?: string;
    documentDate?: string;
    documentId?: number;
    invoiceHeaderId?: number;
    idempotencyKey: string;
  }) =>
    request<GoodsReceiptApiResponse>("/api/goods-receipts", {
      method: "POST",
      headers: { "Idempotency-Key": input.idempotencyKey },
      body: JSON.stringify(input),
    }),
  addGoodsReceiptItem: (id: number, input: {
    poItem: string;
    acceptedQuantity: number;
    damagedQuantity?: number;
    rejectedQuantity?: number;
    batchNumber?: string;
    expiryDate?: string;
  }) =>
    request<GoodsReceiptApiResponse>(`/api/goods-receipts/${id}/items`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  validateGoodsReceipt: (id: number) =>
    request<GoodsReceiptValidationResponse>(`/api/goods-receipts/${id}/validate`, { method: "POST" }),
  submitGoodsReceipt: (id: number) =>
    request<GoodsReceiptApiResponse>(`/api/goods-receipts/${id}/submit`, { method: "POST" }),
  getGoodsReceipt: (id: number) =>
    request<GoodsReceiptApiResponse>(`/api/goods-receipts/${id}`),
  createDocument: (input: {
    idempotencyKey?: string;
    fileName: string;
    mimeType?: string;
    pageCount: number;
    fileSizeBytes?: number;
    checksum?: string;
    propertyCode?: string;
    storeCode?: string;
    hints?: {
      supplierName?: string;
      invoiceNumber?: string;
      invoiceDate?: string;
      poNumber?: string;
      invoiceType?: "MATERIAL" | "SERVICE" | "MIXED" | "UNKNOWN";
    };
  }) =>
    request<DocumentCreateResponse>("/api/documents", {
      method: "POST",
      headers: input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : undefined,
      body: JSON.stringify(input),
    }),
  attachDocumentFile: (documentId: number, input: {
    uri: string;
    name: string;
    mimeType: string;
    size?: number;
    checksum?: string;
    propertyCode?: string;
    storeCode?: string;
    idempotencyKey?: string;
  }) => {
    const form = new FormData();
    form.append("file", {
      uri: input.uri,
      name: input.name,
      type: input.mimeType,
    } as unknown as Blob);
    if (input.size !== undefined) form.append("fileSizeBytes", String(input.size));
    if (input.checksum) form.append("checksum", input.checksum);
    if (input.propertyCode) form.append("propertyCode", input.propertyCode);
    if (input.storeCode) form.append("storeCode", input.storeCode);
    return request<{ id: number; fileSizeBytes: number | null; checksum: string | null }>(
      `/api/documents/${documentId}/file`,
      {
        method: "POST",
        headers: input.idempotencyKey ? { "Idempotency-Key": input.idempotencyKey } : undefined,
        body: form,
      },
    );
  },
  extractDocument: (documentId: number) =>
    request<InvoiceApiResponse>(`/api/documents/${documentId}/extract`, { method: "POST" }),
  getExtractionStatus: (documentId: number) =>
    request<{ documentId: number; processingStatus: string; storageStatus: string }>(
      `/api/documents/${documentId}/extraction-status`,
    ),
  getInvoice: (invoiceId: number) =>
    request<InvoiceApiResponse>(`/api/invoices/${invoiceId}`),
  confirmInvoiceExtraction: (invoiceId: number, input: {
    supplierName?: string;
    invoiceNumber?: string;
    invoiceDate?: string;
    poNumber?: string;
    invoiceType?: "MATERIAL" | "SERVICE" | "MIXED" | "UNKNOWN";
    currency?: string;
    netAmount?: number | string;
    taxAmount?: number | string;
    grossAmount?: number | string;
    lines?: Array<Record<string, unknown>>;
  }) =>
    request<InvoiceApiResponse>(`/api/invoices/${invoiceId}/confirm-extraction`, {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  listInvoices: (filters: { limit?: number; offset?: number; status?: string } = {}) => {
    const params = new URLSearchParams();
    params.set("limit", String(filters.limit ?? 50));
    params.set("offset", String(filters.offset ?? 0));
    if (filters.status) params.set("status", filters.status);
    return request<InvoiceHistoryResponse>(`/api/invoices?${params.toString()}`);
  },
  matchInvoicePurchaseOrders: (invoiceId: number) =>
    request<{ invoiceId: number; candidates: InvoiceCandidatesResponse["candidates"] }>(
      `/api/invoices/${invoiceId}/match-purchase-orders`,
      { method: "POST" },
    ),
  getInvoiceCandidates: (invoiceId: number) =>
    request<InvoiceCandidatesResponse>(`/api/invoices/${invoiceId}/purchase-order-candidates`),
  confirmInvoicePurchaseOrder: (invoiceId: number, poNumber: string) =>
    request<InvoiceApiResponse>(`/api/invoices/${invoiceId}/confirm-purchase-order`, {
      method: "POST",
      body: JSON.stringify({ poNumber }),
    }),
  getInvoiceComparison: (invoiceId: number) =>
    request<{ invoiceId: number; invoiceNumber: string; poNumber: string | null; lines: Array<Record<string, unknown>> }>(
      `/api/invoices/${invoiceId}/po-comparison`,
    ),
  startReceivingFromInvoice: (invoiceId: number) =>
    request<{ invoiceId: number; documentId: number; poNumber: string; invoiceNumber: string; status: string }>(
      `/api/invoices/${invoiceId}/start-receiving`,
      { method: "POST" },
    ),
  archiveDocument: (documentId: number) =>
    request<{ documentId: number; storageStatus: string; storageProvider: string | null; storagePath: string | null }>(
      `/api/documents/${documentId}/upload`,
      { method: "POST" },
    ),
  logout: () => request<{ success: true }>("/auth/mobile/logout", { method: "POST" }),
};

export const testBackendConnectivity = async (): Promise<void> => {
  try {
    const health = await api.getHealth();
    console.info("[SILA Store API] Backend connected", health);
  } catch (error) {
    console.warn(
      "[SILA Store API] Backend connectivity check failed",
      error instanceof Error ? error.message : error,
    );
  }
};