import React from 'react';
import { Activity, TrendingDown, TrendingUp } from 'lucide-react';
import { useStockUsageTrend } from '../../context/UsageTrendContext';
import { StockItem } from '../../types';

export const UsageTrendIndicator: React.FC<{
  item: Pick<StockItem, 'ItemID' | 'Qty' | 'Unit'>;
  compact?: boolean;
}> = ({ item, compact = false }) => {
  const trend = useStockUsageTrend(item);
  const isHighUsage = trend.direction === 'rising';
  const netUsage = Math.round(trend.projectedNetUsage30Days * 10) / 10;
  const projectedUsage = Math.round(trend.projectedUsage30Days * 10) / 10;
  const projectedStock = Math.round(trend.projectedStockAfter30Days * 10) / 10;
  const Icon = trend.direction === 'rising' ? TrendingUp : trend.direction === 'falling' ? TrendingDown : Activity;
  const tone =
    trend.direction === 'rising'
      ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
      : trend.direction === 'falling'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
      : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md ${tone} ${
        compact ? 'px-1 py-0.5 text-[9px]' : 'px-1.5 py-1 text-[10px]'
      } font-semibold whitespace-nowrap`}
      title={`Full-history trend: ${trend.direction} usage. Estimated ${projectedUsage} ${item.Unit} usage and ${netUsage} ${item.Unit} net stock depletion per 30 days; projected balance ${projectedStock} ${item.Unit}.`}
      aria-label={`${trend.direction} usage trend; ${projectedUsage} ${item.Unit} estimated usage per 30 days; projected balance ${projectedStock} ${item.Unit}`}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} aria-hidden="true" />
      <span>30d {projectedUsage} {compact ? '' : item.Unit}</span>
    </span>
  );
};
