#!/usr/bin/env bash
# Bootstrap local SILA stack:
#   - main-backend-sila (integration) on SQL Server
#   - Vosox portal frontend (this repo)
#   - sila-me cloud + mobile apps (vendored from sila-platform)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="${SILA_BACKEND_DIR:-$ROOT/vendor-backend-sila}"
BACKEND_REPO="${SILA_BACKEND_REPO:-https://github.com/balachandhru-hub/main-backend-sila.git}"
BACKEND_BRANCH="${SILA_BACKEND_BRANCH:-integration}"
export PATH="${HOME}/.dotnet:${PATH}"
export ASPNETCORE_ENVIRONMENT=Development
export DOTNET_ENVIRONMENT=Development

log() { printf '\n==> %s\n' "$*"; }

ensure_dbs() {
  log "Starting databases (docker compose)"
  if ! docker info >/dev/null 2>&1; then
    echo "Docker is not available. Start Docker and retry." >&2
    exit 1
  fi
  # Reuse containers if already created outside compose
  if docker ps -a --format '{{.Names}}' | grep -qx sila-mssql; then
    docker start sila-mssql >/dev/null || true
  fi
  if docker ps -a --format '{{.Names}}' | grep -qx sila-postgres; then
    docker start sila-postgres >/dev/null || true
  fi
  (cd "$ROOT" && docker compose up -d mssql postgres 2>/dev/null) || true
  log "Waiting for SQL Server"
  for i in $(seq 1 60); do
    if docker exec sila-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SilaDev@Pass123' -C -Q "SELECT 1" >/dev/null 2>&1; then
      echo "SQL Server ready"
      return 0
    fi
    sleep 2
  done
  echo "SQL Server did not become ready" >&2
  exit 1
}

ensure_backend() {
  if [[ ! -d "$BACKEND_DIR/.git" && ! -f "$BACKEND_DIR/ProcurementSuite.sln" ]]; then
    log "Cloning backend ($BACKEND_BRANCH)"
    git clone --depth 1 -b "$BACKEND_BRANCH" "$BACKEND_REPO" "$BACKEND_DIR"
  else
    log "Backend present at $BACKEND_DIR"
  fi

  log "Applying dummy identity seed overlays"
  local mig="$BACKEND_DIR/src/Platform/Identity/Identity.Infrastructure/Migrations"
  cp "$ROOT/dev-seeds/Organization.csv" "$mig/Organization.csv"
  cp "$ROOT/dev-seeds/Person.csv" "$mig/Person.csv"
  cp "$ROOT/dev-seeds/User.csv" "$mig/User.csv"
  cp "$ROOT/dev-seeds/UserRoleMapping.csv" "$mig/UserRoleMapping.csv"

  # Ensure Development connection strings exist
  python3 - <<PY
import json
from pathlib import Path
root = Path("$BACKEND_DIR")
services = [
  ("src/Platform/Identity/Identity.API", "IdentitySystemDB", "identitysystem"),
  ("src/Platform/MasterData/MasterData.API", "MasterDataDb", "masterdata"),
  ("src/Modules/Supplier/Supplier.API", "SupplierDb", "supplier"),
  ("src/Modules/Buyer/Buyer.API", "BuyerSystemDB", "buyersystem"),
  ("src/Modules/Operations/Operations.API", "OperationsDb", "operations"),
]
conn = "Server=localhost,1433;Database={db};User Id=sa;Password=SilaDev@Pass123;Encrypt=false;TrustServerCertificate=True;MultipleActiveResultSets=True;"
for rel, db, schema in services:
    base = root / rel / "appsettings.json"
    out = root / rel / "appsettings.Development.json"
    data = json.loads(base.read_text())
    data["ConnectionStrings"] = {
        "DefaultConnection": conn.format(db=db),
        "Schema": schema,
        "DatabaseName": db,
    }
    origin = data.get("Origin") or {}
    origin["HostOriginLocal"] = "https://localhost:6001"
    data["Origin"] = origin
    out.write_text(json.dumps(data, indent=2) + "\n")
print("Development appsettings ready")
PY
}

build_backend() {
  log "Building backend services"
  (cd "$BACKEND_DIR" && \
    dotnet build src/Platform/Identity/Identity.API/Identity.API.csproj -c Debug -v q && \
    dotnet build src/Platform/MasterData/MasterData.API/MasterData.API.csproj -c Debug -v q && \
    dotnet build src/Modules/Supplier/Supplier.API/Supplier.API.csproj -c Debug -v q && \
    dotnet build src/Modules/Buyer/Buyer.API/Buyer.API.csproj -c Debug -v q && \
    dotnet build src/Modules/Operations/Operations.API/Operations.API.csproj -c Debug -v q && \
    dotnet build src/ApiGateWay/OcelotGateway/OcelotGateway.csproj -c Debug -v q)
}

start_backend() {
  local logs="$ROOT/.run-logs"
  mkdir -p "$logs"
  log "Starting backend APIs + gateway"
  (
    cd "$BACKEND_DIR/src/Platform/Identity/Identity.API"
    ASPNETCORE_URLS=http://127.0.0.1:8001 nohup dotnet run --no-build -c Debug >"$logs/identity.log" 2>&1 &
    echo $! >"$logs/identity.pid"
  )
  (
    cd "$BACKEND_DIR/src/Platform/MasterData/MasterData.API"
    ASPNETCORE_URLS=http://127.0.0.1:8002 nohup dotnet run --no-build -c Debug >"$logs/masterdata.log" 2>&1 &
    echo $! >"$logs/masterdata.pid"
  )
  (
    cd "$BACKEND_DIR/src/Modules/Supplier/Supplier.API"
    ASPNETCORE_URLS=http://127.0.0.1:8003 nohup dotnet run --no-build -c Debug >"$logs/supplier.log" 2>&1 &
    echo $! >"$logs/supplier.pid"
  )
  (
    cd "$BACKEND_DIR/src/Modules/Buyer/Buyer.API"
    ASPNETCORE_URLS=http://127.0.0.1:8004 nohup dotnet run --no-build -c Debug >"$logs/buyer.log" 2>&1 &
    echo $! >"$logs/buyer.pid"
  )
  (
    cd "$BACKEND_DIR/src/Modules/Operations/Operations.API"
    ASPNETCORE_URLS=http://127.0.0.1:8005 nohup dotnet run --no-build -c Debug >"$logs/operations.log" 2>&1 &
    echo $! >"$logs/operations.pid"
  )
  (
    cd "$BACKEND_DIR/src/ApiGateWay/OcelotGateway"
    ASPNETCORE_URLS=http://0.0.0.0:8000 nohup dotnet run --no-build -c Debug >"$logs/gateway.log" 2>&1 &
    echo $! >"$logs/gateway.pid"
  )

  log "Waiting for gateway on :8000"
  for i in $(seq 1 90); do
    if curl -sf http://127.0.0.1:8000/swagger/index.html >/dev/null 2>&1 || curl -sf http://127.0.0.1:8001/swagger/index.html >/dev/null 2>&1; then
      echo "Backend responding"
      break
    fi
    sleep 2
  done
}

seed_catalog() {
  log "Inserting dummy catalog / material master data"
  docker cp "$ROOT/dev-seeds/catalog-seed.sql" sila-mssql:/tmp/catalog-seed.sql
  docker exec sila-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SilaDev@Pass123' -C -i /tmp/catalog-seed.sql || {
    echo "Catalog seed returned non-zero (tables may not exist yet). Check buyer/supplier logs." >&2
  }
}

print_accounts() {
  cat <<'EOF'

Dummy portal accounts (password Test@123 unless noted):
  platform admin : NawazSharief@chervic.in / Nawaz@123
  buyer admin    : buyer.admin@sila.test / Test@123
  buyer user     : buyer.user@sila.test / Test@123
  outlet manager : outlet.manager@sila.test / Test@123
  supplier admin : supplier.admin@sila.test / Test@123
  supplier user  : supplier.user@sila.test / Test@123

sila-me cloud/mobile (password from SILA_DEV_PASSWORD, default SilaDev@123):
  admin@sila.cloud
  sriram@sila.cloud (store manager)
  amira@sila.cloud (inventory)

Endpoints:
  Portal host     https://localhost:6001
  API gateway     http://localhost:8000
  sila-cloud      http://localhost:5173
  sila-mobile     http://localhost:8081 (Expo web)

EOF
}

cmd="${1:-up}"
case "$cmd" in
  up)
    ensure_dbs
    ensure_backend
    build_backend
    start_backend
    # give migrations a moment
    sleep 8
    seed_catalog
    print_accounts
    ;;
  seed)
    seed_catalog
    ;;
  backend)
    ensure_dbs
    ensure_backend
    build_backend
    start_backend
    sleep 8
    seed_catalog
    print_accounts
    ;;
  stop)
    log "Stopping backend processes"
    logs="$ROOT/.run-logs"
    if [[ -d "$logs" ]]; then
      for f in "$logs"/*.pid; do
        [[ -f "$f" ]] || continue
        kill "$(cat "$f")" 2>/dev/null || true
      done
    fi
    (cd "$ROOT" && docker compose stop) || true
    ;;
  *)
    echo "Usage: $0 {up|backend|seed|stop}"
    exit 1
    ;;
esac
