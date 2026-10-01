import { createInsertSchema } from "drizzle-zod";
import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const userAccountsTable = pgTable(
  "sila_user_accounts",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    code: text("code").notNull(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    authProvider: text("auth_provider").notNull().default("SILA Local Login"),
    role: text("role").notNull(),
    customerScope: text("customer_scope").notNull().default("*"),
    propertyScope: text("property_scope").notNull().default("*"),
    storeScope: text("store_scope").notNull().default("*"),
    accessModel: text("access_model").notNull().default("Legacy"),
    passwordHash: text("password_hash").notNull(),
    status: text("status").notNull().default("Active"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    codeIndex: uniqueIndex("sila_user_accounts_code_idx").on(table.code),
    emailIndex: uniqueIndex("sila_user_accounts_email_idx").on(table.email),
  }),
);

export const insertUserAccountSchema = createInsertSchema(userAccountsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertUserAccount = z.infer<typeof insertUserAccountSchema>;
export type UserAccount = typeof userAccountsTable.$inferSelect;