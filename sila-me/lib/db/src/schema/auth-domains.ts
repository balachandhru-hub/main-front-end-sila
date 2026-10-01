import { createInsertSchema } from "drizzle-zod";
import {
  boolean,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { customersTable, propertiesTable, rolesTable, storesTable } from "./organization";
import { userAccountsTable } from "./user-accounts";

const identityFields = {
  email: text("email").notNull(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  isSuperAdmin: boolean("is_super_admin").notNull().default(false),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const mobileUsersTable = pgTable(
  "sila_mobile_users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    legacyUserId: integer("legacy_user_id")
      .notNull()
      .unique()
      .references(() => userAccountsTable.id),
    code: text("code").notNull(),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customersTable.id),
    ...identityFields,
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_mobile_users_code_idx").on(table.code),
    emailIndex: uniqueIndex("sila_mobile_users_email_idx").on(table.email),
    customerIndex: uniqueIndex("sila_mobile_users_customer_email_idx").on(
      table.customerId,
      table.email,
    ),
  }),
);

export const cloudUsersTable = pgTable(
  "sila_cloud_users",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    legacyUserId: integer("legacy_user_id")
      .notNull()
      .unique()
      .references(() => userAccountsTable.id),
    ...identityFields,
  },
  (table) => ({
    emailIndex: uniqueIndex("sila_cloud_users_email_idx").on(table.email),
  }),
);

export const mobileUserRolesTable = pgTable(
  "sila_mobile_user_roles",
  {
    mobileUserId: integer("mobile_user_id")
      .notNull()
      .references(() => mobileUsersTable.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.mobileUserId, table.roleId] }),
  }),
);

export const cloudUserRolesTable = pgTable(
  "sila_cloud_user_roles",
  {
    cloudUserId: integer("cloud_user_id")
      .notNull()
      .references(() => cloudUsersTable.id, { onDelete: "cascade" }),
    roleId: integer("role_id")
      .notNull()
      .references(() => rolesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.cloudUserId, table.roleId] }),
  }),
);

export const mobileUserPropertyAccessTable = pgTable(
  "sila_mobile_user_property_access",
  {
    mobileUserId: integer("mobile_user_id")
      .notNull()
      .references(() => mobileUsersTable.id, { onDelete: "cascade" }),
    propertyId: integer("property_id")
      .notNull()
      .references(() => propertiesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.mobileUserId, table.propertyId] }),
  }),
);

export const mobileUserStoreAccessTable = pgTable(
  "sila_mobile_user_store_access",
  {
    mobileUserId: integer("mobile_user_id")
      .notNull()
      .references(() => mobileUsersTable.id, { onDelete: "cascade" }),
    storeId: integer("store_id")
      .notNull()
      .references(() => storesTable.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.mobileUserId, table.storeId] }),
  }),
);

export const insertMobileUserSchema = createInsertSchema(mobileUsersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertCloudUserSchema = createInsertSchema(cloudUsersTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertMobileUser = z.infer<typeof insertMobileUserSchema>;
export type InsertCloudUser = z.infer<typeof insertCloudUserSchema>;
export type MobileUser = typeof mobileUsersTable.$inferSelect;
export type CloudUser = typeof cloudUsersTable.$inferSelect;