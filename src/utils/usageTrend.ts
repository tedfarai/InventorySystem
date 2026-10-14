import { MovementLogEntry } from '../types';

export interface UsageTrend {
  historicalUsage: number;
  historicalReceipts: number;
  projectedUsage30Days: number;
  projectedNetUsage30Days: number;
  projectedStockAfter30Days: number;
  averageDailyUsage: number;
  periodDays: number;
  direction: 'rising' | 'falling' | 'stable';
}

interface DatedMovement {
  timestamp: number;
  usage: number;
  receipts: number;
}

const parseMovementDate = (timestamp: string): number | null => {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : null;
};

export function calculateUsageTrends(movementLogs: MovementLogEntry[]): Map<string, UsageTrend> {
  const totals = new Map<
    string,
    {
      usage: number;
      receipts: number;
      firstDate: number | null;
      lastDate: number | null;
      movements: DatedMovement[];
    }
  >();

  movementLogs.forEach((log) => {
    if (!log?.ItemID || !Number.isFinite(Number(log.Qty))) return;
    const entry = totals.get(log.ItemID) ?? {
      usage: 0,
      receipts: 0,
      firstDate: null,
      lastDate: null,
      movements: [],
    };
    const quantity = Number(log.Qty);
    let usage = 0;
    let receipts = 0;

    if (log.Type === 'ISSUE') {
      usage = Math.abs(quantity);
    } else if (log.Type === 'DELIVERY') {
      receipts = Math.abs(quantity);
    } else if (log.Type === 'ADJUSTMENT') {
      if (quantity < 0) usage = Math.abs(quantity);
      else receipts = quantity;
    }
    entry.usage += usage;
    entry.receipts += receipts;

    const timestamp = parseMovementDate(log.Timestamp);
    if (timestamp !== null) {
      entry.firstDate = entry.firstDate === null ? timestamp : Math.min(entry.firstDate, timestamp);
      entry.lastDate = entry.lastDate === null ? timestamp : Math.max(entry.lastDate, timestamp);
      entry.movements.push({ timestamp, usage, receipts });
    }
    totals.set(log.ItemID, entry);
  });

  const trends = new Map<string, UsageTrend>();
  totals.forEach((entry, itemId) => {
    const observedDays =
      entry.firstDate !== null && entry.lastDate !== null
        ? Math.max(1, (entry.lastDate - entry.firstDate) / 86_400_000 + 1)
        : 1;
    const periodDays = Math.max(30, observedDays);
    const averageDailyUsage = entry.usage / periodDays;
    const recentStart = entry.lastDate === null ? null : entry.lastDate - 30 * 86_400_000;
    const previousStart = entry.lastDate === null ? null : entry.lastDate - 60 * 86_400_000;
    let recentUsage = 0;
    let previousUsage = 0;
    let recentReceipts = 0;
    let recentMovementCount = 0;

    entry.movements.forEach((movement) => {
      if (recentStart === null || previousStart === null || entry.lastDate === null) return;
      if (movement.timestamp > recentStart && movement.timestamp <= entry.lastDate) {
        recentUsage += movement.usage;
        recentReceipts += movement.receipts;
        recentMovementCount++;
      } else if (movement.timestamp > previousStart && movement.timestamp <= recentStart) {
        previousUsage += movement.usage;
      }
    });

    const projectedUsage30Days = recentMovementCount > 0 ? recentUsage : averageDailyUsage * 30;
    const projectedNetUsage30Days =
      recentMovementCount > 0
        ? recentUsage - recentReceipts
        : ((entry.usage - entry.receipts) / periodDays) * 30;
    const direction =
      recentUsage > previousUsage * 1.1 && recentUsage > 0
        ? 'rising'
        : previousUsage > recentUsage * 1.1
        ? 'falling'
        : 'stable';

    trends.set(itemId, {
      historicalUsage: entry.usage,
      historicalReceipts: entry.receipts,
      projectedUsage30Days,
      projectedNetUsage30Days,
      projectedStockAfter30Days: -projectedNetUsage30Days,
      averageDailyUsage,
      periodDays,
      direction,
    });
  });

  return trends;
}
