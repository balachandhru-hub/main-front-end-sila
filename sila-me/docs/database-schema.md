# SILA Cloud database schema

This document describes the additive PostgreSQL foundation for SILA Cloud
Administration. The schema is defined in `lib/db/src/schema` and is pushed to
the development database with the existing Drizzle configuration.

## Design rules

- Existing identity, organization, access, mobile configuration, audit, material,
  and supplier tables are reused. No replacement identity or tenant model was
  introduced.
- Integer generated identity columns remain the primary key strategy.
- Customer-owned records carry a `customer_id` and reference
  `sila_customers.id`. Property, store, plant, and storage-location references
  are explicit so application services can enforce customer → property → store
  scope before a transaction is accepted.
- Business codes and document numbers are not primary keys. Tenant-aware unique
  indexes are used for business identity, such as material code plus plant,
  supplier code, purchase-order number, receipt number, and invoice number.
- Status, approval status, and execution status are stored independently where
  a future workflow needs to distinguish lifecycle state from authorization or
  posting state.
- Foreign keys use `cascade` for owned children, `restrict` for master-data
  references that must remain valid, and `set null` for optional historical
  references.
- `DEV_DATABASE` remains the source-system marker for development records where
  the existing model supports one.

## Existing tables reused

### Organization and tenancy

- `sila_customers`
- `sila_properties`
- `sila_stores`
- `sila_store_areas`
- `sila_plants`
- `sila_storage_locations`

The last three organization tables are additive extensions. Store areas derive
customer ownership through their store. Plants and storage locations carry
explicit customer ownership; storage locations can additionally point to a
property, store, and plant.

### Identity and access

- `sila_user_accounts`
- `sila_roles`
- `sila_permissions`
- `sila_user_roles`
- `sila_role_permissions`
- `sila_user_customer_access`
- `sila_user_property_access`
- `sila_user_store_access`
- `sila_mobile_configurations`
- `sila_audit_events`

The existing browser session, mobile identity, role, access-assignment, and
audit structures remain the source of truth. The foundation adds only mobile
configuration history and approval/integration actor references.

### Master data

- `sila_materials`
- `sila_material_aliases`
- `sila_material_barcodes`
- `sila_material_uom_conversions`
- `sila_material_confirmations`
- `sila_suppliers`
- `sila_supplier_aliases`
- `sila_supplier_material_mappings`

Existing material uniqueness is customer + material code + plant. Existing
supplier uniqueness is customer + supplier code. Their supporting tables remain
compatible with the current tenant-scoped APIs.

## New tables

### Material and supplier support

- `sila_material_categories`
- `sila_material_groups`
- `sila_material_images`
- `sila_material_external_mappings`
- `sila_supplier_addresses`
- `sila_supplier_contacts`
- `sila_supplier_external_mappings`

These tables support classification, images, external identifiers, supplier
contacts, and addresses without changing the existing master-data API.

### Stock, batch, and expiry foundation

- `sila_stock_balances`
- `sila_stock_batches`
- `sila_stock_movements`
- `sila_batch_movements`
- `sila_expiry_alert_rules`

The tables record the shape needed for future stock services. They do not post
stock, calculate availability, or expose operational endpoints.

### Purchasing, receipts, and ERP material documents

- `sila_purchase_orders`
- `sila_purchase_order_items`
- `sila_purchase_order_schedules`
- `sila_goods_receipts`
- `sila_goods_receipt_items`
- `sila_goods_receipt_exceptions`
- `sila_erp_material_documents`

Purchase orders and receipts have separate lifecycle, approval, and execution
fields. ERP material documents retain external document identity and response
payloads for a later provider implementation.

### Inventory, transfers, issues, and exceptions

- `sila_inventory_counts`
- `sila_inventory_count_items`
- `sila_inventory_count_attempts`
- `sila_inventory_adjustments`
- `sila_inventory_adjustment_items`
- `sila_stock_transfers`
- `sila_stock_transfer_items`
- `sila_goods_issues`
- `sila_goods_issue_items`
- `sila_exception_reasons`
- `sila_stock_exceptions`
- `sila_stock_write_offs`
- `sila_stock_write_off_items`
- `sila_material_rejections`
- `sila_material_rejection_items`

These structures preserve count attempts, adjustment deltas, transfer
locations, issue destinations, exception reasons, write-offs, and rejection
evidence. They are intentionally inert until business workflows are added.

### Approval engine

- `sila_approval_workflows`
- `sila_approval_conditions`
- `sila_approval_levels`
- `sila_approval_level_approvers`
- `sila_approval_requests`
- `sila_approval_request_levels`
- `sila_approval_actions`
- `sila_approval_delegations`

The engine foundation supports configurable levels, conditions, user/role
approvers, decisions, and temporary delegation. It does not decide or execute
transaction approvals yet.

### Generic transactions and documents

- `sila_transactions`
- `sila_documents`
- `sila_document_files`
- `sila_document_links`
- `sila_document_processing_status`

`sila_transactions` is a generic registry for later business modules.
`sila_document_links` supports polymorphic references for records that are not
known at schema-design time, while document files keep storage references
separate from document metadata.

### Invoices and recognition foundations

- `sila_invoice_headers`
- `sila_invoice_line_items`
- `sila_invoice_purchase_orders`
- `sila_invoice_ocr_extractions`
- `sila_invoice_validation_results`
- `sila_material_recognition_profiles`
- `sila_material_recognition_candidates`
- `sila_vision_recognition_runs`
- `sila_vision_recognition_candidates`
- `sila_vision_confirmations`

These tables preserve invoice, OCR result, validation, deterministic
recognition, and Vision AI evidence shapes. No OCR or Vision AI provider is
called by this database pass.

### Mobile configuration, notifications, and integrations

- `sila_mobile_configuration_versions`
- `sila_notification_templates`
- `sila_notifications`
- `sila_notification_recipients`
- `sila_notification_preferences`
- `sila_integration_connections`
- `sila_integration_endpoints`
- `sila_integration_mappings`
- `sila_integration_jobs`
- `sila_integration_job_runs`
- `sila_integration_errors`
- `sila_erp_material_mappings`
- `sila_erp_supplier_mappings`
- `sila_erp_plant_mappings`
- `sila_erp_storage_location_mappings`
- `sila_erp_uom_mappings`
- `sila_erp_transaction_mappings`

Integration secrets are represented only by a `secret_reference`; secret
values do not belong in PostgreSQL or source control. Job, run, error, and
mapping tables provide provider boundaries for future SAP S/4HANA, Odoo,
Oracle, or other adapters.

## Main primary-key and foreign-key relationships

- Customer → property → store → store area.
- Customer → plant and customer → storage location; storage locations can
  additionally reference property, store, and plant.
- Customer → materials and suppliers.
- Material → images, aliases, barcodes, UOM conversions, batches, stock
  balances, movements, invoice lines, and recognition candidates.
- Supplier → addresses, contacts, aliases, material mappings, and invoices.
- Purchase order → items → schedules; purchase order → goods receipt →
  receipt items and exceptions.
- Inventory count → count items → count attempts.
- Adjustment, transfer, issue, write-off, rejection → their corresponding
  line-item tables.
- Approval workflow → levels/conditions; approval level → approvers;
  approval request → request levels → actions.
- Document → files, links, processing status; invoice → document and purchase
  orders.
- Stock batch → batch movements and stock movement references.
- Integration connection → endpoints, mappings, jobs → job runs → errors.
- Mobile configuration → version history.

The `information_schema` foreign-key graph is validated by the foundation test
suite. Parent references are deliberately constrained in PostgreSQL; tenant
scope and cross-customer validation remain mandatory service-layer checks
before future APIs write a transaction.

## Main indexes and uniqueness rules

- Existing materials: customer + material code + plant.
- Existing suppliers: customer + supplier code.
- Organization codes: customer + property/plant/storage-location code and
  property + store code; store + area code.
- Stock balances: customer + location dimensions + material.
- Stock batches: customer + material + batch number; expiry-date lookup.
- Documents and business transactions: customer + business number where a
  number is present.
- PO, receipt, count, adjustment, transfer, issue, write-off, and rejection
  line numbers are unique within their parent document.
- Approval levels are unique within a workflow; request levels are unique
  within a request.
- Invoice lines are unique within an invoice; invoice-to-PO links use a
  composite primary key.
- Integration and ERP mapping keys prevent duplicate provider values within
  their customer or connection scope.

## Altered tables

No existing table was replaced or destructively altered. The additive changes
are:

1. Organization schema additions for store areas, plants, and storage
   locations.
2. A new foundation schema module exported from `lib/db/src/schema/index.ts`.
3. Foreign-key and index creation for the new table families.

## Intentionally omitted

This pass does not implement:

- Stock posting, inventory transaction processing, PO/GRN processing, goods
  issue execution, or any other operational posting logic.
- OCR engines, Fatoora, SharePoint, Vision AI execution, model hosting, or
  provider credentials.
- Offline synchronization, device management, scanner device enrollment, or
  mobile token changes.
- SAP/Odoo/Oracle adapters, scheduled integration execution, or ERP retries.
- Operational APIs, admin screens, approval actions, notifications delivery,
  or transaction workflows.

The database structures are ready for those later phases without making the
initial SILA Cloud release an operational transaction system.