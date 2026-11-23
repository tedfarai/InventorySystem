import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  CalendarDays,
  Plus,
  X,
  AlertTriangle,
  Info,
  Database,
  RefreshCw,
  CheckCircle2,
  PackageCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { StockItem, MovementLogEntry } from '../../types';
import { useTheme } from '../../hooks/useTheme';
import { sqliteBridge } from '../../utils/sqliteBridge';
import {
  ItemLinearForecastReport,
  ForecastWindowAnchor,
  ForecastSeriesPoint,
  addDaysToIsoDate,
  calculateFutureDaysFromDate,
  formatLocalDateIso,
  formatReadableIsoDate,
} from '../../utils/stockForecastService';

interface ExecutiveLinearForecastTabProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  onNavigateToReorder?: () => void;
}

const HISTORY_PRESETS = [14, 30, 60, 90, 180] as const;
const QUICK_FUTURE_OFFSETS = [7, 10, 14, 30, 60] as const;

interface ForecastChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: ForecastSeriesPoint }>;
  unit: string;
  isDark: boolean;
}

const ForecastChartTooltip: React.FC<ForecastChartTooltipProps> = ({
  active,
  payload,
  unit,
  isDark,
}) => {
  if (!active || !payload || payload.length === 0) return null;
  const pt = payload[0]?.payload;
  if (!pt) return null;

  return (
    <div
      className={`rounded-xl p-3 text-xs shadow-lg border min-w-[220px] pointer-events-none ${
        isDark
          ? 'bg-slate-950/95 text-slate-100 border-slate-700'
          : 'bg-white/98 text-slate-900 border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-2 border-b border-slate-200 dark:border-slate-800">
        <span className="font-bold">{formatReadableIsoDate(pt.dateIso)}</span>
        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          {pt.isTargetDate ? 'Target Date' : pt.isForecast ? 'Projected' : 'History'}
        </span>
      </div>

      <div className="space-y-1">
        {pt.historicalStock !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">Historical Stock:</span>
            <span className="font-mono tabular-nums font-bold text-teal-600 dark:text-teal-400">
              {pt.historicalStock.toLocaleString()} {unit}
            </span>
          </div>
        )}
        {pt.projectedStock !== null && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">Projected Stock:</span>
            <span className="font-mono tabular-nums font-bold text-indigo-600 dark:text-indigo-400">
              {pt.projectedStock.toLocaleString()} {unit}
            </span>
          </div>
        )}
        {!pt.isForecast && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">OLS Trend Fit:</span>
            <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
              {pt.regressionTrend.toLocaleString()} {unit}
            </span>
          </div>
        )}
        {pt.netDailyMovement !== null && pt.netDailyMovement !== 0 && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-600 dark:text-slate-300">Net Movement:</span>
            <span
              className={`font-mono tabular-nums font-semibold ${
                pt.netDailyMovement > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {pt.netDailyMovement > 0 ? '+' : ''}
              {pt.netDailyMovement.toLocaleString()} {unit}
            </span>
          </div>
        )}
        {pt.minimumThreshold !== null && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Min Threshold:</span>
            <span className="font-mono tabular-nums font-semibold text-rose-600 dark:text-rose-400">
              {pt.minimumThreshold.toLocaleString()} {unit}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export const ExecutiveLinearForecastTab: React.FC<ExecutiveLinearForecastTabProps> = ({
  stockItems = [],
  movementLogs = [],
  onNavigateToReorder,
}) => {
  const { isDark, palette } = useTheme();
  const todayIso = useMemo(() => formatLocalDateIso(new Date()), []);

  // Prefer an item that actually has historical movements for initial selection
  const defaultItemId = useMemo(() => {
    if (!stockItems.length) return '';
    const logItemIds = new Set(movementLogs.map((l) => l.ItemID));
    const itemWithLogs = stockItems.find((item) => logItemIds.has(item.ItemID));
    return (itemWithLogs || stockItems[0])?.ItemID || '';
  }, [stockItems, movementLogs]);

  const [selectedItemId, setSelectedItemId] = useState<string>(defaultItemId);
  const [historyDaysInput, setHistoryDaysInput] = useState<string>('30');
  const [windowAnchor, setWindowAnchor] = useState<ForecastWindowAnchor>('today');

  // Threshold mode: 'item' uses SQLite ReorderLevel, 'custom' uses user input, 'none' evaluates against 0 only
  const [thresholdMode, setThresholdMode] = useState<'item' | 'custom' | 'none'>('item');
  const [customThresholdInput, setCustomThresholdInput] = useState<string>('20');

  const [targetDates, setTargetDates] = useState<string[]>(() => [
    addDaysToIsoDate(todayIso, 10),
    addDaysToIsoDate(todayIso, 30),
  ]);
  const [newTargetDateInput, setNewTargetDateInput] = useState<string>(() =>
    addDaysToIsoDate(todayIso, 14)
  );
  const [dateInputError, setDateInputError] = useState<string | null>(null);

  const [report, setReport] = useState<ItemLinearForecastReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  // Sync selectedItemId if current selection becomes missing or initialized empty
  useEffect(() => {
    if (!stockItems.length) return;
    if (!selectedItemId || !stockItems.some((i) => i.ItemID === selectedItemId)) {
      setSelectedItemId(defaultItemId);
    }
  }, [stockItems, selectedItemId, defaultItemId]);

  const selectedStockItem = useMemo(
    () => stockItems.find((i) => i.ItemID === selectedItemId) || null,
    [stockItems, selectedItemId]
  );

  // Validate historyDays input live
  const historyDaysValidation = useMemo(() => {
    const trimmed = historyDaysInput.trim();
    if (!trimmed) {
      return { valid: false, value: 30, error: 'Enter a whole number of history days (2–3,650).' };
    }
    const parsed = Number(trimmed);
    if (!Number.isInteger(parsed) || parsed < 2 || parsed > 3650) {
      return {
        valid: false,
        value: parsed,
        error: 'History window must be a whole number between 2 and 3,650 days.',
      };
    }
    return { valid: true, value: parsed, error: null };
  }, [historyDaysInput]);

  // Validate threshold override if in custom mode
  const thresholdValidation = useMemo(() => {
    if (thresholdMode === 'item') {
      return { valid: true, resolved: undefined as number | null | undefined, error: null };
    }
    if (thresholdMode === 'none') {
      return { valid: true, resolved: null as number | null | undefined, error: null };
    }
    const trimmed = customThresholdInput.trim();
    if (!trimmed) {
      return { valid: false, resolved: undefined, error: 'Enter a minimum level (0 or higher).' };
    }
    const num = Number(trimmed);
    if (!Number.isFinite(num) || num < 0) {
      return { valid: false, resolved: undefined, error: 'Minimum level must be 0 or greater.' };
    }
    return { valid: true, resolved: num, error: null };
  }, [thresholdMode, customThresholdInput]);

  // Query SQLite & calculate regression forecast when parameters or DB state change
  useEffect(() => {
    if (!selectedItemId || !stockItems.length) {
      setReport(null);
      setIsLoading(false);
      return;
    }

    if (!historyDaysValidation.valid || !thresholdValidation.valid) {
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);

    sqliteBridge
      .loadAndForecastItem({
        itemId: selectedItemId,
        historyDays: historyDaysValidation.value,
        targetDates,
        currentDateIso: todayIso,
        windowAnchor,
        customMinThreshold: thresholdValidation.resolved,
      })
      .then((result) => {
        if (!cancelled) {
          setReport(result);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('SQLite Forecast Load Error:', err);
          setLoadError(
            err instanceof Error
              ? err.message
              : 'Failed to load stock and movement records from SQLite.'
          );
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    selectedItemId,
    stockItems,
    movementLogs.length,
    historyDaysValidation.valid,
    historyDaysValidation.value,
    thresholdValidation.valid,
    thresholdValidation.resolved,
    targetDates,
    todayIso,
    windowAnchor,
    reloadNonce,
  ]);

  const handleAddTargetDate = (candidateDate?: string) => {
    const rawDate = (candidateDate ?? newTargetDateInput).trim();
    const check = calculateFutureDaysFromDate(todayIso, rawDate);
    if (!check.valid) {
      setDateInputError(check.errorMessage || 'Select a valid future date.');
      return;
    }
    if (targetDates.includes(rawDate)) {
      setDateInputError(`${formatReadableIsoDate(rawDate)} is already in your target list.`);
      return;
    }
    setDateInputError(null);
    setTargetDates((prev) => [...prev, rawDate].sort());
  };

  const handleRemoveTargetDate = (dateIso: string) => {
    setTargetDates((prev) => prev.filter((d) => d !== dateIso));
    setDateInputError(null);
  };

  const validTargetForecasts = useMemo(
    () => (report?.targetForecasts || []).filter((f) => f.valid),
    [report]
  );

  const maxAdditionalNeeded = useMemo(() => {
    if (!validTargetForecasts.length) return 0;
    return Math.max(0, ...validTargetForecasts.map((f) => f.estimatedQtyNeeded || 0));
  }, [validTargetForecasts]);

  const firstShortfallDate = useMemo(
    () => validTargetForecasts.find((f) => (f.estimatedQtyNeeded || 0) > 0) || null,
    [validTargetForecasts]
  );

  const itemLogCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const l of movementLogs) {
      if (l?.ItemID) {
        map.set(l.ItemID, (map.get(l.ItemID) || 0) + 1);
      }
    }
    return map;
  }, [movementLogs]);

  // Empty catalog state
  if (!stockItems.length) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-2">
        <PackageCheck className="w-8 h-8 text-slate-400 mx-auto" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
          No Master Stock Items Available
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Add stationery or cleaning items to the SQLite master inventory before running a stock forecast.
        </p>
      </div>
    );
  }

  return (
    <div id="executive-linear-forecast-tab" className="space-y-5 animate-in fade-in duration-150">
      {/* Estimate Disclaimer & Header Band */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">
                Stock Level Forecast (SQLite Linear Regression)
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Estimates daily net stock trend from historical SQLite movement logs and projects available units and replenishment needs for selected future dates.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 shrink-0">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Read-only SQLite source</span>
            <span>·</span>
            <span className="font-mono tabular-nums">{formatReadableIsoDate(todayIso)}</span>
          </div>
        </div>

        {/* Explicit Estimate Disclaimer */}
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold">Forecast Estimate Notice: </strong>
            <span>
              Projections are mathematical estimates based on ordinary least squares (OLS) linear regression over past movement records — not guarantees of future stock levels or demand.
            </span>
          </div>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* 1. Item Selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="forecast-item-select"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              Stock Item
            </label>
            <select
              id="forecast-item-select"
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {stockItems.map((item) => {
                const count = itemLogCounts.get(item.ItemID) || 0;
                return (
                  <option key={item.ItemID} value={item.ItemID}>
                    {item.ItemID} — {item.ItemName} ({item.Qty} {item.Unit} · {count} log{count === 1 ? '' : 's'})
                  </option>
                );
              })}
            </select>
            {selectedStockItem && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                Current on hand: {selectedStockItem.Qty.toLocaleString()} {selectedStockItem.Unit} ·{' '}
                {itemLogCounts.get(selectedStockItem.ItemID) || 0} total logs
              </p>
            )}
          </div>

          {/* 2. History Window (Days) */}
          <div className="space-y-1.5">
            <label
              htmlFor="forecast-history-days"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
            >
              History Window (Days)
            </label>
            <div className="flex items-center gap-2">
              <input
                id="forecast-history-days"
                type="number"
                min={2}
                max={3650}
                step={1}
                value={historyDaysInput}
                onChange={(e) => setHistoryDaysInput(e.target.value)}
                className="w-24 px-3 py-2 text-xs font-mono tabular-nums font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex flex-wrap gap-1">
                {HISTORY_PRESETS.map((preset) => {
                  const active = historyDaysInput.trim() === String(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setHistoryDaysInput(String(preset))}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-mono font-bold border transition cursor-pointer ${
                        active
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      {preset}d
                    </button>
                  );
                })}
              </div>
            </div>
            {historyDaysValidation.error ? (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {historyDaysValidation.error}
              </p>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Includes movement activity within the {historyDaysValidation.value}-day regression span.
              </p>
            )}
          </div>

          {/* 3. Window End Anchor */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              History Window Anchor
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setWindowAnchor('today')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  windowAnchor === 'today'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Ending Today
              </button>
              <button
                type="button"
                onClick={() => setWindowAnchor('latest_activity')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  windowAnchor === 'latest_activity'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Latest Activity
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {windowAnchor === 'today'
                ? `Anchored to ${formatReadableIsoDate(todayIso)}`
                : 'Anchored to the item’s most recent logged movement'}
            </p>
          </div>

          {/* 4. Minimum / Reorder Stock Threshold */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Minimum Stock Threshold
            </span>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setThresholdMode('item')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  thresholdMode === 'item'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Item Reorder ({selectedStockItem?.ReorderLevel ?? 'None'})
              </button>
              <button
                type="button"
                onClick={() => {
                  setThresholdMode('custom');
                  if (selectedStockItem && Number.isFinite(selectedStockItem.ReorderLevel)) {
                    setCustomThresholdInput(String(selectedStockItem.ReorderLevel));
                  }
                }}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  thresholdMode === 'custom'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Custom
              </button>
              <button
                type="button"
                onClick={() => setThresholdMode('none')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                  thresholdMode === 'none'
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                0 Floor Only
              </button>
            </div>

            {thresholdMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="number"
                  min={0}
                  step={1}
                  aria-label="Custom minimum threshold"
                  value={customThresholdInput}
                  onChange={(e) => setCustomThresholdInput(e.target.value)}
                  className="w-28 px-2.5 py-1.5 text-xs font-mono tabular-nums font-bold rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                />
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {selectedStockItem?.Unit || 'Units'}
                </span>
              </div>
            )}
            {thresholdValidation.error && (
              <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                {thresholdValidation.error}
              </p>
            )}
          </div>
        </div>

        {/* Multi-Target-Date Picker Row */}
        <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                <span>Future Target Dates</span>
              </span>

              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="Select future target date"
                  min={addDaysToIsoDate(todayIso, 1)}
                  value={newTargetDateInput}
                  onChange={(e) => {
                    setNewTargetDateInput(e.target.value);
                    setDateInputError(null);
                  }}
                  className="px-2.5 py-1.5 text-xs font-mono rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddTargetDate()}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Date</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mr-1">Quick add:</span>
              {QUICK_FUTURE_OFFSETS.map((days) => {
                const candidate = addDaysToIsoDate(todayIso, days);
                const exists = targetDates.includes(candidate);
                return (
                  <button
                    key={days}
                    type="button"
                    disabled={exists}
                    onClick={() => handleAddTargetDate(candidate)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold border transition ${
                      exists
                        ? 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-teal-500 cursor-pointer'
                    }`}
                  >
                    +{days}d
                  </button>
                );
              })}
            </div>
          </div>

          {dateInputError && (
            <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{dateInputError}</span>
            </p>
          )}

          {/* Active target date tokens */}
          {targetDates.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No target dates selected yet. Add one or more future dates above to forecast expected remaining stock and replenishment needs.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {targetDates.map((d) => {
                const diff = calculateFutureDaysFromDate(todayIso, d);
                return (
                  <div
                    key={d}
                    className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs border ${
                      diff.valid
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    <span className="font-semibold">{formatReadableIsoDate(d)}</span>
                    <span className="font-mono tabular-nums text-[11px] text-slate-500 dark:text-slate-400">
                      {diff.valid ? `(+${diff.daysFromCurrentDate}d)` : '(invalid)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTargetDate(d)}
                      aria-label={`Remove target date ${d}`}
                      className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="h-20 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
            <div className="h-20 bg-slate-100 dark:bg-slate-800/70 rounded-xl" />
          </div>
          <div className="h-64 bg-slate-100 dark:bg-slate-800/50 rounded-xl" />
        </div>
      )}

      {/* Database / Query Error State */}
      {!isLoading && loadError && (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                Unable to Load Forecast Data
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">{loadError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry SQLite Query</span>
          </button>
        </div>
      )}

      {/* Unreliable / Insufficient / No-Movement Explanation State */}
      {!isLoading && !loadError && report && !report.isReliable && (
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {report.statusTitle}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {report.statusExplanation}
              </p>
            </div>
          </div>

          {/* Recovery Actions when older SQLite logs exist */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {report.assumptions.totalLogsAllTime > 0 &&
              report.assumptions.latestLogDateIso &&
              windowAnchor !== 'latest_activity' && (
                <button
                  type="button"
                  onClick={() => setWindowAnchor('latest_activity')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>
                    Anchor Window to Latest Activity ({formatReadableIsoDate(report.assumptions.latestLogDateIso)})
                  </span>
                </button>
              )}

            {historyDaysValidation.value < 180 && (
              <button
                type="button"
                onClick={() => setHistoryDaysInput('180')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 transition cursor-pointer"
              >
                <span>Expand Window to 180 Days</span>
              </button>
            )}
          </div>

          {/* Transparent window assumptions even when forecast cannot run */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-slate-500 dark:text-slate-400">Inspected Window</div>
              <div className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {formatReadableIsoDate(report.assumptions.windowStartDateIso)} –{' '}
                {formatReadableIsoDate(report.assumptions.windowEndDateIso)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Events in Window</div>
              <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {report.assumptions.movementEventsInWindow}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">All-Time SQLite Logs</div>
              <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {report.assumptions.totalLogsAllTime}
              </div>
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400">Current Stock</div>
              <div className="font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                {report.assumptions.currentStock.toLocaleString()} {report.assumptions.unit}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reliable Forecast Output */}
      {!isLoading && !loadError && report && report.isReliable && (
        <>
          {/* Non-blocking Warnings (e.g. missing minimum threshold or flat trend) */}
          {report.warnings.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-1.5">
              {report.warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* 4 Summary KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Current Stock */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Current Stock On Hand
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {report.assumptions.currentStock.toLocaleString()}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {report.assumptions.unit}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {report.assumptions.itemId} · As of {formatReadableIsoDate(report.assumptions.currentDateIso)}
              </div>
            </div>

            {/* Daily Regression Trend */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Estimated Daily Trend
                </span>
                {(report.assumptions.dailyTrend || 0) < -0.0005 ? (
                  <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                ) : (report.assumptions.dailyTrend || 0) > 0.0005 ? (
                  <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Minus className="w-4 h-4 text-slate-400" />
                )}
              </div>
              <div
                className={`text-2xl font-extrabold font-mono tabular-nums mt-1 ${
                  (report.assumptions.dailyTrend || 0) < -0.0005
                    ? 'text-amber-600 dark:text-amber-400'
                    : (report.assumptions.dailyTrend || 0) > 0.0005
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {(report.assumptions.dailyTrend || 0) > 0 ? '+' : ''}
                {(report.assumptions.dailyTrend ?? 0).toFixed(2)}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {report.assumptions.unit}/day
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-mono tabular-nums">
                R² fit: {report.assumptions.rSquared?.toFixed(3)} · {report.assumptions.movementEventsInWindow} events
              </div>
            </div>

            {/* Minimum Stock Level */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Minimum Stock Threshold
              </div>
              <div className="text-2xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                {report.assumptions.minimumThreshold !== null ? (
                  <>
                    {report.assumptions.minimumThreshold.toLocaleString()}{' '}
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {report.assumptions.unit}
                    </span>
                  </>
                ) : (
                  <span className="text-lg text-slate-500 dark:text-slate-400">None (0 floor)</span>
                )}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {report.assumptions.thresholdSource === 'USER_DEFINED'
                  ? 'User-defined override'
                  : report.assumptions.thresholdSource === 'ITEM_REORDER_LEVEL'
                  ? 'Item SQLite reorder level'
                  : 'Shortfall checked against 0'}
              </div>
            </div>

            {/* Max Additional Need Across Target Dates */}
            <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Max Est. Replenishment Need
              </div>
              <div
                className={`text-2xl font-extrabold font-mono tabular-nums mt-1 ${
                  maxAdditionalNeeded > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {maxAdditionalNeeded > 0 ? `+${maxAdditionalNeeded.toLocaleString()}` : '0'}{' '}
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {report.assumptions.unit}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {firstShortfallDate
                  ? `First shortfall by ${firstShortfallDate.formattedDate}`
                  : validTargetForecasts.length > 0
                  ? 'Adequate across selected dates'
                  : 'Add target dates to evaluate'}
              </div>
            </div>
          </div>

          {/* Target-Date Projections Table & Date-Specific Practical Summaries */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Projected Stock vs. Estimated Quantity Needed by Target Date
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Separate readout of expected remaining stock on hand versus estimated additional units required to prevent depletion or breach the minimum threshold.
                </p>
              </div>
              {maxAdditionalNeeded > 0 && onNavigateToReorder && (
                <button
                  type="button"
                  onClick={onNavigateToReorder}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shrink-0"
                >
                  Open Reorder Report &rarr;
                </button>
              )}
            </div>

            {report.targetForecasts.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Select at least one future target date above to calculate projected remaining stock and quantity needed.
              </div>
            ) : (
              <div className="space-y-3">
                {report.targetForecasts.map((tf) => {
                  const needsStock = (tf.estimatedQtyNeeded || 0) > 0;
                  return (
                    <div
                      key={tf.targetDateIso}
                      className={`p-4 rounded-xl border transition ${
                        !tf.valid
                          ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                          : needsStock
                          ? 'bg-rose-50/40 dark:bg-rose-950/15 border-rose-200 dark:border-rose-900/60'
                          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Left: Practical Date-Specific Statement */}
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-bold text-slate-900 dark:text-white">
                              {tf.formattedDate}
                            </span>
                            {tf.valid && tf.daysFromCurrentDate !== null && (
                              <>
                                <span>·</span>
                                <span className="font-mono tabular-nums">
                                  In {tf.daysFromCurrentDate} day{tf.daysFromCurrentDate === 1 ? '' : 's'}
                                </span>
                              </>
                            )}
                            <span>·</span>
                            <span
                              className={`font-semibold ${
                                !tf.valid || needsStock
                                  ? 'text-rose-700 dark:text-rose-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {tf.statusLabel}
                            </span>
                          </div>

                          <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {tf.headlineMessage}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400">
                            {tf.detailMessage}
                          </p>
                        </div>

                        {/* Right: Distinct Quantitative Readouts */}
                        {tf.valid && (
                          <div className="grid grid-cols-2 gap-3 shrink-0 lg:min-w-[300px]">
                            <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Projected Available
                              </div>
                              <div className="text-base font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-0.5">
                                {tf.projectedAvailableStock?.toLocaleString()}{' '}
                                <span className="text-[11px] font-medium text-slate-500">
                                  {report.assumptions.unit}
                                </span>
                              </div>
                              {tf.projectedDepletionDeficit > 0 && (
                                <div className="text-[10px] font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                                  Raw projection: {tf.rawProjectedStock}
                                </div>
                              )}
                            </div>

                            <div
                              className={`p-2.5 rounded-lg border ${
                                needsStock
                                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
                                  : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60'
                              }`}
                            >
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                                Est. Qty Needed
                              </div>
                              <div
                                className={`text-base font-extrabold font-mono tabular-nums mt-0.5 ${
                                  needsStock
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-emerald-700 dark:text-emerald-300'
                                }`}
                              >
                                {needsStock
                                  ? `${tf.estimatedQtyNeeded?.toLocaleString()} ${report.assumptions.unit}`
                                  : `0 ${report.assumptions.unit}`}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                {!needsStock && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                                <span>
                                  {tf.evaluatedThreshold !== null
                                    ? `vs ${tf.evaluatedThreshold} min`
                                    : 'vs 0 floor'}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Historical + Projected Trajectory Chart */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Historical Stock Balance &amp; Projected Trajectory (Estimate)
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Reconstructed end-of-day stock levels in the {report.assumptions.historyDays}-day history window alongside the OLS linear regression trend line.
                </p>
              </div>
            </div>

            <div className="w-full h-72 sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={report.chartSeries} margin={{ top: 14, right: 16, left: -8, bottom: 4 }}>
                  <defs>
                    <linearGradient id="forecastHistoryArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={palette.stationery} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={palette.stationery} stopOpacity={0.02} />
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
                    minTickGap={22}
                    tick={{ fontSize: 11, fill: palette.axisText }}
                    axisLine={{ stroke: palette.axisLine }}
                    tickLine={{ stroke: palette.axisLine }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: palette.axisText }}
                    axisLine={{ stroke: palette.axisLine }}
                    tickLine={{ stroke: palette.axisLine }}
                  />
                  <Tooltip
                    content={
                      <ForecastChartTooltip unit={report.assumptions.unit} isDark={isDark} />
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

                  {/* Stockout zero baseline */}
                  <ReferenceLine
                    y={0}
                    stroke="#64748b"
                    strokeDasharray="2 2"
                  />

                  {/* Minimum / Reorder Threshold reference line */}
                  {report.assumptions.minimumThreshold !== null && (
                    <ReferenceLine
                      y={report.assumptions.minimumThreshold}
                      stroke="#e11d48"
                      strokeDasharray="5 4"
                      label={{
                        value: `Min (${report.assumptions.minimumThreshold})`,
                        position: 'insideTopRight',
                        fill: '#e11d48',
                        fontSize: 11,
                        fontWeight: 700,
                      }}
                    />
                  )}

                  {/* Vertical markers for selected future target dates */}
                  {validTargetForecasts.map((tf) => {
                    const matchPt = report.chartSeries.find((p) => p.dateIso === tf.targetDateIso);
                    if (!matchPt) return null;
                    return (
                      <ReferenceLine
                        key={tf.targetDateIso}
                        x={matchPt.label}
                        stroke={palette.predictionLine}
                        strokeDasharray="3 3"
                        label={{
                          value: `+${tf.daysFromCurrentDate}d`,
                          position: 'top',
                          fill: palette.predictionLine,
                          fontSize: 10,
                          fontWeight: 700,
                        }}
                      />
                    );
                  })}

                  <Area
                    type="monotone"
                    name="Historical Stock"
                    dataKey="historicalStock"
                    stroke={palette.stationery}
                    strokeWidth={2.25}
                    fill="url(#forecastHistoryArea)"
                    connectNulls={false}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />

                  <Line
                    type="linear"
                    name="OLS Linear Fit"
                    dataKey="regressionTrend"
                    stroke="#64748b"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={false}
                  />

                  <Line
                    type="linear"
                    name="Projected Stock (Estimate)"
                    dataKey="projectedStock"
                    stroke={palette.predictionLine}
                    strokeWidth={2.75}
                    strokeDasharray="6 4"
                    connectNulls={false}
                    dot={(dotProps: any) => {
                      const { cx, cy, payload } = dotProps;
                      if (!payload?.isTargetDate || cx === undefined || cy === undefined) {
                        return <g key={`empty-${payload?.dateIso}`} />;
                      }
                      return (
                        <circle
                          key={`target-${payload.dateIso}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={palette.predictionLine}
                          stroke={isDark ? '#0f172a' : '#ffffff'}
                          strokeWidth={2}
                        />
                      );
                    }}
                    activeDot={{ r: 5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explicit Model Assumptions Panel */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
              <SlidersHorizontal className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Model Assumptions &amp; Calculation Basis (Estimate Only)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Selected History Window
                </div>
                <div className="font-mono font-bold text-slate-900 dark:text-white mt-0.5">
                  {report.assumptions.historyDays} days
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {formatReadableIsoDate(report.assumptions.windowStartDateIso)} to{' '}
                  {formatReadableIsoDate(report.assumptions.windowEndDateIso)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Daily Linear Trend (Slope)
                </div>
                <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                  {(report.assumptions.dailyTrend || 0) > 0 ? '+' : ''}
                  {report.assumptions.dailyTrend?.toFixed(4)} {report.assumptions.unit}/day
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  R² = {report.assumptions.rSquared?.toFixed(3)} · Anchor:{' '}
                  {report.assumptions.windowAnchor === 'latest_activity' ? 'Latest Log' : 'Today'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Window Movement Activity
                </div>
                <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                  {report.assumptions.movementEventsInWindow} events ({report.assumptions.activeDaysInWindow} active d)
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  +{report.assumptions.totalInboundUnits} in / -{report.assumptions.totalOutboundUnits} out
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Baseline Stock &amp; Threshold
                </div>
                <div className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mt-0.5">
                  {report.assumptions.currentStock} {report.assumptions.unit} on{' '}
                  {formatReadableIsoDate(report.assumptions.currentDateIso)}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Min threshold:{' '}
                  {report.assumptions.minimumThreshold !== null
                    ? `${report.assumptions.minimumThreshold} ${report.assumptions.unit}`
                    : 'Not configured (0 floor)'}
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
              {report.estimateDisclaimer}
            </p>
          </div>
        </>
      )}
    </div>
  );
};
