import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import {
  BarChart2,
  CalendarDays,
  Flame,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { ItemCategory, MovementLogEntry, StockItem } from '../../types';
import { useTheme } from '../../hooks/useTheme';

type MovementScope = 'ALL' | 'ISSUE' | 'DELIVERY';
type CategorySelection = 'ALL' | ItemCategory;

export interface HighDemandItemStat {
  itemId: string;
  itemName: string;
  category: ItemCategory;
  unit: string;
  currentQty: number;
  reorderLevel: number;
  movementCount: number;
  issueCount: number;
  deliveryCount: number;
  adjustmentCount: number;
  unitsMoved: number;
  demandUnits: number;
  lastMovedLabel: string;
  stockItem?: StockItem;
}

export interface CategoryFrequencyDatum {
  category: ItemCategory;
  totalFrequency: number;
  issueFrequency: number;
  deliveryFrequency: number;
  adjustmentFrequency: number;
  unitsMoved: number;
  uniqueSkus: number;
  sharePercent: number;
  topItemName: string;
  topItemCount: number;
}

interface CategoryMovementFrequencyChartProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  onSelectItemForReorder?: (item: StockItem) => void;
}

const CATEGORIES: ItemCategory[] = ['Stationery', 'Cleaning', 'General'];

function parseLogTimestamp(timestamp: string | undefined): { dateMs: number; dateLabel: string } | null {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const trimmed = timestamp.trim();
  if (!trimmed) return null;

  const isoCandidate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? trimmed.replace(' ', 'T')
    : trimmed;

  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    const prefix = trimmed.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) {
      const fallback = new Date(`${prefix}T12:00:00`);
      if (!Number.isNaN(fallback.getTime())) {
        return {
          dateMs: fallback.getTime(),
          dateLabel: fallback.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      }
    }
    return null;
  }

  return {
    dateMs: parsed.getTime(),
    dateLabel: parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  };
}

function resolveCategory(log: MovementLogEntry, itemCategoryMap: Map<string, ItemCategory>): ItemCategory {
  const mapped = itemCategoryMap.get(log.ItemID);
  if (mapped === 'Stationery' || mapped === 'Cleaning' || mapped === 'General') {
    return mapped;
  }
  const id = (log.ItemID || '').toUpperCase();
  if (id.startsWith('ST-')) return 'Stationery';
  if (id.startsWith('CL-')) return 'Cleaning';
  return 'General';
}

interface CustomFrequencyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: CategoryFrequencyDatum }>;
  scope: MovementScope;
  isDark: boolean;
}

const CustomFrequencyTooltip: React.FC<CustomFrequencyTooltipProps> = ({
  active,
  payload,
  scope,
  isDark,
}) => {
  if (!active || !payload || !payload.length) return null;
  const datum = payload[0]?.payload;
  if (!datum) return null;

  return (
    <div
      className={`rounded-xl shadow-2xl p-3.5 min-w-[230px] max-w-[290px] pointer-events-none border ${
        isDark
          ? 'bg-slate-950/95 text-slate-100 border-slate-700'
          : 'bg-white/98 text-slate-900 border-slate-200 ring-1 ring-slate-900/5'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 pb-2 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <span className="text-xs font-bold">{datum.category} Category</span>
        <span className="text-[11px] font-mono tabular-nums font-bold text-teal-600 dark:text-teal-400">
          {datum.sharePercent}% share
        </span>
      </div>

      <div className="space-y-1.5 pt-2 text-xs tabular-nums">
        <div className="flex items-center justify-between">
          <span className="text-slate-500 dark:text-slate-400">
            {scope === 'ALL' ? 'Total Movements' : scope === 'ISSUE' ? 'Issue Requests' : 'Stock Receipts'}
          </span>
          <span className="font-mono font-bold">
            {datum.totalFrequency.toLocaleString()} events
          </span>
        </div>

        {scope === 'ALL' && (
          <>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-amber-600 dark:text-amber-400">Issues (Demand)</span>
              <span className="font-mono font-semibold">{datum.issueFrequency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-emerald-600 dark:text-emerald-400">Deliveries (Receipts)</span>
              <span className="font-mono font-semibold">{datum.deliveryFrequency}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-violet-600 dark:text-violet-400">Count Adjustments</span>
              <span className="font-mono font-semibold">{datum.adjustmentFrequency}</span>
            </div>
          </>
        )}

        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200 dark:border-slate-800">
          <span className="text-slate-500 dark:text-slate-400">Distinct SKUs Moved</span>
          <span className="font-mono font-semibold">{datum.uniqueSkus} SKUs</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 dark:text-slate-400">Units Transacted</span>
          <span className="font-mono font-semibold">{datum.unitsMoved.toLocaleString()} u</span>
        </div>
        {datum.topItemCount > 0 && (
          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 text-[11px]">
            <div className="text-slate-500 dark:text-slate-400">Top High-Demand SKU</div>
            <div className="font-semibold truncate mt-0.5">
              {datum.topItemName} ({datum.topItemCount}x)
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const CategoryMovementFrequencyChart: React.FC<CategoryMovementFrequencyChartProps> = ({
  stockItems = [],
  movementLogs = [],
  onSelectItemForReorder,
}) => {
  const { isDark, palette } = useTheme();
  const [scope, setScope] = useState<MovementScope>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<CategorySelection>('ALL');
  const [windowAnchor, setWindowAnchor] = useState<'auto' | 'today'>('auto');

  const {
    categorySeries,
    highDemandItems,
    totalEvents,
    totalDistinctSkus,
    topCategory,
    rangeLabel,
    usesLatestActivityAnchor,
  } = useMemo(() => {
    const safeStock = Array.isArray(stockItems) ? stockItems : [];
    const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];

    const stockById = new Map<string, StockItem>();
    const itemCategoryMap = new Map<string, ItemCategory>();
    for (const item of safeStock) {
      if (item?.ItemID) {
        stockById.set(item.ItemID, item);
        if (item.Category) itemCategoryMap.set(item.ItemID, item.Category);
      }
    }

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const calendarStartMs = todayEnd.getTime() - 29 * 86_400_000;

    let maxLogDateMs: number | null = null;
    let hasCalendar30dLogs = false;

    const parsedLogs: Array<{
      log: MovementLogEntry;
      dateMs: number;
      dateLabel: string;
      category: ItemCategory;
    }> = [];

    for (const log of safeLogs) {
      if (!log) continue;
      const parsed = parseLogTimestamp(log.Timestamp);
      if (!parsed) continue;
      if (maxLogDateMs === null || parsed.dateMs > maxLogDateMs) {
        maxLogDateMs = parsed.dateMs;
      }
      if (parsed.dateMs >= calendarStartMs && parsed.dateMs <= todayEnd.getTime()) {
        hasCalendar30dLogs = true;
      }
      parsedLogs.push({
        log,
        dateMs: parsed.dateMs,
        dateLabel: parsed.dateLabel,
        category: resolveCategory(log, itemCategoryMap),
      });
    }

    const shouldAnchorLatest =
      windowAnchor === 'auto' && !hasCalendar30dLogs && maxLogDateMs !== null;

    const endMs = shouldAnchorLatest && maxLogDateMs !== null ? maxLogDateMs : todayEnd.getTime();
    const endDate = new Date(endMs);
    endDate.setHours(23, 59, 59, 999);
    const startDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 29);

    const startMs = startDate.getTime();
    const finalEndMs = endDate.getTime();

    const rangeText = `${startDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })} – ${endDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })}`;

    const catAgg: Record<
      ItemCategory,
      {
        total: number;
        issue: number;
        delivery: number;
        adjustment: number;
        unitsMoved: number;
        skuSet: Set<string>;
      }
    > = {
      Stationery: { total: 0, issue: 0, delivery: 0, adjustment: 0, unitsMoved: 0, skuSet: new Set() },
      Cleaning: { total: 0, issue: 0, delivery: 0, adjustment: 0, unitsMoved: 0, skuSet: new Set() },
      General: { total: 0, issue: 0, delivery: 0, adjustment: 0, unitsMoved: 0, skuSet: new Set() },
    };

    const itemStatsMap = new Map<string, HighDemandItemStat & { lastDateMs: number }>();

    for (const entry of parsedLogs) {
      if (entry.dateMs < startMs || entry.dateMs > finalEndMs) continue;
      const { log, category } = entry;

      if (scope === 'ISSUE' && log.Type !== 'ISSUE') continue;
      if (scope === 'DELIVERY' && log.Type !== 'DELIVERY') continue;

      const absQty = Math.abs(Number(log.Qty) || 0);
      const bucket = catAgg[category];
      bucket.total += 1;
      if (log.Type === 'ISSUE') bucket.issue += 1;
      else if (log.Type === 'DELIVERY') bucket.delivery += 1;
      else bucket.adjustment += 1;
      bucket.unitsMoved += absQty;
      if (log.ItemID) bucket.skuSet.add(log.ItemID);

      const itemKey = log.ItemID || log.ItemName;
      if (!itemKey) continue;

      const linkedStock = stockById.get(log.ItemID);
      let stat = itemStatsMap.get(itemKey);
      if (!stat) {
        stat = {
          itemId: log.ItemID || itemKey,
          itemName: linkedStock?.ItemName || log.ItemName || itemKey,
          category,
          unit: linkedStock?.Unit || 'Units',
          currentQty: linkedStock ? Number(linkedStock.Qty) || 0 : 0,
          reorderLevel: linkedStock ? Number(linkedStock.ReorderLevel) || 10 : 10,
          movementCount: 0,
          issueCount: 0,
          deliveryCount: 0,
          adjustmentCount: 0,
          unitsMoved: 0,
          demandUnits: 0,
          lastMovedLabel: entry.dateLabel,
          lastDateMs: entry.dateMs,
          stockItem: linkedStock,
        };
        itemStatsMap.set(itemKey, stat);
      }

      stat.movementCount += 1;
      stat.unitsMoved += absQty;
      if (log.Type === 'ISSUE') {
        stat.issueCount += 1;
        stat.demandUnits += absQty;
      } else if (log.Type === 'DELIVERY') {
        stat.deliveryCount += 1;
      } else {
        stat.adjustmentCount += 1;
      }

      if (entry.dateMs >= stat.lastDateMs) {
        stat.lastDateMs = entry.dateMs;
        stat.lastMovedLabel = entry.dateLabel;
      }
    }

    const allEvents = CATEGORIES.reduce((sum, cat) => sum + catAgg[cat].total, 0);
    const allItemsRanked: HighDemandItemStat[] = Array.from(itemStatsMap.values())
      .map(({ lastDateMs: _unused, ...rest }) => rest)
      .sort((a, b) => {
        if (b.movementCount !== a.movementCount) return b.movementCount - a.movementCount;
        if (b.demandUnits !== a.demandUnits) return b.demandUnits - a.demandUnits;
        return b.unitsMoved - a.unitsMoved;
      });

    const series: CategoryFrequencyDatum[] = CATEGORIES.map((cat) => {
      const b = catAgg[cat];
      const topCatItem = allItemsRanked.find((i) => i.category === cat);
      return {
        category: cat,
        totalFrequency: b.total,
        issueFrequency: b.issue,
        deliveryFrequency: b.delivery,
        adjustmentFrequency: b.adjustment,
        unitsMoved: b.unitsMoved,
        uniqueSkus: b.skuSet.size,
        sharePercent: allEvents > 0 ? Math.round((b.total / allEvents) * 100) : 0,
        topItemName: topCatItem ? topCatItem.itemName : 'None',
        topItemCount: topCatItem ? topCatItem.movementCount : 0,
      };
    });

    const filteredRankedItems =
      selectedCategory === 'ALL'
        ? allItemsRanked
        : allItemsRanked.filter((item) => item.category === selectedCategory);

    const highestCat = series.reduce<CategoryFrequencyDatum | null>(
      (best, cur) => (best === null || cur.totalFrequency > best.totalFrequency ? cur : best),
      null
    );

    const distinctSkus = CATEGORIES.reduce((sum, cat) => sum + catAgg[cat].skuSet.size, 0);

    return {
      categorySeries: series,
      highDemandItems: filteredRankedItems.slice(0, 8),
      totalEvents: allEvents,
      totalDistinctSkus: distinctSkus,
      topCategory:
        highestCat && highestCat.totalFrequency > 0
          ? `${highestCat.category} (${highestCat.totalFrequency})`
          : 'No activity',
      rangeLabel: rangeText,
      usesLatestActivityAnchor: shouldAnchorLatest,
    };
  }, [stockItems, movementLogs, scope, selectedCategory, windowAnchor]);

  const categoryColorMap: Record<ItemCategory, string> = {
    Stationery: palette.stationery,
    Cleaning: palette.cleaning,
    General: palette.general,
  };

  const handleBarClick = (data: CategoryFrequencyDatum | undefined) => {
    if (!data?.category) return;
    setSelectedCategory((prev) => (prev === data.category ? 'ALL' : data.category));
  };

  return (
    <section
      id="category-movement-frequency-card"
      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center flex-wrap gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <BarChart2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                30-Day Movement Frequency by Category
              </h3>
              <div className="flex items-center flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                  {rangeLabel}
                </span>
                <span aria-hidden="true">·</span>
                <span>{totalEvents.toLocaleString()} movements</span>
                <span aria-hidden="true">·</span>
                <span>{totalDistinctSkus} active SKUs</span>
                <span aria-hidden="true">·</span>
                <span>Peak: {topCategory}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scope & Window Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div
            role="group"
            aria-label="Filter movement frequency scope"
            className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          >
            {(
              [
                { key: 'ALL', label: 'All Movements' },
                { key: 'ISSUE', label: 'Demand (Issues)' },
                { key: 'DELIVERY', label: 'Receipts (GRN)' },
              ] as const
            ).map((opt) => {
              const active = scope === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setScope(opt.key)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {(usesLatestActivityAnchor || windowAnchor === 'today') && (
            <button
              type="button"
              onClick={() => setWindowAnchor((prev) => (prev === 'auto' ? 'today' : 'auto'))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer whitespace-nowrap shrink-0"
              title="Toggle between Latest Active 30-Day Window and Current Calendar 30 Days"
            >
              {windowAnchor === 'auto' && usesLatestActivityAnchor
                ? 'Active 30d Window'
                : 'Calendar Last 30d'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Split: Recharts Category Frequency Chart + High-Demand SKUs List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Recharts Bar Chart (7 cols on lg+) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Click a category bar to filter high-demand items
            </div>
            {selectedCategory !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className="text-xs font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
              >
                Show All Categories
              </button>
            )}
          </div>

          <div className="w-full h-72">
            {totalEvents === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs text-slate-500 dark:text-slate-400">
                <Layers className="w-7 h-7 text-slate-300 dark:text-slate-700 mb-2" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No stock movements recorded in this 30-day window
                </p>
                <p className="mt-1">
                  Log a delivery receipt or department issue request to track category movement frequency.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categorySeries}
                  margin={{ top: 12, right: 16, left: -8, bottom: 4 }}
                  barCategoryGap="24%"
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={palette.grid}
                    strokeOpacity={palette.gridOpacity}
                  />
                  <XAxis
                    dataKey="category"
                    tick={{ fontSize: 12, fill: palette.axisText, fontWeight: 600 }}
                    axisLine={{ stroke: palette.axisLine }}
                    tickLine={{ stroke: palette.axisLine }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                    axisLine={{ stroke: palette.axisLine }}
                    tickLine={{ stroke: palette.axisLine }}
                    label={{
                      value: 'Movements',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 16,
                      style: { fontSize: 11, fill: palette.axisText },
                    }}
                  />
                  <Tooltip
                    cursor={{ fill: isDark ? 'rgba(148, 163, 184, 0.08)' : 'rgba(15, 23, 42, 0.04)' }}
                    content={<CustomFrequencyTooltip scope={scope} isDark={isDark} />}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

                  {scope === 'ALL' ? (
                    <>
                      <Bar
                        name="Issues (Demand)"
                        dataKey="issueFrequency"
                        stackId="freq"
                        fill="#f59e0b"
                        maxBarSize={64}
                        radius={[0, 0, 0, 0]}
                        className="cursor-pointer"
                        onClick={(entry: any) => handleBarClick((entry?.payload ?? entry) as CategoryFrequencyDatum)}
                      />
                      <Bar
                        name="Deliveries (Receipts)"
                        dataKey="deliveryFrequency"
                        stackId="freq"
                        fill="#0d9488"
                        maxBarSize={64}
                        radius={[0, 0, 0, 0]}
                        className="cursor-pointer"
                        onClick={(entry: any) => handleBarClick((entry?.payload ?? entry) as CategoryFrequencyDatum)}
                      />
                      <Bar
                        name="Adjustments"
                        dataKey="adjustmentFrequency"
                        stackId="freq"
                        fill="#6366f1"
                        maxBarSize={64}
                        radius={[6, 6, 0, 0]}
                        className="cursor-pointer"
                        onClick={(entry: any) => handleBarClick((entry?.payload ?? entry) as CategoryFrequencyDatum)}
                      />
                    </>
                  ) : (
                    <Bar
                      name={scope === 'ISSUE' ? 'Issue Requests (Demand)' : 'Stock Receipts (GRN)'}
                      dataKey="totalFrequency"
                      maxBarSize={68}
                      radius={[6, 6, 0, 0]}
                      className="cursor-pointer"
                      onClick={(entry: any) => handleBarClick((entry?.payload ?? entry) as CategoryFrequencyDatum)}
                    >
                      {categorySeries.map((entry) => (
                        <Cell
                          key={entry.category}
                          fill={categoryColorMap[entry.category]}
                          fillOpacity={
                            selectedCategory === 'ALL' || selectedCategory === entry.category ? 0.95 : 0.35
                          }
                        />
                      ))}
                    </Bar>
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Category Summary Row */}
          <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800 mt-2">
            {categorySeries.map((cat) => {
              const isSelected = selectedCategory === cat.category;
              return (
                <button
                  key={cat.category}
                  type="button"
                  onClick={() =>
                    setSelectedCategory((prev) => (prev === cat.category ? 'ALL' : cat.category))
                  }
                  className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {cat.category}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {cat.sharePercent}%
                    </span>
                  </div>
                  <div className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-slate-100 mt-0.5">
                    {cat.totalFrequency} <span className="text-[11px] font-normal text-slate-500">txns</span>
                  </div>
                  <div className="text-[10.5px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {cat.uniqueSkus} SKUs · {cat.unitsMoved.toLocaleString()} u
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: High-Demand Items Ranked by Movement Frequency (5 cols on lg+) */}
        <div className="lg:col-span-5 flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40">
          <div className="px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  High-Demand Items ({selectedCategory === 'ALL' ? 'All Categories' : selectedCategory})
                </h4>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Ranked by 30-day movement frequency &amp; units moved
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 divide-y divide-slate-200/80 dark:divide-slate-800/80 overflow-y-auto max-h-[340px]">
            {highDemandItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
                No item movements found for this selection.
              </div>
            ) : (
              highDemandItems.map((item, idx) => {
                const isLowOrZero = item.stockItem && item.currentQty <= item.reorderLevel;
                const isZero = item.stockItem && item.currentQty <= 0;

                return (
                  <div
                    key={item.itemId}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white/70 dark:bg-slate-900/50 hover:bg-white dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono tabular-nums text-[10.5px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate" title={item.itemName}>
                          {item.itemName}
                        </div>
                        <div className="text-[10.5px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {item.itemId}
                          <span aria-hidden="true"> · </span>
                          {item.category}
                          <span aria-hidden="true"> · </span>
                          Last {item.lastMovedLabel}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {item.movementCount}x moved
                      </div>
                      <div className="text-[10.5px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {item.unitsMoved.toLocaleString()} {item.unit}
                      </div>
                      {isLowOrZero && item.stockItem && onSelectItemForReorder && (
                        <button
                          type="button"
                          onClick={() => onSelectItemForReorder(item.stockItem!)}
                          className={`inline-flex items-center gap-0.5 text-[10.5px] font-semibold mt-0.5 hover:underline cursor-pointer ${
                            isZero
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <span>{isZero ? 'Out of stock · Reorder' : 'Low stock · Reorder'}</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
