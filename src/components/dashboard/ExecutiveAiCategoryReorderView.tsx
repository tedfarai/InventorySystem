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
} from 'recharts';
import {
  Sparkles,
  CalendarClock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowDownToLine,
  PackageSearch,
  Info,
  ClipboardList,
} from 'lucide-react';
import { StockItem, MovementLogEntry } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import {
  AiCategoryReorderForecastResponse,
  CategoryAiForecastRecommendation,
  CategoryMovementPatternSummary,
  buildCategoryMovementPatterns,
} from '../../utils/categoryReorderForecast';
import { formatLocalDateIso, formatReadableIsoDate, isValidIsoDate } from '../../utils/stockForecastService';

interface ExecutiveAiCategoryReorderViewProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  onOpenQuickAction?: (actionType: 'delivery' | 'issue' | 'adjustment' | 'reorderReport') => void;
  onSelectItemForReorder?: (item: StockItem) => void;
}

const WINDOW_OPTIONS = [30, 60, 90, 180] as const;

function daysOffsetLabel(targetIso: string, referenceIso: string): string {
  if (!isValidIsoDate(targetIso) || !isValidIsoDate(referenceIso)) return 'Check date';
  const [ty, tm, td] = targetIso.split('-').map(Number);
  const [ry, rm, rd] = referenceIso.split('-').map(Number);
  const diffDays = Math.round(
    (Date.UTC(ty, tm - 1, td) - Date.UTC(ry, rm - 1, rd)) / 86_400_000
  );
  if (diffDays <= 0) return 'Today (Immediate)';
  if (diffDays === 1) return 'In 1 day';
  return `In ${diffDays} days`;
}

function getUrgencyBadgeProps(
  urgency: CategoryAiForecastRecommendation['urgencyLevel']
): { label: string; className: string; icon: React.ReactNode } {
  switch (urgency) {
    case 'IMMEDIATE':
      return {
        label: 'Immediate Reorder',
        className: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800',
        icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0" />,
      };
    case 'SOON':
      return {
        label: 'Reorder Soon',
        className: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800',
        icon: <Clock className="w-3.5 h-3.5 shrink-0" />,
      };
    case 'PLANNED':
      return {
        label: 'Planned Window',
        className: 'text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800',
        icon: <CalendarClock className="w-3.5 h-3.5 shrink-0" />,
      };
    case 'INSUFFICIENT_DATA':
      return {
        label: 'Limited Log History',
        className: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700',
        icon: <Info className="w-3.5 h-3.5 shrink-0" />,
      };
    default:
      return {
        label: 'Stock Adequate',
        className: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800',
        icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />,
      };
  }
}

export const ExecutiveAiCategoryReorderView: React.FC<ExecutiveAiCategoryReorderViewProps> = ({
  stockItems = [],
  movementLogs = [],
  onOpenQuickAction,
  onSelectItemForReorder,
}) => {
  const { palette } = useTheme();
  const todayIso = useMemo(() => formatLocalDateIso(new Date()), []);

  const [analysisWindowDays, setAnalysisWindowDays] = useState<number>(60);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(5);
  const [safetyBufferDays, setSafetyBufferDays] = useState<number>(7);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiForecast, setAiForecast] = useState<AiCategoryReorderForecastResponse | null>(null);

  const safeStock = useMemo(() => (Array.isArray(stockItems) ? stockItems : []), [stockItems]);
  const safeLogs = useMemo(() => (Array.isArray(movementLogs) ? movementLogs : []), [movementLogs]);

  const patternSummary = useMemo(
    () =>
      buildCategoryMovementPatterns(safeStock, safeLogs, {
        analysisWindowDays,
        leadTimeDays,
        safetyBufferDays,
        referenceDateIso: todayIso,
      }),
    [safeStock, safeLogs, analysisWindowDays, leadTimeDays, safetyBufferDays, todayIso]
  );

  const itemById = useMemo(() => {
    const map = new Map<string, StockItem>();
    for (const it of safeStock) {
      if (it?.ItemID) map.set(it.ItemID, it);
    }
    return map;
  }, [safeStock]);

  const aiByCategory = useMemo(() => {
    const map = new Map<string, CategoryAiForecastRecommendation>();
    if (aiForecast?.categoryForecasts) {
      for (const rec of aiForecast.categoryForecasts) {
        if (rec?.category) {
          map.set(rec.category.toLowerCase(), rec);
        }
      }
    }
    return map;
  }, [aiForecast]);

  const handleRunAiForecast = async () => {
    if (patternSummary.categories.length === 0) {
      setAiError('No stock categories with catalog items are available to forecast.');
      return;
    }

    setIsLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/category-reorder-forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patternSummary),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message =
          typeof payload?.error === 'string' && payload.error.trim()
            ? payload.error
            : `Forecast request failed with HTTP ${response.status}.`;
        throw new Error(message);
      }

      setAiForecast(payload as AiCategoryReorderForecastResponse);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to reach the AI forecasting service. Please try again.';
      setAiError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return patternSummary.categories.map((cat) => {
      const aiRec = aiByCategory.get(cat.category.toLowerCase());
      return {
        category: cat.category,
        avgDailyBurn: cat.avgDailyBurnRate,
        recentDailyBurn: cat.recentHalfDailyBurn,
        predicted30dDailyAvg: aiRec
          ? Math.round((aiRec.predictedNext30DayDemand / 30) * 100) / 100
          : cat.avgDailyBurnRate,
        daysUntilReorder: cat.estimatedDaysUntilReorder ?? 0,
      };
    });
  }, [patternSummary.categories, aiByCategory]);

  const handleActionForCategory = (cat: CategoryMovementPatternSummary) => {
    const firstSku = cat.topPriorityItems[0];
    if (firstSku && onSelectItemForReorder) {
      const stockItem = itemById.get(firstSku.itemID);
      if (stockItem) {
        onSelectItemForReorder(stockItem);
        return;
      }
    }
    if (onOpenQuickAction) {
      onOpenQuickAction('reorderReport');
    }
  };

  if (safeStock.length === 0) {
    return (
      <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
        <PackageSearch className="w-10 h-10 text-slate-400 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          No Inventory Items Available for Category Forecasting
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Add stock items and record issue/delivery movements in the Master Stock Sheet to enable AI-powered category reorder date forecasting.
        </p>
        {onOpenQuickAction && (
          <button
            type="button"
            onClick={() => onOpenQuickAction('delivery')}
            className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer whitespace-nowrap"
          >
            Receive First Stock Delivery
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      {/* Section Header & Configuration Controls */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>AI Category Demand Forecast &amp; Optimal Reorder Dates</span>
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-3xl">
              Analyzes historical issue velocity, weekday demand spikes, stock depletion runway, and supplier lead times across each stock category to recommend optimal reorder dates.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
              <span>Reference date: <strong className="font-mono tabular-nums text-slate-700 dark:text-slate-200">{todayIso}</strong></span>
              <span aria-hidden="true">·</span>
              <span>{patternSummary.categories.length} categories tracked</span>
              <span aria-hidden="true">·</span>
              <span>{safeLogs.length.toLocaleString()} total movement log entries</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onOpenQuickAction && (
              <button
                type="button"
                onClick={() => onOpenQuickAction('reorderReport')}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Reorder Safety Report</span>
              </button>
            )}

            <button
              type="button"
              id="run-ai-category-forecast-btn"
              onClick={handleRunAiForecast}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 rounded-xl transition cursor-pointer flex items-center gap-2 shadow-xs whitespace-nowrap shrink-0"
            >
              {isLoading ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>{isLoading ? 'Analyzing Movement Logs...' : aiForecast ? 'Refresh AI Reorder Forecast' : 'Generate AI Reorder Dates'}</span>
            </button>
          </div>
        </div>

        {/* Parameter Strip */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-semibold text-slate-700 dark:text-slate-300">
              Historical Log Window
            </label>
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {WINDOW_OPTIONS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAnalysisWindowDays(days)}
                  className={`flex-1 px-2.5 py-1.5 rounded-md text-xs font-bold font-mono tabular-nums transition cursor-pointer whitespace-nowrap ${
                    analysisWindowDays === days
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs border border-slate-200 dark:border-slate-700'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-lead-time-input" className="block font-semibold text-slate-700 dark:text-slate-300">
              Supplier Lead Time (days)
            </label>
            <input
              id="ai-lead-time-input"
              type="number"
              min={1}
              max={60}
              value={leadTimeDays}
              onChange={(e) => {
                const v = Math.max(1, Math.min(60, Math.round(Number(e.target.value) || 1)));
                setLeadTimeDays(v);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ai-safety-buffer-input" className="block font-semibold text-slate-700 dark:text-slate-300">
              Safety Coverage Buffer (days)
            </label>
            <input
              id="ai-safety-buffer-input"
              type="number"
              min={0}
              max={60}
              value={safetyBufferDays}
              onChange={(e) => {
                const v = Math.max(0, Math.min(60, Math.round(Number(e.target.value) || 0)));
                setSafetyBufferDays(v);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono tabular-nums text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Upstream Error State */}
      {aiError && (
        <div
          role="alert"
          className="p-4 rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">AI Demand Forecast Request Failed</div>
              <p className="mt-0.5">{aiError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleRunAiForecast}
            disabled={isLoading}
            className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer whitespace-nowrap shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* AI Executive Synthesis Banner */}
      {aiForecast && !isLoading && (
        <div className="p-5 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/70 rounded-2xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>AI Replenishment Summary</span>
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              <span>{aiForecast.model}</span>
              <span aria-hidden="true"> · </span>
              <span>Window {analysisWindowDays}d</span>
              <span aria-hidden="true"> · </span>
              <span>Lead {leadTimeDays}d</span>
              <span aria-hidden="true"> · </span>
              <span>{new Date(aiForecast.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
            {aiForecast.executiveSummary}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
            {aiForecast.forecastHorizonNote}
          </p>
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-busy="true">
          {patternSummary.categories.map((cat) => (
            <div
              key={`skeleton-${cat.category}`}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                <div className="h-5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
              </div>
              <div className="h-8 w-40 bg-slate-200 dark:bg-slate-800 rounded" />
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="h-10 bg-slate-100 dark:bg-slate-800/70 rounded" />
                <div className="h-10 bg-slate-100 dark:bg-slate-800/70 rounded" />
              </div>
              <div className="h-12 bg-slate-100 dark:bg-slate-800/70 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Per-Category Forecast Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {patternSummary.categories.map((cat) => {
            const aiRec = aiByCategory.get(cat.category.toLowerCase());
            const effectiveUrgency: CategoryAiForecastRecommendation['urgencyLevel'] = aiRec
              ? aiRec.urgencyLevel
              : !cat.hasSufficientHistory && cat.itemsBelowThreshold === 0
              ? 'INSUFFICIENT_DATA'
              : cat.estimatedDaysUntilReorder === 0
              ? 'IMMEDIATE'
              : cat.estimatedDaysUntilReorder !== null && cat.estimatedDaysUntilReorder <= 7
              ? 'SOON'
              : cat.estimatedDaysUntilReorder !== null && cat.estimatedDaysUntilReorder <= 21
              ? 'PLANNED'
              : 'ADEQUATE';

            const badge = getUrgencyBadgeProps(effectiveUrgency);
            const targetDateIso = aiRec?.optimalReorderDate || cat.baselineOptimalReorderDate;
            const windowStartIso = aiRec?.orderWindowStartDate || null;
            const predicted30d = aiRec
              ? Math.round(aiRec.predictedNext30DayDemand)
              : Math.round(cat.avgDailyBurnRate * 30);
            const recommendedQty = aiRec ? Math.round(aiRec.recommendedOrderQty) : cat.recommendedBaselineQty;

            return (
              <div
                key={cat.category}
                className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                        {cat.category}
                      </h3>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono tabular-nums">
                        <span>{cat.skuCount} SKUs</span>
                        <span aria-hidden="true"> · </span>
                        <span>{cat.issueTransactionCount} issues ({analysisWindowDays}d)</span>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border whitespace-nowrap shrink-0 ${badge.className}`}
                    >
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  {/* Optimal Reorder Date Display */}
                  <div className="py-3 border-y border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {aiRec ? 'AI Suggested Optimal Reorder Date' : 'Estimated Baseline Reorder Date'}
                    </div>
                    {targetDateIso && isValidIsoDate(targetDateIso) ? (
                      <div className="mt-1 flex items-baseline justify-between gap-2">
                        <span className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                          {formatReadableIsoDate(targetDateIso)}
                        </span>
                        <span className="text-xs font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {daysOffsetLabel(targetDateIso, todayIso)}
                        </span>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                        No Immediate Reorder Required
                      </div>
                    )}
                    {windowStartIso && isValidIsoDate(windowStartIso) && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                        Order window opens {formatReadableIsoDate(windowStartIso)}
                      </div>
                    )}
                  </div>

                  {/* Key Metrics Grid (Tabular Numerals) */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Current Stock</div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {cat.totalCurrentStock.toLocaleString()} units
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Daily Burn Rate</div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>{cat.avgDailyBurnRate.toFixed(2)}/day</span>
                        {cat.velocityMomentum === 'Accelerating' && (
                          <TrendingUp className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        )}
                        {cat.velocityMomentum === 'Cooling' && (
                          <TrendingDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {cat.velocityMomentum === 'Steady' && (
                          <Minus className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">30-Day Forecast</div>
                      <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                        {predicted30d.toLocaleString()} units
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">Suggested Order</div>
                      <div className="font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                        {recommendedQty > 0 ? `+${recommendedQty.toLocaleString()} units` : '0 units'}
                      </div>
                    </div>
                  </div>

                  {/* Pattern Analysis & AI Guidance */}
                  {aiRec ? (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                      <p className="text-slate-700 dark:text-slate-200 leading-relaxed">
                        {aiRec.patternAnalysis}
                      </p>
                      {aiRec.keyDrivers.length > 0 && (
                        <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 list-disc list-inside">
                          {aiRec.keyDrivers.slice(0, 3).map((driver, i) => (
                            <li key={i}>{driver}</li>
                          ))}
                        </ul>
                      )}
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        Next step: {aiRec.actionRecommendation}
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <div>
                        Momentum: <strong className="text-slate-700 dark:text-slate-200">{cat.velocityMomentum}</strong>
                        <span aria-hidden="true"> · </span>
                        Peak day: <strong className="text-slate-700 dark:text-slate-200">{cat.peakWeekday}</strong>
                      </div>
                      <div>
                        Click <strong>Generate AI Reorder Dates</strong> above for Gemini pattern synthesis.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400 truncate">
                    {cat.itemsBelowThreshold > 0
                      ? `${cat.itemsBelowThreshold} SKU below min`
                      : cat.estimatedCoverDays !== null
                      ? `~${cat.estimatedCoverDays}d total cover`
                      : 'Stable coverage'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleActionForCategory(cat)}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-lg transition cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                    <span>Plan Reorder</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Category Demand & Burn-Rate Comparison Chart */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Historical Daily Demand vs. Predicted Run Rate by Category
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compares historical daily issue averages ({analysisWindowDays}d window) with recent half-window velocity and AI 30-day projected daily demand.
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis dataKey="category" stroke={palette.axisText} fontSize={12} />
              <YAxis stroke={palette.axisText} fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  borderRadius: '10px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="avgDailyBurn" name="Historical Avg (units/day)" fill={palette.stationery} radius={[4, 4, 0, 0]} />
              <Bar dataKey="recentDailyBurn" name="Recent Half Avg (units/day)" fill={palette.cleaning} radius={[4, 4, 0, 0]} />
              <Bar dataKey="predicted30dDailyAvg" name="Projected 30d Daily Avg" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category Reorder Matrix Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          Category Movement Patterns &amp; Priority SKUs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-2 text-right">Stock / Threshold</th>
                <th className="py-2.5 px-2 text-right">Issued ({analysisWindowDays}d)</th>
                <th className="py-2.5 px-2">Peak Day &amp; Trend</th>
                <th className="py-2.5 px-2">Urgent SKU</th>
                <th className="py-2.5 px-2">Optimal Reorder Date</th>
                <th className="py-2.5 px-2 text-right">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {patternSummary.categories.map((cat) => {
                const aiRec = aiByCategory.get(cat.category.toLowerCase());
                const leadSku = cat.topPriorityItems[0];
                const reorderDate = aiRec?.optimalReorderDate || cat.baselineOptimalReorderDate;
                return (
                  <tr key={`row-${cat.category}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">
                      {cat.category}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {cat.totalCurrentStock.toLocaleString()} / {cat.totalReorderLevel.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                      {cat.totalIssuedUnits.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">
                      {cat.peakWeekday} · {cat.velocityMomentum}
                    </td>
                    <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">
                      {leadSku ? (
                        <span className="truncate block max-w-[200px]" title={`${leadSku.itemID} - ${leadSku.itemName}`}>
                          <span className="font-mono font-bold">{leadSku.itemID}</span> · {leadSku.itemName}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-2 font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                      {reorderDate && isValidIsoDate(reorderDate)
                        ? `${formatReadableIsoDate(reorderDate)} (${daysOffsetLabel(reorderDate, todayIso)})`
                        : 'No immediate reorder'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      {aiRec ? aiRec.confidenceLevel : cat.hasSufficientHistory ? 'BASELINE' : 'LOW DATA'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
