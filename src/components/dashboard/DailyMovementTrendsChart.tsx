import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Activity,
  CalendarDays,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  TrendingUp,
} from 'lucide-react';
import { StockItem, MovementLogEntry, ItemCategory } from '../../types';
import { useTheme } from '../../hooks/useTheme';

export type DailyCategoryFilter = 'ALL' | ItemCategory;

interface DailyCategoryBucket {
  inbound: number;
  outbound: number;
  total: number;
  events: number;
}

export interface DailyMovementPoint {
  dateKey: string; // YYYY-MM-DD
  label: string; // e.g. "Aug 12"
  fullDateLabel: string; // e.g. "Wed, Aug 12, 2026"
  Stationery: number;
  Cleaning: number;
  General: number;
  TotalAll: number;
  InboundAll: number;
  OutboundAll: number;
  EventsAll: number;
  // Active selected-category metrics (for single-category view)
  SelectedTotal: number;
  SelectedInbound: number;
  SelectedOutbound: number;
  SelectedNet: number;
  SelectedEvents: number;
  byCategory: Record<ItemCategory, DailyCategoryBucket>;
}

interface DailyMovementTrendsChartProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
}

const CATEGORIES: ItemCategory[] = ['Stationery', 'Cleaning', 'General'];

function parseLogDateKey(timestamp: string | undefined): { dateKey: string; dateMs: number } | null {
  if (!timestamp || typeof timestamp !== 'string') return null;
  const trimmed = timestamp.trim();
  if (!trimmed) return null;

  const isoCandidate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed.replace(' ', 'T')}`
    : trimmed;

  const parsed = new Date(isoCandidate);
  if (Number.isNaN(parsed.getTime())) {
    // Fallback on leading YYYY-MM-DD substring
    const prefix = trimmed.substring(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(prefix)) {
      const d = new Date(`${prefix}T12:00:00`);
      if (!Number.isNaN(d.getTime())) {
        return { dateKey: prefix, dateMs: d.getTime() };
      }
    }
    return null;
  }

  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return {
    dateKey: `${y}-${m}-${d}`,
    dateMs: parsed.getTime(),
  };
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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

interface CustomDailyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: DailyMovementPoint }>;
  selectedCategory: DailyCategoryFilter;
  isDark: boolean;
}

const CustomDailyTooltip: React.FC<CustomDailyTooltipProps> = ({
  active,
  payload,
  selectedCategory,
  isDark,
}) => {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div
      className={`rounded-2xl shadow-2xl p-3.5 backdrop-blur-md min-w-[235px] max-w-[300px] pointer-events-none z-50 border ${
        isDark
          ? 'bg-slate-950/95 text-white border-slate-700/80'
          : 'bg-white/98 text-slate-900 border-slate-300 ring-1 ring-slate-900/5'
      }`}
    >
      <div
        className={`flex items-center justify-between gap-2 pb-2 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-extrabold">
          <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
          <span>{point.fullDateLabel}</span>
        </div>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
            isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
          }`}
        >
          {selectedCategory === 'ALL' ? point.EventsAll : point.SelectedEvents} txns
        </span>
      </div>

      {selectedCategory === 'ALL' ? (
        <div className="space-y-1.5 pt-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
              Stationery
            </span>
            <span className="font-bold font-mono">{point.Stationery.toLocaleString()} u</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0" />
              Cleaning
            </span>
            <span className="font-bold font-mono">{point.Cleaning.toLocaleString()} u</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              General
            </span>
            <span className="font-bold font-mono">{point.General.toLocaleString()} u</span>
          </div>

          <div
            className={`pt-2 mt-1.5 border-t flex items-center justify-between text-[11px] ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span className="font-semibold text-slate-500 dark:text-slate-400">Total Moved</span>
            <span className="font-extrabold font-mono">{point.TotalAll.toLocaleString()} units</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Inbound: +{point.InboundAll.toLocaleString()} u
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              Outbound: -{point.OutboundAll.toLocaleString()} u
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-1.5 pt-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300 font-semibold">Category Focus</span>
            <span className="font-extrabold text-teal-600 dark:text-teal-400">{selectedCategory}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              Inbound (Receipts)
            </span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              +{point.SelectedInbound.toLocaleString()} u
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              Outbound (Issues)
            </span>
            <span className="font-bold font-mono text-amber-600 dark:text-amber-400">
              -{point.SelectedOutbound.toLocaleString()} u
            </span>
          </div>
          <div
            className={`pt-2 mt-1.5 border-t flex items-center justify-between text-[11px] ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <span className="font-semibold text-slate-500 dark:text-slate-400">Daily Movement</span>
            <span className="font-extrabold font-mono">{point.SelectedTotal.toLocaleString()} units</span>
          </div>
        </div>
      )}
    </div>
  );
};

export const DailyMovementTrendsChart: React.FC<DailyMovementTrendsChartProps> = ({
  stockItems = [],
  movementLogs = [],
}) => {
  const { isDark, palette } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<DailyCategoryFilter>('ALL');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [windowAnchor, setWindowAnchor] = useState<'auto' | 'today'>('auto');

  const {
    series,
    rangeLabel,
    usesLatestActivityAnchor,
    totals,
  } = useMemo(() => {
    const itemCategoryMap = new Map<string, ItemCategory>();
    for (const item of Array.isArray(stockItems) ? stockItems : []) {
      if (item?.ItemID && item?.Category) {
        itemCategoryMap.set(item.ItemID, item.Category);
      }
    }

    const dailyBuckets = new Map<
      string,
      Record<ItemCategory, DailyCategoryBucket>
    >();

    let maxLogDateMs: number | null = null;
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const thirtyDaysAgoMs = todayEnd.getTime() - 29 * 86_400_000;

    let hasMovementsInCalendar30Days = false;

    for (const log of Array.isArray(movementLogs) ? movementLogs : []) {
      if (!log) continue;
      const parsed = parseLogDateKey(log.Timestamp);
      if (!parsed) continue;

      if (maxLogDateMs === null || parsed.dateMs > maxLogDateMs) {
        maxLogDateMs = parsed.dateMs;
      }
      if (parsed.dateMs >= thirtyDaysAgoMs && parsed.dateMs <= todayEnd.getTime()) {
        hasMovementsInCalendar30Days = true;
      }

      const rawQty = Number(log.Qty) || 0;
      const absQty = Math.abs(rawQty);
      if (absQty === 0) continue;

      const category = resolveCategory(log, itemCategoryMap);
      let dayRecord = dailyBuckets.get(parsed.dateKey);
      if (!dayRecord) {
        dayRecord = {
          Stationery: { inbound: 0, outbound: 0, total: 0, events: 0 },
          Cleaning: { inbound: 0, outbound: 0, total: 0, events: 0 },
          General: { inbound: 0, outbound: 0, total: 0, events: 0 },
        };
        dailyBuckets.set(parsed.dateKey, dayRecord);
      }

      const catBucket = dayRecord[category];
      if (log.Type === 'DELIVERY') {
        catBucket.inbound += absQty;
      } else if (log.Type === 'ISSUE') {
        catBucket.outbound += absQty;
      } else if (log.Type === 'ADJUSTMENT') {
        if (rawQty >= 0) catBucket.inbound += absQty;
        else catBucket.outbound += absQty;
      }
      catBucket.total += absQty;
      catBucket.events += 1;
    }

    // Decide end date for the 30-day rolling window
    const shouldAnchorToLatest =
      windowAnchor === 'auto' && !hasMovementsInCalendar30Days && maxLogDateMs !== null;

    const endDate = shouldAnchorToLatest && maxLogDateMs !== null
      ? new Date(maxLogDateMs)
      : new Date();
    endDate.setHours(0, 0, 0, 0);

    const points: DailyMovementPoint[] = [];
    for (let offset = 29; offset >= 0; offset--) {
      const d = new Date(endDate);
      d.setDate(endDate.getDate() - offset);
      const dateKey = formatDateKey(d);
      const record = dailyBuckets.get(dateKey) || {
        Stationery: { inbound: 0, outbound: 0, total: 0, events: 0 },
        Cleaning: { inbound: 0, outbound: 0, total: 0, events: 0 },
        General: { inbound: 0, outbound: 0, total: 0, events: 0 },
      };

      const statTotal = record.Stationery.total;
      const cleanTotal = record.Cleaning.total;
      const genTotal = record.General.total;
      const totalAll = statTotal + cleanTotal + genTotal;
      const inboundAll =
        record.Stationery.inbound + record.Cleaning.inbound + record.General.inbound;
      const outboundAll =
        record.Stationery.outbound + record.Cleaning.outbound + record.General.outbound;
      const eventsAll =
        record.Stationery.events + record.Cleaning.events + record.General.events;

      const selectedBucket =
        selectedCategory === 'ALL'
          ? { inbound: inboundAll, outbound: outboundAll, total: totalAll, events: eventsAll }
          : record[selectedCategory];

      points.push({
        dateKey,
        label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        fullDateLabel: d.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        Stationery: statTotal,
        Cleaning: cleanTotal,
        General: genTotal,
        TotalAll: totalAll,
        InboundAll: inboundAll,
        OutboundAll: outboundAll,
        EventsAll: eventsAll,
        SelectedTotal: selectedBucket.total,
        SelectedInbound: selectedBucket.inbound,
        SelectedOutbound: selectedBucket.outbound,
        SelectedNet: selectedBucket.inbound - selectedBucket.outbound,
        SelectedEvents: selectedBucket.events,
        byCategory: record,
      });
    }

    const startLabel = points[0]?.label || '';
    const endPoint = points[points.length - 1];
    const endLabel = endPoint
      ? new Date(`${endPoint.dateKey}T12:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

    const totalMoved = points.reduce((sum, p) => sum + p.SelectedTotal, 0);
    const totalInbound = points.reduce((sum, p) => sum + p.SelectedInbound, 0);
    const totalOutbound = points.reduce((sum, p) => sum + p.SelectedOutbound, 0);
    const activeDays = points.filter((p) => p.SelectedTotal > 0).length;
    const peakPoint = points.reduce<DailyMovementPoint | null>(
      (best, p) => (best === null || p.SelectedTotal > best.SelectedTotal ? p : best),
      null
    );

    return {
      series: points,
      rangeLabel: `${startLabel} – ${endLabel}`,
      usesLatestActivityAnchor: shouldAnchorToLatest,
      totals: {
        totalMoved,
        totalInbound,
        totalOutbound,
        activeDays,
        peakLabel: peakPoint && peakPoint.SelectedTotal > 0 ? `${peakPoint.label} (${peakPoint.SelectedTotal} u)` : 'None',
        categoryTotals: {
          ALL: points.reduce((s, p) => s + p.TotalAll, 0),
          Stationery: points.reduce((s, p) => s + p.Stationery, 0),
          Cleaning: points.reduce((s, p) => s + p.Cleaning, 0),
          General: points.reduce((s, p) => s + p.General, 0),
        },
      },
    };
  }, [stockItems, movementLogs, selectedCategory, windowAnchor]);

  const activeCategoryColor =
    selectedCategory === 'Stationery'
      ? palette.stationery
      : selectedCategory === 'Cleaning'
      ? palette.cleaning
      : selectedCategory === 'General'
      ? palette.general
      : '#0d9488';

  return (
    <div
      id="daily-stock-movement-trends-card"
      className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
    >
      {/* Header & Controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pb-3.5 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center flex-wrap gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              30-Day Daily Stock Movement Trends
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              <CalendarDays className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              {rangeLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Daily inbound deliveries, requisition issues, and count adjustments across the last 30 days. Toggle categories to isolate individual supply lines.
          </p>
        </div>

        {/* Controls: Category Toggles + Chart Type + Window Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Individual Category Toggle Buttons */}
          <div
            role="group"
            aria-label="Filter 30-day movement chart by category"
            className="flex items-center flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs"
          >
            {(
              [
                { key: 'ALL', label: 'All Categories', dot: null },
                ...CATEGORIES.map((cat) => ({
                  key: cat,
                  label: cat,
                  dot:
                    cat === 'Stationery'
                      ? 'bg-teal-500'
                      : cat === 'Cleaning'
                      ? 'bg-sky-500'
                      : 'bg-emerald-500',
                })),
              ] as const
            ).map((opt) => {
              const isActive = selectedCategory === opt.key;
              const count = totals.categoryTotals[opt.key];
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setSelectedCategory(opt.key)}
                  aria-pressed={isActive}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                    isActive
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs border border-slate-200/80 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {opt.dot && <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dot}`} />}
                  <span>{opt.label}</span>
                  <span className="text-[10px] font-mono opacity-75">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Chart Visualization Style Switcher */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setChartStyle('area')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                chartStyle === 'area'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Area Trend Chart"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Area</span>
            </button>
            <button
              type="button"
              onClick={() => setChartStyle('bar')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                chartStyle === 'bar'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="Daily Volume Bar Chart"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Bars</span>
            </button>
          </div>

          {/* Window Mode Toggle (Latest Active 30 Days vs Current Calendar 30 Days) */}
          {(usesLatestActivityAnchor || windowAnchor === 'today') && (
            <button
              type="button"
              onClick={() => setWindowAnchor((prev) => (prev === 'auto' ? 'today' : 'auto'))}
              className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition cursor-pointer"
              title="Switch between Latest Active 30-Day Window and Current Calendar 30-Day Window"
            >
              {windowAnchor === 'auto' && usesLatestActivityAnchor
                ? 'Active 30d Window'
                : 'Calendar Last 30d'}
            </button>
          )}
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            30-Day Volume ({selectedCategory === 'ALL' ? 'All' : selectedCategory})
          </div>
          <div className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5 font-mono">
            {totals.totalMoved.toLocaleString()} <span className="text-xs font-semibold text-slate-500">units</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
            <ArrowDownToLine className="w-3 h-3" />
            <span>Inbound Received</span>
          </div>
          <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300 mt-0.5 font-mono">
            +{totals.totalInbound.toLocaleString()} <span className="text-xs font-semibold">units</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
            <ArrowUpFromLine className="w-3 h-3" />
            <span>Outbound Issued</span>
          </div>
          <div className="text-lg font-extrabold text-amber-700 dark:text-amber-300 mt-0.5 font-mono">
            -{totals.totalOutbound.toLocaleString()} <span className="text-xs font-semibold">units</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/70">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Peak Day ({totals.activeDays}/30 Active Days)
          </div>
          <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-1 truncate font-mono">
            {totals.peakLabel}
          </div>
        </div>
      </div>

      {/* Recharts Canvas */}
      <div className="w-full h-72 sm:h-80 pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {chartStyle === 'area' ? (
            <AreaChart data={series} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="dailyStatGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.stationery} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette.stationery} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dailyCleanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.cleaning} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette.cleaning} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dailyGenGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={palette.general} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={palette.general} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="dailySelectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeCategoryColor} stopOpacity={0.38} />
                  <stop offset="95%" stopColor={activeCategoryColor} stopOpacity={0.03} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={palette.grid}
                strokeOpacity={palette.gridOpacity}
              />
              <XAxis
                dataKey="label"
                interval={3}
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <Tooltip
                content={<CustomDailyTooltip selectedCategory={selectedCategory} isDark={isDark} />}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

              {selectedCategory === 'ALL' ? (
                <>
                  <Area
                    type="monotone"
                    name="Stationery"
                    dataKey="Stationery"
                    stroke={palette.stationery}
                    strokeWidth={2.25}
                    fill="url(#dailyStatGrad)"
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    name="Cleaning"
                    dataKey="Cleaning"
                    stroke={palette.cleaning}
                    strokeWidth={2.25}
                    fill="url(#dailyCleanGrad)"
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    name="General"
                    dataKey="General"
                    stroke={palette.general}
                    strokeWidth={2.25}
                    fill="url(#dailyGenGrad)"
                    activeDot={{ r: 5 }}
                  />
                </>
              ) : (
                <>
                  <Area
                    type="monotone"
                    name={`${selectedCategory} Total Moved`}
                    dataKey="SelectedTotal"
                    stroke={activeCategoryColor}
                    strokeWidth={2.5}
                    fill="url(#dailySelectedGrad)"
                    activeDot={{ r: 5 }}
                  />
                  <Area
                    type="monotone"
                    name="Inbound (Receipts)"
                    dataKey="SelectedInbound"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    fillOpacity={0}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Area
                    type="monotone"
                    name="Outbound (Issues)"
                    dataKey="SelectedOutbound"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    fillOpacity={0}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </>
              )}
            </AreaChart>
          ) : (
            <BarChart data={series} margin={{ top: 10, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={palette.grid}
                strokeOpacity={palette.gridOpacity}
              />
              <XAxis
                dataKey="label"
                interval={3}
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <Tooltip
                content={<CustomDailyTooltip selectedCategory={selectedCategory} isDark={isDark} />}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

              {selectedCategory === 'ALL' ? (
                <>
                  <Bar
                    name="Stationery"
                    dataKey="Stationery"
                    stackId="daily"
                    fill={palette.stationery}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    name="Cleaning"
                    dataKey="Cleaning"
                    stackId="daily"
                    fill={palette.cleaning}
                    radius={[0, 0, 0, 0]}
                    maxBarSize={22}
                  />
                  <Bar
                    name="General"
                    dataKey="General"
                    stackId="daily"
                    fill={palette.general}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={22}
                  />
                </>
              ) : (
                <>
                  <Bar
                    name="Inbound (Receipts)"
                    dataKey="SelectedInbound"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    name="Outbound (Issues)"
                    dataKey="SelectedOutbound"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                </>
              )}
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
