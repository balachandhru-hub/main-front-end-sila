# SILA combined local stack

This branch wires the **Vosox/SILA portal frontend** (`integration`) with **main-backend-sila** (`integration`) and vendors **sila-me** apps from [sila-platform](https://github.com/balachandhru-hub/sila-platform) (cloud admin + mobile store).

## What you get

| App | Origin | Port |
|-----|--------|------|
| Portal host | this repo (`packages/host-app`) | https://localhost:6001 |
| Buyer / Supplier / Platform remotes | this repo | 6002–6004 |
| .NET API gateway | `main-backend-sila` integration | http://localhost:8000 |
| sila-cloud | `sila-me/artifacts/sila-cloud` | http://localhost:5173 |
| sila-mobile (SILA Store) | `sila-me/artifacts/sila-scanner` | http://localhost:8081 |
| sila-me API | `sila-me/artifacts/api-server` | http://localhost:5000 |

## Prerequisites

- Node 18+, npm, pnpm
- .NET SDK 8
- Docker (SQL Server + Postgres)

## Quick start

```bash
# 1) Databases + .NET backend + dummy users/catalog
npm run dev:backend

# 2) Portal microfrontends
npm install
npm run dev:portal

# 3) sila-me cloud + mobile (separate terminal)
npm run dev:sila-me
```

Or run backend+DB only via `bash scripts/dev-up.sh up`.

Test accounts: see [`dev-seeds/TEST_ACCOUNTS.md`](dev-seeds/TEST_ACCOUNTS.md).

## Dummy data

Identity seed overlays in `dev-seeds/*.csv` add buyer/supplier/outlet users.  
`dev-seeds/catalog-seed.sql` inserts supplier catalog + buyer material master rows after migrations.

## Notes

- Portal `.env` files point at `http://localhost:8000/` (local gateway).
- Backend is cloned/patched under `vendor-backend-sila/` (gitignored); re-run `scripts/dev-up.sh` to refresh from `integration`.
- sila-me keeps its own Express/Postgres stack (same as sila-platform) so cloud/mobile match the reference UX while the portal uses the .NET procurement APIs.
