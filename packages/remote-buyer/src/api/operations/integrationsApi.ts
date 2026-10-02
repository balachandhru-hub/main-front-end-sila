import axiosInstance from "../axiosInstance";
import { OPERATIONS_BASE, cleanParams, fetchBlob, postForBlob, readError } from "./http";

/** Which organization configures an API type. */
export type IntegrationSide = "buyer" | "supplier";

/** "full": pull on demand, with a full sync. "check": read and validate only, nothing is stored. "none": no pull. */
export type IntegrationPullMode = "full" | "check" | "none";

export interface IntegrationProcessType {
  value: string;
  label: string;
  side: IntegrationSide;
  /** The API type has a field mapping. */
  hasMapping: boolean;
  pull: IntegrationPullMode;
  /** The API type has the data update (spreadsheet import/export) tab. */
  hasDataUpdate: boolean;
  /** Offered only to an organization with the operations (SILA ME) module. */
  operationsModule: boolean;
  /** Push types: when the application calls the API. */
  calledWhen?: string;
}

/** Every API type. The options and the tabs/actions of an integration are derived from this table. */
export const INTEGRATION_PROCESS_TYPES: IntegrationProcessType[] = [
  { value: "POST_PO", label: "Purchase order (create in ERP)", side: "buyer", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: false, calledWhen: "Called when a weekly bucket is fully approved." },
  { value: "GET_STOCK", label: "Material stock (stock in hand)", side: "buyer", hasMapping: true, pull: "check", hasDataUpdate: false, operationsModule: false },
  { value: "GET_MATERIAL", label: "Material master", side: "buyer", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: false },
  { value: "GET_CONTRACT", label: "Contract", side: "buyer", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: false },
  { value: "POST_SUPPLIER", label: "Supplier onboarding", side: "buyer", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: false, calledWhen: "Not called by the application yet." },
  { value: "GET_PO", label: "Purchase orders (import)", side: "buyer", hasMapping: true, pull: "full", hasDataUpdate: true, operationsModule: true },
  { value: "GET_SUPPLIER", label: "Suppliers (import)", side: "buyer", hasMapping: true, pull: "full", hasDataUpdate: true, operationsModule: true },
  { value: "POST_GRN", label: "Goods receipt (post to ERP)", side: "buyer", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: true, calledWhen: "Called when a goods receipt is posted." },
  { value: "GET_CATALOG", label: "Product catalog", side: "supplier", hasMapping: true, pull: "full", hasDataUpdate: false, operationsModule: false },
  { value: "GET_CATALOG_STOCK", label: "Product stock", side: "supplier", hasMapping: true, pull: "full", hasDataUpdate: false, operationsModule: false },
  { value: "POST_SALES_ORDER", label: "Purchase order (receive in ERP)", side: "supplier", hasMapping: false, pull: "none", hasDataUpdate: false, operationsModule: false, calledWhen: "Not called by the application yet." },
];

/** Push types send data to the external system; every other type reads from it. */
export const isPushProcess = (processType: string): boolean => processType.toUpperCase().startsWith("POST_");

/** The API types one side can configure; the operations-module types only with that module. */
export const integrationProcessTypesFor = (side: IntegrationSide, hasOperations: boolean): IntegrationProcessType[] =>
  INTEGRATION_PROCESS_TYPES.filter((type) => type.side === side && (hasOperations || !type.operationsModule));

/** The table row of an API type. A type saved before this table existed keeps every tab and action it had. */
export const integrationProcessOf = (processType: string): IntegrationProcessType =>
  INTEGRATION_PROCESS_TYPES.find((type) => type.value === processType) ?? {
    value: processType,
    label: processType,
    side: "buyer",
    hasMapping: true,
    pull: isPushProcess(processType) ? "none" : "full",
    hasDataUpdate: true,
    operationsModule: true,
  };

export const INTEGRATION_PROTOCOLS: { value: string; label: string }[] = [
  { value: "ODATA_V4", label: "OData V4" },
  { value: "REST", label: "REST" },
];

export const INTEGRATION_AUTH_TYPES: { value: string; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "BASIC", label: "Basic authentication" },
  { value: "API_KEY", label: "API key" },
  { value: "BEARER_TOKEN", label: "Bearer token" },
  { value: "OAUTH2_CLIENT_CREDENTIALS", label: "OAuth2 client credentials" },
  { value: "CUSTOM_TOKEN_ENDPOINT", label: "Custom token endpoint" },
];

export type IntegrationHttpMethod = "GET" | "POST" | "PUT" | "PATCH";

export const INTEGRATION_HTTP_METHODS: IntegrationHttpMethod[] = ["GET", "POST", "PUT", "PATCH"];

export type IntegrationPayloadFormat = "JSON" | "SOAP" | "CXML";

export const INTEGRATION_PAYLOAD_FORMATS: { value: IntegrationPayloadFormat; label: string }[] = [
  { value: "JSON", label: "JSON" },
  { value: "SOAP", label: "SOAP" },
  { value: "CXML", label: "cXML" },
];

/** Suggestions for the external system name; any other name can be typed. */
export const INTEGRATION_SYSTEMS: string[] = ["SAP S/4", "Ariba"];

/** Header name used for an API key when none is entered. */
export const INTEGRATION_DEFAULT_API_KEY_HEADER = "X-API-KEY";

/** Tokens the POST_PO request body template can contain. */
export const INTEGRATION_PO_BODY_TOKENS: string[] = [
  "{{weeklyBucketId}}", "{{bucketCode}}", "{{companyCode}}", "{{plant}}", "{{supplierId}}", "{{supplierName}}",
  "{{buyerDocumentNumber}}", "{{shipTo}}", "{{orderDate}}", "{{currency}}", "{{deliveryInstruction}}", "{{entries}}",
];

/** Extra request headers cannot carry credentials: the server refuses a name containing one of these words. */
export const isReservedIntegrationHeader = (name: string): boolean => /authorization|secret|token|key/i.test(name);

export const INTEGRATION_NULL_POLICIES: { value: string; label: string }[] = [
  { value: "IGNORE_NULL", label: "Ignore empty values" },
  { value: "WRITE_NULL", label: "Write empty values" },
  { value: "DEFAULT_VALUE", label: "Use a default value" },
];

export type IntegrationImportKind = "PURCHASE_ORDERS" | "SUPPLIERS";

export interface IntegrationConfiguration {
  id: string;
  organizationUnitId?: string | null;
  entityCode: string;
  name: string;
  processType: string;
  systemName?: string | null;
  protocol: string;
  baseUrl: string;
  resourcePath?: string | null;
  httpMethod?: IntegrationHttpMethod | null;
  payloadFormat?: IntegrationPayloadFormat | null;
  requestBody?: string | null;
  headers?: Record<string, string> | null;
  authenticationType: string;
  username?: string | null;
  apiKeyHeader?: string | null;
  credentialStatus: string;
  timeoutSeconds: number;
  retryCount: number;
  pageSize?: number | null;
  watermarkField?: string | null;
  lastWatermark?: string | null;
  lastAttemptAt?: string | null;
  lastSuccessfulRunAt?: string | null;
  nextRunAt?: string | null;
  isRunning: boolean;
  lastErrorSafe?: string | null;
  scheduleCron?: string | null;
  status: string;
  testedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Secrets are write-only: leaving one null keeps the value already stored. */
export interface IntegrationConfigurationWrite {
  name: string;
  entityCode: string;
  organizationUnitId?: string | null;
  processType: string;
  systemName?: string | null;
  protocol: string;
  baseUrl: string;
  resourcePath?: string | null;
  httpMethod: IntegrationHttpMethod;
  payloadFormat: IntegrationPayloadFormat;
  requestBody?: string | null;
  headers?: Record<string, string> | null;
  authenticationType: string;
  username?: string | null;
  apiKeyHeader?: string | null;
  apiKey?: string | null;
  password?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  bearerToken?: string | null;
  tokenEndpoint?: string | null;
  tokenScope?: string | null;
  tokenHeaders?: Record<string, string> | null;
  tokenBody?: Record<string, string> | null;
  timeoutSeconds: number;
  retryCount: number;
  pageSize?: number | null;
  watermarkField?: string | null;
  scheduleCron?: string | null;
}

export interface IntegrationTestResult {
  success: boolean;
  message: string;
  httpStatus?: number | null;
  testedAt: string;
}

export interface IntegrationSchemaProperty {
  name: string;
  type: string;
  nullable: boolean;
}

export interface IntegrationSchemaEntity {
  name: string;
  entitySet?: string | null;
  properties: IntegrationSchemaProperty[];
  keys: string[];
}

export interface IntegrationSchema {
  configurationId: string;
  metadataUrl: string;
  discoveredAt: string;
  entities: IntegrationSchemaEntity[];
}

export interface IntegrationTargetField {
  targetField: string;
  area: string;
  dataType: string;
  required: boolean;
  allowedTransformations: string[];
}

export interface IntegrationMappingWrite {
  sourceField: string;
  targetField: string;
  transformation?: string | null;
  nullPolicy: string;
  defaultValue?: string | null;
}

export interface IntegrationMapping extends IntegrationMappingWrite {
  id: string;
  configurationId: string;
  isValidated: boolean;
  updatedAt: string;
}

export interface IntegrationExecution {
  id: string;
  configurationId: string;
  trigger: string;
  status: string;
  startedAt: string;
  completedAt?: string | null;
  recordsRead: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  watermarkBefore?: string | null;
  watermarkAfter?: string | null;
  errorCode?: string | null;
  errorMessageSafe?: string | null;
}

/** A row of imported data; the columns depend on the kind that was requested. */
export type IntegrationDataRow = Record<string, string | number | boolean | null | undefined>;

export interface IntegrationDataUpdate {
  configurationId: string;
  purchaseOrders: number;
  suppliers?: number | null;
  purchaseOrderRows: IntegrationDataRow[];
  supplierRows: IntegrationDataRow[];
  lastSyncedAt?: string | null;
  lastWatermark?: string | null;
  isRunning: boolean;
  lastErrorSafe?: string | null;
  kind: string;
  totalRows: number;
  page: number;
  pageSize: number;
}

export interface IntegrationDataQuery {
  kind: IntegrationImportKind;
  search?: string;
  status?: string;
  sortBy?: string;
  descending?: boolean;
  page?: number;
  pageSize?: number;
}

export interface IntegrationImportRow {
  rowNumber: number;
  isValid: boolean;
  values: Record<string, string | null>;
  errors: string[];
}

export interface IntegrationImportPreview {
  configurationId: string;
  kind: IntegrationImportKind;
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  columns: string[];
  rows: IntegrationImportRow[];
}

export interface IntegrationImportCommitResult {
  execution: IntegrationExecution;
  recordsCommitted: number;
}

const BASE = `${OPERATIONS_BASE}/integrations`;

const asArray = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

export const getIntegrations = async (): Promise<IntegrationConfiguration[]> => {
  try {
    const response = await axiosInstance.get<IntegrationConfiguration[]>(BASE);
    return asArray<IntegrationConfiguration>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the integrations."));
  }
};

export const getIntegration = async (configurationId: string): Promise<IntegrationConfiguration> => {
  try {
    const response = await axiosInstance.get<IntegrationConfiguration>(`${BASE}/${configurationId}`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the integration."));
  }
};

export const createIntegration = async (payload: IntegrationConfigurationWrite): Promise<IntegrationConfiguration> => {
  try {
    const response = await axiosInstance.post<IntegrationConfiguration>(BASE, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not save the integration."));
  }
};

export const updateIntegration = async (
  configurationId: string,
  payload: IntegrationConfigurationWrite,
): Promise<IntegrationConfiguration> => {
  try {
    const response = await axiosInstance.put<IntegrationConfiguration>(`${BASE}/${configurationId}`, payload);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not update the integration."));
  }
};

export const testIntegration = async (configurationId: string): Promise<IntegrationTestResult> => {
  try {
    const response = await axiosInstance.post<IntegrationTestResult>(`${BASE}/${configurationId}/test`);
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The connection test could not be completed."));
  }
};

export const setIntegrationActive = async (configurationId: string, active: boolean): Promise<void> => {
  try {
    await axiosInstance.post(`${BASE}/${configurationId}/${active ? "activate" : "deactivate"}`);
  } catch (error: unknown) {
    throw new Error(readError(error, active ? "Could not activate the integration." : "Could not deactivate the integration."));
  }
};

export const pullIntegration = async (configurationId: string, fullSync: boolean): Promise<IntegrationExecution> => {
  try {
    const response = await axiosInstance.post<IntegrationExecution>(`${BASE}/${configurationId}/pull`, { fullSync });
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The pull could not be started."));
  }
};

export const getIntegrationExecutions = async (configurationId?: string): Promise<IntegrationExecution[]> => {
  try {
    const response = await axiosInstance.get<IntegrationExecution[]>(`${BASE}/executions`, {
      params: cleanParams({ configurationId }),
    });
    return asArray<IntegrationExecution>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the run history."));
  }
};

/** The mapping targets of one API type; empty for a type without field mapping. */
export const getIntegrationTargetFields = async (processType: string): Promise<IntegrationTargetField[]> => {
  try {
    const response = await axiosInstance.get<IntegrationTargetField[]>(`${BASE}/target-fields`, {
      params: cleanParams({ processType }),
    });
    return asArray<IntegrationTargetField>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the target fields."));
  }
};

const normalizeSchema = (schema: IntegrationSchema): IntegrationSchema => ({
  ...schema,
  entities: asArray<IntegrationSchemaEntity>(schema?.entities).map((entity) => ({
    ...entity,
    properties: asArray<IntegrationSchemaProperty>(entity.properties),
    keys: asArray<string>(entity.keys),
  })),
});

/** The last discovered schema, or null when none has been discovered yet. */
export const getIntegrationSchema = async (configurationId: string): Promise<IntegrationSchema | null> => {
  try {
    const response = await axiosInstance.get<IntegrationSchema | null>(`${BASE}/${configurationId}/schema`);
    return response.data ? normalizeSchema(response.data) : null;
  } catch (error: unknown) {
    if (axiosStatus(error) === 404) return null;
    throw new Error(readError(error, "Could not load the schema."));
  }
};

export const discoverIntegrationSchema = async (configurationId: string): Promise<IntegrationSchema> => {
  try {
    const response = await axiosInstance.post<IntegrationSchema>(`${BASE}/${configurationId}/schema`);
    return normalizeSchema(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Schema discovery failed. Test the connection and check the base URL."));
  }
};

export const getIntegrationMappings = async (configurationId: string): Promise<IntegrationMapping[]> => {
  try {
    const response = await axiosInstance.get<IntegrationMapping[]>(`${BASE}/${configurationId}/mappings`);
    return asArray<IntegrationMapping>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the field mappings."));
  }
};

/** Replaces every mapping of the configuration; the backend validates them against the target registry. */
export const saveIntegrationMappings = async (
  configurationId: string,
  mappings: IntegrationMappingWrite[],
): Promise<IntegrationMapping[]> => {
  try {
    const response = await axiosInstance.put<IntegrationMapping[]>(`${BASE}/${configurationId}/mappings`, mappings);
    return asArray<IntegrationMapping>(response.data);
  } catch (error: unknown) {
    throw new Error(readError(error, "The field mappings could not be saved."));
  }
};

const dataParams = (query: IntegrationDataQuery, paged: boolean): Record<string, string | number | boolean> =>
  cleanParams({
    kind: query.kind,
    search: query.search?.trim(),
    status: query.status,
    sortBy: query.sortBy,
    descending: query.descending ? true : undefined,
    page: paged ? query.page : undefined,
    pageSize: paged ? query.pageSize : undefined,
  });

export const getIntegrationDataUpdate = async (
  configurationId: string,
  query: IntegrationDataQuery,
): Promise<IntegrationDataUpdate> => {
  try {
    const response = await axiosInstance.get<IntegrationDataUpdate>(`${BASE}/${configurationId}/data-update`, {
      params: dataParams(query, true),
    });
    return {
      ...response.data,
      purchaseOrderRows: asArray<IntegrationDataRow>(response.data?.purchaseOrderRows),
      supplierRows: asArray<IntegrationDataRow>(response.data?.supplierRows),
    };
  } catch (error: unknown) {
    throw new Error(readError(error, "Could not load the imported data."));
  }
};

export const downloadIntegrationTemplate = async (
  configurationId: string,
  kind: IntegrationImportKind,
): Promise<{ blob: Blob; fileName: string }> => {
  const result = await fetchBlob(`${BASE}/${configurationId}/data-update/template`, { kind }, "Could not download the template.");
  return { blob: result.blob, fileName: result.fileName ?? `${kind.toLowerCase()}-template.xlsx` };
};

export const exportIntegrationData = async (
  configurationId: string,
  query: IntegrationDataQuery,
): Promise<{ blob: Blob; fileName: string }> => {
  const result = await fetchBlob(`${BASE}/${configurationId}/data-update/export`, dataParams(query, false), "Could not export the data.");
  return { blob: result.blob, fileName: result.fileName ?? `${query.kind.toLowerCase()}-export.xlsx` };
};

/** Validates a spreadsheet without changing any record. */
export const previewIntegrationImport = async (
  configurationId: string,
  kind: IntegrationImportKind,
  file: File,
): Promise<IntegrationImportPreview> => {
  const form = new FormData();
  form.append("file", file);
  try {
    const response = await axiosInstance.post<IntegrationImportPreview>(
      `${BASE}/${configurationId}/data-update/import/preview`,
      form,
      { params: { kind }, headers: { "Content-Type": "multipart/form-data" } },
    );
    return {
      ...response.data,
      columns: asArray<string>(response.data?.columns),
      rows: asArray<IntegrationImportRow>(response.data?.rows).map((row) => ({ ...row, errors: asArray<string>(row.errors) })),
    };
  } catch (error: unknown) {
    throw new Error(readError(error, "The spreadsheet could not be previewed."));
  }
};

export const commitIntegrationImport = async (
  configurationId: string,
  kind: IntegrationImportKind,
  rows: Record<string, string | null>[],
): Promise<IntegrationImportCommitResult> => {
  try {
    const response = await axiosInstance.post<IntegrationImportCommitResult>(
      `${BASE}/${configurationId}/data-update/import`,
      { kind, rows },
    );
    return response.data;
  } catch (error: unknown) {
    throw new Error(readError(error, "The import was not committed. No records were changed."));
  }
};

export const downloadIntegrationCorrectionReport = async (
  configurationId: string,
  kind: IntegrationImportKind,
  rows: IntegrationImportRow[],
): Promise<{ blob: Blob; fileName: string }> => {
  const result = await postForBlob(
    `${BASE}/${configurationId}/data-update/import/correction-report`,
    { kind, rows },
    "Could not download the correction report.",
  );
  return { blob: result.blob, fileName: result.fileName ?? `${kind.toLowerCase()}-correction-report.csv` };
};

function axiosStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status;
}
