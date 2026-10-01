---
name: Operational dashboard access
description: Durable authorization rule for operational dashboard APIs.
---

Operational dashboard APIs must declare their allowed roles and scope type at the route boundary, then derive effective customer, property, and store IDs from the authenticated context before reading or writing records.

**Why:** The dashboard navigation is only a user-experience restriction. Direct requests can bypass it unless every operational endpoint repeats the role and tenant decision on the server, and audit records make those decisions reviewable.

**How to apply:** Add new operational surfaces to the shared policy map and enforcement middleware. Treat request scope parameters as narrowing hints only; reject IDs outside the resolved context and record both denied and granted scope decisions.