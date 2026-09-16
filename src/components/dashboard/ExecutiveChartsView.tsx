import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
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
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  PieChart as PieIcon,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Info,
  CalendarDays,
  CalendarRange,
  RotateCcw,
  Check,
  Sparkles,
  GitCompare,
  Activity,
  ArrowRight,
  ShieldCheck,
  Brain,
} from 'lucide-react';
import { StockItem, MovementLogEntry } from '../../types';
import {
  MonthlyCategoryConsumption,
  ConsumptionTrendPoint,
  DateRangeFilterConfig,
  calculateFlexibleConsumptionTrend,
} from '../../utils/predictiveAnalytics';
import { useTheme } from '../../hooks/useTheme';

interface ExecutiveChartsViewProps {
  stockItems?: StockItem[];
  movementLogs?: MovementLogEntry[];
  monthlyTrend?: MonthlyCategoryConsumption[];
  categoryDistribution: { name: string; value: number; count: number }[];
  deptConsumption: { name: string; qty: number }[];
}

const CATEGORY_COLORS: Record<string, string> = {
  Stationery: '#0d9488', // teal-600
  Cleaning: '#0284c7',   // sky-600
  General: '#10b981',    // emerald-500
};

const PIE_COLORS = ['#0d9488', '#0284c7', '#10b981', '#f59e0b', '#8b5cf6'];

/**
 * Custom Recharts Tooltip showing precise numerical breakdown,
 * category shares, and period-over-period percentage variance.
 * Dynamically adjusts contrast for Light and Dark modes.
 */
interface CustomConsumptionTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  showPredictionOverlay?: boolean;
}

const CustomConsumptionTooltip: React.FC<CustomConsumptionTooltipProps> = ({
  active,
  payload,
  showPredictionOverlay = false,
}) => {
  const { isDark } = useTheme();

  if (!active || !payload || !payload.length) return null;
  const point: ConsumptionTrendPoint = payload[0]?.payload;
  if (!point) return null;

  // If this point is a future forecast period, show the predictive horizon card
  if (point.isForecast) {
    return (
      <div
        className={`rounded-2xl shadow-2xl p-3.5 backdrop-blur-md min-w-[280px] max-w-[340px] pointer-events-none z-50 ${
          isDark
            ? 'bg-slate-950/95 text-white border border-violet-500/80'
            : 'bg-white/98 text-slate-900 border border-violet-300 ring-1 ring-violet-500/10'
        }`}
      >
        <div
          className={`flex items-center justify-between gap-2 pb-2 border-b ${
            isDark ? 'border-violet-800/60' : 'border-violet-200'
          }`}
        >
          <div>
            <div
              className={`text-xs font-black tracking-wide flex items-center gap-1.5 ${
                isDark ? 'text-violet-200' : 'text-violet-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>{point.label}</span>
            </div>
            <div
              className={`text-[10px] mt-0.5 font-medium ${
                isDark ? 'text-violet-300/80' : 'text-violet-700'
              }`}
            >
              {point.subLabel || 'Projected Requirement Horizon'}
            </div>
          </div>
          <span
            className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isDark
                ? 'bg-violet-900/80 text-violet-200 border-violet-700'
                : 'bg-violet-100 text-violet-800 border-violet-300 font-bold'
            }`}
          >
            Forecast
          </span>
        </div>

        <div
          className={`py-2.5 my-2.5 px-3 rounded-xl border ${
            isDark
              ? 'bg-violet-950/80 border-violet-800/60'
              : 'bg-violet-50 border-violet-200'
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase tracking-wider ${
              isDark ? 'text-violet-300' : 'text-violet-700'
            }`}
          >
            Total Projected Requirement
          </div>
          <div
            className={`text-xl font-extrabold mt-0.5 ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}
          >
            {(point.predictedTotal || 0).toLocaleString()}{' '}
            <span
              className={`text-xs font-medium ${
                isDark ? 'text-violet-300' : 'text-violet-600'
              }`}
            >
              units
            </span>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-teal-500"></span>
              Stationery Projected:
            </span>
            <span
              className={`font-bold ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {(point.predictedStationery || 0).toLocaleString()} units
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={`flex items-center gap-1.5 font-medium ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-sky-500"></span>
              Cleaning Projected:
            </span>
            <span
              className={`font-bold ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {(point.predictedCleaning || 0).toLocaleString()} units
            </span>
          </div>
          {(point.predictedGeneral || 0) > 0 && (
            <div className="flex items-center justify-between">
              <span
                className={`flex items-center gap-1.5 font-medium ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                General Projected:
              </span>
              <span
                className={`font-bold ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {(point.predictedGeneral || 0).toLocaleString()} units
              </span>
            </div>
          )}
        </div>

        <div
          className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] ${
            isDark
              ? 'border-violet-900/80 text-slate-400'
              : 'border-violet-200 text-slate-600'
          }`}
        >
          <span className="flex items-center gap-1 font-medium">
            <Brain className="w-3 h-3 text-indigo-500" />
            Predicted burn model
          </span>
          <span
            className={`font-bold ${
              isDark ? 'text-violet-300' : 'text-violet-700'
            }`}
          >
            Future Horizon
          </span>
        </div>
      </div>
    );
  }

  const total = point.Total;
  const stat = point.Stationery;
  const clean = point.Cleaning;
  const gen = point.General;

  const statPct = point.stationerySharePct ?? (total > 0 ? Math.round((stat / total) * 1000) / 10 : 0);
  const cleanPct = point.cleaningSharePct ?? (total > 0 ? Math.round((clean / total) * 1000) / 10 : 0);
  const genPct = point.generalSharePct ?? (total > 0 ? Math.round((gen / total) * 1000) / 10 : 0);

  const statVar = point.stationeryVariancePct;
  const cleanVar = point.cleaningVariancePct;
  const genVar = point.generalVariancePct;
  const totVar = point.totalVariancePct;

  const formatVarBadge = (v: number | null, prevUnits: number) => {
    if (v === null) {
      return (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
            isDark
              ? 'text-slate-400 bg-slate-800 border-slate-700'
              : 'text-slate-700 bg-slate-100 border-slate-300'
          }`}
        >
          Baseline
        </span>
      );
    }
    const isZero = v === 0;
    const isPos = v > 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          isZero
            ? isDark
              ? 'text-slate-300 bg-slate-800 border-slate-700'
              : 'text-slate-700 bg-slate-100 border-slate-300'
            : isPos
            ? isDark
              ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/70'
              : 'text-emerald-800 bg-emerald-100 border-emerald-300'
            : isDark
            ? 'text-rose-300 bg-rose-950/80 border-rose-800/70'
            : 'text-rose-800 bg-rose-100 border-rose-300'
        }`}
        title={`Previous period: ${prevUnits.toLocaleString()} units`}
      >
        {isZero ? (
          '0.0%'
        ) : isPos ? (
          <>
            <ArrowUpRight className="w-2.5 h-2.5" />
            +{v.toFixed(1)}%
          </>
        ) : (
          <>
            <ArrowDownRight className="w-2.5 h-2.5" />
            {v.toFixed(1)}%
          </>
        )}
      </span>
    );
  };

  return (
    <div
      className={`rounded-2xl shadow-2xl p-3.5 backdrop-blur-md min-w-[280px] max-w-[340px] pointer-events-none z-50 ${
        isDark
          ? 'bg-slate-950/95 text-white border border-slate-700/80'
          : 'bg-white/98 text-slate-900 border border-slate-300 ring-1 ring-slate-900/5'
      }`}
    >
      {/* Tooltip Header */}
      <div
        className={`flex items-center justify-between gap-2 pb-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div>
          <div
            className={`text-xs font-black tracking-wide flex items-center gap-1.5 ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span>{point.label}</span>
          </div>
          {point.subLabel && (
            <div
              className={`text-[10px] mt-0.5 font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              {point.subLabel}
            </div>
          )}
        </div>
        <span
          className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
            isDark
              ? 'bg-slate-800 text-slate-300 border-slate-700'
              : 'bg-slate-100 text-slate-800 border-slate-300 font-bold'
          }`}
        >
          {point.periodType === 'monthly'
            ? 'Monthly'
            : point.periodType === 'quarterly'
            ? 'Quarterly'
            : 'Custom Range'}
        </span>
      </div>

      {/* Aggregate Headline */}
      <div
        className={`py-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-semibold ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Total Consumed
          </span>
          <div className="flex items-center gap-1.5">
            <span
              className={`text-sm font-black ${
                isDark ? 'text-white' : 'text-slate-950'
              }`}
            >
              {total.toLocaleString()} units
            </span>
            {formatVarBadge(totVar, point.prevTotal)}
          </div>
        </div>

        {/* Proportional visual bar */}
        <div
          className={`w-full h-1.5 rounded-full overflow-hidden flex mt-2 ${
            isDark ? 'bg-slate-800' : 'bg-slate-200'
          }`}
        >
          {stat > 0 && (
            <div
              style={{ width: `${statPct}%` }}
              className="bg-teal-600 dark:bg-teal-500 h-full"
              title={`Stationery: ${statPct}%`}
            />
          )}
          {clean > 0 && (
            <div
              style={{ width: `${cleanPct}%` }}
              className="bg-sky-600 dark:bg-sky-500 h-full"
              title={`Cleaning: ${cleanPct}%`}
            />
          )}
          {gen > 0 && (
            <div
              style={{ width: `${genPct}%` }}
              className="bg-emerald-600 dark:bg-emerald-500 h-full"
              title={`General: ${genPct}%`}
            />
          )}
        </div>
        <div
          className={`flex items-center justify-between text-[10px] mt-1 font-medium ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          <span>Stationery {statPct}%</span>
          <span>Cleaning {cleanPct}%</span>
          {gen > 0 && <span>General {genPct}%</span>}
        </div>
      </div>

      {/* Precise Numerical Breakdown Rows */}
      <div className="space-y-2 pt-2.5">
        {/* Stationery Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 dark:bg-teal-500 shrink-0" />
            <span
              className={`font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Stationery
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span
                className={`font-bold ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {stat.toLocaleString()}
              </span>
              <span
                className={`text-[10px] ml-1 font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                u
              </span>
            </div>
            <div className="min-w-16 flex justify-end">
              {formatVarBadge(statVar, point.prevStationery)}
            </div>
          </div>
        </div>

        {/* Cleaning Row */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 dark:bg-sky-500 shrink-0" />
            <span
              className={`font-semibold ${
                isDark ? 'text-slate-200' : 'text-slate-800'
              }`}
            >
              Cleaning
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <span
                className={`font-bold ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {clean.toLocaleString()}
              </span>
              <span
                className={`text-[10px] ml-1 font-medium ${
                  isDark ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                u
              </span>
            </div>
            <div className="min-w-16 flex justify-end">
              {formatVarBadge(cleanVar, point.prevCleaning)}
            </div>
          </div>
        </div>

        {/* General Row */}
        {(gen > 0 || point.prevGeneral > 0) && (
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 dark:bg-emerald-500 shrink-0" />
              <span
                className={`font-semibold ${
                  isDark ? 'text-slate-200' : 'text-slate-800'
                }`}
              >
                General
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <span
                  className={`font-bold ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}
                >
                  {gen.toLocaleString()}
                </span>
                <span
                  className={`text-[10px] ml-1 font-medium ${
                    isDark ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  u
                </span>
              </div>
              <div className="min-w-16 flex justify-end">
                {formatVarBadge(genVar, point.prevGeneral)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Predictive Demand Overlay & Requirement Gap Section */}
      {showPredictionOverlay && point.predictedTotal !== undefined && (
        <div
          className={`mt-2.5 pt-2 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}
        >
          <div
            className={`p-2 rounded-xl border space-y-1.5 ${
              isDark
                ? 'bg-violet-950/60 border-violet-800/60'
                : 'bg-violet-50/90 border-violet-200'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span
                className={`font-bold flex items-center gap-1 text-[11px] ${
                  isDark ? 'text-violet-300' : 'text-violet-900'
                }`}
              >
                <Sparkles className="w-3 h-3 text-amber-500 dark:text-amber-300" />
                Predicted Model Demand:
              </span>
              <span
                className={`font-extrabold ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {point.predictedTotal.toLocaleString()} units
              </span>
            </div>

            <div
              className={`flex items-center justify-between text-xs pt-1 border-t ${
                isDark ? 'border-violet-800/40' : 'border-violet-200'
              }`}
            >
              <span
                className={`text-[10px] font-semibold ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Requirement Gap:
              </span>
              <span
                className={`font-bold px-1.5 py-0.5 rounded text-[10px] border ${
                  (point.demandGapTotal ?? 0) > 0
                    ? isDark
                      ? 'text-amber-300 bg-amber-950/80 border-amber-800/70'
                      : 'text-amber-800 bg-amber-100 border-amber-300'
                    : (point.demandGapTotal ?? 0) < 0
                    ? isDark
                      ? 'text-emerald-300 bg-emerald-950/80 border-emerald-800/70'
                      : 'text-emerald-800 bg-emerald-100 border-emerald-300'
                    : isDark
                    ? 'text-slate-300 bg-slate-800 border-slate-700'
                    : 'text-slate-700 bg-slate-100 border-slate-300'
                }`}
              >
                {(point.demandGapTotal ?? 0) > 0 ? (
                  <>
                    +{(point.demandGapTotal ?? 0).toLocaleString()} u{' '}
                    {point.demandGapPct !== null ? `(+${point.demandGapPct}%)` : ''}
                  </>
                ) : (point.demandGapTotal ?? 0) < 0 ? (
                  <>
                    {(point.demandGapTotal ?? 0).toLocaleString()} u{' '}
                    {point.demandGapPct !== null ? `(${point.demandGapPct}%)` : ''}
                  </>
                ) : (
                  'Aligned (±0%)'
                )}
              </span>
            </div>

            <div
              className={`grid grid-cols-2 gap-1 pt-1 text-[9px] font-medium ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              <div>
                Stat: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{stat}</span> vs <span className={`font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{point.predictedStationery}</span>
              </div>
              <div>
                Clean: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{clean}</span> vs <span className={`font-semibold ${isDark ? 'text-violet-300' : 'text-violet-700'}`}>{point.predictedCleaning}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tooltip Footer Info */}
      <div
        className={`mt-3 pt-2 border-t flex items-center justify-between text-[10px] font-medium ${
          isDark
            ? 'border-slate-800 text-slate-400'
            : 'border-slate-200 text-slate-600'
        }`}
      >
        <span>{point.issueCount} issue events</span>
        {point.prevTotal > 0 && (
          <span>Prev Total: {point.prevTotal.toLocaleString()} units</span>
        )}
      </div>
    </div>
  );
};

export const ExecutiveChartsView: React.FC<ExecutiveChartsViewProps> = ({
  stockItems = [],
  movementLogs = [],
  monthlyTrend = [],
  categoryDistribution = [],
  deptConsumption = [],
}) => {
  const { isDark, palette } = useTheme();
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked' | 'trend'>('grouped');
  const [activePieIndex, setActivePieIndex] = useState<number | null>(null);

  // Predictive Demand Overlay State (Historical Trend vs Predicted Demand Gap)
  const [showPredictionOverlay, setShowPredictionOverlay] = useState<boolean>(true);
  const [includeForecastHorizon, setIncludeForecastHorizon] = useState<boolean>(true);
  const [predictionOverlayType, setPredictionOverlayType] = useState<'total' | 'byCategory'>('total');

  // Date Range Filter State
  const [filter, setFilter] = useState<DateRangeFilterConfig>({
    viewMode: 'monthly',
    monthlySpan: 6,
    quarterlySpan: 4,
    customStartDate: '',
    customEndDate: '',
    customInterval: 'auto',
  });

  // Calculate dynamic analytics and trend points based on active date-range filter
  const dynamicAnalytics = useMemo(() => {
    if (stockItems && stockItems.length > 0 && movementLogs && movementLogs.length > 0) {
      return calculateFlexibleConsumptionTrend(stockItems, movementLogs, filter, {
        includeForecastHorizon: showPredictionOverlay && includeForecastHorizon,
      });
    }

    // Fallback if raw logs not available: format from monthlyTrend
    const data: ConsumptionTrendPoint[] = monthlyTrend.map((m, idx) => {
      const prev = idx > 0 ? monthlyTrend[idx - 1] : null;
      const prevTotal = prev ? prev.Total : 0;
      const prevStationery = prev ? prev.Stationery : 0;
      const prevCleaning = prev ? prev.Cleaning : 0;
      const prevGeneral = prev ? prev.General : 0;

      const totalVariancePct = prevTotal > 0 ? Math.round(((m.Total - prevTotal) / prevTotal) * 1000) / 10 : null;
      const stationeryVariancePct = prevStationery > 0 ? Math.round(((m.Stationery - prevStationery) / prevStationery) * 1000) / 10 : null;
      const cleaningVariancePct = prevCleaning > 0 ? Math.round(((m.Cleaning - prevCleaning) / prevCleaning) * 1000) / 10 : null;
      const generalVariancePct = prevGeneral > 0 ? Math.round(((m.General - prevGeneral) / prevGeneral) * 1000) / 10 : null;

      const stationerySharePct = m.Total > 0 ? Math.round((m.Stationery / m.Total) * 1000) / 10 : 0;
      const cleaningSharePct = m.Total > 0 ? Math.round((m.Cleaning / m.Total) * 1000) / 10 : 0;
      const generalSharePct = m.Total > 0 ? Math.round((m.General / m.Total) * 1000) / 10 : 0;

      return {
        periodKey: m.monthKey,
        label: m.month,
        periodType: 'monthly',
        Stationery: m.Stationery,
        Cleaning: m.Cleaning,
        General: m.General,
        Total: m.Total,
        prevStationery,
        prevCleaning,
        prevGeneral,
        prevTotal,
        stationeryVariancePct,
        cleaningVariancePct,
        generalVariancePct,
        totalVariancePct,
        stationerySharePct,
        cleaningSharePct,
        generalSharePct,
        issueCount: 1,
        predictedTotal: m.Total,
        predictedStationery: m.Stationery,
        predictedCleaning: m.Cleaning,
        predictedGeneral: m.General,
        demandGapTotal: 0,
        demandGapPct: 0,
        isForecast: false,
      };
    });

    const totalStationery = data.reduce((acc, d) => acc + d.Stationery, 0);
    const totalCleaning = data.reduce((acc, d) => acc + d.Cleaning, 0);
    const totalGeneral = data.reduce((acc, d) => acc + d.General, 0);
    const grandTotal = totalStationery + totalCleaning + totalGeneral;

    let overallVariancePct: number | null = null;
    if (data.length >= 2) {
      const latest = data[data.length - 1];
      const prev = data[data.length - 2];
      if (prev.Total > 0) {
        overallVariancePct = Math.round(((latest.Total - prev.Total) / prev.Total) * 1000) / 10;
      }
    }

    const fallbackSummary = {
      totalHistoricalActual: grandTotal,
      totalHistoricalPredicted: grandTotal,
      netDemandGap: 0,
      netDemandGapPct: 0,
      gapStatus: 'ALIGNED' as const,
      nextPeriodForecastTotal: Math.round(grandTotal / Math.max(1, data.length)),
      nextPeriodForecastStationery: Math.round(totalStationery / Math.max(1, data.length)),
      nextPeriodForecastCleaning: Math.round(totalCleaning / Math.max(1, data.length)),
      forecastHorizonCount: 0,
    };

    return {
      trendData: data,
      totalStationery,
      totalCleaning,
      totalGeneral,
      grandTotal,
      overallVariancePct,
      dateRangeDescription: 'Monthly Consumption Trend (Past 6 Months)',
      filteredLogCount: movementLogs.length,
      deptConsumption,
      availableDateBounds: { minDate: '2026-01-01', maxDate: '2026-12-31' },
      predictiveOverlaySummary: fallbackSummary,
    };
  }, [stockItems, movementLogs, filter, monthlyTrend, deptConsumption, showPredictionOverlay, includeForecastHorizon]);

  const {
    trendData,
    totalStationery,
    totalCleaning,
    totalGeneral,
    grandTotal,
    overallVariancePct,
    dateRangeDescription,
    filteredLogCount,
    availableDateBounds,
    predictiveOverlaySummary,
  } = dynamicAnalytics;

  // Preset handlers for custom date range
  const handleSetCustomPreset = (daysBack: number | 'ytd' | 'all') => {
    const maxD = availableDateBounds.maxDate ? new Date(availableDateBounds.maxDate + 'T23:59:59') : new Date();
    let startD: Date;

    if (daysBack === 'all') {
      const minD = availableDateBounds.minDate ? new Date(availableDateBounds.minDate + 'T00:00:00') : new Date(maxD.getTime() - 180 * 86400000);
      startD = minD;
    } else if (daysBack === 'ytd') {
      startD = new Date(maxD.getFullYear(), 0, 1);
    } else {
      startD = new Date(maxD.getTime() - daysBack * 86400000);
    }

    setFilter((prev) => ({
      ...prev,
      viewMode: 'custom',
      customStartDate: startD.toISOString().substring(0, 10),
      customEndDate: maxD.toISOString().substring(0, 10),
    }));
  };

  // Top requisitioning departments data
  const activeDeptConsumption = dynamicAnalytics.deptConsumption.length > 0 ? dynamicAnalytics.deptConsumption : deptConsumption;
  const topDeptsData = activeDeptConsumption.slice(0, 6).map((d) => ({
    name: d.name.length > 18 ? `${d.name.substring(0, 16)}...` : d.name,
    fullName: d.name,
    qty: d.qty,
  }));

  const totalStockUnits = categoryDistribution.reduce((acc, c) => acc + c.value, 0);

  const lastHistoricalLabel = useMemo(() => {
    const hist = trendData.filter((d) => !d.isForecast);
    return hist.length > 0 ? hist[hist.length - 1].label : undefined;
  }, [trendData]);

  return (
    <div className="w-full space-y-5">
      {/* SECTION 1: CONSUMPTION TREND WITH DATE-RANGE FILTER & CUSTOM TOOLTIPS */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        {/* Header with Title & Date-Range Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Consumption Trends: Stationery vs. Cleaning Supplies
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Interactive temporal material requisitions with precise unit metrics, category shares, and period variance tracking.
            </p>
          </div>

          {/* Chart Controls & Predictive Demand Overlay Toggle */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Historical vs Predicted Demand Toggle */}
            <button
              type="button"
              onClick={() => setShowPredictionOverlay(!showPredictionOverlay)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
                showPredictionOverlay
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-violet-500 shadow-violet-500/20'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
              title="Toggle overlay of Predicted Demand model against Historical Trend"
            >
              <Sparkles className={`w-3.5 h-3.5 ${showPredictionOverlay ? 'text-amber-300' : 'text-violet-500'}`} />
              <span>Overlay Predicted Demand</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ml-0.5 ${
                showPredictionOverlay ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}>
                {showPredictionOverlay ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* Chart Display Mode Switcher (Grouped, Stacked, Composed) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setChartMode('grouped')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Side-by-Side
              </button>
              <button
                type="button"
                onClick={() => setChartMode('stacked')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMode === 'stacked'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Stacked
              </button>
              <button
                type="button"
                onClick={() => setChartMode('trend')}
                className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer ${
                  chartMode === 'trend'
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Composed Trend
              </button>
            </div>
          </div>
        </div>

        {/* DATE-RANGE PICKER FILTER TOOLBAR */}
        <div className="py-3 px-3.5 my-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Mode Toggle: Monthly | Quarterly | Custom */}
            <div className="flex items-center gap-1 p-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, viewMode: 'monthly' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter.viewMode === 'monthly'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Monthly View</span>
              </button>

              <button
                type="button"
                onClick={() => setFilter((prev) => ({ ...prev, viewMode: 'quarterly' }))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter.viewMode === 'quarterly'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Quarterly View</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilter((prev) => ({
                    ...prev,
                    viewMode: 'custom',
                    customStartDate: prev.customStartDate || availableDateBounds.minDate,
                    customEndDate: prev.customEndDate || availableDateBounds.maxDate,
                  }));
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filter.viewMode === 'custom'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarRange className="w-3.5 h-3.5" />
                <span>Custom Date Range</span>
              </button>
            </div>

            {/* Sub-presets for Monthly & Quarterly views */}
            {filter.viewMode === 'monthly' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold mr-1">Time Horizon:</span>
                {[
                  { key: 6, label: 'Past 6 Months' },
                  { key: 12, label: 'Past 12 Months' },
                  { key: 'ytd', label: 'Year to Date' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() =>
                      setFilter((prev) => ({ ...prev, monthlySpan: preset.key as 6 | 12 | 'ytd' }))
                    }
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filter.monthlySpan === preset.key
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}

            {filter.viewMode === 'quarterly' && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-400 text-[11px] font-semibold mr-1">Quarters:</span>
                {[
                  { key: 4, label: 'Past 4 Quarters (1 Yr)' },
                  { key: 6, label: 'Past 6 Quarters' },
                  { key: 'all', label: 'All Quarters' },
                ].map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() =>
                      setFilter((prev) => ({ ...prev, quarterlySpan: preset.key as 4 | 6 | 'all' }))
                    }
                    className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                      filter.quarterlySpan === preset.key
                        ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expanded Custom Date-Range Selector Strip */}
          {filter.viewMode === 'custom' && (
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              {/* Quick presets */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-semibold text-[11px]">Quick Presets:</span>
                <button
                  type="button"
                  onClick={() => handleSetCustomPreset(30)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer font-medium"
                >
                  Last 30 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCustomPreset(60)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer font-medium"
                >
                  Last 60 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCustomPreset(90)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer font-medium"
                >
                  Last 90 Days
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCustomPreset('ytd')}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer font-medium"
                >
                  Year to Date
                </button>
                <button
                  type="button"
                  onClick={() => handleSetCustomPreset('all')}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer font-medium"
                >
                  All History
                </button>
              </div>

              {/* Start and End Date Inputs */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-1.5 pl-1">
                  <span className="text-[11px] font-bold text-slate-500">From:</span>
                  <input
                    type="date"
                    value={filter.customStartDate || availableDateBounds.minDate}
                    max={filter.customEndDate || availableDateBounds.maxDate}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, customStartDate: e.target.value }))
                    }
                    className="bg-transparent text-slate-900 dark:text-white font-medium text-xs focus:outline-hidden cursor-pointer"
                  />
                </div>

                <span className="text-slate-400 font-semibold">&rarr;</span>

                <div className="flex items-center gap-1.5 pr-1">
                  <span className="text-[11px] font-bold text-slate-500">To:</span>
                  <input
                    type="date"
                    value={filter.customEndDate || availableDateBounds.maxDate}
                    min={filter.customStartDate || availableDateBounds.minDate}
                    onChange={(e) =>
                      setFilter((prev) => ({ ...prev, customEndDate: e.target.value }))
                    }
                    className="bg-transparent text-slate-900 dark:text-white font-medium text-xs focus:outline-hidden cursor-pointer"
                  />
                </div>

                {/* Interval Selector */}
                <div className="border-l border-slate-200 dark:border-slate-700 pl-2 flex items-center gap-1">
                  <span className="text-[10px] text-slate-400">Interval:</span>
                  <select
                    value={filter.customInterval || 'auto'}
                    onChange={(e) =>
                      setFilter((prev) => ({
                        ...prev,
                        customInterval: e.target.value as 'auto' | 'week' | 'month',
                      }))
                    }
                    className="bg-slate-100 dark:bg-slate-800 text-[11px] font-medium rounded px-1.5 py-0.5 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
                  >
                    <option value="auto">Auto</option>
                    <option value="week">Weekly</option>
                    <option value="month">Monthly</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setFilter((prev) => ({
                      ...prev,
                      customStartDate: availableDateBounds.minDate,
                      customEndDate: availableDateBounds.maxDate,
                    }))
                  }
                  title="Reset date bounds"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Active Range Banner */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
              <span>{dateRangeDescription}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {trendData.length} data intervals
              </span>
              <span>•</span>
              <span className="text-teal-600 dark:text-teal-400 font-semibold">
                {filteredLogCount} issue transactions
              </span>
            </div>
          </div>
        </div>

        {/* PREDICTIVE DEMAND OVERLAY & REQUIREMENT GAP BANNER */}
        {showPredictionOverlay && predictiveOverlaySummary && (
          <div className="p-3.5 bg-gradient-to-r from-violet-950/20 via-indigo-950/20 to-slate-900/40 dark:from-violet-950/50 dark:via-indigo-950/40 dark:to-slate-900/70 rounded-2xl border border-violet-500/30 dark:border-violet-500/40 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30">
                  <GitCompare className="w-4 h-4 text-violet-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Historical Trend vs. Predicted Demand Model
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        predictiveOverlaySummary.gapStatus === 'SURGE'
                          ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-700'
                          : predictiveOverlaySummary.gapStatus === 'CONSERVED'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-700'
                          : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <Activity className="w-2.5 h-2.5" />
                      {predictiveOverlaySummary.gapStatus === 'SURGE'
                        ? 'Consumption Surged Beyond Baseline'
                        : predictiveOverlaySummary.gapStatus === 'CONSERVED'
                        ? 'Material Demand Conserved vs Model'
                        : 'Consumption Perfectly Aligned'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Visualizing historical requisitions alongside AI-projected baseline burn rates and future procurement horizons.
                  </p>
                </div>
              </div>

              {/* Overlay Sub-controls (Horizon toggle + Overlay granularity) */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Future Forecast Horizon Toggle */}
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer bg-white/70 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={includeForecastHorizon}
                    onChange={(e) => setIncludeForecastHorizon(e.target.checked)}
                    className="rounded text-violet-600 focus:ring-violet-500 cursor-pointer w-3.5 h-3.5"
                  />
                  <span className="font-semibold text-[11px]">Include Future Horizon (+Forecast)</span>
                </label>

                {/* Granularity Switcher */}
                <div className="flex items-center p-0.5 bg-white/70 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setPredictionOverlayType('total')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                      predictionOverlayType === 'total'
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Total Demand Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setPredictionOverlayType('byCategory')}
                    className={`px-2 py-0.5 rounded-md font-semibold transition cursor-pointer ${
                      predictionOverlayType === 'byCategory'
                        ? 'bg-violet-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    Category Lines
                  </button>
                </div>
              </div>
            </div>

            {/* Gap Analysis Summary Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Past Actual Issues
                </div>
                <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {predictiveOverlaySummary.totalHistoricalActual.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal text-slate-500">units</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span>Actual materials requisitioned</span>
                </div>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider flex items-center gap-1">
                  <Brain className="w-3 h-3 text-violet-500" />
                  Model Baseline Demand
                </div>
                <div className="text-lg font-black text-violet-700 dark:text-violet-300 mt-0.5">
                  {predictiveOverlaySummary.totalHistoricalPredicted.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal text-violet-500">units</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Expected normal burn rate</div>
              </div>

              <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Net Requirement Gap
                </div>
                <div
                  className={`text-lg font-black mt-0.5 flex items-center gap-1 ${
                    predictiveOverlaySummary.netDemandGap > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : predictiveOverlaySummary.netDemandGap < 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {predictiveOverlaySummary.netDemandGap > 0 ? (
                    <>
                      <span>+{predictiveOverlaySummary.netDemandGap.toLocaleString()}</span>
                      <ArrowUpRight className="w-4 h-4 text-amber-500 shrink-0" />
                    </>
                  ) : predictiveOverlaySummary.netDemandGap < 0 ? (
                    <>
                      <span>{predictiveOverlaySummary.netDemandGap.toLocaleString()}</span>
                      <ArrowDownRight className="w-4 h-4 text-emerald-500 shrink-0" />
                    </>
                  ) : (
                    <span>0</span>
                  )}
                  <span className="text-[11px] font-bold">
                    ({predictiveOverlaySummary.netDemandGapPct > 0 ? `+${predictiveOverlaySummary.netDemandGapPct}` : predictiveOverlaySummary.netDemandGapPct}%)
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {predictiveOverlaySummary.netDemandGap > 0 ? 'Surge beyond expectation' : 'Demand lower than modeled'}
                </div>
              </div>

              <div className="p-2.5 bg-violet-50/50 dark:bg-violet-950/40 rounded-xl border border-violet-200/80 dark:border-violet-900/60">
                <div className="text-[10px] font-bold text-violet-700 dark:text-violet-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Next Period Forecast
                </div>
                <div className="text-lg font-black text-violet-800 dark:text-violet-200 mt-0.5">
                  {predictiveOverlaySummary.nextPeriodForecastTotal.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal text-violet-600/70">req. units</span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  Stat: {predictiveOverlaySummary.nextPeriodForecastStationery} • Clean: {predictiveOverlaySummary.nextPeriodForecastCleaning}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Highlight KPI Pills for Selected Date Window */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Units Issued
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
              {grandTotal.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">units</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 truncate">
              <Calendar className="w-3 h-3 text-teal-500 shrink-0" />
              <span className="truncate">{trendData.length} active periods</span>
            </div>
          </div>

          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-900/50">
            <div className="text-[11px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-wider">
              Stationery Consumed
            </div>
            <div className="text-xl font-extrabold text-teal-800 dark:text-teal-200 mt-0.5">
              {totalStationery.toLocaleString()}{' '}
              <span className="text-xs font-normal text-teal-600/70">units</span>
            </div>
            <div className="text-[10px] text-teal-600 dark:text-teal-400 mt-1">
              {grandTotal > 0 ? Math.round((totalStationery / grandTotal) * 100) : 0}% of selected consumption
            </div>
          </div>

          <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-900/50">
            <div className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
              Cleaning Consumed
            </div>
            <div className="text-xl font-extrabold text-sky-800 dark:text-sky-200 mt-0.5">
              {totalCleaning.toLocaleString()}{' '}
              <span className="text-xs font-normal text-sky-600/70">units</span>
            </div>
            <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1">
              {grandTotal > 0 ? Math.round((totalCleaning / grandTotal) * 100) : 0}% of selected consumption
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Latest Velocity
            </div>
            <div className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5 flex items-center gap-1">
              {overallVariancePct !== null ? (
                <>
                  <span>{overallVariancePct >= 0 ? `+${overallVariancePct.toFixed(1)}%` : `${overallVariancePct.toFixed(1)}%`}</span>
                  {overallVariancePct >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-rose-500 shrink-0" />
                  )}
                </>
              ) : (
                <span className="text-sm font-semibold text-slate-400">Baseline</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Period-over-period variance</div>
          </div>
        </div>

        {/* The Recharts Container with Custom Tooltip and Predictive Demand Overlay */}
        <div className="w-full h-88 pt-2">
          {trendData.length === 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-xs">
              <Info className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-slate-600 dark:text-slate-300">
                No consumption records found for this date range.
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Try widening your date boundaries or selecting another view mode.
              </p>
            </div>
          ) : showPredictionOverlay ? (
            /* Composed Chart with Predictive Demand Overlay */
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 12, right: 15, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <YAxis tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <Tooltip content={<CustomConsumptionTooltip showPredictionOverlay={true} />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />

                {/* Background area envelope highlighting predicted demand */}
                <Area
                  dataKey="predictedTotal"
                  name="Predicted Demand Envelope"
                  fill="#6366f1"
                  fillOpacity={isDark ? 0.08 : 0.12}
                  stroke="none"
                  isAnimationActive={false}
                  legendType="none"
                />

                {/* Vertical Reference Separator for Forecast Horizon */}
                {lastHistoricalLabel && trendData.some((d) => d.isForecast) && (
                  <ReferenceLine
                    x={lastHistoricalLabel}
                    stroke={isDark ? '#818cf8' : '#6366f1'}
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: 'Forecast Horizon ➔',
                      position: 'insideTopRight',
                      fill: isDark ? '#a5b4fc' : '#4f46e5',
                      fontSize: 10,
                      fontWeight: 700,
                    }}
                  />
                )}

                {/* Historical Category Requisitions */}
                <Bar
                  name="Stationery"
                  dataKey="Stationery"
                  fill={CATEGORY_COLORS.Stationery}
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  name="Cleaning Supplies"
                  dataKey="Cleaning"
                  fill={CATEGORY_COLORS.Cleaning}
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  radius={chartMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={36}
                />
                {totalGeneral > 0 && (
                  <Bar
                    name="General Stock"
                    dataKey="General"
                    fill={CATEGORY_COLORS.General}
                    stackId={chartMode === 'stacked' ? 'a' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                )}

                {/* Optional Actual Total Line if Composed Trend is active */}
                {chartMode === 'trend' && (
                  <Line
                    name="Total Issued (Actual)"
                    type="monotone"
                    dataKey="Total"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#10b981' }}
                    activeDot={{ r: 6 }}
                  />
                )}

                {/* Primary Predicted Demand Model Line */}
                <Line
                  name="Predicted Demand Model"
                  type="monotone"
                  dataKey="predictedTotal"
                  stroke="#6366f1"
                  strokeWidth={3}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: '#6366f1', stroke: palette.cardBg, strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#4f46e5' }}
                />

                {/* Detailed Category Prediction Overlays if selected */}
                {predictionOverlayType === 'byCategory' && (
                  <>
                    <Line
                      name="Predicted Stationery"
                      type="monotone"
                      dataKey="predictedStationery"
                      stroke="#0d9488"
                      strokeWidth={1.8}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                    <Line
                      name="Predicted Cleaning"
                      type="monotone"
                      dataKey="predictedCleaning"
                      stroke="#0284c7"
                      strokeWidth={1.8}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </>
                )}
              </ComposedChart>
            </ResponsiveContainer>
          ) : chartMode === 'trend' ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <YAxis tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <Tooltip content={<CustomConsumptionTooltip showPredictionOverlay={false} />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />
                <Bar
                  name="Stationery"
                  dataKey="Stationery"
                  fill={CATEGORY_COLORS.Stationery}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  name="Cleaning Supplies"
                  dataKey="Cleaning"
                  fill={CATEGORY_COLORS.Cleaning}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
                <Line
                  name="Total Consumed"
                  type="monotone"
                  dataKey="Total"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <YAxis tick={{ fontSize: 11, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                <Tooltip content={<CustomConsumptionTooltip showPredictionOverlay={false} />} />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px', color: palette.text }} />
                <Bar
                  name="Stationery"
                  dataKey="Stationery"
                  fill={CATEGORY_COLORS.Stationery}
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={40}
                />
                <Bar
                  name="Cleaning Supplies"
                  dataKey="Cleaning"
                  fill={CATEGORY_COLORS.Cleaning}
                  stackId={chartMode === 'stacked' ? 'a' : undefined}
                  radius={chartMode === 'stacked' ? [6, 6, 0, 0] : [6, 6, 0, 0]}
                  maxBarSize={40}
                />
                {totalGeneral > 0 && (
                  <Bar
                    name="General Stock"
                    dataKey="General"
                    fill={CATEGORY_COLORS.General}
                    stackId={chartMode === 'stacked' ? 'a' : undefined}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                )}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* SECTION 2: PIE CHARTS & BAR CHARTS (CATEGORY DISTRIBUTION & DEPT CONSUMPTION) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* PIE CHART: Category Stock Share */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400">
                <PieIcon className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Stock Distribution by Category (Pie Chart)
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {totalStockUnits.toLocaleString()} units total
            </span>
          </div>

          <div className="relative w-full h-64 flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderRadius: '0.75rem',
                    color: palette.tooltipText,
                    fontSize: '12px',
                    boxShadow: isDark
                      ? '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
                      : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{
                    color: palette.tooltipText,
                  }}
                  formatter={(value: any, name: any) => {
                    const percent = totalStockUnits > 0 ? Math.round((Number(value) / totalStockUnits) * 100) : 0;
                    return [`${Number(value).toLocaleString()} units (${percent}%)`, name];
                  }}
                />
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActivePieIndex(index)}
                  onMouseLeave={() => setActivePieIndex(null)}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={CATEGORY_COLORS[entry.name] || PIE_COLORS[index % PIE_COLORS.length]}
                      stroke={palette.cardBg}
                      strokeWidth={activePieIndex === index ? 3 : 1.5}
                      className="transition-all duration-150 cursor-pointer"
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Centered Donut Summary */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">Catalog Units</div>
              <div className="text-lg font-extrabold text-slate-900 dark:text-white">
                {totalStockUnits.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Category Legend Badges */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
            {categoryDistribution.map((cat, idx) => {
              const color = CATEGORY_COLORS[cat.name] || PIE_COLORS[idx % PIE_COLORS.length];
              const pct = totalStockUnits > 0 ? Math.round((cat.value / totalStockUnits) * 100) : 0;
              return (
                <div
                  key={cat.name}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/70"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{cat.name}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-1">
                    {cat.value.toLocaleString()}{' '}
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">({pct}%)</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{cat.count} SKUs</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* BAR CHART: Department Requisition Breakdown */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Department Consumption in Selected Range
              </h3>
            </div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Issue volume</span>
          </div>

          <div className="w-full h-64 pt-2 flex-1">
            {topDeptsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No department requisition activity recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topDeptsData}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} strokeOpacity={palette.gridOpacity} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: palette.axisText, fontWeight: 500 }} axisLine={{ stroke: palette.axisLine }} tickLine={{ stroke: palette.axisLine }} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    tick={{ fontSize: 10, fill: palette.axisText, fontWeight: 500 }}
                    axisLine={{ stroke: palette.axisLine }}
                    tickLine={{ stroke: palette.axisLine }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      borderRadius: '0.75rem',
                      color: palette.tooltipText,
                      fontSize: '12px',
                      boxShadow: isDark
                        ? '0 20px 25px -5px rgba(0, 0, 0, 0.6)'
                        : '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    }}
                    itemStyle={{
                      color: palette.tooltipText,
                    }}
                    formatter={(value: any, _: any, item: any) => [
                      `${value} units issued`,
                      item?.payload?.fullName || 'Department',
                    ]}
                  />
                  <Bar dataKey="qty" fill="#0284c7" radius={[0, 6, 6, 0]} maxBarSize={22}>
                    {topDeptsData.map((_, index) => (
                      <Cell
                        key={`dept-cell-${index}`}
                        fill={index === 0 ? '#0d9488' : index === 1 ? '#0284c7' : '#38bdf8'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3 text-sky-500" />
              Highest consuming department drives replenishment prioritization
            </span>
            <span className="font-bold text-sky-600 dark:text-sky-400">
              {topDeptsData[0] ? `${topDeptsData[0].fullName}: ${topDeptsData[0].qty} units` : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
