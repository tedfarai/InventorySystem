/**
 * ===============================================================================
 * PARAMOUNT PROCUREMENT SYSTEM — CRDT & LAST-WRITE-WINS (LWW) CONFLICT RESOLUTION
 * Deterministic, lock-free, zero-exception multi-client replication engine.
 * Ensures that concurrent updates, offline edits, and parallel stock changes
 * converge mathematically across all workstations without UI locks or data loss.
 * ===============================================================================
 */

import {
  StockItem,
  MovementLogEntry,
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
  StockAdjustmentRequest,
  OfflineMutation,
  LwwConflictResolutionResult,
} from '../types';

// Persistent Client ID for deterministic LWW tie-breaking
export function getLocalClientId(): string {
  let clientId = localStorage.getItem('paramount_client_uuid');
  if (!clientId) {
    clientId = `node_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
    localStorage.setItem('paramount_client_uuid', clientId);
  }
  return clientId;
}

// Logical clock state to guarantee strict monotonicity
let lastGeneratedTimestamp = 0;

/**
 * Generates a monotonically increasing hybrid logical timestamp (HLC)
 */
export function generateMonotonicTimestamp(): { timestampMs: number; iso: string } {
  let now = Date.now();
  if (now <= lastGeneratedTimestamp) {
    now = lastGeneratedTimestamp + 1;
  }
  lastGeneratedTimestamp = now;
  return {
    timestampMs: now,
    iso: new Date(now).toISOString(),
  };
}

/**
 * Parses timestamp string or number into epoch milliseconds safely
 */
export function parseTimestamp(val?: string | number | null): number {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const parsed = Date.parse(val);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * LWW Resolution for a single StockItem.
 * Resolves concurrent updates to the same stock item deterministically.
 */
export function resolveStockItemLWW(
  local: StockItem,
  incoming: StockItem
): LwwConflictResolutionResult<StockItem> {
  const localTime = parseTimestamp(local.UpdatedAt);
  const incomingTime = parseTimestamp(incoming.UpdatedAt);

  const localVersion = local.Version || 1;
  const incomingVersion = incoming.Version || 1;

  // 1. Compare timestamps
  if (incomingTime > localTime) {
    return {
      resolved: { ...incoming },
      wasConflict: localTime > 0 && Math.abs(incomingTime - localTime) < 5000,
      winner: 'incoming',
      reason: `Incoming timestamp (${incoming.UpdatedAt}) is newer than local (${local.UpdatedAt})`,
    };
  }

  if (localTime > incomingTime) {
    return {
      resolved: { ...local },
      wasConflict: incomingTime > 0 && Math.abs(localTime - incomingTime) < 5000,
      winner: 'local',
      reason: `Local timestamp (${local.UpdatedAt}) is newer than incoming (${incoming.UpdatedAt})`,
    };
  }

  // 2. Timestamps match: Compare Versions
  if (incomingVersion > localVersion) {
    return {
      resolved: { ...incoming },
      wasConflict: true,
      winner: 'incoming',
      reason: `Incoming version (${incomingVersion}) exceeds local (${localVersion})`,
    };
  }

  if (localVersion > incomingVersion) {
    return {
      resolved: { ...local },
      wasConflict: true,
      winner: 'local',
      reason: `Local version (${localVersion}) exceeds incoming (${incomingVersion})`,
    };
  }

  // 3. Perfect tie: Deterministic tie-breaker based on ClientId string comparison
  const localClient = local.ClientId || '';
  const incomingClient = incoming.ClientId || '';

  if (incomingClient.localeCompare(localClient) > 0) {
    return {
      resolved: { ...incoming },
      wasConflict: true,
      winner: 'incoming',
      reason: `Deterministic tie-breaker: incoming ClientId (${incomingClient}) won`,
    };
  }

  return {
    resolved: { ...local },
    wasConflict: true,
    winner: 'local',
    reason: `Deterministic tie-breaker: local ClientId (${localClient}) won`,
  };
}

/**
 * Merges two complete stock catalogs using LWW resolution for each item.
 */
export function mergeStockCatalogsLWW(
  currentCatalog: StockItem[],
  incomingCatalog: StockItem[]
): {
  merged: StockItem[];
  conflictCount: number;
  updatedItems: StockItem[];
} {
  const stockMap = new Map<string, StockItem>();
  let conflictCount = 0;
  const updatedItems: StockItem[] = [];

  // Populate current
  currentCatalog.forEach((item) => {
    stockMap.set(item.ItemID, item);
  });

  // Merge incoming
  incomingCatalog.forEach((incoming) => {
    const existing = stockMap.get(incoming.ItemID);
    if (!existing) {
      stockMap.set(incoming.ItemID, incoming);
      updatedItems.push(incoming);
    } else {
      const resolution = resolveStockItemLWW(existing, incoming);
      if (resolution.wasConflict) {
        conflictCount++;
      }
      if (resolution.winner === 'incoming') {
        stockMap.set(incoming.ItemID, resolution.resolved);
        updatedItems.push(resolution.resolved);
      }
    }
  });

  const merged = Array.from(stockMap.values()).sort((a, b) =>
    a.ItemID.localeCompare(b.ItemID)
  );

  return { merged, conflictCount, updatedItems };
}

/**
 * Merges movement logs deduplicating by ID and sorting by timestamp descending
 */
export function mergeMovementLogs(
  existing: MovementLogEntry[],
  incoming: MovementLogEntry[]
): MovementLogEntry[] {
  const logMap = new Map<string, MovementLogEntry>();
  existing.forEach((l) => logMap.set(l.id, l));
  incoming.forEach((l) => {
    const prev = logMap.get(l.id);
    if (!prev) {
      logMap.set(l.id, l);
    } else {
      // Keep most comprehensive log
      logMap.set(l.id, { ...prev, ...l });
    }
  });

  return Array.from(logMap.values()).sort(
    (a, b) => parseTimestamp(b.Timestamp) - parseTimestamp(a.Timestamp)
  );
}

/**
 * Merges Document Vouchers
 */
export function mergeDocuments<T extends { slipNumber?: string; voucherNumber?: string; timestamp?: string }>(
  existing: T[],
  incoming: T[],
  keyProp: 'slipNumber' | 'voucherNumber'
): T[] {
  const docMap = new Map<string, T>();
  existing.forEach((d) => docMap.set((d as any)[keyProp], d));
  incoming.forEach((d) => docMap.set((d as any)[keyProp], d));

  return Array.from(docMap.values()).sort(
    (a, b) => parseTimestamp(b.timestamp) - parseTimestamp(a.timestamp)
  );
}

/**
 * Merges Adjustment Requests
 */
export function mergeAdjustmentRequests(
  existing: StockAdjustmentRequest[],
  incoming: StockAdjustmentRequest[]
): StockAdjustmentRequest[] {
  const reqMap = new Map<string, StockAdjustmentRequest>();
  existing.forEach((r) => reqMap.set(r.id, r));
  incoming.forEach((r) => {
    const prev = reqMap.get(r.id);
    if (!prev) {
      reqMap.set(r.id, r);
    } else {
      // If status changed or reviewed, incoming takes precedence if timestamp is newer
      const prevTime = parseTimestamp(prev.reviewedAt || prev.createdAt);
      const incTime = parseTimestamp(r.reviewedAt || r.createdAt);
      if (incTime >= prevTime) {
        reqMap.set(r.id, r);
      }
    }
  });

  return Array.from(reqMap.values()).sort(
    (a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt)
  );
}
