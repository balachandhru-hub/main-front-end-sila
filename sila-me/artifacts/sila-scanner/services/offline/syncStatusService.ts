import { Platform } from 'react-native';
import { getConnectivity, type ConnectivitySnapshot } from './connectivityService';
import { getLocalDatabase } from '@/data/local/database';

export const SYNC_DOMAINS = ['MATERIALS', 'SUPPLIERS', 'STOCK', 'PO', 'CONFIG'] as const;
export type SyncDomain = (typeof SYNC_DOMAINS)[number];

export type SyncStatusSnapshot = {
  connectivity: ConnectivitySnapshot;
  lastSuccessfulSync: Partial<Record<SyncDomain, string | null>>;
  pendingDrafts: number;
  pendingUploads: number;
  failedItems: number;
};

const emptyStatus = (connectivity: ConnectivitySnapshot): SyncStatusSnapshot => ({
  connectivity,
  lastSuccessfulSync: {},
  pendingDrafts: 0,
  pendingUploads: 0,
  failedItems: 0,
});

export async function getSyncStatus(): Promise<SyncStatusSnapshot> {
  const connectivity = await getConnectivity();
  if (Platform.OS === 'web') return emptyStatus(connectivity);

  const db = await getLocalDatabase();
  const [drafts, uploads, failedUploads, failedSync, states] = await Promise.all([
    db.getFirstAsync<{ count: number }>(
      `SELECT
        (SELECT COUNT(*) FROM draft_goods_receipts WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_inventory_counts WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_stock_transfers WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_goods_issues WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_stock_exceptions WHERE status NOT IN ('SUBMITTED')) +
        (SELECT COUNT(*) FROM draft_documents WHERE upload_status NOT IN ('UPLOADED','CLEANED')) +
        (SELECT COUNT(*) FROM draft_invoices WHERE status NOT IN ('SUBMITTED')) AS count`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM upload_queue
       WHERE status IN ('PENDING','UPLOADING','FAILED')`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM upload_queue WHERE status = 'FAILED'`,
    ),
    db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM sync_queue WHERE status = 'FAILED'`,
    ),
    db.getAllAsync<{ domain: string; last_successful_sync: string | null }>(
      'SELECT domain, last_successful_sync FROM sync_state',
    ),
  ]);

  return {
    connectivity,
    lastSuccessfulSync: Object.fromEntries(
      states.map((state) => [state.domain, state.last_successful_sync]),
    ) as Partial<Record<SyncDomain, string | null>>,
    pendingDrafts: drafts?.count ?? 0,
    pendingUploads: uploads?.count ?? 0,
    failedItems: (failedUploads?.count ?? 0) + (failedSync?.count ?? 0),
  };
}