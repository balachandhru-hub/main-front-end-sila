import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { LOCAL_DATABASE_NAME, migrateLocalDatabase } from './migrations';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function createLocalId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return `${prefix}_${randomUuid ?? `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`}`;
}

export async function getLocalDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (Platform.OS === 'web') {
    throw new Error('The SILA local database is available on native mobile platforms only.');
  }

  if (!databasePromise) {
    databasePromise = openAndMigrateDatabase().catch((error) => {
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

export async function initializeLocalDatabase(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await getLocalDatabase();
  return true;
}

export async function verifyLocalDatabaseFoundation(): Promise<{
  schemaVersion: number;
  tables: string[];
}> {
  const database = await getLocalDatabase();
  const migrations = await database.getAllAsync<{ version: number }>(
    'SELECT version FROM local_schema_migrations ORDER BY version DESC',
  );
  const tables = await database.getAllAsync<{ name: string }>(
    `SELECT name FROM sqlite_master
     WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
     ORDER BY name`,
  );
  const requiredTables = [
    'local_profile',
    'cached_mobile_config',
    'cached_materials',
    'cached_suppliers',
    'cached_stock_balances',
    'cached_purchase_orders',
    'draft_goods_receipts',
    'draft_inventory_counts',
    'draft_documents',
    'draft_invoices',
    'upload_queue',
    'sync_queue',
    'sync_state',
  ];
  const tableNames = tables.map((table) => table.name);
  const missingTables = requiredTables.filter((table) => !tableNames.includes(table));
  if (missingTables.length) {
    throw new Error(`Local database foundation is missing tables: ${missingTables.join(', ')}`);
  }
  return {
    schemaVersion: migrations[0]?.version ?? 0,
    tables: tableNames,
  };
}

async function openAndMigrateDatabase(): Promise<SQLite.SQLiteDatabase> {
  const database = await SQLite.openDatabaseAsync(LOCAL_DATABASE_NAME);
  await migrateLocalDatabase(database);
  return database;
}