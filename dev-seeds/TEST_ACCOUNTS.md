# Local test accounts

## Portal (main-front-end-sila + main-backend-sila)

| Role | Username | Password |
|------|----------|----------|
| Platform admin | NawazSharief@chervic.in | Nawaz@123 |
| Buyer admin | buyer.admin@sila.test | Test@123 |
| Buyer user | buyer.user@sila.test | Test@123 |
| Outlet manager | outlet.manager@sila.test | Test@123 |
| Supplier admin | supplier.admin@sila.test | Test@123 |
| Supplier user | supplier.user@sila.test | Test@123 |

Dummy catalog: 5 supplier catalog items + 5 buyer material-master rows (`dev-seeds/catalog-seed.sql`).

Endpoints: portal `https://localhost:6001`, gateway `http://localhost:8000`.

## sila-me cloud / mobile

Password for all seeded sila-me users: `SilaDev@123` (from `SILA_DEV_PASSWORD`).

| App | Username | Notes |
|-----|----------|-------|
| Cloud | admin@sila.cloud | SUPER_ADMIN |
| Cloud | support@sila.cloud | support |
| Mobile | sriram@sila.cloud | STORE_MANAGER |

Endpoints: API `http://localhost:5000`, cloud `http://localhost:5173`, mobile `http://localhost:8081`.
