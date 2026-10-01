---
name: Drizzle identity insert schemas
description: Compatibility note for drizzle-zod schemas generated from PostgreSQL identity columns.
---

Do not pass PostgreSQL `generatedAlwaysAsIdentity()` primary keys to `createInsertSchema(...).omit(...)`; the generated insert schema already excludes them.

**Why:** With the workspace's Drizzle and Zod versions, omitting the already-excluded key throws `Unrecognized key: "id"` when Drizzle Kit loads the schema, even though TypeScript compilation succeeds.

**How to apply:** Omit timestamps or other insert-visible server-owned fields, but leave identity keys out of the `.omit(...)` object.