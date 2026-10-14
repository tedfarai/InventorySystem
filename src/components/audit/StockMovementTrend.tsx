import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  Bar,
  Line,
  ComposedChart,
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
  Package,
  Layers,
  Search,
  CheckSquare,
  Square,
  BarChart2,
  Calendar,
  Sparkles,
  ArrowRightLeft,
  X,
  SlidersHorizontal,
  ChevronDown,
  Info,
  CalendarRange,
} from 'lucide-react';
import { StockItem, MovementLogEntry } from '../../types';
import { useTheme } from '../../hooks/useTheme';

export type TrendPeriodPreset =
  | 'ALL'
  | 'YTD'
  | 'FY2026'
  | 'FY2025'
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'LAST_6M'
  | 'LAST_12M'
  | 'CUSTOM';

export interface StockMovementTrendProps {
  movementLogs: MovementLogEntry[];
  stockItems: StockItem[];
  selectedItemIds?: string[];
  onSelectItemIdsChange?: (itemIds: string[]) => void;
  className?: string;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export interface MonthlyItemMovementPoint {
  monthKey: string;     // e.g. "2026-05"
  monthLabel: string;   // e.g. "May 2026"
  shortMonth: string;   // e.g. "May '26"
  deliveries: number;   // Total units delivered/received inbound
  issues: number;       // Total units issued out to departments
  netMovement: number;  // Deliveries - Issues
  deliveryTransactions: number;
  issueTransactions: number;
}

export const StockMovementTrend: React.FC<StockMovementTrendProps> = ({
  movementLogs = [],
  stockItems = [],
  selectedItemIds: externalSelectedItemIds,
  onSelectItemIdsChange,
  className = '',
  defaultStartDate,
  defaultEndDate,
}) => {
  const { isDark, palette } = useTheme();

  // Internal state for selected item IDs if not controlled externally
  const [internalSelectedItemIds, setInternalSelectedItemIds] = useState<string[]>(() => {
    if (stockItems.length > 0) {
      return [stockItems[0].ItemID];
    }
    return [];
  });

  const selectedItemIds = externalSelectedItemIds ?? internalSelectedItemIds;
  const setSelectedItemIds = (newIds: string[]) => {
    if (onSelectItemIdsChange) {
      onSelectItemIdsChange(newIds);
    } else {
      setInternalSelectedItemIds(newIds);
    }
  };

  // Date range filter states
  const [periodPreset, setPeriodPreset] = useState<TrendPeriodPreset>('ALL');
  const [trendStartDate, setTrendStartDate] = useState<string>(defaultStartDate || '2026-01-01');
  const [trendEndDate, setTrendEndDate] = useState<string>(defaultEndDate || '2026-12-31');
  const [showCustomDateInputs, setShowCustomDateInputs] = useState<boolean>(false);

  // Selector search and category filters
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');
  const [chartMode, setChartMode] = useState<'grouped' | 'stacked' | 'netFlow'>('grouped');
  const [showItemPickerDropdown, setShowItemPickerDropdown] = useState(false);

  // Safe collections
  const safeStockItems = useMemo(() => (Array.isArray(stockItems) ? stockItems : []), [stockItems]);
  const safeLogs = useMemo(() => (Array.isArray(movementLogs) ? movementLogs : []), [movementLogs]);

  // Map of stock items for fast lookup
  const stockItemMap = useMemo(() => {
    const map = new Map<string, StockItem>();
    safeStockItems.forEach((item) => {
      if (item && item.ItemID) map.set(item.ItemID, item);
    });
    return map;
  }, [safeStockItems]);

  // Aggregate total movement counts per item to highlight most active items
  const itemMovementCounts = useMemo(() => {
    const counts = new Map<string, { deliveries: number; issues: number; total: number }>();
    safeLogs.forEach((log) => {
      if (!log || !log.ItemID) return;
      const current = counts.get(log.ItemID) || { deliveries: 0, issues: 0, total: 0 };
      const qty = Math.abs(Number(log.Qty) || 0);
      if (log.Type === 'DELIVERY') {
        current.deliveries += qty;
        current.total += qty;
      } else if (log.Type === 'ISSUE') {
        current.issues += qty;
        current.total += qty;
      }
      counts.set(log.ItemID, current);
    });
    return counts;
  }, [safeLogs]);

  // Preset Date Handlers for Periods (Q1, Q2, Q3, Q4, Fiscal Years, YTD)
  const handleSelectPreset = (preset: TrendPeriodPreset) => {
    setPeriodPreset(preset);
    const anchorYear = 2026;

    switch (preset) {
      case 'Q1':
        setTrendStartDate(`${anchorYear}-01-01`);
        setTrendEndDate(`${anchorYear}-03-31`);
        setShowCustomDateInputs(false);
        break;
      case 'Q2':
        setTrendStartDate(`${anchorYear}-04-01`);
        setTrendEndDate(`${anchorYear}-06-30`);
        setShowCustomDateInputs(false);
        break;
      case 'Q3':
        setTrendStartDate(`${anchorYear}-07-01`);
        setTrendEndDate(`${anchorYear}-09-30`);
        setShowCustomDateInputs(false);
        break;
      case 'Q4':
        setTrendStartDate(`${anchorYear}-10-01`);
        setTrendEndDate(`${anchorYear}-12-31`);
        setShowCustomDateInputs(false);
        break;
      case 'FY2026':
        setTrendStartDate('2026-01-01');
        setTrendEndDate('2026-12-31');
        setShowCustomDateInputs(false);
        break;
      case 'FY2025':
        setTrendStartDate('2025-01-01');
        setTrendEndDate('2025-12-31');
        setShowCustomDateInputs(false);
        break;
      case 'YTD':
        setTrendStartDate('2026-01-01');
        setTrendEndDate('2026-08-20');
        setShowCustomDateInputs(false);
        break;
      case 'LAST_6M':
        setTrendStartDate('2026-03-01');
        setTrendEndDate('2026-08-31');
        setShowCustomDateInputs(false);
        break;
      case 'LAST_12M':
        setTrendStartDate('2025-09-01');
        setTrendEndDate('2026-08-31');
        setShowCustomDateInputs(false);
        break;
      case 'ALL':
        setTrendStartDate('2025-01-01');
        setTrendEndDate('2026-12-31');
        setShowCustomDateInputs(false);
        break;
      case 'CUSTOM':
        setShowCustomDateInputs(true);
        break;
    }
  };

  // Filtered stock items for the selector
  const selectableStockItems = useMemo(() => {
    return safeStockItems.filter((item) => {
      if (!item) return false;
      if (categoryFilter !== 'All' && item.Category !== categoryFilter) return false;
      if (!itemSearchQuery.trim()) return true;
      const q = itemSearchQuery.toLowerCase();
      return (
        item.ItemID.toLowerCase().includes(q) ||
        item.ItemName.toLowerCase().includes(q) ||
        (item.Category && item.Category.toLowerCase().includes(q))
      );
    });
  }, [safeStockItems, categoryFilter, itemSearchQuery]);

  // Toggle item selection
  const handleToggleItem = (itemId: string) => {
    if (selectedItemIds.includes(itemId)) {
      setSelectedItemIds(selectedItemIds.filter((id) => id !== itemId));
    } else {
      setSelectedItemIds([...selectedItemIds, itemId]);
    }
  };

  const handleSelectAllVisible = () => {
    const visibleIds = selectableStockItems.map((i) => i.ItemID);
    const combined = Array.from(new Set([...selectedItemIds, ...visibleIds]));
    setSelectedItemIds(combined);
  };

  const handleClearAll = () => {
    setSelectedItemIds([]);
  };

  const handleSelectTopActive = () => {
    const sorted = [...safeStockItems].sort((a, b) => {
      const aVol = itemMovementCounts.get(a.ItemID)?.total || 0;
      const bVol = itemMovementCounts.get(b.ItemID)?.total || 0;
      return bVol - aVol;
    });
    setSelectedItemIds(sorted.slice(0, 3).map((i) => i.ItemID));
  };

  // Determine months range and calculate monthly breakdown for selected items constrained by date filter
  const monthlyTrendData = useMemo(() => {
    if (selectedItemIds.length === 0) return [];

    const selectedSet = new Set(selectedItemIds);

    // Calculate month boundary strings: YYYY-MM
    const startMonthStr = trendStartDate ? trendStartDate.slice(0, 7) : '2025-01';
    const endMonthStr = trendEndDate ? trendEndDate.slice(0, 7) : '2026-12';

    // Filter relevant logs: only DELIVERY and ISSUE for selected items and within date range
    const relevantLogs = safeLogs.filter((log) => {
      if (!log || !selectedSet.has(log.ItemID)) return false;
      if (log.Type !== 'DELIVERY' && log.Type !== 'ISSUE') return false;

      const datePart = (log.Timestamp || '').split(' ')[0];
      if (trendStartDate && datePart < trendStartDate) return false;
      if (trendEndDate && datePart > trendEndDate) return false;

      return true;
    });

    // Month formatting helper
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    const fullMonthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    // Generate continuous list of months between startMonthStr and endMonthStr
    const sortedMonthKeys: string[] = [];
    const [startYear, startMonth] = startMonthStr.split('-').map(Number);
    const [endYear, endMonth] = endMonthStr.split('-').map(Number);

    let curYear = startYear;
    let curMonth = startMonth;

    while (curYear < endYear || (curYear === endYear && curMonth <= endMonth)) {
      const mKey = `${curYear}-${String(curMonth).padStart(2, '0')}`;
      sortedMonthKeys.push(mKey);

      curMonth++;
      if (curMonth > 12) {
        curMonth = 1;
        curYear++;
      }
    }

    // Safety fallback: if user chose backwards dates, ensure at least start month exists
    if (sortedMonthKeys.length === 0) {
      sortedMonthKeys.push(startMonthStr);
    }

    // Initialize map with all months in window
    const breakdownMap = new Map<string, MonthlyItemMovementPoint>();

    sortedMonthKeys.forEach((mKey) => {
      const [yearStr, monthStr] = mKey.split('-');
      const monthIdx = parseInt(monthStr, 10) - 1;
      const year = parseInt(yearStr, 10);
      const shortMonth = `${monthNames[monthIdx]} '${String(year).slice(-2)}`;
      const monthLabel = `${fullMonthNames[monthIdx]} ${year}`;

      breakdownMap.set(mKey, {
        monthKey: mKey,
        monthLabel,
        shortMonth,
        deliveries: 0,
        issues: 0,
        netMovement: 0,
        deliveryTransactions: 0,
        issueTransactions: 0,
      });
    });

    // Populate with actual log entries
    relevantLogs.forEach((log) => {
      if (!log.Timestamp) return;
      const datePart = log.Timestamp.split(' ')[0];
      const match = datePart.match(/^(\d{4})-(\d{2})/);
      if (!match) return;
      const mKey = `${match[1]}-${match[2]}`;

      if (breakdownMap.has(mKey)) {
        const point = breakdownMap.get(mKey)!;
        const qty = Math.abs(Number(log.Qty) || 0);

        if (log.Type === 'DELIVERY') {
          point.deliveries += qty;
          point.deliveryTransactions += 1;
        } else if (log.Type === 'ISSUE') {
          point.issues += qty;
          point.issueTransactions += 1;
        }
        point.netMovement = point.deliveries - point.issues;
      }
    });

    return Array.from(breakdownMap.values());
  }, [selectedItemIds, safeLogs, trendStartDate, trendEndDate]);

  // Aggregate KPI summary for the selected items and date window
  const summaryMetrics = useMemo(() => {
    let totalDeliveries = 0;
    let totalIssues = 0;
    let totalDeliveryTx = 0;
    let totalIssueTx = 0;

    monthlyTrendData.forEach((d) => {
      totalDeliveries += d.deliveries;
      totalIssues += d.issues;
      totalDeliveryTx += d.deliveryTransactions;
      totalIssueTx += d.issueTransactions;
    });

    const net = totalDeliveries - totalIssues;
    const turnoverRatio = totalDeliveries > 0 ? ((totalIssues / totalDeliveries) * 100).toFixed(1) : '0';

    return {
      totalDeliveries,
      totalIssues,
      totalDeliveryTx,
      totalIssueTx,
      net,
      turnoverRatio,
    };
  }, [monthlyTrendData]);

  // Selected item names description
  const selectedItemsSummary = useMemo(() => {
    if (selectedItemIds.length === 0) return 'No items selected';
    if (selectedItemIds.length === 1) {
      const it = stockItemMap.get(selectedItemIds[0]);
      return it ? `${it.ItemName} (${it.ItemID})` : selectedItemIds[0];
    }
    if (selectedItemIds.length === safeStockItems.length && safeStockItems.length > 0) {
      return `All ${safeStockItems.length} Master Stock Items`;
    }
    const firstTwo = selectedItemIds
      .slice(0, 2)
      .map((id) => stockItemMap.get(id)?.ItemName || id)
      .join(', ');
    const remaining = selectedItemIds.length - 2;
    return remaining > 0 ? `${firstTwo} +${remaining} more` : firstTwo;
  }, [selectedItemIds, stockItemMap, safeStockItems]);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4 transition-colors ${className}`}
    >
      {/* 1. Header Banner & Main Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 text-white flex items-center justify-center shadow-md shrink-0">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  Stock Movement Trend
                  <span className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 font-mono px-2 py-0.5 rounded-md border border-sky-200 dark:border-sky-800 font-semibold">
                    Recharts
                  </span>
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Monthly breakdown of warehouse inbound deliveries versus departmental issues for each and every stock item.
              </p>
            </div>
          </div>
        </div>

        {/* Chart View Modes and Dropdown Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart Display Mode Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setChartMode('grouped')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'grouped'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Side-by-side comparison of deliveries and issues per month"
            >
              Side-by-Side
            </button>
            <button
              type="button"
              onClick={() => setChartMode('stacked')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'stacked'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Stacked bars showing combined transaction throughput"
            >
              Stacked Total
            </button>
            <button
              type="button"
              onClick={() => setChartMode('netFlow')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                chartMode === 'netFlow'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Net Stock Inventory balance curve overlay"
            >
              Net Flow
            </button>
          </div>

          {/* Item Selector Dropdown Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowItemPickerDropdown(!showItemPickerDropdown)}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer shadow-xs ${
                showItemPickerDropdown
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/70'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>
                Selected Items ({selectedItemIds.length}/{safeStockItems.length})
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showItemPickerDropdown ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick Multi-Item Picker Popover */}
            {showItemPickerDropdown && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-3.5 z-40 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Package className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Filter Target Stock Items
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowItemPickerDropdown(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Search Box inside dropdown */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by SKU or Item Name..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px]">
                  {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2 py-0.5 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                        categoryFilter === cat
                          ? 'bg-teal-600 text-white font-bold'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Quick Selection Shortcuts */}
                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
                  >
                    Select All Visible ({selectableStockItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectTopActive}
                    className="text-sky-600 dark:text-sky-400 hover:underline font-semibold cursor-pointer"
                  >
                    Top 3 Active
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-rose-600 dark:text-rose-400 hover:underline font-semibold cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>

                {/* Stock Items Checklist */}
                <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-100 dark:divide-slate-800/60 pr-1">
                  {selectableStockItems.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400 italic">
                      No stock items match your search.
                    </div>
                  ) : (
                    selectableStockItems.map((item) => {
                      const isSelected = selectedItemIds.includes(item.ItemID);
                      const stats = itemMovementCounts.get(item.ItemID) || { deliveries: 0, issues: 0, total: 0 };

                      return (
                        <div
                          key={item.ItemID}
                          onClick={() => handleToggleItem(item.ItemID)}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                            isSelected
                              ? 'bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 text-teal-950 dark:text-teal-200'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold truncate">{item.ItemName}</div>
                              <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-mono">
                                <span>{item.ItemID}</span>
                                <span>•</span>
                                <span className="text-slate-400">{item.Category}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0 font-mono text-[11px] pl-2">
                            <span className="text-sky-600 dark:text-sky-400 font-bold">+{stats.deliveries}</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">−{stats.issues}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. DATE-RANGE FILTER BAR: Focus on Periods, Quarters, Fiscal Years, or Custom Range */}
      <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Quick Period Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[10px] uppercase font-bold px-1 flex items-center gap-1">
              <Calendar className="w-3 h-3 text-teal-600 dark:text-teal-400" />
              <span>Period:</span>
            </span>

            {/* Quarters */}
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/80">
              {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSelectPreset(q)}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                    periodPreset === q
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`${q} (3-Month Quarter)`}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Fiscal Years */}
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleSelectPreset('FY2026')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  periodPreset === 'FY2026'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Full Fiscal Year 2026"
              >
                FY 2026
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('FY2025')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  periodPreset === 'FY2025'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Full Fiscal Year 2025"
              >
                FY 2025
              </button>
            </div>

            {/* Rolling Windows & All Time */}
            <div className="flex items-center bg-white dark:bg-slate-900 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => handleSelectPreset('YTD')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  periodPreset === 'YTD'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Year to Date 2026"
              >
                YTD
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('LAST_6M')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  periodPreset === 'LAST_6M'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Last 6 Months"
              >
                6M
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                  periodPreset === 'ALL'
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="All Recorded History"
              >
                All Time
              </button>
            </div>

            {/* Custom Range Toggle */}
            <button
              type="button"
              onClick={() => {
                if (showCustomDateInputs) {
                  setShowCustomDateInputs(false);
                } else {
                  handleSelectPreset('CUSTOM');
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center space-x-1 ${
                periodPreset === 'CUSTOM' || showCustomDateInputs
                  ? 'bg-teal-50 dark:bg-teal-950/70 border-teal-500 text-teal-700 dark:text-teal-300'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Custom Range</span>
            </button>
          </div>

          {/* Active Period Label */}
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="bg-slate-200/80 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px] font-bold text-slate-700 dark:text-slate-300">
              {trendStartDate} → {trendEndDate}
            </span>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
              ({monthlyTrendData.length} mo)
            </span>
          </div>
        </div>

        {/* Custom Date Pickers Drawer (when Custom is selected) */}
        {(showCustomDateInputs || periodPreset === 'CUSTOM') && (
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-xs animate-in fade-in duration-150">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">From:</span>
              <input
                type="date"
                value={trendStartDate}
                onChange={(e) => {
                  setTrendStartDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">To:</span>
              <input
                type="date"
                value={trendEndDate}
                onChange={(e) => {
                  setTrendEndDate(e.target.value);
                  setPeriodPreset('CUSTOM');
                }}
                className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="text-[11px] text-slate-400 italic">
              Chart dynamically plots each calendar month encompassed by this range.
            </div>
          </div>
        )}
      </div>

      {/* 3. Active Scope Pill & Selected Items Badges */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
        <div className="flex items-center space-x-2 min-w-0">
          <span className="text-slate-500 dark:text-slate-400 font-semibold font-mono text-[11px] uppercase tracking-wider shrink-0">
            Active Scope:
          </span>
          <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
            {selectedItemsSummary}
          </span>
        </div>

        {/* Selected Item Badges */}
        <div className="flex flex-wrap items-center gap-1.5 max-w-full">
          {selectedItemIds.slice(0, 5).map((id) => {
            return (
              <span
                key={id}
                className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-200 dark:border-teal-800 text-[11px] font-mono shadow-2xs"
              >
                <span className="font-bold">{id}</span>
                <button
                  type="button"
                  onClick={() => handleToggleItem(id)}
                  className="hover:text-rose-500 cursor-pointer ml-1 text-slate-400"
                  title="Remove item from trend scope"
                >
                  ×
                </button>
              </span>
            );
          })}
          {selectedItemIds.length > 5 && (
            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md text-[10px] font-bold">
              +{selectedItemIds.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* 4. Recharts Visual Chart Container */}
      {selectedItemIds.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <Package className="w-10 h-10 text-slate-400 mx-auto mb-2 opacity-60" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Stock Items Selected for Trend Analysis
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Choose one or more items from the selector dropdown above or select the top active items to visualize monthly issuing versus deliveries.
          </p>
          <button
            type="button"
            onClick={handleSelectTopActive}
            className="mt-3 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
          >
            Load Top Active Items
          </button>
        </div>
      ) : (
        <div className="w-full h-[320px] sm:h-[360px] pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={monthlyTrendData}
              margin={{ top: 10, right: 15, left: -10, bottom: 20 }}
            >
              <defs>
                <linearGradient id="deliveryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0284c7" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0369a1" stopOpacity={0.75} />
                </linearGradient>
                <linearGradient id="issueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.75} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={palette.gridStroke}
                opacity={palette.gridOpacity}
                vertical={false}
              />

              <XAxis
                dataKey="shortMonth"
                tick={{ fill: palette.axisText, fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.tickLine }}
              />

              <YAxis
                tick={{ fill: palette.axisText, fontSize: 11, fontFamily: 'monospace' }}
                axisLine={{ stroke: palette.axisLine }}
                tickLine={{ stroke: palette.tickLine }}
                label={{
                  value: 'Quantity (Units)',
                  angle: -90,
                  position: 'insideLeft',
                  offset: 20,
                  fill: palette.textMuted,
                  fontSize: 10,
                  fontFamily: 'monospace',
                }}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data: MonthlyItemMovementPoint = payload[0]?.payload;
                  if (!data) return null;

                  return (
                    <div
                      className={`rounded-2xl shadow-xl p-3.5 backdrop-blur-md min-w-[240px] border text-xs font-sans ${
                        isDark
                          ? 'bg-slate-950/95 text-white border-slate-700'
                          : 'bg-white/95 text-slate-900 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
                        <span className="font-bold text-xs">{data.monthLabel}</span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {selectedItemIds.length} item{selectedItemIds.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-1.5 font-mono text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center space-x-1.5 text-sky-600 dark:text-sky-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
                            <span>Inbound Deliveries:</span>
                          </span>
                          <span className="font-bold">
                            +{data.deliveries} Units ({data.deliveryTransactions} GRNs)
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Outbound Issues:</span>
                          </span>
                          <span className="font-bold">
                            −{data.issues} Units ({data.issueTransactions} Slips)
                          </span>
                        </div>

                        <div className="pt-1.5 mt-1 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold">
                          <span className="text-slate-600 dark:text-slate-400">Net Movement:</span>
                          <span
                            className={
                              data.netMovement > 0
                                ? 'text-sky-600 dark:text-sky-400'
                                : data.netMovement < 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-slate-500'
                            }
                          >
                            {data.netMovement > 0 ? `+${data.netMovement}` : data.netMovement} Units
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />

              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: 10, fontSize: 11, fontFamily: 'monospace' }}
              />

              {/* Reference zero line */}
              <ReferenceLine y={0} stroke={palette.axisLine} strokeWidth={1} />

              {/* Bars: Grouped or Stacked */}
              <Bar
                name="Deliveries (Inbound)"
                dataKey="deliveries"
                fill="url(#deliveryGradient)"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                radius={chartMode === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                barSize={chartMode === 'stacked' ? 32 : 16}
              />

              <Bar
                name="Issues (Outbound)"
                dataKey="issues"
                fill="url(#issueGradient)"
                stackId={chartMode === 'stacked' ? 'a' : undefined}
                radius={chartMode === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
                barSize={chartMode === 'stacked' ? 32 : 16}
              />

              {/* Net Inventory Movement Line Curve */}
              {(chartMode === 'netFlow' || chartMode === 'grouped') && (
                <Line
                  name="Net Inventory Flow"
                  type="monotone"
                  dataKey="netMovement"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#f59e0b', strokeWidth: 1.5, stroke: isDark ? '#0f172a' : '#ffffff' }}
                  activeDot={{ r: 6, fill: '#f59e0b' }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 5. Mini KPI Cards Row for the Selected Items within Date Window */}
      {selectedItemIds.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
              Total Inbound Delivered
            </span>
            <div className="text-lg font-black font-mono text-sky-600 dark:text-sky-400 mt-1">
              +{summaryMetrics.totalDeliveries}{' '}
              <span className="text-[10px] font-normal text-slate-500">Units</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across {summaryMetrics.totalDeliveryTx} delivery notes in period
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
              Total Outbound Issued
            </span>
            <div className="text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 mt-1">
              −{summaryMetrics.totalIssues}{' '}
              <span className="text-[10px] font-normal text-slate-500">Units</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Across {summaryMetrics.totalIssueTx} requisitions in period
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
              Net Balance Change
            </span>
            <div
              className={`text-lg font-black font-mono mt-1 ${
                summaryMetrics.net >= 0
                  ? 'text-sky-600 dark:text-sky-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {summaryMetrics.net >= 0 ? `+${summaryMetrics.net}` : summaryMetrics.net}{' '}
              <span className="text-[10px] font-normal text-slate-500">Units</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {summaryMetrics.net >= 0 ? 'Net positive stock retention' : 'Outflow exceeds replenish'}
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/70 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-bold">
              Fulfillment Velocity
            </span>
            <div className="text-lg font-black font-mono text-teal-600 dark:text-teal-400 mt-1">
              {summaryMetrics.turnoverRatio}%
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Consumption vs Inflow ratio
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
