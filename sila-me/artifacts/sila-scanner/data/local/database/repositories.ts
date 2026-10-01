import type { SQLiteDatabase } from 'expo-sqlite';
import { createLocalId, getLocalDatabase } from './database';

const now = () => new Date().toISOString();
const json = (value: unknown) => JSON.stringify(value ?? null);

export type CachedProfile = {
  userId: string;
  displayName: string;
  email: string;
  customerId?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
  properties: unknown[];
  stores: unknown[];
  roles: string[];
  permissions: string[];
  cachedAt?: string;
};

export type CachedMobileConfig = {
  configurationVersion: number;
  payload: unknown;
  downloadedAt?: string;
};

export type DraftStatus =
  | 'DRAFT'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTING'
  | 'SUBMITTED'
  | 'FAILED'
  | 'REQUIRES_REVALIDATION';

export type InventoryCountDraft = {
  localId?: string;
  serverId?: string | null;
  ownerUserId?: string | null;
  ownerCustomerId?: string | null;
  customerServerId?: string | null;
  propertyServerId?: string | null;
  storeServerId?: string | null;
  status?: DraftStatus;
  items: Array<{
    materialServerId?: string | null;
    materialCode: string;
    locationCode?: string | null;
    physicalQuantity: number;
    bookQuantity?: number | null;
    uom: string;
    payload?: unknown;
  }>;
};

export type DraftDocument = {
  localId?: string;
  serverId?: string | null;
  ownerUserId?: string | null;
  ownerCustomerId?: string | null;
  documentType: string;
  fileReference?: string | null;
  payload?: unknown;
};

export type DraftInvoicePage = {
  pageNumber: number;
  fileReference: string;
  rotationDegrees?: number;
  capturedAt?: string;
};

export type InvoiceDraftRecord = {
  localId: string;
  idempotencyKey: string;
  documentId?: string | null;
  invoiceId?: string | null;
  fileReference?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  propertyCode?: string | null;
  storeCode?: string | null;
  uploadStatus?: string;
  processingStatus?: string;
  status?: string;
  lastError?: string | null;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  poNumber?: string;
  currency?: string;
  netAmount?: number | null;
  taxAmount?: number | null;
  grossAmount?: number | null;
  pages: DraftInvoicePage[];
};

export async function saveInvoiceDraft(input: InvoiceDraftRecord): Promise<void> {
  const db = await getLocalDatabase();
  const timestamp = now();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO draft_documents (
        local_id, server_id, created_at, updated_at, document_type, file_reference,
        upload_status, last_error, payload_json
      ) VALUES (?, ?, COALESCE((SELECT created_at FROM draft_documents WHERE local_id = ?), ?), ?, 'INVOICE', ?, ?, ?, ?)
      ON CONFLICT(local_id) DO UPDATE SET
        server_id = excluded.server_id, updated_at = excluded.updated_at,
        file_reference = excluded.file_reference, upload_status = excluded.upload_status,
        last_error = excluded.last_error, payload_json = excluded.payload_json`,
      input.localId,
      input.documentId ?? null,
      input.localId,
      timestamp,
      timestamp,
      input.fileReference ?? null,
      input.uploadStatus === 'FAILED' ? 'FAILED' : input.uploadStatus === 'UPLOADED' ? 'UPLOADED' : 'PENDING',
      input.lastError ?? null,
      json(input),
    );
    await transaction.runAsync('DELETE FROM draft_document_pages WHERE document_local_id = ?', input.localId);
    for (const page of input.pages) {
      await transaction.runAsync(
        `INSERT INTO draft_document_pages (
          local_id, server_id, created_at, updated_at, document_local_id, page_number,
          file_reference, rotation_degrees, captured_at, upload_status
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        createLocalId('document_page'),
        timestamp,
        timestamp,
        input.localId,
        page.pageNumber,
        page.fileReference,
        page.rotationDegrees ?? 0,
        page.capturedAt ?? timestamp,
      );
    }
    const invoiceLocalId = `${input.localId}_invoice`;
    await transaction.runAsync(
      `INSERT INTO draft_invoices (
        local_id, server_id, created_at, updated_at, document_local_id, supplier_name,
        invoice_number, invoice_date, purchase_order_number, gross_amount, net_amount,
        tax_amount, currency, ocr_status, status, last_error, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(local_id) DO UPDATE SET
        server_id = excluded.server_id, updated_at = excluded.updated_at,
        supplier_name = excluded.supplier_name, invoice_number = excluded.invoice_number,
        invoice_date = excluded.invoice_date, purchase_order_number = excluded.purchase_order_number,
        gross_amount = excluded.gross_amount, net_amount = excluded.net_amount,
        tax_amount = excluded.tax_amount, currency = excluded.currency,
        ocr_status = excluded.ocr_status, status = excluded.status,
        last_error = excluded.last_error, payload_json = excluded.payload_json`,
      invoiceLocalId,
      input.invoiceId ?? null,
      timestamp,
      timestamp,
      input.localId,
      input.supplierName ?? null,
      input.invoiceNumber ?? null,
      input.invoiceDate ?? null,
      input.poNumber ?? null,
      input.grossAmount ?? null,
      input.netAmount ?? null,
      input.taxAmount ?? null,
      input.currency ?? null,
      input.processingStatus ?? 'NOT_STARTED',
      input.status ?? 'DRAFT',
      input.lastError ?? null,
      json(input),
    );
  });
}

export async function getInvoiceDraft(localId: string): Promise<InvoiceDraftRecord | null> {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<{ payload_json: string }>(
    'SELECT payload_json FROM draft_documents WHERE local_id = ?',
    localId,
  );
  if (!row) return null;
  return JSON.parse(row.payload_json) as InvoiceDraftRecord;
}

export async function getLatestInvoiceDraft(): Promise<InvoiceDraftRecord | null> {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<{ payload_json: string }>(
    `SELECT payload_json FROM draft_documents
     WHERE document_type = 'INVOICE' AND upload_status NOT IN ('CLEANED')
     ORDER BY updated_at DESC LIMIT 1`,
  );
  return row ? JSON.parse(row.payload_json) as InvoiceDraftRecord : null;
}

export type UploadQueueItem = {
  entityType: string;
  entityLocalId: string;
  fileReference?: string | null;
  ownerUserId?: string | null;
  ownerCustomerId?: string | null;
};

export type SyncQueueItem = {
  operation: string;
  entityType: string;
  entityLocalId: string;
  serverId?: string | null;
  payload?: unknown;
  ownerUserId?: string | null;
  ownerCustomerId?: string | null;
};

export async function saveLocalProfile(profile: CachedProfile): Promise<void> {
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT INTO local_profile (
      profile_key, user_id, display_name, email, customer_id, customer_code,
      customer_name, properties_json, stores_json, roles_json, permissions_json,
      cached_at
    ) VALUES ('current', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_key) DO UPDATE SET
      user_id = excluded.user_id,
      display_name = excluded.display_name,
      email = excluded.email,
      customer_id = excluded.customer_id,
      customer_code = excluded.customer_code,
      customer_name = excluded.customer_name,
      properties_json = excluded.properties_json,
      stores_json = excluded.stores_json,
      roles_json = excluded.roles_json,
      permissions_json = excluded.permissions_json,
      cached_at = excluded.cached_at`,
    profile.userId,
    profile.displayName,
    profile.email,
    profile.customerId ?? null,
    profile.customerCode ?? null,
    profile.customerName ?? null,
    json(profile.properties),
    json(profile.stores),
    json(profile.roles),
    json(profile.permissions),
    profile.cachedAt ?? now(),
  );
}

export async function getLocalProfile(): Promise<CachedProfile | null> {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<{
    user_id: string;
    display_name: string;
    email: string;
    customer_id: string | null;
    customer_code: string | null;
    customer_name: string | null;
    properties_json: string;
    stores_json: string;
    roles_json: string;
    permissions_json: string;
    cached_at: string;
  }>('SELECT * FROM local_profile WHERE profile_key = ?', 'current');
  if (!row) return null;
  return {
    userId: row.user_id,
    displayName: row.display_name,
    email: row.email,
    customerId: row.customer_id,
    customerCode: row.customer_code,
    customerName: row.customer_name,
    properties: JSON.parse(row.properties_json) as unknown[],
    stores: JSON.parse(row.stores_json) as unknown[],
    roles: JSON.parse(row.roles_json) as string[],
    permissions: JSON.parse(row.permissions_json) as string[],
    cachedAt: row.cached_at,
  };
}

export async function saveCachedMobileConfig(config: CachedMobileConfig): Promise<void> {
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT INTO cached_mobile_config
      (profile_key, configuration_version, payload_json, downloaded_at)
     VALUES ('current', ?, ?, ?)
     ON CONFLICT(profile_key) DO UPDATE SET
       configuration_version = excluded.configuration_version,
       payload_json = excluded.payload_json,
       downloaded_at = excluded.downloaded_at`,
    config.configurationVersion,
    json(config.payload),
    config.downloadedAt ?? now(),
  );
}

export async function getCachedMobileConfig(): Promise<CachedMobileConfig | null> {
  const db = await getLocalDatabase();
  const row = await db.getFirstAsync<{
    configuration_version: number;
    payload_json: string;
    downloaded_at: string;
  }>('SELECT * FROM cached_mobile_config WHERE profile_key = ?', 'current');
  if (!row) return null;
  return {
    configurationVersion: row.configuration_version,
    payload: JSON.parse(row.payload_json) as unknown,
    downloadedAt: row.downloaded_at,
  };
}

export async function cacheServerRows(
  table: 'cached_properties' | 'cached_stores' | 'cached_materials' | 'cached_suppliers',
  rows: Array<Record<string, string | number | null>>,
): Promise<void> {
  const db = await getLocalDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    for (const row of rows) {
      const values: Record<string, string | number | null> = {
        local_id: row.local_id ?? createLocalId('cache'),
        server_id: row.server_id,
        server_updated_at: row.server_updated_at ?? null,
        cached_at: row.cached_at ?? now(),
        sync_version: row.sync_version ?? null,
        ...row,
      };
      const columns = Object.keys(values);
      const placeholders = columns.map(() => '?').join(', ');
      const updates = columns
        .filter((column) => column !== 'local_id' && column !== 'server_id')
        .map((column) => `${column} = excluded.${column}`)
        .join(', ');
      await transaction.runAsync(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
         ON CONFLICT(server_id) DO UPDATE SET ${updates}`,
        ...columns.map((column) => values[column] as string | number | null),
      );
    }
  });
}

export async function saveInventoryCountDraft(input: InventoryCountDraft): Promise<string> {
  const db = await getLocalDatabase();
  const localId = input.localId ?? createLocalId('inventory_count');
  const timestamp = now();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `INSERT INTO draft_inventory_counts (
        local_id, server_id, created_at, updated_at, customer_server_id,
        property_server_id, store_server_id, status, last_error,
        owner_user_id, owner_customer_id
      ) VALUES (?, ?, COALESCE((SELECT created_at FROM draft_inventory_counts WHERE local_id = ?), ?), ?, ?, ?, ?, ?, NULL, ?, ?)
      ON CONFLICT(local_id) DO UPDATE SET
        server_id = excluded.server_id,
        updated_at = excluded.updated_at,
        customer_server_id = excluded.customer_server_id,
        property_server_id = excluded.property_server_id,
        store_server_id = excluded.store_server_id,
        status = excluded.status,
        last_error = NULL,
        owner_user_id = excluded.owner_user_id,
        owner_customer_id = excluded.owner_customer_id`,
      localId,
      input.serverId ?? null,
      localId,
      timestamp,
      timestamp,
      input.customerServerId ?? null,
      input.propertyServerId ?? null,
      input.storeServerId ?? null,
      input.status ?? 'DRAFT',
      input.ownerUserId ?? null,
      input.ownerCustomerId ?? null,
    );
    await transaction.runAsync(
      'DELETE FROM draft_inventory_count_items WHERE inventory_count_local_id = ?',
      localId,
    );
    for (const item of input.items) {
      await transaction.runAsync(
        `INSERT INTO draft_inventory_count_items (
          local_id, server_id, created_at, updated_at, inventory_count_local_id,
          material_server_id, material_code, location_code, physical_quantity,
          book_quantity, uom, payload_json
        ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        createLocalId('inventory_count_item'),
        timestamp,
        timestamp,
        localId,
        item.materialServerId ?? null,
        item.materialCode,
        item.locationCode ?? null,
        item.physicalQuantity,
        item.bookQuantity ?? null,
        item.uom,
        json(item.payload ?? item),
      );
    }
  });
  return localId;
}

export async function listInventoryCountDrafts(): Promise<Array<Record<string, unknown>>> {
  const db = await getLocalDatabase();
  return db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM draft_inventory_counts ORDER BY updated_at DESC',
  );
}

export async function saveDraftDocument(input: DraftDocument): Promise<string> {
  const db = await getLocalDatabase();
  const localId = input.localId ?? createLocalId('document');
  const timestamp = now();
  await db.runAsync(
    `INSERT INTO draft_documents (
      local_id, server_id, created_at, updated_at, document_type, file_reference,
      upload_status, payload_json, owner_user_id, owner_customer_id
    ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)
    ON CONFLICT(local_id) DO UPDATE SET
      server_id = excluded.server_id,
      updated_at = excluded.updated_at,
      document_type = excluded.document_type,
      file_reference = excluded.file_reference,
      payload_json = excluded.payload_json,
      owner_user_id = excluded.owner_user_id,
      owner_customer_id = excluded.owner_customer_id`,
    localId,
    input.serverId ?? null,
    timestamp,
    timestamp,
    input.documentType,
    input.fileReference ?? null,
    json(input.payload ?? {}),
    input.ownerUserId ?? null,
    input.ownerCustomerId ?? null,
  );
  return localId;
}

export async function enqueueUpload(input: UploadQueueItem): Promise<string> {
  const db = await getLocalDatabase();
  const localId = createLocalId('upload');
  await db.runAsync(
    `INSERT INTO upload_queue (
      local_id, entity_type, entity_local_id, file_reference, created_at,
      owner_user_id, owner_customer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    localId,
    input.entityType,
    input.entityLocalId,
    input.fileReference ?? null,
    now(),
    input.ownerUserId ?? null,
    input.ownerCustomerId ?? null,
  );
  return localId;
}

export async function listPendingUploads(): Promise<Array<Record<string, unknown>>> {
  const db = await getLocalDatabase();
  return db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM upload_queue
     WHERE status IN ('PENDING', 'FAILED')
     ORDER BY created_at ASC`,
  );
}

export async function enqueueSync(input: SyncQueueItem): Promise<string> {
  const db = await getLocalDatabase();
  const localId = createLocalId('sync');
  await db.runAsync(
    `INSERT INTO sync_queue (
      local_id, operation, entity_type, entity_local_id, server_id,
      payload_json, created_at, owner_user_id, owner_customer_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    localId,
    input.operation,
    input.entityType,
    input.entityLocalId,
    input.serverId ?? null,
    json(input.payload ?? null),
    now(),
    input.ownerUserId ?? null,
    input.ownerCustomerId ?? null,
  );
  return localId;
}

export async function getSyncState(domain: string): Promise<Record<string, unknown> | null> {
  const db = await getLocalDatabase();
  return db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM sync_state WHERE domain = ?',
    domain,
  );
}

export async function setSyncState(input: {
  domain: string;
  serverVersion?: string | null;
  serverCursor?: string | null;
  localVersion?: number;
}): Promise<void> {
  const db = await getLocalDatabase();
  await db.runAsync(
    `INSERT INTO sync_state (
      domain, last_successful_sync, server_version, server_cursor, local_version
    ) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(domain) DO UPDATE SET
      last_successful_sync = excluded.last_successful_sync,
      server_version = excluded.server_version,
      server_cursor = excluded.server_cursor,
      local_version = excluded.local_version`,
    input.domain,
    now(),
    input.serverVersion ?? null,
    input.serverCursor ?? null,
    input.localVersion ?? 0,
  );
}

export async function cleanupUploadedDocument(documentLocalId: string): Promise<void> {
  const db = await getLocalDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.runAsync(
      `UPDATE draft_document_pages
       SET file_reference = '', upload_status = 'CLEANED'
       WHERE document_local_id = ?`,
      documentLocalId,
    );
    await transaction.runAsync(
      `UPDATE draft_documents
       SET file_reference = NULL, upload_status = 'CLEANED', updated_at = ?
       WHERE local_id = ?`,
      now(),
      documentLocalId,
    );
  });
}

export async function getUnsyncedWorkSummary(): Promise<{
  drafts: number;
  uploads: number;
}> {
  const db = await getLocalDatabase();
  const [drafts, uploads] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT
        (SELECT COUNT(*) FROM draft_goods_receipts WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_inventory_counts WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_stock_transfers WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_goods_issues WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_stock_exceptions WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_documents WHERE upload_status NOT IN ('UPLOADED','CLEANED')) +
        (SELECT COUNT(*) FROM draft_invoices WHERE status NOT IN ('SUBMITTED')) AS count`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM upload_queue
       WHERE status IN ('PENDING','UPLOADING','FAILED')`,
    ),
  ]);
  return { drafts: drafts?.count ?? 0, uploads: uploads?.count ?? 0 };
}

export async function clearCachedServerData(): Promise<void> {
  const db = await getLocalDatabase();
  await db.withExclusiveTransactionAsync(async (transaction) => {
    await transaction.execAsync(`
      DELETE FROM local_profile;
      DELETE FROM cached_mobile_config;
      DELETE FROM cached_properties;
      DELETE FROM cached_stores;
      DELETE FROM cached_store_areas;
      DELETE FROM cached_materials;
      DELETE FROM cached_material_barcodes;
      DELETE FROM cached_material_aliases;
      DELETE FROM cached_material_uom_conversions;
      DELETE FROM cached_suppliers;
      DELETE FROM cached_supplier_material_mappings;
      DELETE FROM cached_stock_balances;
      DELETE FROM cached_stock_batches;
      DELETE FROM cached_purchase_orders;
      DELETE FROM cached_purchase_order_items;
    `);
  });
}

export async function deleteDraft(
  type: 'goods_receipt' | 'inventory_count' | 'stock_transfer' | 'goods_issue' | 'stock_exception' | 'document' | 'invoice',
  localId: string,
): Promise<void> {
  const tableByType = {
    goods_receipt: 'draft_goods_receipts',
    inventory_count: 'draft_inventory_counts',
    stock_transfer: 'draft_stock_transfers',
    goods_issue: 'draft_goods_issues',
    stock_exception: 'draft_stock_exceptions',
    document: 'draft_documents',
    invoice: 'draft_invoices',
  } as const;
  const db = await getLocalDatabase();
  await db.runAsync(`DELETE FROM ${tableByType[type]} WHERE local_id = ?`, localId);
}