import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
  AlertTriangle,
  Package,
  Calendar,
  Layers,
  ArrowDownToLine,
  Download,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building2,
  SlidersHorizontal,
  ChevronRight,
  Info,
  DollarSign,
  ArrowRight,
  Send,
  BarChart3,
  LineChart as LineChartIcon,
  Flame,
  Target,
  RotateCcw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { StockItem, MovementLogEntry, ItemCategory } from '../../types';
import {
  ForecastModelType,
  FORECAST_MODELS,
  calculateUpcomingMonthDemandForecast,
  ItemDemandForecast,
  calculatePredictedVsActualUsageTrends,
  PredictedVsActualDataPoint,
} from '../../utils/demandForecasting';
import { useTheme } from '../../hooks/useTheme';

interface ExecutiveDemandForecastingViewProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  onOpenQuickAction?: (actionType: 'delivery' | 'issue' | 'adjustment' | 'reorderReport') => void;
  onSelectItemForReorder?: (item: StockItem) => void;
}

export const ExecutiveDemandForecastingView: React.FC<ExecutiveDemandForecastingViewProps> = ({
  stockItems = [],
  movementLogs = [],
  onOpenQuickAction,
  onSelectItemForReorder,
}) => {
  const { isDark, palette } = useTheme();

  const safeStock = useMemo(() => (Array.isArray(stockItems) ? stockItems : []), [stockItems]);
  const safeLogs = useMemo(() => (Array.isArray(movementLogs) ? movementLogs : []), [movementLogs]);

  // Model and forecast controls
  const [selectedModel, setSelectedModel] = useState<ForecastModelType>('weighted');
  const [safetyBufferPct, setSafetyBufferPct] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'DEFICIT' | 'LOW_MARGIN' | 'ADEQUATE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [chartViewMode, setChartViewMode] = useState<'category' | 'total'>('category');

  // Predicted vs. Actual Line Graph Controls
  const [trendTimeframe, setTrendTimeframe] = useState<'monthly' | 'weekly'>('monthly');
  const [trendScope, setTrendScope] = useState<string>('ALL');
  const [showConfidenceBand, setShowConfidenceBand] = useState<boolean>(true);
  const [showMovingAverage, setShowMovingAverage] = useState<boolean>(true);
  const [showReorderThreshold, setShowReorderThreshold] = useState<boolean>(true);

  // Compute forecast summary
  const forecastSummary = useMemo(() => {
    return calculateUpcomingMonthDemandForecast(safeStock, safeLogs, {
      model: selectedModel,
      customBufferPct: safetyBufferPct,
      categoryFilter,
    });
  }, [safeStock, safeLogs, selectedModel, safetyBufferPct, categoryFilter]);

  // Compute trend result for the Recharts Line Graph
  const trendResult = useMemo(() => {
    return calculatePredictedVsActualUsageTrends(safeStock, safeLogs, {
      timeframe: trendTimeframe,
      scope: trendScope,
      model: selectedModel,
      customBufferPct: safetyBufferPct,
      historicalCount: trendTimeframe === 'monthly' ? 6 : 8,
      forecastCount: trendTimeframe === 'monthly' ? 3 : 4,
    });
  }, [safeStock, safeLogs, trendTimeframe, trendScope, selectedModel, safetyBufferPct]);

  // Compute individual item forecasts for the table
  const allItemForecasts = useMemo(() => {
    // Re-run with current model to get item-level details
    const summary = calculateUpcomingMonthDemandForecast(stockItems, movementLogs, {
      model: selectedModel,
      customBufferPct: safetyBufferPct,
      categoryFilter: 'ALL',
    });
    // We can extract all items by calculating for all
    const safeStock = Array.isArray(stockItems) ? stockItems : [];
    const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];
    
    // We already have topRisk and topDemand, but let's build the full table from safeStock
    return safeStock.map((item) => {
      const currentQty = Number(item.Qty) || 0;
      const reorderLevel = Number(item.ReorderLevel) || 10;
      const unitPrice = Number(item.UnitPrice) || 2.5;

      // Find logs for this item
      const itemLogs = safeLogs.filter((l) => l.ItemID === item.ItemID && l.Type === 'ISSUE');
      const totalPastIssues = itemLogs.reduce((acc, l) => acc + Math.abs(Number(l.Qty) || 0), 0);
      const avgMonthly = Math.max(1, Math.round((totalPastIssues / 3) * 10) / 10);

      let predicted = avgMonthly;
      if (selectedModel === 'weighted') {
        predicted = Math.round(avgMonthly * 1.05);
      } else if (selectedModel === 'trend') {
        predicted = Math.round(avgMonthly * 1.1);
      } else if (selectedModel === 'buffer') {
        predicted = Math.round(avgMonthly * 1.15);
      }
      predicted = Math.round(predicted * (1 + safetyBufferPct / 100));

      const endingStock = currentQty - predicted;
      const dailyRate = predicted / summary.daysInUpcomingMonth;
      const runwayDays = dailyRate > 0 ? Math.floor(currentQty / dailyRate) : 999;

      let stockoutRisk: ItemDemandForecast['stockoutRisk'] = 'ADEQUATE';
      let stockoutDayEstimate: number | null = null;
      let urgencyScore = 0;

      if (currentQty <= 0) {
        stockoutRisk = 'DEFICIT';
        stockoutDayEstimate = 1;
        urgencyScore = 100;
      } else if (currentQty < predicted) {
        stockoutRisk = 'DEFICIT';
        stockoutDayEstimate = Math.max(1, Math.min(summary.daysInUpcomingMonth, Math.floor(currentQty / dailyRate)));
        urgencyScore = 80 + (30 - Math.min(30, runwayDays));
      } else if (endingStock <= reorderLevel) {
        stockoutRisk = 'LOW_MARGIN';
        urgencyScore = 50 + (reorderLevel - endingStock);
      } else if (currentQty > predicted * 3) {
        stockoutRisk = 'OVERSTOCKED';
        urgencyScore = 5;
      } else {
        stockoutRisk = 'ADEQUATE';
        urgencyScore = 20;
      }

      let suggestedReorderQty = 0;
      if (endingStock < reorderLevel) {
        suggestedReorderQty = Math.max(reorderLevel * 2, predicted + reorderLevel - currentQty);
      }

      return {
        item,
        itemID: item.ItemID,
        itemName: item.ItemName,
        category: item.Category,
        unit: item.Unit || 'Units',
        currentQty,
        reorderLevel,
        unitPrice,
        historicalMonthlyIssues: [],
        pastMonthUsage: Math.round(avgMonthly),
        threeMonthAverage: avgMonthly,
        predictedNextMonthUsage: predicted,
        predictedEndingStock: endingStock,
        runwayDays,
        stockoutRisk,
        stockoutDayEstimate,
        suggestedReorderQty: Math.ceil(suggestedReorderQty),
        projectedProcurementCost: Math.round(suggestedReorderQty * unitPrice * 100) / 100,
        topDepartment: itemLogs[0]?.DeptName || 'Administration',
        urgencyScore,
      };
    });
  }, [stockItems, movementLogs, selectedModel, safetyBufferPct]);

  // Filter items for table display
  const filteredItems = useMemo(() => {
    return allItemForecasts
      .filter((f) => {
        if (categoryFilter !== 'ALL' && f.category !== categoryFilter) return false;
        if (riskFilter !== 'ALL' && f.stockoutRisk !== riskFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchSku = f.itemID.toLowerCase().includes(q);
          const matchName = f.itemName.toLowerCase().includes(q);
          if (!matchSku && !matchName) return false;
        }
        return true;
      })
      .sort((a, b) => b.urgencyScore - a.urgencyScore);
  }, [allItemForecasts, categoryFilter, riskFilter, searchQuery]);

  // Export forecast to Excel
  const handleExportExcel = () => {
    const rows = filteredItems.map((f) => ({
      'Item ID': f.itemID,
      'Item Name': f.itemName,
      Category: f.category,
      'Current Stock': f.currentQty,
      Unit: f.unit,
      'Reorder Level': f.reorderLevel,
      'Historical 3M Avg (Monthly)': f.threeMonthAverage,
      [`Predicted Usage (${forecastSummary.upcomingMonthLabel})`]: f.predictedNextMonthUsage,
      'Projected Ending Stock': f.predictedEndingStock,
      'Estimated Runway (Days)': f.runwayDays > 365 ? '365+' : f.runwayDays,
      'Forecast Risk Status': f.stockoutRisk,
      'Predicted Stockout Day': f.stockoutDayEstimate ? `Day ${f.stockoutDayEstimate}` : 'None',
      'Suggested Procurement Reorder (Units)': f.suggestedReorderQty,
      'Unit Price ($)': f.unitPrice,
      'Projected Reorder Cost ($)': f.projectedProcurementCost,
      'Primary Dept Requester': f.topDepartment,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Upcoming_Month_Forecast');

    const fileName = `Paramount_Demand_Forecast_${forecastSummary.upcomingMonthKey}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Category Colors
  const CATEGORY_COLORS: Record<string, string> = {
    Stationery: palette.stationery,
    Cleaning: palette.cleaning,
    General: palette.general,
  };

  const pieData = [
    { name: 'Stationery', value: forecastSummary.projectedStationeryUsage, color: palette.stationery },
    { name: 'Cleaning', value: forecastSummary.projectedCleaningUsage, color: palette.cleaning },
    { name: 'General', value: forecastSummary.projectedGeneralUsage, color: palette.general },
  ].filter((d) => d.value > 0);

  // Custom Chart Tooltip
  const CustomForecastTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const isForecastPoint = payload[0]?.payload?.isForecast;

    return (
      <div
        className="p-3 rounded-xl border shadow-xl text-xs space-y-1.5 backdrop-blur-md"
        style={{
          backgroundColor: palette.tooltipBg,
          borderColor: isForecastPoint ? '#6366f1' : palette.tooltipBorder,
          color: palette.tooltipText,
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b pb-1 border-slate-200 dark:border-slate-800">
          <span className="font-extrabold text-sm flex items-center gap-1.5">
            {isForecastPoint && <Sparkles className="w-3.5 h-3.5 text-indigo-500" />}
            {label}
          </span>
          {isForecastPoint ? (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded">
              Predicted Horizon
            </span>
          ) : (
            <span className="text-[10px] text-slate-400 font-mono">Historical</span>
          )}
        </div>

        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === 'upperConfidence' || entry.dataKey === 'lowerConfidence') return null;
          return (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-bold font-mono">
                {entry.value.toLocaleString()} units
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Custom Trend Tooltip for Predicted vs. Actual Line Graph
  const CustomTrendTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const point: PredictedVsActualDataPoint = payload[0]?.payload;
    if (!point) return null;

    return (
      <div
        className="p-3.5 rounded-xl border shadow-xl text-xs space-y-2 backdrop-blur-md max-w-xs"
        style={{
          backgroundColor: palette.tooltipBg,
          borderColor: point.isForecast ? '#6366f1' : palette.tooltipBorder,
          color: palette.tooltipText,
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b pb-1.5 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-1.5">
            {point.isForecast ? (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <Calendar className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="font-extrabold text-sm">{point.fullLabel || label}</span>
          </div>
          <span
            className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md font-mono ${
              point.isForecast
                ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {point.isForecast ? 'Projected Horizon' : 'Actual Historical'}
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {/* Actual stock issues */}
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Actual Stock Issues:</span>
            </span>
            <span className="font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {point.actualUsage !== null ? `${point.actualUsage.toLocaleString()} units` : 'Future Period'}
            </span>
          </div>

          {/* Predicted stock usage trend */}
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>Predicted Usage Trend:</span>
            </span>
            <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
              {point.predictedUsage.toLocaleString()} units
            </span>
          </div>

          {/* Variance (Historical) */}
          {!point.isForecast && point.varianceUnits !== null && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Model Variance:</span>
              <span
                className={`font-mono font-bold ${
                  point.varianceUnits > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : point.varianceUnits < 0
                    ? 'text-teal-600 dark:text-teal-400'
                    : 'text-slate-400'
                }`}
              >
                {point.varianceUnits > 0 ? '+' : ''}
                {point.varianceUnits} units ({point.variancePct !== null && point.variancePct > 0 ? '+' : ''}
                {point.variancePct}%)
              </span>
            </div>
          )}

          {/* Confidence interval (Forecast) */}
          {point.isForecast && (
            <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
              <span className="text-slate-500 dark:text-slate-400">Confidence Band (±12%):</span>
              <span className="font-mono font-semibold text-indigo-500 dark:text-indigo-400">
                [{point.lowerConfidence.toLocaleString()} – {point.upperConfidence.toLocaleString()}]
              </span>
            </div>
          )}

          {/* 3-period moving average */}
          {point.movingAverage && (
            <div className="flex items-center justify-between gap-4 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-0.5 bg-amber-500" />
                <span>3-Period Moving Avg:</span>
              </span>
              <span className="font-mono font-medium">{point.movingAverage.toLocaleString()} units</span>
            </div>
          )}

          {/* Log count */}
          {!point.isForecast && point.logCount !== undefined && point.logCount > 0 && (
            <div className="text-[10px] text-slate-400 pt-0.5">
              Derived from {point.logCount} historical issue requisition{point.logCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full space-y-6 animate-in fade-in duration-200">
      {/* View Header Banner */}
      <div className="p-5 bg-linear-to-r from-indigo-950/20 via-slate-900/5 to-emerald-950/20 dark:from-indigo-950/40 dark:via-slate-900/60 dark:to-emerald-950/40 border border-indigo-500/20 dark:border-indigo-500/30 rounded-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Demand Forecasting &amp; Stock Consumption Prediction
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800">
                    {forecastSummary.upcomingMonthLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  Predicts stock issue volumes for the upcoming month ({forecastSummary.upcomingMonthLabel}) by analyzing historical movement logs, consumption velocity, and reorder thresholds.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-2xs"
            >
              <Download className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Export Forecast (Excel)</span>
            </button>

            {onOpenQuickAction && (
              <button
                type="button"
                onClick={() => onOpenQuickAction('delivery')}
                className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition cursor-pointer shadow-md"
              >
                <ArrowDownToLine className="w-4 h-4" />
                <span>Procure Safety Stock</span>
              </button>
            )}
          </div>
        </div>

        {/* Model Selection & Simulation Toolbar */}
        <div className="mt-5 pt-4 border-t border-indigo-200/40 dark:border-indigo-900/40 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
              <span>Prediction Model:</span>
            </span>

            {FORECAST_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setSelectedModel(model.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedModel === model.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
                title={model.description}
              >
                <span>{model.name}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                    selectedModel === model.id
                      ? 'bg-indigo-800 text-indigo-100'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {model.badge}
                </span>
              </button>
            ))}
          </div>

          {/* Safety Buffer Adjustment Slider */}
          <div className="flex items-center gap-3 bg-white/70 dark:bg-slate-800/70 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 self-start lg:self-auto">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              <span>Safety Buffer:</span>
            </span>
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              value={safetyBufferPct}
              onChange={(e) => setSafetyBufferPct(Number(e.target.value))}
              className="w-24 accent-indigo-600 cursor-pointer"
            />
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 min-w-[32px]">
              +{safetyBufferPct}%
            </span>
          </div>
        </div>
      </div>

      {/* KPI Highlight Cards for Upcoming Month */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Projected Usage */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Projected {forecastSummary.upcomingMonthLabel.split(' ')[0]} Usage
            </span>
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {forecastSummary.projectedTotalUsage.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            {forecastSummary.monthOverMonthChangePct !== null ? (
              forecastSummary.monthOverMonthChangePct >= 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center">
                  <TrendingUp className="w-3 h-3 mr-0.5" />+{forecastSummary.monthOverMonthChangePct}%
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                  <TrendingDown className="w-3 h-3 mr-0.5" />{forecastSummary.monthOverMonthChangePct}%
                </span>
              )
            ) : null}
            <span>vs. past month ({forecastSummary.previousMonthTotalUsage} units)</span>
          </div>
        </div>

        {/* Card 2: Projected Stockout Deficits */}
        <div
          onClick={() => setRiskFilter('DEFICIT')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 rounded-2xl shadow-2xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Predicted Stockout Deficits
            </span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2 flex items-baseline gap-2">
            <span>{forecastSummary.itemsWithDeficitCount} SKUs</span>
            <span className="text-xs font-semibold text-rose-500/80">exhaustion alert</span>
          </div>
          <div className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1 group-hover:underline flex items-center gap-1">
            <span>Stock will hit 0 before month end &rarr;</span>
          </div>
        </div>

        {/* Card 3: Below Safety Buffer */}
        <div
          onClick={() => setRiskFilter('LOW_MARGIN')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl shadow-2xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Breaching Reorder Buffer
            </span>
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2 flex items-baseline gap-2">
            <span>{forecastSummary.itemsBelowSafetyCount} SKUs</span>
            <span className="text-xs font-semibold text-amber-500/80">near buffer</span>
          </div>
          <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 group-hover:underline flex items-center gap-1">
            <span>Ending stock &le; reorder level &rarr;</span>
          </div>
        </div>

        {/* Card 4: Recommended Pre-Month Procurement */}
        <div
          onClick={() => onOpenQuickAction && onOpenQuickAction('reorderReport')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 rounded-2xl shadow-2xs cursor-pointer transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Suggested Pre-Month Order
            </span>
            <ArrowDownToLine className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
            {forecastSummary.totalSuggestedReorderUnits.toLocaleString()}{' '}
            <span className="text-xs font-normal text-slate-400">units</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 group-hover:underline flex items-center gap-1">
            <span>Est. ${forecastSummary.totalEstimatedReorderCost.toLocaleString()} volume &rarr;</span>
          </div>
        </div>
      </div>

      {/* Primary Feature: Predicted Stock Usage Trends vs. Actual Historical Data (Recharts Line Graph) */}
      <div
        id="demand-trend-line-graph"
        className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4"
      >
        {/* Card Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                <LineChartIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                Predicted Stock Usage Trends vs. Actual Historical Data
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                Recharts Time Series
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Solid line plots actual issue transactions extracted from movement logs; dashed line models algorithmic consumption velocity and future forecast horizons.
            </p>
          </div>

          {/* Controls Bar: Timeframe & Scope Selector */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Timeframe Switcher */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setTrendTimeframe('monthly')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  trendTimeframe === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Monthly (6M + 3M Proj)
              </button>
              <button
                type="button"
                onClick={() => setTrendTimeframe('weekly')}
                className={`px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ${
                  trendTimeframe === 'weekly'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Weekly (8W + 4W Proj)
              </button>
            </div>

            {/* Scope / Item Filter Dropdown */}
            <div className="relative">
              <select
                value={trendScope}
                onChange={(e) => setTrendScope(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 max-w-[260px] truncate cursor-pointer"
              >
                <optgroup label="Inventory Aggregation">
                  <option value="ALL">All Inventory (Master Stock Total)</option>
                  <option value="Stationery">Stationery Category</option>
                  <option value="Cleaning">Cleaning Category</option>
                  <option value="General">General Category</option>
                </optgroup>
                <optgroup label="Inspect Specific Stock Item (SKU)">
                  {safeStock.map((item) => (
                    <option key={item.ItemID} value={item.ItemID}>
                      {item.ItemID} — {item.ItemName} ({item.Category})
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>
        </div>

        {/* Selected Scope Indicator & Toggles Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-slate-500 dark:text-slate-400 font-medium">Target Scope:</span>
            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
              <Package className="w-3.5 h-3.5 text-indigo-500" />
              <span>{trendResult.summary.scopeName}</span>
            </span>

            {trendResult.summary.itemDetails && (
              <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <span>On-hand: <strong className="text-slate-800 dark:text-slate-200">{trendResult.summary.itemDetails.currentQty} {trendResult.summary.itemDetails.unit}</strong></span>
                <span>•</span>
                <span>Reorder Level: <strong className="text-amber-600 dark:text-amber-400">{trendResult.summary.itemDetails.reorderLevel} {trendResult.summary.itemDetails.unit}</strong></span>
              </span>
            )}

            {trendScope !== 'ALL' && (
              <button
                type="button"
                onClick={() => setTrendScope('ALL')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 underline cursor-pointer ml-1"
              >
                Reset to All Stock
              </button>
            )}
          </div>

          {/* Visual Overlays Toggles */}
          <div className="flex items-center flex-wrap gap-3 text-[11px]">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showConfidenceBand}
                onChange={(e) => setShowConfidenceBand(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>Confidence Band (±12%)</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showMovingAverage}
                onChange={(e) => setShowMovingAverage(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <span>3-Period Moving Avg</span>
            </label>

            {trendResult.summary.itemDetails && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showReorderThreshold}
                  onChange={(e) => setShowReorderThreshold(e.target.checked)}
                  className="rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <span>Reorder Threshold Line</span>
              </label>
            )}
          </div>
        </div>

        {/* Telemetry Summary Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Historical Actual Issues
            </span>
            <div className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              {trendResult.summary.totalActualUsage.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Recorded across {trendResult.series.filter(s => !s.isForecast).length} historical periods
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Forecast Horizon Demand
            </span>
            <div className="text-base font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              {trendResult.summary.totalPredictedHorizon.toLocaleString()} <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Projected requirement ({trendResult.series.filter(s => s.isForecast).length} periods)
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Historical Model Fit
            </span>
            <div className="text-base font-black text-slate-900 dark:text-white mt-0.5">
              {trendResult.summary.trackingAccuracyPct}%
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Backtested tracking accuracy
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Forecasting Model
            </span>
            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 truncate" title={FORECAST_MODELS.find(m => m.id === selectedModel)?.name}>
              {FORECAST_MODELS.find(m => m.id === selectedModel)?.name}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">
              Buffer: +{safetyBufferPct}%
            </div>
          </div>
        </div>

        {/* The Recharts Line Graph */}
        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trendResult.series} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.axisLine }}
              />
              <Tooltip content={<CustomTrendTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px', color: palette.text }} />

              {/* Demarcation line dividing Historical Logs from Forecast Horizon */}
              <ReferenceLine
                x={trendResult.summary.forecastBoundaryLabel}
                stroke={isDark ? '#818cf8' : '#6366f1'}
                strokeDasharray="4 4"
                strokeWidth={2}
                label={{
                  value: 'FORECAST HORIZON',
                  position: 'insideTopLeft',
                  fill: isDark ? '#a5b4fc' : '#4f46e5',
                  fontSize: 10,
                  fontWeight: 800,
                }}
              />

              {/* Optional Reorder Level Threshold Line for specific item */}
              {showReorderThreshold && trendResult.summary.itemDetails && (
                <ReferenceLine
                  y={trendResult.summary.itemDetails.reorderLevel}
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{
                    value: `Reorder Level (${trendResult.summary.itemDetails.reorderLevel})`,
                    position: 'insideBottomRight',
                    fill: '#f59e0b',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                />
              )}

              {/* Confidence Band Area (±12%) */}
              {showConfidenceBand && (
                <Area
                  type="monotone"
                  dataKey="upperConfidence"
                  stroke="none"
                  fill="#818cf8"
                  fillOpacity={isDark ? 0.18 : 0.12}
                  name="Confidence Envelope (Upper Bound)"
                />
              )}

              {/* 3-Period Moving Average */}
              {showMovingAverage && (
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={false}
                  name="3-Period Moving Average"
                />
              )}

              {/* Line 1: Actual Historical Usage (from movement logs) */}
              <Line
                type="monotone"
                dataKey="actualUsage"
                name="Actual Historical Usage (Movement Logs)"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4.5, fill: '#10b981', stroke: palette.cardBg, strokeWidth: 2 }}
                activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2 }}
                connectNulls={false}
              />

              {/* Line 2: Predicted Usage Trend */}
              <Line
                type="monotone"
                dataKey="predictedUsage"
                name="Predicted Usage Trend"
                stroke="#6366f1"
                strokeWidth={3}
                strokeDasharray="5 5"
                dot={{ r: 4.5, fill: '#6366f1', stroke: palette.cardBg, strokeWidth: 2 }}
                activeDot={{ r: 7, stroke: '#6366f1', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Visual Key & Informational Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-emerald-500 rounded" />
              <span>Solid Green: Real historical issue movements</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-indigo-500 rounded border-dashed" />
              <span>Dashed Purple: Predicted algorithmic trajectory</span>
            </span>
            {showConfidenceBand && (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-indigo-300/40 rounded" />
                <span>Shaded: Statistical variance envelope</span>
              </span>
            )}
          </div>

          <div className="font-mono text-[11px]">
            Data points: {trendResult.series.length} total periods ({trendResult.series.filter(s => !s.isForecast).length} past, {trendResult.series.filter(s => s.isForecast).length} future)
          </div>
        </div>
      </div>

      {/* Main Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Visual 1: Historical to Upcoming Month Forecast (2 cols) */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Consumption Velocity &amp; Upcoming Month Demand Forecast</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Past 4-month actual issues leading into {forecastSummary.upcomingMonthLabel} projected requirement
              </p>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setChartViewMode('category')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  chartViewMode === 'category'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Category Split
              </button>
              <button
                type="button"
                onClick={() => setChartViewMode('total')}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                  chartViewMode === 'total'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Total Volume
              </button>
            </div>
          </div>

          <div className="w-full h-72 pt-3 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastSummary.forecastTrendChartData} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                  axisLine={{ stroke: palette.axisLine }}
                  tickLine={{ stroke: palette.axisLine }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }}
                  axisLine={{ stroke: palette.axisLine }}
                  tickLine={{ stroke: palette.axisLine }}
                />
                <Tooltip content={<CustomForecastTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

                {/* Vertical demarcation before the forecast column */}
                <ReferenceLine
                  x={`${forecastSummary.upcomingMonthLabel.split(' ')[0]} (Forecast)`}
                  stroke={isDark ? '#818cf8' : '#6366f1'}
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  label={{
                    value: 'FORECAST HORIZON',
                    position: 'insideTopLeft',
                    fill: isDark ? '#a5b4fc' : '#4f46e5',
                    fontSize: 10,
                    fontWeight: 800,
                  }}
                />

                {chartViewMode === 'category' ? (
                  <>
                    <Bar
                      name="Stationery"
                      dataKey="Stationery"
                      fill={palette.stationery}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="Cleaning"
                      dataKey="Cleaning"
                      fill={palette.cleaning}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      name="General"
                      dataKey="General"
                      fill={palette.general}
                      radius={[4, 4, 0, 0]}
                    />
                  </>
                ) : (
                  <Bar
                    name="Total Issue Units"
                    dataKey="Total"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                  />
                )}

                <Line
                  type="monotone"
                  dataKey="Total"
                  name="Trajectory Line"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#4f46e5', stroke: palette.cardBg, strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                Model applied: <strong className="text-slate-700 dark:text-slate-200">{FORECAST_MODELS.find((m) => m.id === selectedModel)?.name}</strong>
              </span>
            </div>
            <span className="font-mono text-[11px]">
              Upcoming Target: {forecastSummary.daysInUpcomingMonth} calendar days
            </span>
          </div>
        </div>

        {/* Visual 2: Category Breakdown Donut for Upcoming Month (1 col) */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>{forecastSummary.upcomingMonthLabel.split(' ')[0]} Category Demand</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Projected share of consumption volume
            </p>
          </div>

          <div className="w-full h-56 relative flex-1 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderRadius: '0.75rem',
                    color: palette.tooltipText,
                    fontSize: '12px',
                  }}
                  formatter={(value: any, name: any) => {
                    const pct = forecastSummary.projectedTotalUsage > 0
                      ? Math.round((Number(value) / forecastSummary.projectedTotalUsage) * 100)
                      : 0;
                    return [`${value} units (${pct}%)`, name];
                  }}
                />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={palette.cardBg} strokeWidth={2} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Demand</span>
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {forecastSummary.projectedTotalUsage.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400">units</span>
            </div>
          </div>

          {/* Category List */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {[
              {
                name: 'Stationery',
                qty: forecastSummary.projectedStationeryUsage,
                color: palette.stationery,
              },
              {
                name: 'Cleaning',
                qty: forecastSummary.projectedCleaningUsage,
                color: palette.cleaning,
              },
              {
                name: 'General',
                qty: forecastSummary.projectedGeneralUsage,
                color: palette.general,
              },
            ].map((c) => {
              const pct = forecastSummary.projectedTotalUsage > 0
                ? Math.round((c.qty / forecastSummary.projectedTotalUsage) * 100)
                : 0;
              return (
                <div key={c.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{c.name}</span>
                  </div>
                  <div className="font-mono font-bold text-slate-900 dark:text-white">
                    {c.qty} units <span className="text-slate-400 font-normal">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* High-Risk Stockout Warning Banner (if deficits detected) */}
      {forecastSummary.itemsWithDeficitCount > 0 && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <Flame className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-extrabold text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                  Critical Warning: {forecastSummary.itemsWithDeficitCount} Stock Items Predicted to Stock Out in {forecastSummary.upcomingMonthLabel.split(' ')[0]}
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                  Current on-hand inventory is insufficient to satisfy projected departmental requisition velocity. Place purchase orders immediately to avoid stockouts.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRiskFilter('DEFICIT')}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition"
              >
                Filter Deficit SKUs ({forecastSummary.itemsWithDeficitCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projected Department Demand Breakdown */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              Projected Requisition Distribution by Department ({forecastSummary.upcomingMonthLabel.split(' ')[0]})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Based on historical demand shares
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-3">
          {forecastSummary.projectedDepartmentUsage.map((dept, idx) => (
            <div
              key={dept.department}
              className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
                <span>#{idx + 1} DEPT</span>
                <span>{dept.percentage}%</span>
              </div>
              <div className="text-xs font-bold text-slate-900 dark:text-white truncate" title={dept.department}>
                {dept.department}
              </div>
              <div className="text-sm font-extrabold font-mono text-indigo-600 dark:text-indigo-400 mt-1">
                ~{dept.projectedQty} <span className="text-[10px] font-normal text-slate-400">units</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detailed Item-by-Item Demand Forecast Table */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Itemized SKU Demand Projections ({forecastSummary.upcomingMonthLabel})</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparison between current physical stock, projected consumption, runway days, and suggested orders.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU or Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500 w-44"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Categories</option>
              <option value="Stationery">Stationery</option>
              <option value="Cleaning">Cleaning</option>
              <option value="General">General</option>
            </select>

            {/* Risk Filter */}
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-hidden"
            >
              <option value="ALL">All Risk Statuses</option>
              <option value="DEFICIT">Stockout Deficit (&lt;30 days)</option>
              <option value="LOW_MARGIN">Low Safety Margin</option>
              <option value="ADEQUATE">Adequate Runway</option>
            </select>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="py-2.5 px-3">SKU / Item</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3 text-right">Current Stock</th>
                <th className="py-2.5 px-3 text-right">Hist. 3M Avg</th>
                <th className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-400">
                  Predicted Demand
                </th>
                <th className="py-2.5 px-3 text-right">Month-End Balance</th>
                <th className="py-2.5 px-3 text-center">Runway</th>
                <th className="py-2.5 px-3">Risk Status</th>
                <th className="py-2.5 px-3 text-right">Suggested Order</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                    No items match the selected forecast criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isDeficit = item.stockoutRisk === 'DEFICIT';
                  const isLowMargin = item.stockoutRisk === 'LOW_MARGIN';

                  return (
                    <tr
                      key={item.itemID}
                      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition ${
                        isDeficit ? 'bg-rose-50/30 dark:bg-rose-950/20' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400">
                          {item.itemID}
                        </div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                          {item.itemName}
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[item.category]}20`,
                            color: CATEGORY_COLORS[item.category],
                          }}
                        >
                          {item.category}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        {item.currentQty} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.threeMonthAverage}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                        {item.predictedNextMonthUsage} {item.unit}
                      </td>

                      <td
                        className={`py-2.5 px-3 text-right font-mono font-bold ${
                          item.predictedEndingStock < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : item.predictedEndingStock <= item.reorderLevel
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.predictedEndingStock} {item.unit}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                            item.runwayDays <= 15
                              ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                              : item.runwayDays <= 30
                              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {item.runwayDays > 365 ? '365+ d' : `${item.runwayDays} d`}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        {isDeficit ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" />
                            Stockout D{item.stockoutDayEstimate}
                          </span>
                        ) : isLowMargin ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                            <ShieldAlert className="w-3 h-3" />
                            Near Buffer
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            Adequate
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {item.suggestedReorderQty > 0 ? (
                          <span>+{item.suggestedReorderQty} {item.unit}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setTrendScope(item.itemID);
                              const el = document.getElementById('demand-trend-line-graph');
                              if (el) {
                                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              }
                            }}
                            className={`p-1 rounded-lg transition cursor-pointer ${
                              trendScope === item.itemID
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                            title={`Plot Predicted vs. Actual Line Graph for ${item.itemID}`}
                          >
                            <LineChartIcon className="w-3.5 h-3.5" />
                          </button>
                          {item.suggestedReorderQty > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (onSelectItemForReorder) {
                                  onSelectItemForReorder(item.item);
                                } else if (onOpenQuickAction) {
                                  onOpenQuickAction('delivery');
                                }
                              }}
                              className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-2xs transition cursor-pointer"
                            >
                              Reorder
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
