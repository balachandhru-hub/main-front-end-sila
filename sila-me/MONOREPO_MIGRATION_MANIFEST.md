# SILA Cloud Monorepo Migration Manifest

Prepared from the existing SILA Cloud source tree on 2026-09-13.

## Scope and safety boundary

This manifest documents the existing project for transfer into a unified SILA
Platform workspace. It does not change application behavior, authentication,
database schema, deployment configuration, or production data.

## 1. Project confirmation and architecture

- **Real SILA Cloud project confirmed:** YES
- Evidence: SILA Cloud Administration artifact, SILA-branded assets, Cloud
  administration UI, SILA API routes, SILA database tables, and separate Cloud
  and mobile authentication domains.
- **Architecture type:** A — frontend and backend are already separated inside
  a pnpm monorepo.
- **Frontend:** Vite + React + TypeScript.
- **Backend:** Express 5 + TypeScript API server.
- **Database/shared backend:** PostgreSQL with Drizzle ORM in a shared library.
- **Shared API contracts:** OpenAPI source, generated Zod validators, and
  generated React API client.

## 2. Current relevant directory tree

```text
.
├── artifacts/
│   ├── sila-cloud/
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── index.css
│   │   │   └── lib/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── .replit-artifact/artifact.toml
│   └── api-server/
│       ├── src/
│       │   ├── index.ts
│       │   ├── app.ts
│       │   ├── lib/
│       │   ├── middlewares/
│       │   ├── routes/
│       │   └── tests/
│       ├── build.mjs
│       ├── test-build.mjs
│       ├── package.json
│       ├── tsconfig.json
│       └── .replit-artifact/artifact.toml
├── lib/
│   ├── db/
│   │   ├── src/
│   │   │   └── schema/
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   ├── api-spec/
│   │   ├── openapi.yaml
│   │   ├── orval.config.ts
│   │   └── package.json
│   ├── api-zod/
│   │   ├── src/
│   │   └── package.json
│   └── api-client-react/
│       ├── src/
│       └── package.json
├── scripts/
├── attached_assets/
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.base.json
├── .replit
└── .replitignore
```

The Cloud screen components are currently consolidated in
`artifacts/sila-cloud/src/App.tsx`; there is no separate `pages/` directory.

## 3. Frontend source and user-facing screens

### Frontend source

- Entry point: `artifacts/sila-cloud/src/main.tsx`
- Main application and routing: `artifacts/sila-cloud/src/App.tsx`
- Styles: `artifacts/sila-cloud/src/index.css`
- Shared UI components: `artifacts/sila-cloud/src/components/ui/`
- Error boundary: `artifacts/sila-cloud/src/components/error-boundary.tsx`
- Hooks and utilities:
  - `artifacts/sila-cloud/src/hooks/`
  - `artifacts/sila-cloud/src/lib/`

### Current screen coverage

The navigation and screen implementations are in `App.tsx`:

- Command center: Dashboard, Customers, Properties, Stores, Mobile Users,
  Cloud Users, Roles & Permissions, User Access
- Control plane: Authentication, Approval Workflows, Approval Matrix, Workflow
  Simulator, Delegations, ERP Connections, Plant Mapping, Storage Mapping,
  Materials, Suppliers, Mobile Configuration, OCR Agent
- Observability: Transactions, Approval Monitoring, Integration Monitoring,
  ERP Errors, Audit Logs
- Configuration: Notifications, Transaction Types, System Settings, Mobile
  Readiness, Customer Setup Wizard
- Authentication UI: Cloud login and forced first-login password change
- Live administration UI: Cloud/mobile user administration, role and scope
  controls, password reset, and credential delivery metadata

The primary frontend component declarations are:
`Dashboard`, `AdministrationUserPage`, `ResourcePage`, `ConfigPage`,
`OcrAgentPage`, `Simulator`, `WorkflowPage`, `MatrixPage`,
`LiveMasterDataPage`, `MonitoringPage`, `SetupWizard`, `LoginScreen`,
`ChangePasswordScreen`, and `AppShell`.

## 4. Backend source and API route files

### Backend entry and middleware

- Server entry and `PORT` binding:
  `artifacts/api-server/src/index.ts`
- Express app, CORS, JSON parsing, `/api` mounting, and error handling:
  `artifacts/api-server/src/app.ts`
- Route registration:
  `artifacts/api-server/src/routes/index.ts`
- Authentication and authorization middleware:
  `artifacts/api-server/src/middlewares/auth.ts`

### API route modules

- `artifacts/api-server/src/routes/health.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/routes/user-administration.ts`
- `artifacts/api-server/src/routes/users.ts`
- `artifacts/api-server/src/routes/admin.ts`
- `artifacts/api-server/src/routes/mobile.ts`
- `artifacts/api-server/src/routes/master-data.ts`
- `artifacts/api-server/src/routes/operational.ts`
- `artifacts/api-server/src/routes/invoices.ts`

### Backend supporting libraries

- `artifacts/api-server/src/lib/access.ts`
- `artifacts/api-server/src/lib/auth-context.ts`
- `artifacts/api-server/src/lib/audit.ts`
- `artifacts/api-server/src/lib/logger.ts`
- `artifacts/api-server/src/lib/master-data.ts`
- `artifacts/api-server/src/lib/mobile-config.ts`
- `artifacts/api-server/src/lib/notifications.ts`
- `artifacts/api-server/src/lib/ocr-agent.ts`
- `artifacts/api-server/src/lib/seed-users.ts`
- `artifacts/api-server/src/lib/sharepoint.ts`

## 5. Known backend route locations

The Express app mounts the route index at `/api`.

| Public route | Implementation file | Route declaration |
| --- | --- | --- |
| `GET /api/health` | `artifacts/api-server/src/routes/health.ts` | `router.get("/health", ...)` |
| `GET /api/version` | `artifacts/api-server/src/routes/health.ts` | `router.get("/version", ...)` |
| `POST /api/auth/mobile/login` | `artifacts/api-server/src/routes/auth.ts` | `router.post("/auth/mobile/login", ...)` |
| `GET /api/me` | `artifacts/api-server/src/routes/auth.ts` | `router.get("/me", ...)` |
| `GET /api/mobile/config` | `artifacts/api-server/src/routes/mobile.ts` | `router.get("/mobile/config", ...)` |

Additional health endpoint:

- `GET /api/healthz` is implemented in
  `artifacts/api-server/src/routes/health.ts` and is used by the API artifact
  startup health check.

## 6. Authentication and authorization files

- Cloud login: `artifacts/api-server/src/routes/auth.ts`,
  `POST /api/auth/sign-in`
- Mobile login: `artifacts/api-server/src/routes/auth.ts`,
  `POST /api/auth/mobile/login`
- `/api/me`: `artifacts/api-server/src/routes/auth.ts`
- Password hashing and verification: `artifacts/api-server/src/lib/access.ts`
- Mobile bearer-token creation and validation:
  `artifacts/api-server/src/lib/access.ts`
- Cloud cookie/session creation and validation:
  `artifacts/api-server/src/lib/access.ts`
- Authentication middleware and channel/domain checks:
  `artifacts/api-server/src/middlewares/auth.ts`
- Role, permission, customer, property, and store-scope resolution:
  `artifacts/api-server/src/lib/auth-context.ts`
- Cloud/mobile user password reset and password-change routes:
  `artifacts/api-server/src/routes/user-administration.ts`
- Cloud/mobile identity table lookup and domain separation:
  `lib/db/src/schema/auth-domains.ts`

Authentication files must be transferred unchanged for this preparation
exercise.

## 7. Database ownership and schema

- PostgreSQL connection creation:
  `lib/db/src/index.ts`
- `DATABASE_URL` consumption:
  - `lib/db/src/index.ts`
  - `lib/db/drizzle.config.ts`
- ORM/query library: Drizzle ORM with `pg`/node-postgres.
- Schema entry point: `lib/db/src/schema/index.ts`
- Schema files:
  - `lib/db/src/schema/user-accounts.ts`
  - `lib/db/src/schema/auth-domains.ts`
  - `lib/db/src/schema/user-sharepoint-links.ts`
  - `lib/db/src/schema/organization.ts`
  - `lib/db/src/schema/master-data.ts`
  - `lib/db/src/schema/foundation.ts`
- Drizzle configuration: `lib/db/drizzle.config.ts`
- Schema operation: `pnpm --filter @workspace/db run push`
- Checked-in migration directory: none found. The current project uses the
  Drizzle schema source and push scripts rather than a checked-in migrations
  directory.

## 8. Configuration and environment variable names

Only names are documented here; no values are included.

### Shared/runtime names

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `MOBILE_TOKEN_SECRET`
- `ALLOWED_ORIGINS`
- `REPLIT_DOMAINS`
- `REPL_ID`

### API-specific names

- `SILA_BACKEND_VERSION`
- `LOG_LEVEL`
- `INVOICE_MAX_UPLOAD_BYTES`
- `SILA_DEV_PASSWORD` — development-only seed password

### Cloud frontend/build names

- `BASE_PATH`
- Vite-generated `import.meta.env.BASE_URL`

`BASE_PATH` is required by `artifacts/sila-cloud/vite.config.ts` and is set to
`/` by the Cloud artifact configuration. The API server does not use
`BASE_PATH`.

## 9. Build, development, and start requirements

- **Package manager:** pnpm workspaces.
- **Install:** `pnpm install --frozen-lockfile`
- **Cloud development:** `pnpm --filter @workspace/sila-cloud run dev`
- **Cloud build:** `pnpm --filter @workspace/sila-cloud run build`
- **Cloud built preview/start:** `pnpm --filter @workspace/sila-cloud run serve`
- **API development:** `pnpm --filter @workspace/api-server run dev`
- **API build:** `pnpm --filter @workspace/api-server run build`
- **API start:** `pnpm --filter @workspace/api-server run start`
- **Full workspace typecheck:** `pnpm run typecheck`
- **Full workspace build:** `pnpm run build`
- **API tests:** `pnpm --filter @workspace/api-server run test`
- **API code generation:** `pnpm --filter @workspace/api-spec run codegen`

The API requires a positive `PORT` and binds to `0.0.0.0`. The Cloud Vite
server also requires a positive `PORT` and binds to `0.0.0.0`.

## 10. Replit and deployment configuration

Required Replit/project configuration:

- `.replit`
- `.replitignore`
- `artifacts/sila-cloud/.replit-artifact/artifact.toml`
- `artifacts/api-server/.replit-artifact/artifact.toml`
- `scripts/post-merge.sh`

The Cloud artifact builds to `artifacts/sila-cloud/dist/public` and serves the
static output with an SPA rewrite. The API artifact builds the API bundle and
uses `/api/healthz` as its startup health check. This manifest does not deploy
or modify either configuration.

## 11. Exact transfer set

Transfer these source and configuration paths:

```text
package.json
pnpm-workspace.yaml
pnpm-lock.yaml
.npmrc
.replit
.replitignore
tsconfig.json
tsconfig.base.json
scripts/
artifacts/sila-cloud/src/
artifacts/sila-cloud/public/
artifacts/sila-cloud/package.json
artifacts/sila-cloud/tsconfig.json
artifacts/sila-cloud/vite.config.ts
artifacts/sila-cloud/.replit-artifact/artifact.toml
artifacts/api-server/src/
artifacts/api-server/build.mjs
artifacts/api-server/test-build.mjs
artifacts/api-server/package.json
artifacts/api-server/tsconfig.json
artifacts/api-server/.replit-artifact/artifact.toml
lib/db/src/
lib/db/drizzle.config.ts
lib/db/package.json
lib/db/tsconfig.json
lib/api-spec/openapi.yaml
lib/api-spec/orval.config.ts
lib/api-spec/package.json
lib/api-zod/src/
lib/api-zod/package.json
lib/api-zod/tsconfig.json
lib/api-client-react/src/
lib/api-client-react/package.json
lib/api-client-react/tsconfig.json
attached_assets/SILA_Transpalog_1789175779917.png
```

Transfer only the listed SILA logo asset from `attached_assets/`; do not copy
the complete attachment directory unless its contents are independently
reviewed and required by the target workspace.

## 12. Exclusions

Do not transfer:

```text
node_modules/
**/node_modules/
dist/
**/dist/
build/
**/build/
.cache/
.test-dist/
*.tsbuildinfo
*.log
.env
.env.*
local secret files
Replit runtime cache
temporary files
generated client output when it is regenerated from the OpenAPI source
```

Generated API client and Zod output may be regenerated in the target
workspace. If the target migration requires an offline source snapshot, the
checked-in generated source under `lib/api-client-react/src/generated/` and
`lib/api-zod/src/generated/` may be retained, but generated build output under
`dist/` must remain excluded.

Do not transfer:

- Development or production database contents.
- Secret values, password hashes, temporary passwords, or credential files.
- The complete `attached_assets/` directory without review.
- Existing `artifacts/mockup-sandbox/` unless the target workspace explicitly
  needs the design-preview artifact.

## 13. Git readiness

- **Git repository connected:** YES
- **Current branch:** `main`
- **Remote configuration:** present
- **Uncommitted changes:** YES
- At inventory time, the attached preparation instruction file was untracked.
  This manifest is also an intentionally uncommitted preparation artifact.
- Nothing was pushed.

## 14. Recommended transfer method

**Recommended method: A — Git repository migration.**

The project is already a pnpm workspace with separate artifacts and shared
libraries, and Git is configured on the `main` branch. Git preserves the
directory structure, package relationships, TypeScript configuration, and
Replit artifact configuration more safely than a selective file upload.

Before transfer, commit only the reviewed source and manifest files, keep
secrets outside Git, and do not include generated caches or dependency
directories.

## 15. Blockers and handoff notes

- No source-structure blocker was found.
- The destination workspace must preserve pnpm workspace package names and
  workspace dependency resolution.
- The destination must provision PostgreSQL and provide the required
  environment variable names before starting the API.
- The destination must provide `SESSION_SECRET` and, if used independently,
  `MOBILE_TOKEN_SECRET` through its secret manager; values are not part of this
  manifest.
- There is no checked-in Drizzle migrations directory; database setup must
  follow the existing schema/push process or be explicitly migrated to the
  destination's migration convention as a separate, reviewed task.
- Production deployment and production data changes are intentionally outside
  this preparation task.

## Final checklist

1. Real SILA Cloud project confirmed: **YES**
2. Project architecture type: **A — separated frontend and backend in a pnpm monorepo**
3. Frontend path: **`artifacts/sila-cloud/`**
4. Backend path: **`artifacts/api-server/`**
5. Database/schema path: **`lib/db/src/` and `lib/db/drizzle.config.ts`**
6. Migration path: **Git repository migration**
7. API route files: **`artifacts/api-server/src/routes/*.ts`**
8. Authentication files: **`artifacts/api-server/src/routes/auth.ts`, `src/lib/access.ts`, `src/middlewares/auth.ts`, `src/lib/auth-context.ts`, `src/routes/user-administration.ts`**
9. `/api/health` location: **`artifacts/api-server/src/routes/health.ts`**
10. `/api/version` location: **`artifacts/api-server/src/routes/health.ts`**
11. `/api/auth/mobile/login` location: **`artifacts/api-server/src/routes/auth.ts`**
12. `/api/me` location: **`artifacts/api-server/src/routes/auth.ts`**
13. `/api/mobile/config` location: **`artifacts/api-server/src/routes/mobile.ts`**
14. Package manager: **pnpm**
15. Build command: **`pnpm run build` or the artifact-specific build commands above**
16. Start command: **`pnpm --filter @workspace/api-server run start`; Cloud built preview uses `pnpm --filter @workspace/sila-cloud run serve`**
17. PORT handling: **required by both services; both bind `0.0.0.0`**
18. BASE_PATH usage: **Cloud Vite build/runtime configuration only; set to `/` in the artifact**
19. Git connected: **YES**
20. Git branch: **`main`**
21. Uncommitted changes: **YES**
22. `MONOREPO_MIGRATION_MANIFEST.md` created: **YES**
23. Recommended transfer method: **Git repository migration**
24. Exact folders/files to transfer: **listed in section 11**
25. Exact folders/files to exclude: **listed in section 12**
26. Blockers: **no source blocker; destination PostgreSQL, secrets, and workspace configuration are required**
