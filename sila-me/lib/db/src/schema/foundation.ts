import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  customersTable,
  mobileConfigurationsTable,
  plantsTable,
  propertiesTable,
  rolesTable,
  storageLocationsTable,
  storeAreasTable,
  storesTable,
} from "./organization";
import { userAccountsTable } from "./user-accounts";
import {
  materialAliasesTable,
  materialBarcodesTable,
  materialsTable,
  suppliersTable,
  supplierMaterialMappingsTable,
} from "./master-data";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

const recordFields = () => ({
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  ...timestamps(),
});

const customerFields = () => ({
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
});

const actorFields = () => ({
  createdBy: integer("created_by").references(() => userAccountsTable.id, {
    onDelete: "set null",
  }),
  updatedBy: integer("updated_by").references(() => userAccountsTable.id, {
    onDelete: "set null",
  }),
});

export const materialCategoriesTable = pgTable(
  "sila_material_categories",
  {
    ...recordFields(),
    ...customerFields(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_material_categories_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
  }),
);

export const materialGroupsTable = pgTable(
  "sila_material_groups",
  {
    ...recordFields(),
    ...customerFields(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    categoryId: integer("category_id").references(() => materialCategoriesTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_material_groups_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
  }),
);

export const materialImagesTable = pgTable(
  "sila_material_images",
  {
    ...recordFields(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    storageReference: text("storage_reference").notNull(),
    contentType: text("content_type"),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (table) => ({
    materialIndex: index("sila_material_images_material_idx").on(table.materialId),
  }),
);

export const materialExternalMappingsTable = pgTable(
  "sila_material_external_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalId: text("external_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    externalIndex: uniqueIndex("sila_material_external_mapping_idx").on(
      table.customerId,
      table.sourceSystem,
      table.externalId,
    ),
  }),
);

export const supplierAddressesTable = pgTable(
  "sila_supplier_addresses",
  {
    ...recordFields(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    addressType: text("address_type").notNull().default("PRIMARY"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    countryCode: text("country_code"),
    postalCode: text("postal_code"),
    isPrimary: boolean("is_primary").notNull().default(false),
  },
  (table) => ({
    supplierIndex: index("sila_supplier_addresses_supplier_idx").on(table.supplierId),
  }),
);

export const supplierContactsTable = pgTable(
  "sila_supplier_contacts",
  {
    ...recordFields(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    contactName: text("contact_name"),
    email: text("email"),
    phone: text("phone"),
    role: text("role"),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
  },
  (table) => ({
    supplierIndex: index("sila_supplier_contacts_supplier_idx").on(table.supplierId),
  }),
);

export const supplierExternalMappingsTable = pgTable(
  "sila_supplier_external_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalId: text("external_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    externalIndex: uniqueIndex("sila_supplier_external_mapping_idx").on(
      table.customerId,
      table.sourceSystem,
      table.externalId,
    ),
  }),
);

export const stockBalancesTable = pgTable(
  "sila_stock_balances",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    plantId: integer("plant_id").references(() => plantsTable.id, {
      onDelete: "set null",
    }),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    reservedQuantity: numeric("reserved_quantity", { precision: 18, scale: 6 })
      .notNull()
      .default("0"),
    uom: text("uom").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    locationMaterialIndex: uniqueIndex("sila_stock_balances_location_material_idx").on(
      table.customerId,
      table.propertyId,
      table.storeId,
      table.materialId,
      table.plantId,
      table.storageLocationId,
    ),
  }),
);

export const stockBatchesTable = pgTable(
  "sila_stock_batches",
  {
    ...recordFields(),
    ...customerFields(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    batchNumber: text("batch_number").notNull(),
    manufactureDate: date("manufacture_date"),
    expiryDate: date("expiry_date"),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull().default("0"),
    uom: text("uom").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    batchIndex: uniqueIndex("sila_stock_batches_customer_material_batch_idx").on(
      table.customerId,
      table.materialId,
      table.batchNumber,
    ),
    expiryIndex: index("sila_stock_batches_expiry_idx").on(table.expiryDate),
  }),
);

export const stockMovementsTable = pgTable(
  "sila_stock_movements",
  {
    ...recordFields(),
    ...customerFields(),
    stockBalanceId: integer("stock_balance_id").references(() => stockBalancesTable.id, {
      onDelete: "set null",
    }),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    movementType: text("movement_type").notNull(),
    businessReference: text("business_reference"),
    sourceApplication: text("source_application"),
    status: text("status").notNull().default("Posted"),
    ...actorFields(),
  },
  (table) => ({
    customerDateIndex: index("sila_stock_movements_customer_created_idx").on(
      table.customerId,
      table.createdAt,
    ),
    materialIndex: index("sila_stock_movements_material_idx").on(table.materialId),
  }),
);

export const purchaseOrdersTable = pgTable(
  "sila_purchase_orders",
  {
    ...recordFields(),
    ...customerFields(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "restrict" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    plantId: integer("plant_id").references(() => plantsTable.id, {
      onDelete: "set null",
    }),
    poNumber: text("po_number").notNull(),
    poType: text("po_type").notNull().default("STANDARD"),
    currency: text("currency"),
    status: text("status").notNull().default("Draft"),
    orderDate: date("order_date"),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    externalId: text("external_id"),
    ...actorFields(),
  },
  (table) => ({
    poNumberIndex: uniqueIndex("sila_purchase_orders_customer_number_idx").on(
      table.customerId,
      table.poNumber,
    ),
    statusIndex: index("sila_purchase_orders_status_idx").on(table.customerId, table.status),
  }),
);

export const purchaseOrderItemsTable = pgTable(
  "sila_purchase_order_items",
  {
    ...recordFields(),
    purchaseOrderId: integer("purchase_order_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "restrict",
    }),
    supplierMaterialMappingId: integer("supplier_material_mapping_id").references(
      () => supplierMaterialMappingsTable.id,
      { onDelete: "set null" },
    ),
    lineNumber: integer("line_number").notNull(),
    description: text("description"),
    orderedQuantity: numeric("ordered_quantity", { precision: 18, scale: 6 }).notNull(),
    receivedQuantity: numeric("received_quantity", { precision: 18, scale: 6 })
      .notNull()
      .default("0"),
    uom: text("uom").notNull(),
    unitPrice: numeric("unit_price", { precision: 18, scale: 6 }),
    remainingQuantity: numeric("remaining_quantity", { precision: 18, scale: 6 }),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull().default("Open"),
  },
  (table) => ({
    orderLineIndex: uniqueIndex("sila_purchase_order_items_order_line_idx").on(
      table.purchaseOrderId,
      table.lineNumber,
    ),
  }),
);

export const purchaseOrderSchedulesTable = pgTable(
  "sila_purchase_order_schedules",
  {
    ...recordFields(),
    purchaseOrderItemId: integer("purchase_order_item_id")
      .notNull()
      .references(() => purchaseOrderItemsTable.id, { onDelete: "cascade" }),
    scheduledDate: date("scheduled_date"),
    scheduledQuantity: numeric("scheduled_quantity", { precision: 18, scale: 6 }).notNull(),
    status: text("status").notNull().default("Open"),
  },
);

export const goodsReceiptsTable = pgTable(
  "sila_goods_receipts",
  {
    ...recordFields(),
    ...customerFields(),
    purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrdersTable.id, {
      onDelete: "set null",
    }),
    supplierId: integer("supplier_id").references(() => suppliersTable.id, {
      onDelete: "set null",
    }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    receiptNumber: text("receipt_number").notNull(),
    receiptDate: date("receipt_date"),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    erpPostingReference: text("erp_posting_reference"),
    ...actorFields(),
  },
  (table) => ({
    receiptNumberIndex: uniqueIndex("sila_goods_receipts_customer_number_idx").on(
      table.customerId,
      table.receiptNumber,
    ),
  }),
);

export const goodsReceiptItemsTable = pgTable(
  "sila_goods_receipt_items",
  {
    ...recordFields(),
    goodsReceiptId: integer("goods_receipt_id")
      .notNull()
      .references(() => goodsReceiptsTable.id, { onDelete: "cascade" }),
    purchaseOrderItemId: integer("purchase_order_item_id").references(
      () => purchaseOrderItemsTable.id,
      { onDelete: "set null" },
    ),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "restrict",
    }),
    lineNumber: integer("line_number").notNull(),
    acceptedQuantity: numeric("accepted_quantity", { precision: 18, scale: 6 })
      .notNull()
      .default("0"),
    damagedQuantity: numeric("damaged_quantity", { precision: 18, scale: 6 })
      .notNull()
      .default("0"),
    rejectedQuantity: numeric("rejected_quantity", { precision: 18, scale: 6 })
      .notNull()
      .default("0"),
    uom: text("uom").notNull(),
    batchNumber: text("batch_number"),
    expiryDate: date("expiry_date"),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    status: text("status").notNull().default("Pending"),
  },
  (table) => ({
    receiptLineIndex: uniqueIndex("sila_goods_receipt_items_receipt_line_idx").on(
      table.goodsReceiptId,
      table.lineNumber,
    ),
  }),
);

export const goodsReceiptExceptionsTable = pgTable(
  "sila_goods_receipt_exceptions",
  {
    ...recordFields(),
    goodsReceiptId: integer("goods_receipt_id")
      .notNull()
      .references(() => goodsReceiptsTable.id, { onDelete: "cascade" }),
    goodsReceiptItemId: integer("goods_receipt_item_id").references(
      () => goodsReceiptItemsTable.id,
      { onDelete: "set null" },
    ),
    exceptionType: text("exception_type").notNull(),
    description: text("description"),
    status: text("status").notNull().default("Open"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
);

export const erpMaterialDocumentsTable = pgTable(
  "sila_erp_material_documents",
  {
    ...recordFields(),
    ...customerFields(),
    goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceiptsTable.id, {
      onDelete: "set null",
    }),
    sourceSystem: text("source_system").notNull(),
    documentNumber: text("document_number").notNull(),
    fiscalYear: text("fiscal_year"),
    status: text("status").notNull().default("Pending"),
    responsePayload: jsonb("response_payload").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    sourceDocumentIndex: uniqueIndex("sila_erp_material_documents_source_number_idx").on(
      table.customerId,
      table.sourceSystem,
      table.documentNumber,
    ),
  }),
);

export const inventoryCountsTable = pgTable(
  "sila_inventory_counts",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    countNumber: text("count_number").notNull(),
    countDate: date("count_date"),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    ...actorFields(),
  },
  (table) => ({
    countNumberIndex: uniqueIndex("sila_inventory_counts_customer_number_idx").on(
      table.customerId,
      table.countNumber,
    ),
  }),
);

export const inventoryCountItemsTable = pgTable(
  "sila_inventory_count_items",
  {
    ...recordFields(),
    inventoryCountId: integer("inventory_count_id")
      .notNull()
      .references(() => inventoryCountsTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
    lineNumber: integer("line_number").notNull(),
    expectedQuantity: numeric("expected_quantity", { precision: 18, scale: 6 }),
    countedQuantity: numeric("counted_quantity", { precision: 18, scale: 6 }),
    uom: text("uom").notNull(),
    status: text("status").notNull().default("Open"),
  },
  (table) => ({
    countLineIndex: uniqueIndex("sila_inventory_count_items_count_line_idx").on(
      table.inventoryCountId,
      table.lineNumber,
    ),
  }),
);

export const inventoryCountAttemptsTable = pgTable(
  "sila_inventory_count_attempts",
  {
    ...recordFields(),
    inventoryCountItemId: integer("inventory_count_item_id")
      .notNull()
      .references(() => inventoryCountItemsTable.id, { onDelete: "cascade" }),
    attemptNumber: integer("attempt_number").notNull(),
    countedQuantity: numeric("counted_quantity", { precision: 18, scale: 6 }),
    countedBy: integer("counted_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("Submitted"),
    notes: text("notes"),
  },
  (table) => ({
    attemptIndex: uniqueIndex("sila_inventory_count_attempts_item_number_idx").on(
      table.inventoryCountItemId,
      table.attemptNumber,
    ),
  }),
);

export const inventoryAdjustmentsTable = pgTable(
  "sila_inventory_adjustments",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    adjustmentNumber: text("adjustment_number").notNull(),
    reasonCode: text("reason_code"),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    ...actorFields(),
  },
  (table) => ({
    adjustmentNumberIndex: uniqueIndex("sila_inventory_adjustments_customer_number_idx").on(
      table.customerId,
      table.adjustmentNumber,
    ),
  }),
);

export const inventoryAdjustmentItemsTable = pgTable(
  "sila_inventory_adjustment_items",
  {
    ...recordFields(),
    inventoryAdjustmentId: integer("inventory_adjustment_id")
      .notNull()
      .references(() => inventoryAdjustmentsTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    quantityDelta: numeric("quantity_delta", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
    storageLocationId: integer("storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
  },
);

export const stockTransfersTable = pgTable(
  "sila_stock_transfers",
  {
    ...recordFields(),
    ...customerFields(),
    sourcePropertyId: integer("source_property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    sourceStoreId: integer("source_store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    sourceStorageLocationId: integer("source_storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    destinationPropertyId: integer("destination_property_id").references(
      () => propertiesTable.id,
      { onDelete: "set null" },
    ),
    destinationStoreId: integer("destination_store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    destinationStorageLocationId: integer("destination_storage_location_id").references(
      () => storageLocationsTable.id,
      { onDelete: "set null" },
    ),
    transferNumber: text("transfer_number").notNull(),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    ...actorFields(),
  },
  (table) => ({
    transferNumberIndex: uniqueIndex("sila_stock_transfers_customer_number_idx").on(
      table.customerId,
      table.transferNumber,
    ),
  }),
);

export const stockTransferItemsTable = pgTable(
  "sila_stock_transfer_items",
  {
    ...recordFields(),
    stockTransferId: integer("stock_transfer_id")
      .notNull()
      .references(() => stockTransfersTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    lineNumber: integer("line_number").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    transferLineIndex: uniqueIndex("sila_stock_transfer_items_transfer_line_idx").on(
      table.stockTransferId,
      table.lineNumber,
    ),
  }),
);

export const goodsIssuesTable = pgTable(
  "sila_goods_issues",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    issueNumber: text("issue_number").notNull(),
    departmentCode: text("department_code"),
    costCenter: text("cost_center"),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    ...actorFields(),
  },
  (table) => ({
    issueNumberIndex: uniqueIndex("sila_goods_issues_customer_number_idx").on(
      table.customerId,
      table.issueNumber,
    ),
  }),
);

export const goodsIssueItemsTable = pgTable(
  "sila_goods_issue_items",
  {
    ...recordFields(),
    goodsIssueId: integer("goods_issue_id")
      .notNull()
      .references(() => goodsIssuesTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
  },
);

export const exceptionReasonsTable = pgTable(
  "sila_exception_reasons",
  {
    ...recordFields(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_exception_reasons_code_idx").on(table.code),
  }),
);

export const stockExceptionsTable = pgTable(
  "sila_stock_exceptions",
  {
    ...recordFields(),
    ...customerFields(),
    exceptionReasonId: integer("exception_reason_id").references(() => exceptionReasonsTable.id, {
      onDelete: "set null",
    }),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "set null",
    }),
    stockMovementId: integer("stock_movement_id").references(() => stockMovementsTable.id, {
      onDelete: "set null",
    }),
    description: text("description"),
    status: text("status").notNull().default("Open"),
    resolution: text("resolution"),
    ...actorFields(),
  },
);

export const stockWriteOffsTable = pgTable(
  "sila_stock_write_offs",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    writeOffNumber: text("write_off_number").notNull(),
    reasonId: integer("reason_id").references(() => exceptionReasonsTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    ...actorFields(),
  },
  (table) => ({
    writeOffNumberIndex: uniqueIndex("sila_stock_writeoffs_customer_number_idx").on(
      table.customerId,
      table.writeOffNumber,
    ),
  }),
);

export const stockWriteOffItemsTable = pgTable(
  "sila_stock_write_off_items",
  {
    ...recordFields(),
    stockWriteOffId: integer("stock_write_off_id")
      .notNull()
      .references(() => stockWriteOffsTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
  },
);

export const materialRejectionsTable = pgTable(
  "sila_material_rejections",
  {
    ...recordFields(),
    ...customerFields(),
    goodsReceiptId: integer("goods_receipt_id").references(() => goodsReceiptsTable.id, {
      onDelete: "set null",
    }),
    rejectionNumber: text("rejection_number").notNull(),
    reasonId: integer("reason_id").references(() => exceptionReasonsTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotPosted"),
    ...actorFields(),
  },
  (table) => ({
    rejectionNumberIndex: uniqueIndex("sila_material_rejections_customer_number_idx").on(
      table.customerId,
      table.rejectionNumber,
    ),
  }),
);

export const materialRejectionItemsTable = pgTable(
  "sila_material_rejection_items",
  {
    ...recordFields(),
    materialRejectionId: integer("material_rejection_id")
      .notNull()
      .references(() => materialRejectionsTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "restrict" }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    batchId: integer("batch_id").references(() => stockBatchesTable.id, {
      onDelete: "set null",
    }),
  },
);

export const approvalWorkflowsTable = pgTable(
  "sila_approval_workflows",
  {
    ...recordFields(),
    ...customerFields(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    transactionType: text("transaction_type").notNull(),
    status: text("status").notNull().default("Draft"),
    ...actorFields(),
  },
  (table) => ({
    workflowCodeIndex: uniqueIndex("sila_approval_workflows_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
  }),
);

export const approvalConditionsTable = pgTable(
  "sila_approval_conditions",
  {
    ...recordFields(),
    workflowId: integer("workflow_id")
      .notNull()
      .references(() => approvalWorkflowsTable.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    operator: text("operator").notNull(),
    value: text("value"),
  },
);

export const approvalLevelsTable = pgTable(
  "sila_approval_levels",
  {
    ...recordFields(),
    workflowId: integer("workflow_id")
      .notNull()
      .references(() => approvalWorkflowsTable.id, { onDelete: "cascade" }),
    levelNumber: integer("level_number").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    levelIndex: uniqueIndex("sila_approval_levels_workflow_number_idx").on(
      table.workflowId,
      table.levelNumber,
    ),
  }),
);

export const approvalLevelApproversTable = pgTable(
  "sila_approval_level_approvers",
  {
    approvalLevelId: integer("approval_level_id")
      .notNull()
      .references(() => approvalLevelsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    roleId: integer("role_id").references(
      () => rolesTable.id,
      { onDelete: "cascade" },
    ),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.approvalLevelId, table.userId] }),
  }),
);

export const transactionsTable = pgTable(
  "sila_transactions",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    transactionType: text("transaction_type").notNull(),
    businessReference: text("business_reference"),
    businessStatus: text("business_status").notNull().default("Draft"),
    approvalStatus: text("approval_status").notNull().default("NotRequired"),
    executionStatus: text("execution_status").notNull().default("NotStarted"),
    sourceApplication: text("source_application").notNull().default("SILA_CLOUD"),
    createdBy: integer("created_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    typeStatusIndex: index("sila_transactions_customer_type_status_idx").on(
      table.customerId,
      table.transactionType,
      table.businessStatus,
    ),
  }),
);

export const approvalRequestsTable = pgTable(
  "sila_approval_requests",
  {
    ...recordFields(),
    ...customerFields(),
    workflowId: integer("workflow_id").references(() => approvalWorkflowsTable.id, {
      onDelete: "set null",
    }),
    transactionId: integer("transaction_id").references(() => transactionsTable.id, {
      onDelete: "set null",
    }),
    transactionType: text("transaction_type").notNull(),
    businessReference: text("business_reference"),
    status: text("status").notNull().default("Pending"),
    requestedBy: integer("requested_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
  },
);

export const approvalRequestLevelsTable = pgTable(
  "sila_approval_request_levels",
  {
    ...recordFields(),
    approvalRequestId: integer("approval_request_id")
      .notNull()
      .references(() => approvalRequestsTable.id, { onDelete: "cascade" }),
    approvalLevelId: integer("approval_level_id").references(() => approvalLevelsTable.id, {
      onDelete: "set null",
    }),
    levelNumber: integer("level_number").notNull(),
    status: text("status").notNull().default("Pending"),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (table) => ({
    requestLevelIndex: uniqueIndex("sila_approval_request_levels_request_number_idx").on(
      table.approvalRequestId,
      table.levelNumber,
    ),
  }),
);

export const approvalActionsTable = pgTable(
  "sila_approval_actions",
  {
    ...recordFields(),
    approvalRequestId: integer("approval_request_id")
      .notNull()
      .references(() => approvalRequestsTable.id, { onDelete: "cascade" }),
    approvalRequestLevelId: integer("approval_request_level_id").references(
      () => approvalRequestLevelsTable.id,
      { onDelete: "set null" },
    ),
    actorUserId: integer("actor_user_id").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    comment: text("comment"),
  },
);

export const approvalDelegationsTable = pgTable(
  "sila_approval_delegations",
  {
    ...recordFields(),
    ...customerFields(),
    delegatorUserId: integer("delegator_user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    delegateUserId: integer("delegate_user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    scope: jsonb("scope").$type<Record<string, unknown> | null>(),
    status: text("status").notNull().default("Scheduled"),
  },
);

export const documentsTable = pgTable(
  "sila_documents",
  {
    ...recordFields(),
    ...customerFields(),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    documentType: text("document_type").notNull(),
    documentNumber: text("document_number"),
    status: text("status").notNull().default("Draft"),
    uploadStatus: text("upload_status").notNull().default("PENDING_UPLOAD"),
    processingStatus: text("processing_status").notNull().default("PENDING"),
    idempotencyKey: text("idempotency_key"),
    checksum: text("checksum"),
    sourceApplication: text("source_application"),
    createdBy: integer("created_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => ({
    idempotencyIndex: uniqueIndex("sila_documents_customer_idempotency_idx").on(
      table.customerId,
      table.idempotencyKey,
    ),
    scopeIndex: index("sila_documents_scope_idx").on(
      table.customerId,
      table.propertyId,
      table.storeId,
    ),
  }),
);

export const documentFilesTable = pgTable(
  "sila_document_files",
  {
    ...recordFields(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documentsTable.id, { onDelete: "cascade" }),
    storageReference: text("storage_reference").notNull(),
    storageProvider: text("storage_provider").notNull().default("SHAREPOINT"),
    fileName: text("file_name"),
    contentType: text("content_type"),
    fileSize: integer("file_size"),
    checksum: text("checksum"),
    sharePointSiteId: text("sharepoint_site_id"),
    sharePointDriveId: text("sharepoint_drive_id"),
    sharePointItemId: text("sharepoint_item_id"),
    sharePointPath: text("sharepoint_path"),
    sharePointWebUrl: text("sharepoint_web_url"),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }),
  },
);

export const documentLinksTable = pgTable(
  "sila_document_links",
  {
    ...recordFields(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documentsTable.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    businessReference: text("business_reference"),
  },
  (table) => ({
    entityIndex: index("sila_document_links_entity_idx").on(table.entityType, table.entityId),
  }),
);

export const documentProcessingStatusTable = pgTable(
  "sila_document_processing_status",
  {
    ...recordFields(),
    documentId: integer("document_id")
      .notNull()
      .references(() => documentsTable.id, { onDelete: "cascade" }),
    processor: text("processor").notNull(),
    status: text("status").notNull().default("Pending"),
    errorMessage: text("error_message"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
  },
);

export const invoiceHeadersTable = pgTable(
  "sila_invoice_headers",
  {
    ...recordFields(),
    ...customerFields(),
    documentId: integer("document_id").references(() => documentsTable.id, {
      onDelete: "set null",
    }),
    supplierId: integer("supplier_id").references(() => suppliersTable.id, {
      onDelete: "set null",
    }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    invoiceNumber: text("invoice_number").notNull(),
    invoiceDate: date("invoice_date"),
    supplierNameExtracted: text("supplier_name_extracted"),
    supplierTaxRegistrationNumber: text("supplier_tax_registration_number"),
    currency: text("currency"),
    grossAmount: numeric("gross_amount", { precision: 18, scale: 6 }),
    netAmount: numeric("net_amount", { precision: 18, scale: 6 }),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 6 }),
    invoiceType: text("invoice_type"),
    poReference: text("po_reference"),
    ocrStatus: text("ocr_status").notNull().default("NotStarted"),
    validationStatus: text("validation_status").notNull().default("Pending"),
    confirmedBy: integer("confirmed_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  },
  (table) => ({
    invoiceNumberIndex: uniqueIndex("sila_invoice_headers_customer_number_idx").on(
      table.customerId,
      table.invoiceNumber,
    ),
  }),
);

export const invoiceLineItemsTable = pgTable(
  "sila_invoice_line_items",
  {
    ...recordFields(),
    invoiceHeaderId: integer("invoice_header_id")
      .notNull()
      .references(() => invoiceHeadersTable.id, { onDelete: "cascade" }),
    lineNumber: integer("line_number").notNull(),
    description: text("description"),
    supplierMaterialCode: text("supplier_material_code"),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "set null",
    }),
    quantity: numeric("quantity", { precision: 18, scale: 6 }),
    uom: text("uom"),
    unitPrice: numeric("unit_price", { precision: 18, scale: 6 }),
    taxCode: text("tax_code"),
    taxRate: numeric("tax_rate", { precision: 9, scale: 4 }),
    netAmount: numeric("net_amount", { precision: 18, scale: 6 }),
    taxAmount: numeric("tax_amount", { precision: 18, scale: 6 }),
    grossAmount: numeric("gross_amount", { precision: 18, scale: 6 }),
    confidence: numeric("confidence", { precision: 7, scale: 4 }),
    extractionMetadata: jsonb("extraction_metadata").$type<Record<string, unknown> | null>(),
  },
  (table) => ({
    invoiceLineIndex: uniqueIndex("sila_invoice_line_items_invoice_line_idx").on(
      table.invoiceHeaderId,
      table.lineNumber,
    ),
  }),
);

export const invoicePurchaseOrdersTable = pgTable(
  "sila_invoice_purchase_orders",
  {
    invoiceHeaderId: integer("invoice_header_id")
      .notNull()
      .references(() => invoiceHeadersTable.id, { onDelete: "cascade" }),
    purchaseOrderId: integer("purchase_order_id")
      .notNull()
      .references(() => purchaseOrdersTable.id, { onDelete: "restrict" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.invoiceHeaderId, table.purchaseOrderId] }),
  }),
);

export const invoiceOcrExtractionsTable = pgTable(
  "sila_invoice_ocr_extractions",
  {
    ...recordFields(),
    invoiceHeaderId: integer("invoice_header_id")
      .notNull()
      .references(() => invoiceHeadersTable.id, { onDelete: "cascade" }),
    provider: text("provider"),
    status: text("status").notNull().default("Pending"),
    extractedData: jsonb("extracted_data").$type<Record<string, unknown> | null>(),
    rawResponseJson: jsonb("raw_response_json").$type<Record<string, unknown> | null>(),
    extractedText: text("extracted_text"),
    confidence: numeric("confidence", { precision: 7, scale: 4 }),
  },
);

export const invoiceValidationResultsTable = pgTable(
  "sila_invoice_validation_results",
  {
    ...recordFields(),
    invoiceHeaderId: integer("invoice_header_id")
      .notNull()
      .references(() => invoiceHeadersTable.id, { onDelete: "cascade" }),
    validationCode: text("validation_code").notNull(),
    status: text("status").notNull().default("Pending"),
    message: text("message"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
);

export const materialRecognitionProfilesTable = pgTable(
  "sila_material_recognition_profiles",
  {
    ...recordFields(),
    ...customerFields(),
    name: text("name").notNull(),
    strategy: text("strategy").notNull().default("DETERMINISTIC"),
    configuration: jsonb("configuration").$type<Record<string, unknown> | null>(),
    status: text("status").notNull().default("Active"),
  },
);

export const materialRecognitionCandidatesTable = pgTable(
  "sila_material_recognition_candidates",
  {
    ...recordFields(),
    profileId: integer("profile_id")
      .notNull()
      .references(() => materialRecognitionProfilesTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    clueType: text("clue_type").notNull(),
    clueValue: text("clue_value").notNull(),
    priority: integer("priority").notNull().default(0),
    status: text("status").notNull().default("Active"),
  },
);

export const visionRecognitionRunsTable = pgTable(
  "sila_vision_recognition_runs",
  {
    ...recordFields(),
    ...customerFields(),
    documentId: integer("document_id").references(() => documentsTable.id, {
      onDelete: "set null",
    }),
    provider: text("provider"),
    status: text("status").notNull().default("Pending"),
    requestMetadata: jsonb("request_metadata").$type<Record<string, unknown> | null>(),
    responseMetadata: jsonb("response_metadata").$type<Record<string, unknown> | null>(),
  },
);

export const visionRecognitionCandidatesTable = pgTable(
  "sila_vision_recognition_candidates",
  {
    ...recordFields(),
    runId: integer("run_id")
      .notNull()
      .references(() => visionRecognitionRunsTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "set null",
    }),
    label: text("label"),
    confidence: numeric("confidence", { precision: 7, scale: 4 }),
    evidence: jsonb("evidence").$type<Record<string, unknown> | null>(),
  },
);

export const visionConfirmationsTable = pgTable(
  "sila_vision_confirmations",
  {
    ...recordFields(),
    runId: integer("run_id")
      .notNull()
      .references(() => visionRecognitionRunsTable.id, { onDelete: "cascade" }),
    candidateId: integer("candidate_id").references(() => visionRecognitionCandidatesTable.id, {
      onDelete: "set null",
    }),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "set null",
    }),
    confirmedBy: integer("confirmed_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    evidence: jsonb("evidence").$type<Record<string, unknown> | null>(),
  },
);

export const batchMovementsTable = pgTable(
  "sila_batch_movements",
  {
    ...recordFields(),
    ...customerFields(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => stockBatchesTable.id, { onDelete: "cascade" }),
    movementType: text("movement_type").notNull(),
    quantity: numeric("quantity", { precision: 18, scale: 6 }).notNull(),
    uom: text("uom").notNull(),
    businessReference: text("business_reference"),
  },
);

export const expiryAlertRulesTable = pgTable(
  "sila_expiry_alert_rules",
  {
    ...recordFields(),
    ...customerFields(),
    materialId: integer("material_id").references(() => materialsTable.id, {
      onDelete: "cascade",
    }),
    daysBeforeExpiry: integer("days_before_expiry").notNull(),
    recipientScope: jsonb("recipient_scope").$type<Record<string, unknown> | null>(),
    status: text("status").notNull().default("Active"),
  },
);

export const mobileConfigurationVersionsTable = pgTable(
  "sila_mobile_configuration_versions",
  {
    ...recordFields(),
    configurationId: integer("configuration_id")
      .notNull()
      .references(() => mobileConfigurationsTable.id, { onDelete: "cascade" }),
    configurationVersion: integer("configuration_version").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    createdBy: integer("created_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
  },
);

export const notificationTemplatesTable = pgTable(
  "sila_notification_templates",
  {
    ...recordFields(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    channel: text("channel").notNull(),
    subjectTemplate: text("subject_template"),
    bodyTemplate: text("body_template"),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_notification_templates_code_idx").on(table.code),
  }),
);

export const notificationsTable = pgTable(
  "sila_notifications",
  {
    ...recordFields(),
    ...customerFields(),
    templateId: integer("template_id").references(() => notificationTemplatesTable.id, {
      onDelete: "set null",
    }),
    entityType: text("entity_type"),
    entityId: integer("entity_id"),
    status: text("status").notNull().default("Pending"),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
  },
);

export const notificationRecipientsTable = pgTable(
  "sila_notification_recipients",
  {
    ...recordFields(),
    notificationId: integer("notification_id")
      .notNull()
      .references(() => notificationsTable.id, { onDelete: "cascade" }),
    userId: integer("user_id").references(() => userAccountsTable.id, {
      onDelete: "cascade",
    }),
    destination: text("destination"),
    status: text("status").notNull().default("Pending"),
    readAt: timestamp("read_at", { withTimezone: true }),
  },
);

export const notificationPreferencesTable = pgTable(
  "sila_notification_preferences",
  {
    ...recordFields(),
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    notificationType: text("notification_type").notNull(),
    channel: text("channel").notNull(),
    enabled: boolean("enabled").notNull().default(true),
  },
  (table) => ({
    preferenceIndex: uniqueIndex("sila_notification_preferences_user_type_channel_idx").on(
      table.userId,
      table.notificationType,
      table.channel,
    ),
  }),
);

export const integrationConnectionsTable = pgTable(
  "sila_integration_connections",
  {
    ...recordFields(),
    ...customerFields(),
    provider: text("provider").notNull(),
    name: text("name").notNull(),
    secretReference: text("secret_reference"),
    status: text("status").notNull().default("Draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  },
);

export const integrationEndpointsTable = pgTable(
  "sila_integration_endpoints",
  {
    ...recordFields(),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => integrationConnectionsTable.id, { onDelete: "cascade" }),
    endpointType: text("endpoint_type").notNull(),
    endpointReference: text("endpoint_reference"),
    status: text("status").notNull().default("Active"),
  },
);

export const integrationMappingsTable = pgTable(
  "sila_integration_mappings",
  {
    ...recordFields(),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => integrationConnectionsTable.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    silaValue: text("sila_value").notNull(),
    externalValue: text("external_value").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    mappingIndex: uniqueIndex("sila_integration_mappings_connection_entity_value_idx").on(
      table.connectionId,
      table.entityType,
      table.silaValue,
    ),
  }),
);

export const integrationJobsTable = pgTable(
  "sila_integration_jobs",
  {
    ...recordFields(),
    connectionId: integer("connection_id")
      .notNull()
      .references(() => integrationConnectionsTable.id, { onDelete: "cascade" }),
    jobType: text("job_type").notNull(),
    schedule: text("schedule"),
    status: text("status").notNull().default("Active"),
  },
);

export const integrationJobRunsTable = pgTable(
  "sila_integration_job_runs",
  {
    ...recordFields(),
    jobId: integer("job_id")
      .notNull()
      .references(() => integrationJobsTable.id, { onDelete: "cascade" }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    status: text("status").notNull().default("Pending"),
    recordsProcessed: integer("records_processed").notNull().default(0),
    errorMessage: text("error_message"),
  },
);

export const integrationErrorsTable = pgTable(
  "sila_integration_errors",
  {
    ...recordFields(),
    connectionId: integer("connection_id").references(() => integrationConnectionsTable.id, {
      onDelete: "set null",
    }),
    jobRunId: integer("job_run_id").references(() => integrationJobRunsTable.id, {
      onDelete: "set null",
    }),
    errorCode: text("error_code"),
    message: text("message").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown> | null>(),
    status: text("status").notNull().default("Open"),
  },
);

export const erpMaterialMappingsTable = pgTable(
  "sila_erp_material_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalMaterialCode: text("external_material_code").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    mappingIndex: uniqueIndex("sila_erp_material_mappings_customer_source_code_idx").on(
      table.customerId,
      table.sourceSystem,
      table.externalMaterialCode,
    ),
  }),
);

export const erpSupplierMappingsTable = pgTable(
  "sila_erp_supplier_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalSupplierCode: text("external_supplier_code").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    mappingIndex: uniqueIndex("sila_erp_supplier_mappings_customer_source_code_idx").on(
      table.customerId,
      table.sourceSystem,
      table.externalSupplierCode,
    ),
  }),
);

export const erpPlantMappingsTable = pgTable(
  "sila_erp_plant_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    plantId: integer("plant_id")
      .notNull()
      .references(() => plantsTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalPlantCode: text("external_plant_code").notNull(),
    status: text("status").notNull().default("Active"),
  },
);

export const erpStorageLocationMappingsTable = pgTable(
  "sila_erp_storage_location_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    storageLocationId: integer("storage_location_id")
      .notNull()
      .references(() => storageLocationsTable.id, { onDelete: "cascade" }),
    sourceSystem: text("source_system").notNull(),
    externalStorageLocationCode: text("external_storage_location_code").notNull(),
    status: text("status").notNull().default("Active"),
  },
);

export const erpUomMappingsTable = pgTable(
  "sila_erp_uom_mappings",
  {
    ...recordFields(),
    sourceSystem: text("source_system").notNull(),
    silaUom: text("sila_uom").notNull(),
    externalUom: text("external_uom").notNull(),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    mappingIndex: uniqueIndex("sila_erp_uom_mappings_source_sila_uom_idx").on(
      table.sourceSystem,
      table.silaUom,
    ),
  }),
);

export const erpTransactionMappingsTable = pgTable(
  "sila_erp_transaction_mappings",
  {
    ...recordFields(),
    ...customerFields(),
    sourceSystem: text("source_system").notNull(),
    silaTransactionType: text("sila_transaction_type").notNull(),
    externalTransactionType: text("external_transaction_type").notNull(),
    status: text("status").notNull().default("Active"),
  },
);