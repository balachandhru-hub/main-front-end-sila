---
name: SILA Cloud delivery boundary
description: Scope boundary for the first SILA Cloud administration milestone.
---

The initial SILA Cloud milestone is intentionally frontend-first: it provides the complete administration surface, working local interactions, and clearly labeled development/test data. Shared PostgreSQL persistence, generated API contracts, backend authorization, and strict customer/property/store isolation are the next implementation boundary.

**Why:** The administration brief is broad and the first usable control-plane experience needed to be visible before wiring every domain to the shared backend.

**How to apply:** Treat the current UI as the product surface to connect, not as a second source of truth. The next backend pass should preserve the existing navigation and data concepts while enforcing authorization and tenant isolation server-side.