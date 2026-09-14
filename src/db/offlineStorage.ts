/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — PWA OFFLINE INDEXEDDB PERSISTENCE ADAPTER
 * High-performance browser-native persistence replacing external server dependencies.
 * Supports zero-data-loss transactions, mutation queue with Background Sync,
 * LWW conflict resolution, and JSON / SQLite binary backups.
 * ===============================================================================
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  StockItem,
  MovementLogEntry,
  AdminUser,
  Department,
  Manager,
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
  StockAdjustmentRequest,
  BackupSnapshot,
  OfflineMutation,
} from '../types';
import {
  DEFAULT_MASTER_STOCK,
  DEFAULT_ADMINS,
  DEFAULT_DEPARTMENTS,
  DEFAULT_MANAGERS,
  DEFAULT_LOGS,
  DEFAULT_ADJUSTMENT_REQUESTS,
  DEFAULT_BACKUPS_SEEDS,
} from './defaultSeeds';
import { getLocalClientId } from './crdtLwwEngine';
import type { SyncDocument } from './backgroundSync';

export interface ProcureSimDB extends DBSchema {
  master_stock: { key: string; value: StockItem };
  movement_logs: { key: string; value: MovementLogEntry };
  admin_users: { key: string; value: AdminUser };
  departments: { key: string; value: Department };
  managers: { key: string; value: Manager };
  issued_documents: { key: string; value: IssuedDocument };
  received_documents: { key: string; value: ReceivedDocument };
  adjustment_documents: { key: string; value: AdjustmentDocument };
  adjustment_requests: { key: string; value: StockAdjustmentRequest };
  backups: { key: string; value: BackupSnapshot };
  mutation_queue: { key: string; value: OfflineMutation };
  large_documents: { key: string; value: SyncDocument };
  sync_queue: { key: string; value: SyncDocument & { sync_id: string } };
  settings: { key: string; value: { key: string; value: any } };
}

const DB_NAME = 'ProcureSim_Offline_DB_v3';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<ProcureSimDB>> | null = null;

export function getOfflineDB(): Promise<IDBPDatabase<ProcureSimDB>> {
  if (!dbPromise) {
    dbPromise = openDB<ProcureSimDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('master_stock')) {
          db.createObjectStore('master_stock', { keyPath: 'ItemID' });
        }
        if (!db.objectStoreNames.contains('movement_logs')) {
          db.createObjectStore('movement_logs', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('admin_users')) {
          db.createObjectStore('admin_users', { keyPath: 'IssuerID' });
        }
        if (!db.objectStoreNames.contains('departments')) {
          db.createObjectStore('departments', { keyPath: 'DeptID' });
        }
        if (!db.objectStoreNames.contains('managers')) {
          db.createObjectStore('managers', { keyPath: 'ManagerID' });
        }
        if (!db.objectStoreNames.contains('issued_documents')) {
          db.createObjectStore('issued_documents', { keyPath: 'slipNumber' });
        }
        if (!db.objectStoreNames.contains('received_documents')) {
          db.createObjectStore('received_documents', { keyPath: 'voucherNumber' });
        }
        if (!db.objectStoreNames.contains('adjustment_documents')) {
          db.createObjectStore('adjustment_documents', { keyPath: 'voucherNumber' });
        }
        if (!db.objectStoreNames.contains('adjustment_requests')) {
          db.createObjectStore('adjustment_requests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('mutation_queue')) {
          db.createObjectStore('mutation_queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('large_documents')) {
          db.createObjectStore('large_documents', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          db.createObjectStore('sync_queue', { keyPath: 'sync_id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export interface FullProcurementPayload {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  admins: AdminUser[];
  departments: Department[];
  managers: Manager[];
  issuedDocs: IssuedDocument[];
  receivedDocs: ReceivedDocument[];
  adjustmentDocs: AdjustmentDocument[];
  adjustmentRequests: StockAdjustmentRequest[];
  backups: BackupSnapshot[];
  pendingMutations?: OfflineMutation[];
  exportedAt?: string;
  version?: string;
}

/**
 * Loads the full state from IndexedDB. If empty, seeds with default dataset.
 */
export async function loadInitialFromIndexedDB(): Promise<FullProcurementPayload> {
  try {
    const db = await getOfflineDB();
    const stockCount = await db.count('master_stock');

    if (stockCount === 0) {
      await seedInitialDataset(db);
    }

    const [
      stockItems,
      movementLogs,
      admins,
      departments,
      managers,
      issuedDocs,
      receivedDocs,
      adjustmentDocs,
      adjustmentRequests,
      backups,
      pendingMutations,
    ] = await Promise.all([
      db.getAll('master_stock'),
      db.getAll('movement_logs'),
      db.getAll('admin_users'),
      db.getAll('departments'),
      db.getAll('managers'),
      db.getAll('issued_documents'),
      db.getAll('received_documents'),
      db.getAll('adjustment_documents'),
      db.getAll('adjustment_requests'),
      db.getAll('backups'),
      db.getAll('mutation_queue'),
    ]);

    return {
      stockItems: stockItems || [],
      movementLogs: movementLogs || [],
      admins: admins || [],
      departments: departments || [],
      managers: managers || [],
      issuedDocs: issuedDocs || [],
      receivedDocs: receivedDocs || [],
      adjustmentDocs: adjustmentDocs || [],
      adjustmentRequests: adjustmentRequests || [],
      backups: backups || [],
      pendingMutations: pendingMutations || [],
    };
  } catch (err) {
    console.warn('[OfflineStorage] IndexedDB read fallback to memory seeds:', err);
    return {
      stockItems: DEFAULT_MASTER_STOCK,
      movementLogs: DEFAULT_LOGS,
      admins: DEFAULT_ADMINS,
      departments: DEFAULT_DEPARTMENTS,
      managers: DEFAULT_MANAGERS,
      issuedDocs: [],
      receivedDocs: [],
      adjustmentDocs: [],
      adjustmentRequests: DEFAULT_ADJUSTMENT_REQUESTS,
      backups: DEFAULT_BACKUPS_SEEDS,
      pendingMutations: [],
    };
  }
}

async function seedInitialDataset(db: IDBPDatabase<ProcureSimDB>): Promise<void> {
  const tx = db.transaction(
    [
      'master_stock',
      'movement_logs',
      'admin_users',
      'departments',
      'managers',
      'adjustment_requests',
      'backups',
    ],
    'readwrite'
  );

  const clientId = getLocalClientId();
  const now = new Date().toISOString();

  for (const item of DEFAULT_MASTER_STOCK) {
    await tx.objectStore('master_stock').put({
      ...item,
      UnitPrice: item.Category === 'Stationery' ? 4.5 : 12.0,
      Location: item.Category === 'Stationery' ? 'Aisle A-01' : 'Aisle B-03',
      UpdatedAt: now,
      Version: 1,
      ClientId: clientId,
    });
  }
  for (const log of DEFAULT_LOGS) {
    await tx.objectStore('movement_logs').put({ ...log, UpdatedAt: now, ClientId: clientId });
  }
  for (const adm of DEFAULT_ADMINS) {
    await tx.objectStore('admin_users').put(adm);
  }
  for (const dept of DEFAULT_DEPARTMENTS) {
    await tx.objectStore('departments').put(dept);
  }
  for (const mgr of DEFAULT_MANAGERS) {
    await tx.objectStore('managers').put(mgr);
  }
  for (const req of DEFAULT_ADJUSTMENT_REQUESTS) {
    await tx.objectStore('adjustment_requests').put(req);
  }
  for (const bkp of DEFAULT_BACKUPS_SEEDS) {
    await tx.objectStore('backups').put(bkp);
  }

  await tx.done;
}

/**
 * Saves complete synchronized application state into IndexedDB atomically
 */
export async function syncAllToIndexedDB(payload: FullProcurementPayload): Promise<void> {
  try {
    const db = await getOfflineDB();
    const storeNames = [
      'master_stock',
      'movement_logs',
      'admin_users',
      'departments',
      'managers',
      'issued_documents',
      'received_documents',
      'adjustment_documents',
      'adjustment_requests',
      'backups',
    ] as const;

    const tx = db.transaction(storeNames as any, 'readwrite');

    if (payload.stockItems) {
      const store = tx.objectStore('master_stock');
      await store.clear();
      for (const item of payload.stockItems) await store.put(item);
    }
    if (payload.movementLogs) {
      const store = tx.objectStore('movement_logs');
      await store.clear();
      for (const log of payload.movementLogs) await store.put(log);
    }
    if (payload.admins) {
      const store = tx.objectStore('admin_users');
      await store.clear();
      for (const adm of payload.admins) await store.put(adm);
    }
    if (payload.departments) {
      const store = tx.objectStore('departments');
      await store.clear();
      for (const dept of payload.departments) await store.put(dept);
    }
    if (payload.managers) {
      const store = tx.objectStore('managers');
      await store.clear();
      for (const mgr of payload.managers) await store.put(mgr);
    }
    if (payload.issuedDocs) {
      const store = tx.objectStore('issued_documents');
      await store.clear();
      for (const doc of payload.issuedDocs) await store.put(doc);
    }
    if (payload.receivedDocs) {
      const store = tx.objectStore('received_documents');
      await store.clear();
      for (const doc of payload.receivedDocs) await store.put(doc);
    }
    if (payload.adjustmentDocs) {
      const store = tx.objectStore('adjustment_documents');
      await store.clear();
      for (const doc of payload.adjustmentDocs) await store.put(doc);
    }
    if (payload.adjustmentRequests) {
      const store = tx.objectStore('adjustment_requests');
      await store.clear();
      for (const req of payload.adjustmentRequests) await store.put(req);
    }
    if (payload.backups) {
      const store = tx.objectStore('backups');
      await store.clear();
      for (const bkp of payload.backups) await store.put(bkp);
    }

    await tx.done;
  } catch (err) {
    console.error('[OfflineStorage] Error syncing to IndexedDB:', err);
  }
}

// =============================================================================
// OFFLINE MUTATION QUEUE & PWA BACKGROUND SYNC MANAGEMENT
// =============================================================================

/**
 * Adds an offline mutation to IndexedDB and triggers PWA Background Sync registration
 */
export async function enqueueOfflineMutation(mutation: OfflineMutation): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.put('mutation_queue', mutation);

    // Register PWA Background Sync tag if supported by browser
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('sync' in registration) {
          await (registration as any).sync.register('sync-documents');
        }
      } catch (syncErr) {
        // Tolerant if background sync not permitted
      }
    }
  } catch (err) {
    console.error('[OfflineStorage] Failed to enqueue mutation:', err);
  }
}

export async function putSyncDocument(document: SyncDocument & { sync_id: string }): Promise<void> {
  const db = await getOfflineDB();
  await db.put('sync_queue', document);
}

export async function enqueueSyncDocument(document: SyncDocument): Promise<string> {
  const db = await getOfflineDB();
  const syncDocument = { ...document, sync_id: crypto.randomUUID() };
  const tx = db.transaction(['large_documents', 'sync_queue'], 'readwrite');
  await tx.objectStore('large_documents').put(document);
  await tx.objectStore('sync_queue').put(syncDocument);
  await tx.done;
  return syncDocument.sync_id;
}

export async function getPendingSyncDocuments(): Promise<Array<SyncDocument & { sync_id: string }>> {
  const db = await getOfflineDB();
  return (await db.getAll('sync_queue')).sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
  );
}

export async function removeSyncDocument(syncId: string): Promise<void> {
  const db = await getOfflineDB();
  await db.delete('sync_queue', syncId);
}

/**
 * Retrieves all pending offline mutations
 */
export async function getPendingMutations(): Promise<OfflineMutation[]> {
  try {
    const db = await getOfflineDB();
    const all = await db.getAll('mutation_queue');
    return all.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    return [];
  }
}

/**
 * Removes or marks resolved a processed mutation from the queue
 */
export async function removeMutationFromQueue(mutationId: string): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.delete('mutation_queue', mutationId);
  } catch (err) {
    console.warn('[OfflineStorage] Error deleting mutation:', err);
  }
}

/**
 * Clears entire mutation queue after successful drain
 */
export async function clearAllMutations(): Promise<void> {
  try {
    const db = await getOfflineDB();
    await db.clear('mutation_queue');
  } catch (err) {
    console.warn('[OfflineStorage] Error clearing mutation queue:', err);
  }
}

/**
 * Serializes all IndexedDB stores to clean JSON
 */
export async function exportAllDataToJSON(): Promise<string> {
  const db = await getOfflineDB();
  const exportData: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    version: 'PWA_v3.0_OFFLINE_LWW',
    master_stock: await db.getAll('master_stock'),
    movement_logs: await db.getAll('movement_logs'),
    admin_users: await db.getAll('admin_users'),
    departments: await db.getAll('departments'),
    managers: await db.getAll('managers'),
    issued_documents: await db.getAll('issued_documents'),
    received_documents: await db.getAll('received_documents'),
    adjustment_documents: await db.getAll('adjustment_documents'),
    adjustment_requests: await db.getAll('adjustment_requests'),
    backups: await db.getAll('backups'),
  };
  return JSON.stringify(exportData, null, 2);
}

/**
 * Restores all stores from JSON string
 */
export async function importAllDataFromJSON(jsonString: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonString);
    const db = await getOfflineDB();
    const storeMap: Record<string, keyof ProcureSimDB> = {
      master_stock: 'master_stock',
      stockItems: 'master_stock',
      movement_logs: 'movement_logs',
      movementLogs: 'movement_logs',
      admin_users: 'admin_users',
      admins: 'admin_users',
      departments: 'departments',
      managers: 'managers',
      issued_documents: 'issued_documents',
      issuedDocs: 'issued_documents',
      received_documents: 'received_documents',
      receivedDocs: 'received_documents',
      adjustment_documents: 'adjustment_documents',
      adjustmentDocs: 'adjustment_documents',
      adjustment_requests: 'adjustment_requests',
      adjustmentRequests: 'adjustment_requests',
      backups: 'backups',
    };

    const storeNames = [
      'master_stock',
      'movement_logs',
      'admin_users',
      'departments',
      'managers',
      'issued_documents',
      'received_documents',
      'adjustment_documents',
      'adjustment_requests',
      'backups',
    ] as const;

    const tx = db.transaction(storeNames as any, 'readwrite');

    for (const [key, targetStore] of Object.entries(storeMap)) {
      if (Array.isArray(data[key])) {
        const store = tx.objectStore(targetStore as any);
        await store.clear();
        for (const item of data[key]) {
          await store.put(item);
        }
      }
    }

    await tx.done;
    return true;
  } catch (err) {
    console.error('[OfflineStorage] Import JSON failed:', err);
    return false;
  }
}

/**
 * Complete database reset to defaults
 */
export async function resetOfflineDB(): Promise<void> {
  const db = await getOfflineDB();
  const storeNames = [
    'master_stock',
    'movement_logs',
    'admin_users',
    'departments',
    'managers',
    'issued_documents',
    'received_documents',
    'adjustment_documents',
    'adjustment_requests',
    'backups',
    'mutation_queue',
  ] as const;

  const tx = db.transaction(storeNames as any, 'readwrite');
  for (const s of storeNames) {
    await tx.objectStore(s as any).clear();
  }
  await tx.done;

  await seedInitialDataset(db);
}
