import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { userAccountsTable } from "./user-accounts";

export const customersTable = pgTable(
  "sila_customers",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_customers_code_idx").on(table.code),
  }),
);

export const propertiesTable = pgTable(
  "sila_properties",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_properties_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
  }),
);

export const storesTable = pgTable(
  "sila_stores",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    propertyId: integer("property_id")
      .notNull()
      .references(() => propertiesTable.id),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    propertyCodeIndex: uniqueIndex("sila_stores_property_code_idx").on(
      table.propertyId,
      table.code,
    ),
  }),
);

export const storeAreasTable = pgTable(
  "sila_store_areas",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    storeId: integer("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    storeCodeIndex: uniqueIndex("sila_store_areas_store_code_idx").on(table.storeId, table.code),
  }),
);

export const plantsTable = pgTable(
  "sila_plants",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    sourceSystem: text("source_system").notNull().default("DEV_DATABASE"),
    externalId: text("external_id"),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_plants_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
    propertyIndex: index("sila_plants_property_idx").on(table.propertyId),
  }),
);

export const storageLocationsTable = pgTable(
  "sila_storage_locations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "set null",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "set null",
    }),
    plantId: integer("plant_id").references(() => plantsTable.id, {
      onDelete: "set null",
    }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    status: text("status").notNull().default("Active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    customerCodeIndex: uniqueIndex("sila_storage_locations_customer_code_idx").on(
      table.customerId,
      table.code,
    ),
    plantIndex: index("sila_storage_locations_plant_idx").on(table.plantId),
  }),
);

export const rolesTable = pgTable(
  "sila_roles",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    applicationScope: text("application_scope").notNull().default("BOTH"),
    status: text("status").notNull().default("Active"),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_roles_code_idx").on(table.code),
  }),
);

export const permissionsTable = pgTable(
  "sila_permissions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    name: text("name").notNull(),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_permissions_code_idx").on(table.code),
  }),
);

export const notificationDeliveriesTable = pgTable(
  "sila_notification_deliveries",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    channel: text("channel").notNull().default("EMAIL"),
    notificationType: text("notification_type").notNull(),
    recipient: text("recipient").notNull(),
    targetUserId: integer("target_user_id").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("PENDING"),
    provider: text("provider").notNull().default("NOT_CONFIGURED"),
    failureReason: text("failure_reason"),
    attemptCount: integer("attempt_count").notNull().default(0),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    targetIndex: index("sila_notification_deliveries_target_idx").on(table.targetUserId),
  }),
);

export const userRolesTable = pgTable(
  "sila_user_roles",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
);

export const rolePermissionsTable = pgTable(
  "sila_role_permissions",
  {
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
    permissionId: integer("permission_id")
      .notNull()
      .references(() => permissionsTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);

export const userCustomerAccessTable = pgTable(
  "sila_user_customer_access",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.customerId] }),
  }),
);

export const userPropertyAccessTable = pgTable(
  "sila_user_property_access",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    propertyId: integer("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.propertyId] }),
  }),
);

export const userStoreAccessTable = pgTable(
  "sila_user_store_access",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    storeId: integer("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.userId, table.storeId] }),
  }),
);

export const mobileConfigurationsTable = pgTable(
  "sila_mobile_configurations",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id, { onDelete: "cascade" }),
    propertyId: integer("property_id").references(() => propertiesTable.id, {
      onDelete: "cascade",
    }),
    storeId: integer("store_id").references(() => storesTable.id, {
      onDelete: "cascade",
    }),
    configurationVersion: integer("configuration_version").notNull().default(1),
    receiveGoods: boolean("receive_goods").notNull().default(false),
    inventoryCount: boolean("inventory_count").notNull().default(false),
    stockTransfer: boolean("stock_transfer").notNull().default(false),
    goodsIssue: boolean("goods_issue").notNull().default(false),
    stockWriteOff: boolean("stock_write_off").notNull().default(false),
    scanDocument: boolean("scan_document").notNull().default(false),
    approvals: boolean("approvals").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    scopeIndex: uniqueIndex("sila_mobile_configurations_scope_idx").on(
      table.customerId,
      table.propertyId,
      table.storeId,
    ),
  }),
);

export const auditEventsTable = pgTable("sila_audit_events", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  eventType: text("event_type").notNull(),
  actorUserId: integer("actor_user_id").references(() => userAccountsTable.id, {
    onDelete: "set null",
  }),
  targetUserId: integer("target_user_id").references(() => userAccountsTable.id, {
    onDelete: "set null",
  }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertPropertySchema = createInsertSchema(propertiesTable).omit({
  createdAt: true,
  updatedAt: true,
});
export const insertStoreSchema = createInsertSchema(storesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Customer = typeof customersTable.$inferSelect;
export type Property = typeof propertiesTable.$inferSelect;
export type Store = typeof storesTable.$inferSelect;
export type Role = typeof rolesTable.$inferSelect;
export type Permission = typeof permissionsTable.$inferSelect;
export type MobileConfiguration = typeof mobileConfigurationsTable.$inferSelect;