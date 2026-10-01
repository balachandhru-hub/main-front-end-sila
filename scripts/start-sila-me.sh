#!/usr/bin/env bash
# Start sila-me (cloud admin + mobile store) against local Postgres + api-server
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ME="$ROOT/sila-me"
LOGS="$ROOT/.run-logs"
mkdir -p "$LOGS"

export DATABASE_URL="${DATABASE_URL:-postgresql://sila:sila@127.0.0.1:5432/sila}"
export SILA_DEV_PASSWORD="${SILA_DEV_PASSWORD:-SilaDev@123}"
export SESSION_SECRET="${SESSION_SECRET:-local-sila-dev-session-secret-change-me}"
export NODE_ENV=development

if [[ ! -d "$ME" ]]; then
  echo "sila-me folder missing" >&2
  exit 1
fi

cd "$ME"

if ! command -v pnpm >/dev/null; then
  npm install -g pnpm
fi

if [[ ! -d node_modules ]]; then
  echo "==> Installing sila-me dependencies"
  pnpm install --no-frozen-lockfile
fi

echo "==> Pushing DB schema"
DATABASE_URL="$DATABASE_URL" pnpm --filter @workspace/db run push

echo "==> Building api-server"
pnpm --filter @workspace/api-server run build

echo "==> Starting api-server on :5000"
PORT=5000 DATABASE_URL="$DATABASE_URL" SILA_DEV_PASSWORD="$SILA_DEV_PASSWORD" SESSION_SECRET="$SESSION_SECRET" \
  nohup pnpm --filter @workspace/api-server run start >"$LOGS/sila-api.log" 2>&1 &
echo $! >"$LOGS/sila-api.pid"

sleep 3

# Seed a mobile store-manager identity for Expo login (idempotent)
python3 - <<'PY'
import os, secrets, subprocess
from hashlib import pbkdf2_hmac
# Use node's scrypt via small script
password = os.environ.get("SILA_DEV_PASSWORD", "SilaDev@123")
hash_js = f"""
import {{ randomBytes, scryptSync }} from 'node:crypto';
const salt = randomBytes(16).toString('hex');
const digest = scryptSync({password!r}, salt, 64).toString('hex');
process.stdout.write(salt + ':' + digest);
"""
# write temp and run from lib/db for pg? just generate hash
import tempfile, pathlib
p = pathlib.Path('/tmp/sila_hash.mjs')
p.write_text(hash_js)
h = subprocess.check_output(['node', str(p)], text=True).strip()
sql = f"""
DO $$
DECLARE
  legacy_id int;
  cust_id int;
  role_id int;
  prop_id int;
  store_id int;
  mobile_id int;
BEGIN
  SELECT id INTO legacy_id FROM sila_user_accounts WHERE email='sriram@sila.cloud';
  SELECT id INTO cust_id FROM sila_customers ORDER BY id LIMIT 1;
  SELECT id INTO role_id FROM sila_roles WHERE code='STORE_MANAGER' LIMIT 1;
  SELECT id INTO prop_id FROM sila_properties ORDER BY id LIMIT 1;
  SELECT id INTO store_id FROM sila_stores ORDER BY id LIMIT 1;
  IF legacy_id IS NULL OR cust_id IS NULL THEN
    RAISE NOTICE 'Skipping mobile seed; base org/users not ready';
    RETURN;
  END IF;
  INSERT INTO sila_mobile_users (legacy_user_id, code, customer_id, email, display_name, password_hash, status, is_super_admin, must_change_password, failed_login_attempts, created_at, updated_at)
  SELECT legacy_id, 'SRIRAM001-MOBILE', cust_id, 'sriram@sila.cloud', 'Sriram Krishnan', '{h}', 'ACTIVE', false, false, 0, NOW(), NOW()
  WHERE NOT EXISTS (SELECT 1 FROM sila_mobile_users WHERE email='sriram@sila.cloud')
  RETURNING id INTO mobile_id;
  SELECT id INTO mobile_id FROM sila_mobile_users WHERE email='sriram@sila.cloud';
  IF mobile_id IS NOT NULL AND role_id IS NOT NULL THEN
    INSERT INTO sila_mobile_user_roles (mobile_user_id, role_id)
    SELECT mobile_id, role_id WHERE NOT EXISTS (
      SELECT 1 FROM sila_mobile_user_roles WHERE mobile_user_id=mobile_id AND role_id=role_id);
  END IF;
  IF mobile_id IS NOT NULL AND prop_id IS NOT NULL THEN
    INSERT INTO sila_mobile_user_property_access (mobile_user_id, property_id)
    SELECT mobile_id, prop_id WHERE NOT EXISTS (
      SELECT 1 FROM sila_mobile_user_property_access WHERE mobile_user_id=mobile_id AND property_id=prop_id);
  END IF;
  IF mobile_id IS NOT NULL AND store_id IS NOT NULL THEN
    INSERT INTO sila_mobile_user_store_access (mobile_user_id, store_id)
    SELECT mobile_id, store_id WHERE NOT EXISTS (
      SELECT 1 FROM sila_mobile_user_store_access WHERE mobile_user_id=mobile_id AND store_id=store_id);
  END IF;
END $$;
"""
subprocess.run(['docker','exec','-i','sila-postgres','psql','-U','sila','-d','sila'], input=sql, text=True, check=False)
print('mobile seed attempted')
PY

echo "==> Starting sila-cloud on :5173"
(cd artifacts/sila-cloud && PORT=5173 BASE_PATH=/ \
  nohup pnpm exec vite --config vite.config.ts --host 0.0.0.0 --port 5173 >"$LOGS/sila-cloud.log" 2>&1 &
  echo $! >"$LOGS/sila-cloud.pid")

echo "==> Starting sila-scanner (Expo web) on :8081"
(
  cd artifacts/sila-scanner
  EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5000/api \
  PORT=8081 CI=1 \
  nohup pnpm exec expo start --web --port 8081 >"$LOGS/sila-mobile.log" 2>&1 &
  echo $! >"$LOGS/sila-mobile.pid"
)

cat <<EOF
sila-me started
  API    http://localhost:5000
  Cloud  http://localhost:5173
  Mobile http://localhost:8081

Accounts (password ${SILA_DEV_PASSWORD}):
  Cloud  admin@sila.cloud
  Mobile sriram@sila.cloud
EOF
