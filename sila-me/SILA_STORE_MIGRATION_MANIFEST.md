# SILA Store Migration Manifest

## Scope

This manifest describes the existing SILA Store mobile source for a later move into the unified SILA Platform monorepo. This preparation does not migrate files, redesign authentication, change application behavior, connect a new database, or deploy the app.

## Application identity and toolchain

- **Application root:** `artifacts/sila-scanner`
- **Framework:** Expo / React Native with TypeScript
- **Expo SDK:** `~57.0.7`
- **React Native:** `0.86.3`
- **React:** `19.2.3`
- **Package manager:** pnpm workspace
- **Lockfile:** `pnpm-lock.yaml`
- **Package:** `@workspace/sila-scanner`
- **Entry:** `expo-router/entry`
- **Root layout:** `artifacts/sila-scanner/app/_layout.tsx`
- **Initial route/login:** `artifacts/sila-scanner/app/index.tsx`
- **Navigation:** Expo Router file-based routes using a root `Stack`; a tab shell also exists under `app/(tabs)`.
- **TypeScript config:** `artifacts/sila-scanner/tsconfig.json`

## Source structure

- `app/` — routes and screens
- `components/` — shared mobile UI, brand, screen, offline, keyboard, and error-boundary components
- `context/` — application/session state and connectivity state
- `services/` — API, authentication, ERP/GRN, stock, material recognition, approvals, inventory, and offline coordination
- `data/local/database/` — Expo SQLite database, migrations, repositories, and local types
- `constants/` — colors and development/display configuration
- `hooks/` — theme/color hooks
- `utils/` — filename utility
- `assets/images/` — SILA brand, application icon, splash, and favicon assets
- `scripts/` and `server/` — Expo web build and static serving support
- `.replit-artifact/` — artifact runtime/publishing metadata

No dedicated automated test directory or test command is present in the mobile package.

## Screens and routes

| Route | Source | Existing purpose |
| --- | --- | --- |
| `/` | `app/index.tsx` | Login and session entry |
| `/home` | `app/home.tsx` | Store operations dashboard |
| `/receive` | `app/receive.tsx` | Receiving workflow entry |
| `/po-select`, `/po-detail` | `app/po-select.tsx`, `app/po-detail.tsx` | Open PO selection and detail |
| `/grn-review`, `/grn-confirm`, `/grn-success`, `/grn-pending` | matching `app/grn-*.tsx` files | GRN review, validation, submission, result |
| `/inventory` | `app/inventory.tsx` | Inventory count and material identification |
| `/scan`, `/review` | `app/scan.tsx`, `app/review.tsx` | Invoice/document capture, import, PDF, and review |
| `/invoice-candidates`, `/invoice-comparison`, `/invoice-type-review`, `/service-invoice` | matching route files | Invoice matching and type-specific review |
| `/history`, `/invoice-detail` | matching route files | Document history and detail |
| `/transfer`, `/goods-issue` | matching route files | Stock transfer and goods issue |
| `/approvals` | `app/approvals.tsx` | Local approval list/actions |
| `/pending`, `/sync-status` | matching route files | Local pending work and sync status |
| `/more`, `/settings` | matching route files | More menu and settings |
| `/success` | `app/success.tsx` | Generic completion state |
| fallback | `app/+not-found.tsx` | Unknown route |

## Functional inventory

| Module | Status | Notes |
| --- | --- | --- |
| Login/session | IMPLEMENTED | Mobile login, bearer token, `/me`, `/mobile/config`, restore, logout, and 401 expiry handling |
| Home/dashboard | IMPLEMENTED | Permission/feature-aware operation menu |
| Receive Goods / PO / GRN | IMPLEMENTED | Live API orchestration for PO retrieval, lines, server validation, submission, and pending approval |
| Inventory Count | IMPLEMENTED | Material selection, quantity entry, and API-backed count submission |
| Scan Document | PARTIAL | Camera/gallery/document import exists; no document-edge detection or perspective correction |
| Invoice Scanner | PARTIAL | Multi-page capture/import and review exist; capture uses Expo image picker rather than a native document-scanner SDK |
| Multi-page scanning | IMPLEMENTED | Multiple pages, thumbnails, delete/reorder, retake/add-page flows |
| PDF creation | IMPLEMENTED | `expo-print` creates a PDF from captured image pages |
| OCR | IMPLEMENTED (BACKEND) | Mobile uploads a document and calls backend extraction; no on-device OCR |
| Invoice extraction | IMPLEMENTED (BACKEND) | Structured invoice, supplier, PO, and line-item data returned by document APIs |
| Review/correction | IMPLEMENTED | Candidate comparison, invoice type review, and confirmation flows |
| History | IMPLEMENTED | API-backed document history and detail |
| Stock Transfer | IMPLEMENTED | Live create/add-line/validate/submit API workflow |
| Goods Issue | IMPLEMENTED | Live create/add-line/validate/submit API workflow |
| Approvals | MOCK/PARTIAL | Static local approval records and local resolution; authoritative cloud approval is not implemented here |
| Offline queue | PARTIAL | SQLite tables, repositories, status, and reconnect trigger exist; no complete queue worker/retry processor is wired |
| Sync | PARTIAL | Connectivity and status surfaces exist; foreground invoice upload remains synchronous |
| Barcode/QR | PARTIAL | API barcode lookup from entered code exists; no native camera barcode/QR detector |
| Material recognition | IMPLEMENTED | Backend text/barcode/image recognition with candidate confirmation; cannot mutate inventory directly |
| Camera/gallery | IMPLEMENTED | `expo-image-picker` camera and photo-library access |

## API architecture

- **Primary handwritten client:** `artifacts/sila-scanner/services/api.ts`
- **Generated client:** `@workspace/api-client-react`, configured in `app/_layout.tsx`
- **Handwritten API base:** `EXPO_PUBLIC_API_BASE_URL`, then `API_BASE_URL`, then a hardcoded production fallback; normalized to include `/api`.
- **Generated-client origin:** `EXPO_PUBLIC_API_BASE_URL` or `https://${EXPO_PUBLIC_DOMAIN}`, with `/api` removed because generated paths already include it.
- **Current hardcoded production fallback:** `https://sila-cloud-administration.replit.app/api`
- **Login:** `POST /api/auth/mobile/login`
- **Identity:** `GET /api/me`
- **Mobile configuration:** `GET /api/mobile/config`
- **Authorization:** bearer token added by both handwritten and generated clients.
- **Errors:** typed JSON error extraction; 401 invokes session-expiry handling while authorization failures remain visible.

## Authentication and token storage

- Login UI is in `app/index.tsx`.
- Session orchestration is in `context/AppStateContext.tsx`.
- Token persistence is in `services/auth.ts`.
- Native tokens use Expo SecureStore with device-only, when-unlocked accessibility.
- Web preview uses browser `localStorage`.
- `/me` is authoritative for mobile identity, user type, customer, properties, stores, roles, and permissions.
- `/mobile/config` supplies feature/configuration state after identity retrieval.
- No refresh-token workflow was found.

## Mobile configuration and identity context

The application consumes `/api/mobile/config` and uses backend feature flags/configuration. It consumes `/api/me` for user, role, customer, properties, stores, permissions, and features. Development/display fixtures still exist in `constants/config.ts`, approvals fixtures, pending UI, and a stock property-name mapping; authenticated runtime scope is derived from backend identity.

Known organization-specific display/development references include FIVE Hotels & Resorts, FIVE Palm Jumeirah, FIVE Jumeirah Village/JVC, and FIVE LUXE. These must be reviewed during migration, but they are intentionally unchanged in this source-preservation phase.

## Document, OCR, extraction, and upload architecture

- **Capture:** `app/scan.tsx` uses `expo-image-picker` for camera/gallery and `expo-document-picker` for PDFs/images.
- **Page processing:** Captured pages can be added, previewed, removed, reordered, and reviewed. No edge detection, automatic crop, perspective correction, or image-enhancement engine was found.
- **PDF:** `expo-print` generates a local PDF from captured image pages; imported PDFs are also accepted.
- **Upload/extraction:** `app/review.tsx` creates a document, attaches multipart content, invokes extraction, and supports retry.
- **OCR:** Backend abstraction exposed through `/api/documents/:id/extract`; responses include provider/status/confidence.
- **Invoice extraction:** Backend returns structured invoice fields, supplier/PO candidates, line items, and comparison data.
- **SharePoint/storage:** Mobile calls backend archive/upload APIs and displays storage status/provider/path. It contains no SharePoint or Microsoft Graph credentials and does not upload directly to SharePoint.
- **Current limitation:** Upload is foreground/synchronous. Existing upload-queue repositories are not called by the document review path.

## Offline and local storage architecture

- **Database:** Expo SQLite, native-only, with WAL and schema migrations.
- **Stored locally:** profile/config caches, material/barcode/supplier/stock/PO caches, document/page/invoice drafts, upload queue metadata, and sync queue metadata.
- **Secure state:** Expo SecureStore for native auth token and migration marker.
- **AsyncStorage:** dependency present, but no active source use found.
- **Filesystem:** Expo FileSystem supports local captured/imported document references.
- **Connectivity:** `@react-native-community/netinfo`.
- **Queue/sync:** repositories and status counters exist; reconnect orchestration accepts an external handler, but no complete processor registration, retries, or background worker was found.

## Native configuration and permissions

- Expo config: `artifacts/sila-scanner/app.json`
- App name: `SILA Store`
- Slug: `sila-scanner`
- Scheme/deep-link scheme: `sila-scanner`
- Orientation: portrait
- iOS bundle identifier: not configured
- Android package: not configured
- EAS configuration: not present
- Runtime version/updates configuration: not present
- Plugins: `expo-router`, `expo-image-picker`
- Declared permission prompts: camera and photo library through `expo-image-picker`
- File selection: system document picker
- Notifications: no permission/plugin found
- Native barcode permission/detector: not present

## Assets and branding

Preserve all legitimate files under `artifacts/sila-scanner/assets/images/`:

- `sila-logo.png`
- `sila-logo-wide.png`
- `sila-logo-mark.png`
- `icon.png`
- `splash-icon.png`
- `favicon.png`

The shared `components/Brand.tsx` component renders SILA branding. No custom bundled font asset was found; Inter is supplied through `@expo-google-fonts/inter`.

## Environment variable names

Values are intentionally excluded.

| Name | Classification |
| --- | --- |
| `EXPO_PUBLIC_API_BASE_URL` | REQUIRED for explicit mobile API selection; otherwise fallback applies |
| `API_BASE_URL` | OPTIONAL development script fallback input |
| `EXPO_PUBLIC_DOMAIN` | REQUIRED by generated client when no explicit API base is supplied |
| `EXPO_PUBLIC_MAX_INVOICE_BYTES` | OPTIONAL invoice upload limit |
| `EXPO_PUBLIC_REPL_ID` | OPTIONAL Replit build/runtime metadata |
| `REPL_ID` | OPTIONAL Replit build/runtime metadata |
| `REPLIT_DEV_DOMAIN` | DEVELOPMENT |
| `REPLIT_INTERNAL_APP_DOMAIN` | DEVELOPMENT/BUILD |
| `REPLIT_EXPO_DEV_DOMAIN` | DEVELOPMENT |
| `REPLIT_EXPO_SESSION_SECRET` | DEVELOPMENT secret consumed only by the launch workflow |
| `EXPO_PACKAGER_PROXY_URL` | DEVELOPMENT |
| `REACT_NATIVE_PACKAGER_HOSTNAME` | DEVELOPMENT |
| `PORT` | REQUIRED by Replit workflow/server |
| `BASE_PATH` | OPTIONAL static serving path |

## Commands

From the workspace root:

- Development: `pnpm --filter @workspace/sila-scanner run dev`
- Type check: `pnpm --filter @workspace/sila-scanner run typecheck`
- Build: `pnpm --filter @workspace/sila-scanner run build`
- Serve build: `pnpm --filter @workspace/sila-scanner run serve`
- Automated tests: no mobile test command is currently defined

## Migration exclusions

Do not migrate or commit dependency/runtime/generated/local-secret content:

- `node_modules/`
- `.expo/`
- `dist/`, `build/`, `web-build/`
- caches and logs
- `.env` and `.env.*` other than intentional example files
- OS/editor temporary files
- local credentials, signing keys, certificates, and provisioning profiles
- generated prompt files such as untracked `attached_assets/Pasted-*.txt`

Preserve legitimate assets, source, package configuration, workspace lockfile, and the migration manifest.

## Recommended unified-monorepo destination mapping

No files are moved during this phase.

| Current source | Recommended destination |
| --- | --- |
| `artifacts/sila-scanner/app/` | `apps/store/app/` |
| `artifacts/sila-scanner/components/` | `apps/store/components/` |
| `artifacts/sila-scanner/context/` | `apps/store/context/` |
| `artifacts/sila-scanner/data/` | `apps/store/data/` |
| `artifacts/sila-scanner/services/` | `apps/store/services/` initially |
| `artifacts/sila-scanner/assets/` | `apps/store/assets/` |
| mobile package/config/scripts/server files | corresponding `apps/store/` paths |
| generic API transport and generated API client use | evaluate for `packages/api-client` |
| API request/response models shared with Cloud/API | evaluate for `packages/shared-types` |
| shared Zod/business validation contracts | evaluate for `packages/validation` |
| environment parsing and product-neutral config | evaluate for `packages/config` |

Store-specific Expo routing, UI, local SQLite repositories, camera/document flows, and SecureStore handling should remain in `apps/store`. Shared extraction, ERP, authorization, and inventory authority must remain server-side rather than moving into the mobile app.

## Known blockers and migration risks

1. Production mobile credentials/account activation still require verification through the official SILA Cloud administration flow.
2. Native-device validation remains pending for authentication persistence, camera/gallery/document permissions, PDF generation, uploads, OCR/extraction, and history.
3. Native document edge detection, crop/perspective correction, and camera barcode detection are not implemented.
4. Offline upload/sync persistence exists, but a complete queue consumer/retry worker is not wired.
5. Approvals include local mock records/actions and require authoritative cloud enforcement.
6. SharePoint storage and OCR are backend abstractions from this mobile source; production provider completion must be verified in the API.
7. The static build server has high-severity path-traversal warnings from static analysis. These require focused validation/remediation after source preservation because changing serving behavior is outside this phase.
8. The API base has a hardcoded production fallback. Preserve it for this migration commit, then replace it through unified runtime configuration in a later controlled phase.
9. The generated client and handwritten client use different base conventions (`origin` versus `/api` base); migration must preserve this distinction.
10. No automated mobile tests are defined.