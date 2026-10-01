import assert from "node:assert/strict";
import { after, describe, test } from "node:test";
import { pool } from "@workspace/db";

const expectedTables = [
  "sila_material_categories",
  "sila_material_groups",
  "sila_material_images",
  "sila_material_external_mappings",
  "sila_supplier_addresses",
  "sila_supplier_contacts",
  "sila_supplier_external_mappings",
  "sila_stock_balances",
  "sila_stock_batches",
  "sila_stock_movements",
  "sila_purchase_orders",
  "sila_purchase_order_items",
  "sila_purchase_order_schedules",
  "sila_goods_receipts",
  "sila_goods_receipt_items",
  "sila_goods_receipt_exceptions",
  "sila_erp_material_documents",
  "sila_inventory_counts",
  "sila_inventory_count_items",
  "sila_inventory_count_attempts",
  "sila_inventory_adjustments",
  "sila_inventory_adjustment_items",
  "sila_stock_transfers",
  "sila_stock_transfer_items",
  "sila_goods_issues",
  "sila_goods_issue_items",
  "sila_exception_reasons",
  "sila_stock_exceptions",
  "sila_stock_write_offs",
  "sila_stock_write_off_items",
  "sila_material_rejections",
  "sila_material_rejection_items",
  "sila_approval_workflows",
  "sila_approval_conditions",
  "sila_approval_levels",
  "sila_approval_level_approvers",
  "sila_approval_requests",
  "sila_approval_request_levels",
  "sila_approval_actions",
  "sila_approval_delegations",
  "sila_transactions",
  "sila_documents",
  "sila_document_files",
  "sila_document_links",
  "sila_document_processing_status",
  "sila_invoice_headers",
  "sila_invoice_line_items",
  "sila_invoice_purchase_orders",
  "sila_invoice_ocr_extractions",
  "sila_invoice_validation_results",
  "sila_material_recognition_profiles",
  "sila_material_recognition_candidates",
  "sila_vision_recognition_runs",
  "sila_vision_recognition_candidates",
  "sila_vision_confirmations",
  "sila_batch_movements",
  "sila_expiry_alert_rules",
  "sila_mobile_configuration_versions",
  "sila_notification_templates",
  "sila_notifications",
  "sila_notification_recipients",
  "sila_notification_preferences",
  "sila_integration_connections",
  "sila_integration_endpoints",
  "sila_integration_mappings",
  "sila_integration_jobs",
  "sila_integration_job_runs",
  "sila_integration_errors",
  "sila_erp_material_mappings",
  "sila_erp_supplier_mappings",
  "sila_erp_plant_mappings",
  "sila_erp_storage_location_mappings",
  "sila_erp_uom_mappings",
  "sila_erp_transaction_mappings",
];

type ConstraintRow = {
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
};

async function foreignKeys(): Promise<ConstraintRow[]> {
  const result = await pool.query<ConstraintRow>(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  `);
  return result.rows;
}

describe("additive database foundation", () => {
  after(async () => {
    await pool.end();
  });

  test("schema push created every requested foundation table", async () => {
    const result = await pool.query<{ table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1::text[])
      `,
      [expectedTables],
    );
    const actual = new Set(result.rows.map((row) => row.table_name));

    assert.deepEqual(
      expectedTables.filter((table) => !actual.has(table)),
      [],
      "all foundation tables must exist after schema push",
    );
  });

  test("organization extensions preserve customer and hierarchy foreign keys", async () => {
    const keys = await foreignKeys();
    const hasKey = (table: string, column: string, parent: string) =>
      keys.some(
        (key) =>
          key.table_name === table &&
          key.column_name === column &&
          key.foreign_table_name === parent &&
          key.foreign_column_name === "id",
      );

    assert.equal(hasKey("sila_store_areas", "store_id", "sila_stores"), true);
    assert.equal(hasKey("sila_plants", "customer_id", "sila_customers"), true);
    assert.equal(hasKey("sila_storage_locations", "plant_id", "sila_plants"), true);
    assert.equal(hasKey("sila_storage_locations", "store_id", "sila_stores"), true);
  });

  test("tenant-owned foundation tables expose customer ownership", async () => {
    const tenantTables = [
      "sila_material_categories",
      "sila_material_external_mappings",
      "sila_stock_balances",
      "sila_stock_batches",
      "sila_stock_movements",
      "sila_purchase_orders",
      "sila_goods_receipts",
      "sila_inventory_counts",
      "sila_inventory_adjustments",
      "sila_stock_transfers",
      "sila_goods_issues",
      "sila_stock_write_offs",
      "sila_material_rejections",
      "sila_approval_workflows",
      "sila_approval_requests",
      "sila_transactions",
      "sila_documents",
      "sila_invoice_headers",
      "sila_vision_recognition_runs",
      "sila_notifications",
      "sila_integration_connections",
      "sila_erp_material_mappings",
      "sila_erp_supplier_mappings",
    ];
    const result = await pool.query<{ table_name: string }>(
      `
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'customer_id'
          AND table_name = ANY($1::text[])
      `,
      [tenantTables],
    );
    assert.deepEqual(
      new Set(result.rows.map((row) => row.table_name)),
      new Set(tenantTables),
    );
  });

  test("material and supplier business keys remain tenant-safe and unique", async () => {
    const result = await pool.query<{ indexname: string }>(
      `
        SELECT indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = ANY($1::text[])
      `,
      [
        [
          "sila_materials_customer_code_plant_idx",
          "sila_suppliers_customer_code_idx",
          "sila_purchase_orders_customer_number_idx",
          "sila_goods_receipts_customer_number_idx",
          "sila_invoice_headers_customer_number_idx",
        ],
      ],
    );
    assert.deepEqual(
      new Set(result.rows.map((row) => row.indexname)),
      new Set([
        "sila_materials_customer_code_plant_idx",
        "sila_suppliers_customer_code_idx",
        "sila_purchase_orders_customer_number_idx",
        "sila_goods_receipts_customer_number_idx",
        "sila_invoice_headers_customer_number_idx",
      ]),
    );
  });

  test("core operational relationships are represented by foreign keys", async () => {
    const keys = await foreignKeys();
    const relationship = (table: string, column: string, parent: string) =>
      keys.some(
        (key) =>
          key.table_name === table &&
          key.column_name === column &&
          key.foreign_table_name === parent,
      );

    assert.equal(
      relationship("sila_purchase_order_items", "purchase_order_id", "sila_purchase_orders"),
      true,
    );
    assert.equal(
      relationship("sila_goods_receipts", "purchase_order_id", "sila_purchase_orders"),
      true,
    );
    assert.equal(
      relationship("sila_goods_receipt_items", "goods_receipt_id", "sila_goods_receipts"),
      true,
    );
    assert.equal(
      relationship("sila_inventory_count_items", "inventory_count_id", "sila_inventory_counts"),
      true,
    );
    assert.equal(
      relationship(
        "sila_approval_request_levels",
        "approval_request_id",
        "sila_approval_requests",
      ),
      true,
    );
    assert.equal(
      relationship("sila_approval_requests", "transaction_id", "sila_transactions"),
      true,
    );
    assert.equal(
      relationship("sila_invoice_line_items", "invoice_header_id", "sila_invoice_headers"),
      true,
    );
    assert.equal(
      relationship("sila_invoice_purchase_orders", "purchase_order_id", "sila_purchase_orders"),
      true,
    );
    assert.equal(
      relationship("sila_document_files", "document_id", "sila_documents"),
      true,
    );
    assert.equal(
      relationship("sila_stock_movements", "batch_id", "sila_stock_batches"),
      true,
    );
    assert.equal(
      relationship("sila_integration_job_runs", "job_id", "sila_integration_jobs"),
      true,
    );
  });

  test("PostgreSQL rejects a purchase order with missing tenant or supplier parent", async () => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await assert.rejects(
        client.query(
          `
            INSERT INTO sila_purchase_orders
              (customer_id, supplier_id, po_number, status, source_system)
            VALUES ($1, $2, $3, 'Draft', 'DEV_DATABASE')
          `,
          [0, 0, "SCHEMA-INVALID-PO"],
        ),
        (error: unknown) => {
          assert.equal((error as { code?: string }).code, "23503");
          return true;
        },
      );
    } finally {
      await client.query("ROLLBACK");
      client.release();
    }
  });
});