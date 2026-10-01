import type { SQLiteDatabase } from 'expo-sqlite';

export const LOCAL_DATABASE_NAME = 'sila-store-local.db';
export const CURRENT_LOCAL_SCHEMA_VERSION = 2;

const cachedRecord = `
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT NOT NULL UNIQUE,
  server_updated_at TEXT,
  cached_at TEXT NOT NULL,
  sync_version TEXT,
  origin TEXT NOT NULL DEFAULT 'CACHED_SERVER_DATA'
    CHECK (origin = 'CACHED_SERVER_DATA')
`;

const draftRecord = `
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  origin TEXT NOT NULL DEFAULT 'LOCAL_DRAFT_DATA'
    CHECK (origin = 'LOCAL_DRAFT_DATA')
`;

const migrationOne = [
  `CREATE TABLE IF NOT EXISTS local_profile (
    profile_key TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT NOT NULL,
    customer_id TEXT,
    customer_code TEXT,
    customer_name TEXT,
    properties_json TEXT NOT NULL,
    stores_json TEXT NOT NULL,
    roles_json TEXT NOT NULL,
    permissions_json TEXT NOT NULL,
    cached_at TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'CACHED_SERVER_DATA'
      CHECK (origin = 'CACHED_SERVER_DATA')
  )`,
  `CREATE TABLE IF NOT EXISTS cached_mobile_config (
    profile_key TEXT PRIMARY KEY NOT NULL,
    configuration_version INTEGER NOT NULL,
    payload_json TEXT NOT NULL,
    downloaded_at TEXT NOT NULL,
    origin TEXT NOT NULL DEFAULT 'CACHED_SERVER_DATA'
      CHECK (origin = 'CACHED_SERVER_DATA')
  )`,
  `CREATE TABLE IF NOT EXISTS cached_properties (
    ${cachedRecord},
    customer_server_id TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_stores (
    ${cachedRecord},
    property_server_id TEXT,
    property_code TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_store_areas (
    ${cachedRecord},
    store_server_id TEXT NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_materials (
    ${cachedRecord},
    material_code TEXT NOT NULL,
    description TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    base_uom TEXT NOT NULL,
    purchase_uom TEXT NOT NULL,
    plant_code TEXT,
    storage_location TEXT,
    batch_managed INTEGER NOT NULL DEFAULT 0,
    expiry_managed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS cached_material_barcodes (
    ${cachedRecord},
    material_server_id TEXT NOT NULL,
    barcode TEXT NOT NULL UNIQUE
  )`,
  `CREATE TABLE IF NOT EXISTS cached_material_aliases (
    ${cachedRecord},
    material_server_id TEXT NOT NULL,
    alias TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_material_uom_conversions (
    ${cachedRecord},
    material_server_id TEXT NOT NULL,
    from_uom TEXT NOT NULL,
    to_uom TEXT NOT NULL,
    factor REAL NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_suppliers (
    ${cachedRecord},
    supplier_code TEXT NOT NULL,
    supplier_name TEXT NOT NULL,
    tax_registration_number TEXT,
    status TEXT,
    source_system TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cached_supplier_material_mappings (
    ${cachedRecord},
    supplier_server_id TEXT NOT NULL,
    material_server_id TEXT NOT NULL,
    supplier_material_code TEXT,
    supplier_description TEXT,
    supplier_uom TEXT,
    pack_size TEXT,
    brand TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS cached_stock_balances (
    ${cachedRecord},
    material_server_id TEXT NOT NULL,
    property_server_id TEXT,
    store_server_id TEXT,
    storage_location TEXT,
    on_hand REAL NOT NULL,
    available REAL NOT NULL,
    blocked REAL NOT NULL,
    quality_inspection REAL NOT NULL,
    reserved REAL NOT NULL,
    uom TEXT NOT NULL,
    server_timestamp TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_stock_batches (
    ${cachedRecord},
    material_server_id TEXT NOT NULL,
    store_server_id TEXT,
    storage_location TEXT,
    batch_number TEXT NOT NULL,
    expiry_date TEXT,
    quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    server_timestamp TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_purchase_orders (
    ${cachedRecord},
    po_number TEXT NOT NULL,
    supplier_server_id TEXT,
    property_server_id TEXT,
    status TEXT NOT NULL,
    document_date TEXT,
    delivery_date TEXT,
    currency TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS cached_purchase_order_items (
    ${cachedRecord},
    purchase_order_server_id TEXT NOT NULL,
    po_item TEXT NOT NULL,
    material_server_id TEXT,
    material_code TEXT,
    description TEXT NOT NULL,
    ordered_quantity REAL NOT NULL,
    previously_received_quantity REAL NOT NULL,
    open_quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    plant_code TEXT,
    storage_location TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS draft_goods_receipts (
    ${draftRecord},
    customer_server_id TEXT,
    property_server_id TEXT,
    store_server_id TEXT,
    purchase_order_server_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_goods_receipt_items (
    ${draftRecord},
    goods_receipt_local_id TEXT NOT NULL REFERENCES draft_goods_receipts(local_id) ON DELETE CASCADE,
    material_server_id TEXT,
    material_code TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity REAL NOT NULL,
    damaged_quantity REAL NOT NULL DEFAULT 0,
    rejected_quantity REAL NOT NULL DEFAULT 0,
    uom TEXT NOT NULL,
    batch_number TEXT,
    expiry_date TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_inventory_counts (
    ${draftRecord},
    customer_server_id TEXT,
    property_server_id TEXT,
    store_server_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS draft_inventory_count_items (
    ${draftRecord},
    inventory_count_local_id TEXT NOT NULL REFERENCES draft_inventory_counts(local_id) ON DELETE CASCADE,
    material_server_id TEXT,
    material_code TEXT NOT NULL,
    location_code TEXT,
    physical_quantity REAL NOT NULL,
    book_quantity REAL,
    uom TEXT NOT NULL,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_stock_transfers (
    ${draftRecord},
    customer_server_id TEXT,
    property_server_id TEXT,
    source_store_server_id TEXT,
    destination_store_server_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_stock_transfer_items (
    ${draftRecord},
    stock_transfer_local_id TEXT NOT NULL REFERENCES draft_stock_transfers(local_id) ON DELETE CASCADE,
    material_server_id TEXT,
    material_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    source_storage_location TEXT,
    destination_storage_location TEXT,
    batch_number TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_goods_issues (
    ${draftRecord},
    customer_server_id TEXT,
    property_server_id TEXT,
    store_server_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_goods_issue_items (
    ${draftRecord},
    goods_issue_local_id TEXT NOT NULL REFERENCES draft_goods_issues(local_id) ON DELETE CASCADE,
    material_server_id TEXT,
    material_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    storage_location TEXT,
    batch_number TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_stock_exceptions (
    ${draftRecord},
    customer_server_id TEXT,
    property_server_id TEXT,
    store_server_id TEXT,
    exception_type TEXT NOT NULL
      CHECK (exception_type IN ('DAMAGE','REJECTION','WRITE_OFF')),
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_stock_exception_items (
    ${draftRecord},
    stock_exception_local_id TEXT NOT NULL REFERENCES draft_stock_exceptions(local_id) ON DELETE CASCADE,
    material_server_id TEXT,
    material_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    uom TEXT NOT NULL,
    reason TEXT,
    batch_number TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_documents (
    ${draftRecord},
    document_type TEXT NOT NULL,
    file_reference TEXT,
    upload_status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (upload_status IN ('PENDING','UPLOADING','UPLOADED','FAILED','CLEANED')),
    capture_started_at TEXT,
    captured_at TEXT,
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_document_pages (
    ${draftRecord},
    document_local_id TEXT NOT NULL REFERENCES draft_documents(local_id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    file_reference TEXT NOT NULL,
    rotation_degrees INTEGER NOT NULL DEFAULT 0,
    captured_at TEXT,
    upload_status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (upload_status IN ('PENDING','UPLOADING','UPLOADED','FAILED','CLEANED'))
  )`,
  `CREATE TABLE IF NOT EXISTS draft_invoices (
    ${draftRecord},
    document_local_id TEXT REFERENCES draft_documents(local_id) ON DELETE SET NULL,
    supplier_server_id TEXT,
    supplier_name TEXT,
    invoice_number TEXT,
    invoice_date TEXT,
    trn TEXT,
    purchase_order_number TEXT,
    gross_amount REAL,
    net_amount REAL,
    tax_amount REAL,
    currency TEXT,
    ocr_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
    status TEXT NOT NULL DEFAULT 'DRAFT'
      CHECK (status IN ('DRAFT','READY_TO_SUBMIT','SUBMITTING','SUBMITTED','FAILED','REQUIRES_REVALIDATION')),
    last_error TEXT,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS draft_invoice_lines (
    ${draftRecord},
    invoice_local_id TEXT NOT NULL REFERENCES draft_invoices(local_id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    description TEXT NOT NULL,
    material_server_id TEXT,
    material_code TEXT,
    quantity REAL,
    uom TEXT,
    unit_price REAL,
    tax_amount REAL,
    line_amount REAL,
    payload_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS upload_queue (
    local_id TEXT PRIMARY KEY NOT NULL,
    entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL,
    file_reference TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','UPLOADING','UPLOADED','FAILED','CANCELLED')),
    last_error TEXT,
    created_at TEXT NOT NULL,
    last_attempt_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_queue (
    local_id TEXT PRIMARY KEY NOT NULL,
    operation TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_local_id TEXT NOT NULL,
    server_id TEXT,
    payload_json TEXT,
    created_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING'
      CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED','CANCELLED')),
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    last_attempt_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS sync_state (
    domain TEXT PRIMARY KEY NOT NULL,
    last_successful_sync TEXT,
    server_version TEXT,
    server_cursor TEXT,
    local_version INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_cached_materials_code ON cached_materials(material_code)`,
  `CREATE INDEX IF NOT EXISTS idx_cached_barcodes_material ON cached_material_barcodes(material_server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cached_stock_scope ON cached_stock_balances(property_server_id, store_server_id, material_server_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cached_po_number ON cached_purchase_orders(po_number)`,
  `CREATE INDEX IF NOT EXISTS idx_upload_queue_status ON upload_queue(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_draft_documents_status ON draft_documents(upload_status)`,
];

export const migrations = [
  {
    version: 1,
    statements: migrationOne,
  },
  {
    version: 2,
    statements: [
      `ALTER TABLE draft_goods_receipts ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_goods_receipts ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_inventory_counts ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_inventory_counts ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_stock_transfers ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_stock_transfers ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_goods_issues ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_goods_issues ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_stock_exceptions ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_stock_exceptions ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_documents ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_documents ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE draft_invoices ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE draft_invoices ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE upload_queue ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE upload_queue ADD COLUMN owner_customer_id TEXT`,
      `ALTER TABLE sync_queue ADD COLUMN owner_user_id TEXT`,
      `ALTER TABLE sync_queue ADD COLUMN owner_customer_id TEXT`,
      `CREATE INDEX IF NOT EXISTS idx_draft_inventory_owner ON draft_inventory_counts(owner_user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_upload_queue_owner ON upload_queue(owner_user_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_sync_queue_owner ON sync_queue(owner_user_id, status)`,
    ],
  },
] as const;

export async function migrateLocalDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS local_schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const applied = await db.getAllAsync<{ version: number }>(
    'SELECT version FROM local_schema_migrations ORDER BY version ASC',
  );
  const appliedVersions = new Set(applied.map((row) => row.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) continue;
    await db.withExclusiveTransactionAsync(async (transaction) => {
      for (const statement of migration.statements) {
        await transaction.execAsync(statement);
      }
      await transaction.runAsync(
        'INSERT INTO local_schema_migrations (version, applied_at) VALUES (?, ?)',
        migration.version,
        new Date().toISOString(),
      );
    });
  }
}