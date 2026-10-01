import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { customersTable } from "./organization";
import { userAccountsTable } from "./user-accounts";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const materialsTable = pgTable(
  "sila_materials",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    materialCode: text("material_code").notNull(),
    materialDescription: text("material_description").notNull(),
    shortDescription: text("short_description"),
    materialGroup: text("material_group"),
    category: text("category"),
    brand: text("brand"),
    baseUom: text("base_uom").notNull(),
    purchaseUom: text("purchase_uom"),
    supplierMaterialCode: text("supplier_material_code"),
    manufacturerPartNumber: text("manufacturer_part_number"),
    plantCode: text("plant_code"),
    storageLocation: text("storage_location"),
    batchManaged: boolean("batch_managed").notNull().default(false),
    expiryManaged: boolean("expiry_managed").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    externalId: text("external_id"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown> | null>(),
    ...timestamps,
  },
  (table) => ({
    customerCodePlantIndex: uniqueIndex("sila_materials_customer_code_plant_idx").on(
      table.customerId,
      table.materialCode,
      table.plantCode,
    ),
  }),
);

export const materialUomConversionsTable = pgTable(
  "sila_material_uom_conversions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    fromUom: text("from_uom").notNull(),
    toUom: text("to_uom").notNull(),
    conversionFactor: numeric("conversion_factor", { precision: 18, scale: 6 }).notNull(),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    conversionIndex: uniqueIndex("sila_material_uom_conversion_idx").on(
      table.materialId,
      table.fromUom,
      table.toUom,
    ),
  }),
);

export const materialBarcodesTable = pgTable(
  "sila_material_barcodes",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    barcode: text("barcode").notNull(),
    barcodeType: text("barcode_type"),
    isPrimary: boolean("is_primary").notNull().default(false),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    barcodeIndex: uniqueIndex("sila_material_barcodes_material_barcode_idx").on(
      table.materialId,
      table.barcode,
    ),
  }),
);

export const materialAliasesTable = pgTable(
  "sila_material_aliases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    aliasType: text("alias_type").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    aliasIndex: uniqueIndex("sila_material_aliases_material_alias_idx").on(
      table.materialId,
      table.alias,
      table.aliasType,
    ),
  }),
);

export const suppliersTable = pgTable(
  "sila_suppliers",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    supplierCode: text("supplier_code").notNull(),
    supplierName: text("supplier_name").notNull(),
    legalName: text("legal_name"),
    taxRegistrationNumber: text("tax_registration_number"),
    countryCode: text("country_code"),
    email: text("email"),
    phone: text("phone"),
    active: boolean("active").notNull().default(true),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    externalId: text("external_id"),
    metadataJson: jsonb("metadata_json").$type<Record<string, unknown> | null>(),
    ...timestamps,
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_suppliers_customer_code_idx").on(
      table.customerId,
      table.supplierCode,
    ),
  }),
);

export const supplierAliasesTable = pgTable(
  "sila_supplier_aliases",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    alias: text("alias").notNull(),
    aliasType: text("alias_type").notNull(),
    active: boolean("active").notNull().default(true),
    ...timestamps,
  },
  (table) => ({
    aliasIndex: uniqueIndex("sila_supplier_aliases_supplier_alias_idx").on(
      table.supplierId,
      table.alias,
      table.aliasType,
    ),
  }),
);

export const supplierMaterialMappingsTable = pgTable(
  "sila_supplier_material_mappings",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    supplierId: integer("supplier_id")
      .notNull()
      .references(() => suppliersTable.id, { onDelete: "cascade" }),
    materialId: integer("material_id")
      .notNull()
      .references(() => materialsTable.id, { onDelete: "cascade" }),
    supplierMaterialCode: text("supplier_material_code"),
    supplierDescription: text("supplier_description"),
    supplierUom: text("supplier_uom"),
    supplierPackSize: text("supplier_pack_size"),
    active: boolean("active").notNull().default(true),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    ...timestamps,
  },
  (table) => ({
    mappingIndex: uniqueIndex("sila_supplier_material_mapping_idx").on(
      table.customerId,
      table.supplierId,
      table.materialId,
    ),
  }),
);

export const materialConfirmationsTable = pgTable("sila_material_confirmations", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customersTable.id, { onDelete: "cascade" }),
  materialId: integer("material_id")
    .notNull()
    .references(() => materialsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => userAccountsTable.id, {
    onDelete: "set null",
  }),
  clues: jsonb("clues").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMaterialSchema = createInsertSchema(materialsTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertMaterialUomConversionSchema = createInsertSchema(
  materialUomConversionsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertMaterialBarcodeSchema = createInsertSchema(materialBarcodesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertMaterialAliasSchema = createInsertSchema(materialAliasesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierAliasSchema = createInsertSchema(supplierAliasesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertSupplierMaterialMappingSchema = createInsertSchema(
  supplierMaterialMappingsTable,
).omit({
  createdAt: true,
  updatedAt: true,
});

export type Material = typeof materialsTable.$inferSelect;
export type Supplier = typeof suppliersTable.$inferSelect;
export type MaterialUomConversion = typeof materialUomConversionsTable.$inferSelect;
export type MaterialBarcode = typeof materialBarcodesTable.$inferSelect;
export type MaterialAlias = typeof materialAliasesTable.$inferSelect;
export type SupplierAlias = typeof supplierAliasesTable.$inferSelect;
export type SupplierMaterialMapping = typeof supplierMaterialMappingsTable.$inferSelect;