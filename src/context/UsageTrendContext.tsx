import React, { createContext, useContext, useMemo } from 'react';
import { MovementLogEntry, StockItem } from '../types';
import { calculateUsageTrends, UsageTrend } from '../utils/usageTrend';

interface UsageTrendContextValue {
  getUsageTrend: (itemId: string, currentStock: number) => UsageTrend;
}

const EMPTY_TREND: UsageTrend = {
  historicalUsage: 0,
  historicalReceipts: 0,
  projectedUsage30Days: 0,
  projectedNetUsage30Days: 0,
  projectedStockAfter30Days: 0,
  averageDailyUsage: 0,
  periodDays: 30,
  direction: 'stable',
};

const UsageTrendContext = createContext<UsageTrendContextValue>({
  getUsageTrend: (_itemId, currentStock) => ({
    ...EMPTY_TREND,
    projectedStockAfter30Days: currentStock,
  }),
});

export const UsageTrendProvider: React.FC<{
  movementLogs: MovementLogEntry[];
  children: React.ReactNode;
}> = ({ movementLogs, children }) => {
  const trends = useMemo(
    () => calculateUsageTrends(Array.isArray(movementLogs) ? movementLogs : []),
    [movementLogs]
  );

  const value = useMemo<UsageTrendContextValue>(
    () => ({
      getUsageTrend: (itemId, currentStock) => {
        const trend = trends.get(itemId) ?? EMPTY_TREND;
        return {
          ...trend,
          projectedStockAfter30Days: Math.max(0, currentStock - trend.projectedNetUsage30Days),
        };
      },
    }),
    [trends]
  );

  return <UsageTrendContext.Provider value={value}>{children}</UsageTrendContext.Provider>;
};

export function useStockUsageTrend(item: Pick<StockItem, 'ItemID' | 'Qty'>): UsageTrend {
  return useContext(UsageTrendContext).getUsageTrend(item.ItemID, Number(item.Qty) || 0);
}
