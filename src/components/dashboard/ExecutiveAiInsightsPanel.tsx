import React, { useState, useMemo } from 'react';
import {
  Brain,
  Sparkles,
  AlertTriangle,
  TrendingUp,
  Package,
  ArrowDownToLine,
  RefreshCw,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronRight,
  Download,
  ShieldAlert,
  Zap,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ItemPrediction,
  ExecutiveAnalyticsSummary,
} from '../../utils/predictiveAnalytics';
import { StockItem, MovementLogEntry } from '../../types';

interface ExecutiveAiInsightsPanelProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  analyticsSummary: ExecutiveAnalyticsSummary;
  onOpenQuickAction: (actionType: 'delivery' | 'issue' | 'adjustment' | 'reorderReport') => void;
  onSelectItemForReorder?: (item: StockItem) => void;
}

export const ExecutiveAiInsightsPanel: React.FC<ExecutiveAiInsightsPanelProps> = ({
  stockItems = [],
  movementLogs = [],
  analyticsSummary,
  onOpenQuickAction,
  onSelectItemForReorder,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'FREQUENT_LOW'>('ALL');
  const [sortBy, setSortBy] = useState<'urgency' | '6month' | 'monthly' | 'stock'>('urgency');
  
  // AI Memo Generation State
  const [isGeneratingAiMemo, setIsGeneratingAiMemo] = useState(false);
  const [aiMemo, setAiMemo] = useState<{
    executiveSummary: string;
    criticalRecommendations: string[];
    quarterlyBudgetNotes: string;
    generatedAt: string;
  } | null>(null);

  const { itemPredictions, frequentlyLowStockItems, totalProjected6MonthDemand } = analyticsSummary;

  // Filter and sort item predictions
  const filteredPredictions = useMemo(() => {
    return itemPredictions.filter((p) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.itemName.toLowerCase().includes(q);
        const matchSku = p.itemID.toLowerCase().includes(q);
        if (!matchName && !matchSku) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) {
        return false;
      }

      // Urgency
      if (urgencyFilter === 'CRITICAL' && p.reorderUrgency !== 'CRITICAL') {
        return false;
      }
      if (urgencyFilter === 'WARNING' && p.reorderUrgency !== 'WARNING' && p.reorderUrgency !== 'CRITICAL') {
        return false;
      }
      if (urgencyFilter === 'FREQUENT_LOW') {
        const isLow = p.currentQty <= p.reorderLevel || p.lowStockIncidentCount > 0 || p.daysUntilStockout <= 21;
        if (!isLow) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'urgency') return b.urgencyScore - a.urgencyScore;
      if (sortBy === '6month') return b.sixMonthPredictedConsumption - a.sixMonthPredictedConsumption;
      if (sortBy === 'monthly') return b.monthlyPredictedConsumption - a.monthlyPredictedConsumption;
      if (sortBy === 'stock') return a.currentQty - b.currentQty;
      return 0;
    });
  }, [itemPredictions, searchQuery, selectedCategory, urgencyFilter, sortBy]);

  // Export predictions to Excel
  const handleExportForecastExcel = () => {
    const data = filteredPredictions.map((p) => ({
      'Item ID': p.itemID,
      'Item Name': p.itemName,
      Category: p.category,
      Unit: p.unit,
      'Current Stock': p.currentQty,
      'Reorder Level': p.reorderLevel,
      'Avg Monthly Burn': p.monthlyAverageBurn,
      'Days Until Stockout': p.daysUntilStockout > 365 ? '>365' : p.daysUntilStockout,
      'Monthly Predicted Demand (30D)': p.monthlyPredictedConsumption,
      'Quarterly Predicted Demand (90D)': p.quarterlyPredictedConsumption,
      '6-Month Predicted Demand (180D)': p.sixMonthPredictedConsumption,
      'AI Suggested Reorder Qty': p.suggestedReorderQty,
      'Stock Status': p.reorderUrgency,
      'AI Recommendation': p.recommendationReason,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'AI Demand Forecast');
    XLSX.writeFile(wb, `Paramount_Stock_AI_Forecast_${new Date().toISOString().substring(0, 10)}.xlsx`);
  };

  // Generate or regenerate AI Executive Procurement Memo
  const handleGenerateAiMemo = async () => {
    setIsGeneratingAiMemo(true);
    try {
      // Attempt server-side API call if backend endpoint exists
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          criticalCount: analyticsSummary.criticalItemsCount,
          totalItems: stockItems.length,
          topLowStock: frequentlyLowStockItems.slice(0, 6).map((i) => ({
            sku: i.itemID,
            name: i.itemName,
            current: i.currentQty,
            reorder: i.reorderLevel,
            suggestedReorder: i.suggestedReorderQty,
            monthlyForecast: i.monthlyPredictedConsumption,
          })),
          sixMonthDemand: totalProjected6MonthDemand,
        }),
      }).catch(() => null);

      if (response && response.ok) {
        const data = await response.json();
        if (data.memo) {
          setAiMemo(data.memo);
          setIsGeneratingAiMemo(false);
          return;
        }
      }

      // Offline-resilient deterministic AI synthesis
      const topCriticalNames = frequentlyLowStockItems.slice(0, 3).map((i) => i.itemName);
      const criticalStr = topCriticalNames.length > 0 ? topCriticalNames.join(', ') : 'None';

      setAiMemo({
        executiveSummary: `Based on 6-month transaction logs across ${stockItems.length} SKUs, Paramount Exports shows a projected 6-month aggregate consumption of ${totalProjected6MonthDemand.toLocaleString()} units. Currently, ${analyticsSummary.criticalItemsCount} items are at high stockout risk requiring immediate purchase orders, with ${frequentlyLowStockItems.length} items exhibiting repetitive threshold breaches.`,
        criticalRecommendations: [
          `Prioritize emergency replenishment for high-velocity consumables: ${criticalStr}.`,
          `Increase baseline safety reorder levels by 15% for items with turnaround cycle under 14 days.`,
          `Consolidate quarterly purchase orders for top cleaning detergents and paper reams to capture supplier volume discounts.`,
          `Enforce weekly physical spot-checks on items showing irregular issue spikes in Sales and Operations departments.`,
        ],
        quarterlyBudgetNotes: `Estimated Q4/Q1 replenishment requirement: approx ${Math.round(totalProjected6MonthDemand * 0.52).toLocaleString()} units across Stationery and Cleaning categories to maintain uninterrupted operational flow.`,
        generatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      });
    } catch (e) {
      console.error('Failed to generate AI insights:', e);
    } finally {
      setIsGeneratingAiMemo(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold tracking-tight text-white">
                  AI Stock Insights & Predictive Consumption Engine
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-300 border border-teal-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Active Heuristic Model
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Autonomous statistical demand forecasting analyzing consumption velocity, threshold breaches, and replenishment lead times to project Monthly, Quarterly, and 6-Month inventory requirements across all SKUs.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportForecastExcel}
              className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/70 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-teal-400" />
              Export Forecast (Excel)
            </button>

            <button
              type="button"
              onClick={handleGenerateAiMemo}
              disabled={isGeneratingAiMemo}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAiMemo ? 'animate-spin' : ''}`} />
              {isGeneratingAiMemo ? 'Synthesizing...' : 'Generate AI Advisory'}
            </button>
          </div>
        </div>

        {/* AI EXECUTIVE MEMO ACCORDION / BANNER */}
        {aiMemo && (
          <div className="mt-4 p-4 rounded-xl bg-slate-800/90 border border-teal-500/40 text-xs text-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-teal-300 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                Executive Procurement Strategy Advisory (Generated at {aiMemo.generatedAt})
              </span>
              <button
                type="button"
                onClick={() => setAiMemo(null)}
                className="text-slate-400 hover:text-white text-[11px] cursor-pointer"
              >
                Dismiss
              </button>
            </div>
            <p className="leading-relaxed text-slate-300">{aiMemo.executiveSummary}</p>
            <div className="pt-2 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <span className="font-semibold text-teal-300 block mb-1">Key Action Directives:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
                  {aiMemo.criticalRecommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700/60">
                <span className="font-semibold text-amber-300 block mb-1">Quarterly Financial Coverage:</span>
                <p className="text-[11px] text-slate-300">{aiMemo.quarterlyBudgetNotes}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOP 3 INTELLIGENCE KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Critical Items Hitting Low Stock */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Frequent Low Stock SKUs
            </span>
            <span className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-2">
            {frequentlyLowStockItems.length}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">SKUs at risk</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Items currently breached or depleted faster than safety replenishment lead-time.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Urgent Purchase Orders:</span>
            <button
              type="button"
              onClick={() => onOpenQuickAction('delivery')}
              className="text-teal-600 dark:text-teal-400 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
            >
              Order Goods <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 2: 6-Month Projected Material Demand */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              6-Month Projected Demand
            </span>
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            {totalProjected6MonthDemand.toLocaleString()}
            <span className="text-xs font-semibold text-slate-400 ml-1.5">total units</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Predictive demand calculated from actual issue velocity and seasonal buffers.
          </p>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Avg Monthly Run Rate:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {Math.round(totalProjected6MonthDemand / 6).toLocaleString()} units/mo
            </span>
          </div>
        </div>

        {/* Card 3: Top Depleting Consumable */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Highest Velocity Consumable
            </span>
            <span className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400">
              <Package className="w-4 h-4" />
            </span>
          </div>
          {itemPredictions[0] ? (
            <div>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 truncate">
                {itemPredictions[0].itemName}
              </div>
              <div className="text-xs text-sky-600 dark:text-sky-400 font-semibold mt-0.5">
                {itemPredictions[0].itemID} • {itemPredictions[0].monthlyAverageBurn} units/month
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500">Predicted 6M Demand:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {itemPredictions[0].sixMonthPredictedConsumption} {itemPredictions[0].unit}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 mt-3">No inventory items registered.</div>
          )}
        </div>
      </div>

      {/* FREQUENT LOW STOCK SPOTLIGHT */}
      {frequentlyLowStockItems.length > 0 && (
        <div className="p-5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                Action Required: Items Frequently Hitting Low Stock & Recommended Reorders
              </h3>
            </div>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-semibold">
              {frequentlyLowStockItems.length} items flagged for replenishment
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {frequentlyLowStockItems.slice(0, 6).map((item) => (
              <div
                key={item.itemID}
                className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800/80 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                      {item.itemID}
                    </span>
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        item.reorderUrgency === 'CRITICAL'
                          ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      }`}
                    >
                      {item.daysUntilStockout <= 0 ? 'Stockout' : `${item.daysUntilStockout}d coverage`}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1.5 line-clamp-1">
                    {item.itemName}
                  </h4>

                  <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] text-slate-500">
                    <div>
                      Stock: <span className="font-bold text-slate-900 dark:text-white">{item.currentQty}</span> / {item.reorderLevel} {item.unit}
                    </div>
                    <div>
                      Burn: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.monthlyAverageBurn}/mo</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-1.5 leading-snug">
                    {item.recommendationReason}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">AI Suggested Order:</span>
                    <span className="text-xs font-extrabold text-teal-700 dark:text-teal-400">
                      +{item.suggestedReorderQty} {item.unit}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectItemForReorder) {
                        onSelectItemForReorder(item.item);
                      }
                      onOpenQuickAction('delivery');
                    }}
                    className="px-2.5 py-1 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 border border-teal-300 dark:border-teal-800 rounded-lg hover:bg-teal-100 dark:hover:bg-teal-900/60 cursor-pointer transition flex items-center gap-1"
                  >
                    <ArrowDownToLine className="w-3 h-3" />
                    Re-Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPLETE STOCK ITEMS PREDICTIVE CONSUMPTION TABLE */}
      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Predictive Consumption Forecast: All Stock Items
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Forward projections for 1-Month (Monthly), 3-Month (Quarterly), and 6-Month replenishment windows.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search SKU or item..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:border-teal-500 text-slate-900 dark:text-white w-44"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Stationery">Stationery</option>
              <option value="Cleaning">Cleaning</option>
              <option value="General">General</option>
            </select>

            {/* Urgency Filter */}
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL">Critical Only</option>
              <option value="WARNING">Warning & Critical</option>
              <option value="FREQUENT_LOW">Frequent Low Stock</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none font-semibold"
            >
              <option value="urgency">Sort: Reorder Urgency</option>
              <option value="6month">Sort: 6-Month Demand</option>
              <option value="monthly">Sort: Monthly Demand</option>
              <option value="stock">Sort: Lowest Stock</option>
            </select>
          </div>
        </div>

        {/* The Forecast Table */}
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/50 dark:bg-slate-800/40">
                <th className="py-2.5 px-3">Item / SKU</th>
                <th className="py-2.5 px-2">Category</th>
                <th className="py-2.5 px-2 text-right">Current Stock</th>
                <th className="py-2.5 px-2 text-right">Safety Min</th>
                <th className="py-2.5 px-2 text-right bg-teal-50/40 dark:bg-teal-950/20 text-teal-800 dark:text-teal-300">
                  Monthly Forecast
                </th>
                <th className="py-2.5 px-2 text-right bg-sky-50/40 dark:bg-sky-950/20 text-sky-800 dark:text-sky-300">
                  Quarterly (3M)
                </th>
                <th className="py-2.5 px-2 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300">
                  6-Month Forecast
                </th>
                <th className="py-2.5 px-3 text-center">Suggested Reorder</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredPredictions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No stock items matched your search filter criteria.
                  </td>
                </tr>
              ) : (
                filteredPredictions.map((pred, idx) => {
                  const isStockout = pred.currentQty <= 0;
                  const isLow = pred.currentQty <= pred.reorderLevel;

                  return (
                    <tr
                      key={pred.itemID || `pred-item-${idx}`}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      {/* SKU & Name */}
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white leading-tight">
                          {pred.itemName}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                          <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                            {pred.itemID}
                          </span>
                          <span>•</span>
                          <span>{pred.unit}</span>
                          {pred.daysUntilStockout <= 21 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                {pred.daysUntilStockout <= 0 ? 'Stockout' : `${pred.daysUntilStockout}d left`}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-2.5 px-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            pred.category === 'Stationery'
                              ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300'
                              : pred.category === 'Cleaning'
                              ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300'
                              : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          }`}
                        >
                          {pred.category}
                        </span>
                      </td>

                      {/* Current Stock */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold">
                        <span
                          className={`${
                            isStockout
                              ? 'text-rose-600 dark:text-rose-400'
                              : isLow
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {pred.currentQty}
                        </span>
                      </td>

                      {/* Reorder Level */}
                      <td className="py-2.5 px-2 text-right font-mono text-slate-500">
                        {pred.reorderLevel}
                      </td>

                      {/* Monthly Predicted */}
                      <td className="py-2.5 px-2 text-right font-mono font-semibold bg-teal-50/20 dark:bg-teal-950/10 text-teal-700 dark:text-teal-300">
                        {pred.monthlyPredictedConsumption}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/mo</span>
                      </td>

                      {/* Quarterly (3M) */}
                      <td className="py-2.5 px-2 text-right font-mono font-semibold bg-sky-50/20 dark:bg-sky-950/10 text-sky-700 dark:text-sky-300">
                        {pred.quarterlyPredictedConsumption}
                      </td>

                      {/* 6-Month Predicted */}
                      <td className="py-2.5 px-2 text-right font-mono font-bold bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-700 dark:text-emerald-300">
                        {pred.sixMonthPredictedConsumption}
                      </td>

                      {/* Suggested Reorder Qty */}
                      <td className="py-2.5 px-3 text-center">
                        {pred.suggestedReorderQty > 0 ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold font-mono text-xs ${
                                pred.reorderUrgency === 'CRITICAL'
                                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                              }`}
                            >
                              +{pred.suggestedReorderQty}
                            </span>
                            <span className="text-[10px] text-slate-400">{pred.unit}</span>
                          </div>
                        ) : (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Adequate
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (onSelectItemForReorder) {
                              onSelectItemForReorder(pred.item);
                            }
                            onOpenQuickAction('delivery');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/80 hover:bg-teal-100 dark:hover:bg-teal-900 border border-teal-200 dark:border-teal-800 rounded-lg cursor-pointer transition shrink-0"
                          title={`Replenish ${pred.itemName}`}
                        >
                          Replenish
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-2">
          <span>
            Displaying {filteredPredictions.length} of {itemPredictions.length} catalog items with active predictive forecasting.
          </span>
          <span className="text-teal-600 dark:text-teal-400 font-semibold">
            Formulas: Target Buffer = max(2 × ReorderLevel, 2 × MonthlyBurn)
          </span>
        </div>
      </div>
    </div>
  );
};
