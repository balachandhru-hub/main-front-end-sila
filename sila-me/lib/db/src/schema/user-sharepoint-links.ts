import {
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { userAccountsTable } from "./user-accounts";

export const userSharePointLinksTable = pgTable(
  "sila_user_sharepoint_links",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: integer("user_id")
      .notNull()
      .references(() => userAccountsTable.id, { onDelete: "cascade" }),
    siteUrl: text("site_url").notNull(),
    folderPath: text("folder_path").notNull(),
    folderUrl: text("folder_url"),
    status: text("status").notNull().default("Configured"),
    verificationMessage: text("verification_message"),
    lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
    createdBy: integer("created_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    updatedBy: integer("updated_by").references(() => userAccountsTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => ({
    userIndex: uniqueIndex("sila_user_sharepoint_links_user_idx").on(table.userId),
  }),
);

export type UserSharePointLink = typeof userSharePointLinksTable.$inferSelect;