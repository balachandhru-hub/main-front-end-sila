---
name: Separate authentication domains
description: Durable constraints for keeping mobile and Cloud identities separate without breaking historical actor references.
---

Mobile and Cloud authentication must resolve from separate authoritative user tables and separate role/access mappings. Existing business and audit foreign keys can continue pointing to preserved legacy actor rows through an explicit domain-to-legacy bridge; those rows are projections for historical references, not login sources.

**Why:** Business records already reference the legacy user table, while the authentication reset requires mobile and Cloud identities to never cross-authenticate. Removing those actor rows would damage history, so the domain split needs both strict lookup boundaries and compatibility projections.

**How to apply:** New bearer tokens and Cloud sessions must identify their principal domain. Resolve roles and tenant scope from the matching domain tables on each protected request. Mobile login must query only the mobile identity domain; Cloud and legacy actor rows are never login fallbacks.