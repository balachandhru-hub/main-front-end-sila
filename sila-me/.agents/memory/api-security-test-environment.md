---
name: API security test environment
description: Environment constraints and isolation rules for the API authorization regression suite.
---

The API authorization regression suite runs the real Express app over HTTP against the workspace PostgreSQL database. Its fixtures must use a unique prefix and always be cleaned up; the development database may not have the user table yet, so schema setup must remain idempotent.

**Why:** The configured development database was initially uninitialized, and using the real route stack is important for catching middleware, cookie, and database-scope regressions together.

**How to apply:** Keep `DATABASE_URL` available to the validation environment, avoid shared seed-user assumptions, and do not replace these tests with route-only mocks when changing auth or tenant behavior.

Master-data authorization fixtures must assert permissions from the seeded role definitions rather than assuming a customer manager is view-only; use a role intentionally lacking the target permission for denial tests.

**Why:** The customer-manager fixture is allowed to manage materials by design, so a denial test against that role would report a false security failure.

**How to apply:** For master-data mutation denial coverage, use the store-manager fixture or another role verified to lack `MANAGE_MATERIALS`/`MANAGE_SUPPLIERS`, and keep the positive admin path covered separately.