/**
 * Server-wins conflict reconciliation with a local merge-diff.
 *
 * The server remains authoritative for existing scalar values. Local-only
 * fields are retained, and concurrent text edits are made visible instead of
 * silently discarded.
 */

export interface ConflictDocument {
  id: string;
  content: unknown;
  version: number;
  updatedAt: string | number;
  client_id: string;
  [key: string]: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const timestamp = (value: string | number): number =>
  typeof value === 'number' ? value : Date.parse(value) || 0;

function mergeValue(server: unknown, local: unknown, resolvedAt: string): unknown {
  if (typeof server === 'string' && typeof local === 'string' && server !== local) {
    return `${server}\n\n=== CONFLICT RESOLUTION [${resolvedAt}] ===\n[Server Version]\n============\n${local}\n[Local Version]\n=== END ===`;
  }

  if (isRecord(server) && isRecord(local)) {
    const merged: Record<string, unknown> = { ...local };
    for (const key of new Set([...Object.keys(local), ...Object.keys(server)])) {
      merged[key] = key in server
        ? key in local
          ? mergeValue(server[key], local[key], resolvedAt)
          : server[key]
        : local[key];
    }
    return merged;
  }

  if (Array.isArray(server) || Array.isArray(local)) {
    return server;
  }

  return server;
}

export class ServerConflictResolutionEngine {
  static resolveConflict<T extends ConflictDocument>(localDoc: T, serverDoc: T): T {
    const resolvedAt = new Date().toISOString();
    const localIsNewerSameVersion =
      localDoc.version === serverDoc.version &&
      timestamp(localDoc.updatedAt) > timestamp(serverDoc.updatedAt);

    const content = localIsNewerSameVersion
      ? localDoc.content
      : mergeValue(serverDoc.content, localDoc.content, resolvedAt);

    return {
      ...serverDoc,
      content,
      version: Math.max(localDoc.version, serverDoc.version) + 1,
      updatedAt: resolvedAt,
      client_id: localDoc.client_id,
    };
  }
}

export const resolveConflict = <T extends ConflictDocument>(localDoc: T, serverDoc: T): T =>
  ServerConflictResolutionEngine.resolveConflict(localDoc, serverDoc);
