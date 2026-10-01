---
name: Cloud user administration boundaries
description: Durable rules for separate Cloud/mobile user administration and credential delivery.
---

Cloud and mobile administration must enforce role-domain membership in the API even when stored role metadata is stale; UI filtering is only convenience.

**Why:** Existing databases can contain roles created before application-scope metadata was introduced, so relying only on that column can re-open cross-domain assignment.

Credential delivery remains provider-agnostic: record delivery metadata and status, but never persist temporary passwords or include them in audit/notification records.

**How to apply:** Keep password generation, hashing, forced-change state, and notification status separate; add an outbound provider without changing the user administration contract.