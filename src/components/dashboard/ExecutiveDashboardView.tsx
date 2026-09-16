import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Package,
  TrendingDown,
  Activity,
  ShieldAlert,
  Layers,
  ArrowUpRight,
  ArrowDownToLine,
  Send,
  Building2,
  Database,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Settings,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  Clock,
  ChevronRight,
  Filter,
  Check,
  FolderOpen,
} from 'lucide-react';
import {
  StockItem,
  MovementLogEntry,
  Department,
  StockAdjustmentRequest,
  AdminUser,
  BackupSnapshot,
} from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface ExecutiveDashboardViewProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  departments: Department[];
  adjustmentRequests: StockAdjustmentRequest[];
  currentUser: AdminUser | null;
  backups?: BackupSnapshot[];
  onNavigateTab: (tab: 'simulator' | 'audit' | 'export') => void;
  onOpenQuickAction: (actionType: 'delivery' | 'issue' | 'adjustment' | 'reorderReport') => void;
  onOpenMovementDoc?: (log: MovementLogEntry) => void;
}

export interface DashboardWidgetConfig {
  lowStock: boolean;
  recentActivity: boolean;
  pendingAdjustments: boolean;
  categoryDistribution: boolean;
  departmentConsumption: boolean;
  systemStorageStatus: boolean;
  quickLaunchpad: boolean;
}

const DEFAULT_WIDGETS: DashboardWidgetConfig = {
  lowStock: true,
  recentActivity: true,
  pendingAdjustments: true,
  categoryDistribution: true,
  departmentConsumption: true,
  systemStorageStatus: true,
  quickLaunchpad: true,
};

export const ExecutiveDashboardView: React.FC<ExecutiveDashboardViewProps> = ({
  stockItems = [],
  movementLogs = [],
  departments = [],
  adjustmentRequests = [],
  currentUser,
  backups = [],
  onNavigateTab,
  onOpenQuickAction,
  onOpenMovementDoc,
}) => {
  const [widgets, setWidgets] = useState<DashboardWidgetConfig>(() => {
    try {
      const saved = localStorage.getItem('paramount_dashboard_widgets');
      if (saved) {
        return { ...DEFAULT_WIDGETS, ...JSON.parse(saved) };
      }
    } catch (e) {
      // ignore
    }
    return DEFAULT_WIDGETS;
  });

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('paramount_dashboard_widgets', JSON.stringify(widgets));
    } catch (e) {
      // ignore
    }
  }, [widgets]);

  const toggleWidget = (key: keyof DashboardWidgetConfig) => {
    setWidgets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const resetWidgets = () => {
    setWidgets(DEFAULT_WIDGETS);
  };

  // Safe data arrays
  const safeStock = Array.isArray(stockItems) ? stockItems : [];
  const safeLogs = Array.isArray(movementLogs) ? movementLogs : [];
  const safeDepts = Array.isArray(departments) ? departments : [];
  const safeRequests = Array.isArray(adjustmentRequests) ? adjustmentRequests : [];

  // Summary Metrics
  const totalSkus = safeStock.length;
  const totalUnits = safeStock.reduce((acc, item) => acc + (Number(item?.Qty) || 0), 0);
  const lowStockItems = safeStock.filter(
    (item) => item && (Number(item.Qty) || 0) <= (Number(item.ReorderLevel) || 10)
  );
  const outOfStockItems = safeStock.filter((item) => (Number(item.Qty) || 0) <= 0);
  const pendingRequests = safeRequests.filter((r) => r?.status === 'PENDING');

  // Category breakdown
  const stationeryItems = safeStock.filter((s) => s?.Category === 'Stationery');
  const cleaningItems = safeStock.filter((s) => s?.Category === 'Cleaning');
  const generalItems = safeStock.filter((s) => s?.Category === 'General');

  // Department requisitions aggregation
  const deptIssueCounts: { [deptName: string]: number } = {};
  safeLogs
    .filter((l) => l?.Type === 'ISSUE')
    .forEach((l) => {
      const name = l.DeptName || 'Unknown Dept';
      deptIssueCounts[name] = (deptIssueCounts[name] || 0) + (Number(l.Qty) || 0);
    });
  const topDepts = Object.entries(deptIssueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="w-full space-y-5 pb-8 animate-in fade-in duration-150">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Executive Inventory Dashboard
            </h1>
            <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
              Live Real-time
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Stationery &amp; Cleaning stock overview, threshold monitor, and pending operational requests.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsCustomizeOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer shadow-2xs"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Customize Widgets</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('simulator')}
            className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition cursor-pointer shadow-md"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Master Stock Sheet</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total SKUs */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Catalog SKUs
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/80 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalSkus}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>In Stationery, Cleaning &amp; General</span>
          </div>
        </div>

        {/* Metric 2: Total Units */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Units On Hand
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {totalUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>Verified physical quantity</span>
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div
          onClick={() => onOpenQuickAction('reorderReport')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 rounded-2xl shadow-2xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Below Safety Threshold
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-2">
            <span>{lowStockItems.length}</span>
            {outOfStockItems.length > 0 && (
              <span className="text-xs font-normal text-slate-500">
                ({outOfStockItems.length} out of stock)
              </span>
            )}
          </div>
          <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1 font-semibold">
            <span>Click to view re-order report &rarr;</span>
          </div>
        </div>

        {/* Metric 4: Pending Adjustments */}
        <div
          onClick={() => onOpenQuickAction('adjustment')}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 rounded-2xl shadow-2xs cursor-pointer transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Adjustments
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
            {pendingRequests.length}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>Awaiting supervisor authorization</span>
          </div>
        </div>
      </div>

      {/* Widget 7: Quick Procurement Launchpad (if enabled) */}
      {widgets.quickLaunchpad && (
        <div className="p-4 bg-emerald-950/20 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Fast Procurement Launchpad</span>
            </div>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-400">
              One-click access to core inventory workflows
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => onOpenQuickAction('delivery')}
              className="p-3 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left cursor-pointer transition shadow-2xs group"
            >
              <ArrowDownToLine className="w-4 h-4 text-sky-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Receive Stock</div>
              <div className="text-[10px] text-slate-500">Log GRN delivery note</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuickAction('issue')}
              className="p-3 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left cursor-pointer transition shadow-2xs group"
            >
              <Send className="w-4 h-4 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Issue Out Request</div>
              <div className="text-[10px] text-slate-500">Department issue slip</div>
            </button>

            <button
              type="button"
              onClick={() => onOpenQuickAction('adjustment')}
              className="p-3 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left cursor-pointer transition shadow-2xs group"
            >
              <SlidersHorizontal className="w-4 h-4 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Stock Adjustment</div>
              <div className="text-[10px] text-slate-500">Physical count variance</div>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab('audit')}
              className="p-3 bg-white dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-teal-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-left cursor-pointer transition shadow-2xs group"
            >
              <Activity className="w-4 h-4 text-teal-600 mb-1.5 group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-900 dark:text-white">Audit Analytics</div>
              <div className="text-[10px] text-slate-500">Historical transaction logs</div>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Configurable Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Widget 1: Low Stock & Safety Stock Alerts */}
        {widgets.lowStock && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <TrendingDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Low Stock &amp; Safety Threshold Alerts
                </h3>
              </div>
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/80 px-2 py-0.5 rounded-full">
                {lowStockItems.length} items
              </span>
            </div>

            <div className="py-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-72">
              {lowStockItems.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  All stock items are currently above safety reorder levels!
                </div>
              ) : (
                lowStockItems.slice(0, 8).map((item, idx) => {
                  const qty = Number(item.Qty) || 0;
                  const reorder = Number(item.ReorderLevel) || 10;
                  const percent = Math.min(Math.round((qty / reorder) * 100), 100);
                  const isZero = qty <= 0;

                  return (
                    <div key={item.ItemID || `low-stock-${idx}`} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-teal-700 dark:text-teal-400 bg-slate-100 dark:bg-slate-800 px-1 rounded">
                            {item.ItemID}
                          </span>
                          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                            {item.ItemName}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden max-w-[140px]">
                            <div
                              className={`h-full rounded-full ${isZero ? 'bg-rose-600' : 'bg-amber-500'}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400">
                            Reorder threshold: {reorder} {item.Unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-extrabold ${
                            isZero ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {qty} {item.Unit}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenQuickAction('delivery')}
                          className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          Replenish &rarr;
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => onOpenQuickAction('reorderReport')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Reorder Safety Report</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Widget 2: Recent Inventory Activity & Live Movement Feed */}
        {widgets.recentActivity && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Recent Inventory Movements
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('audit')}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                View Audit &rarr;
              </button>
            </div>

            <div className="py-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-72">
              {safeLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No transaction activity logged yet.
                </div>
              ) : (
                safeLogs.slice(0, 8).map((log, idx) => {
                  const isDelivery = log.Type === 'DELIVERY';
                  const isIssue = log.Type === 'ISSUE';
                  const logKey = log.id || `log-${log.Timestamp || ''}-${idx}`;

                  return (
                    <div
                      key={logKey}
                      onClick={() => onOpenMovementDoc && onOpenMovementDoc(log)}
                      className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 px-1.5 rounded-lg cursor-pointer transition"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                            isDelivery
                              ? 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300'
                              : isIssue
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          {isDelivery ? '+' : isIssue ? '-' : 'Δ'}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {log.ItemName}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2">
                            <span>{log.DeptName || log.Type}</span>
                            <span>•</span>
                            <span>{log.Timestamp ? log.Timestamp.substring(0, 16) : 'Recently'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-bold font-mono ${
                            isDelivery ? 'text-sky-600' : isIssue ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          {isDelivery ? '+' : isIssue ? '-' : ''}
                          {log.Qty}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono">
                          {log.IssuerID || 'ADM001'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Widget 3: Pending Stock Adjustments & Authorizations */}
        {widgets.pendingAdjustments && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Pending Stock Adjustments &amp; Requests
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 px-2 py-0.5 rounded-full">
                {pendingRequests.length} pending
              </span>
            </div>

            <div className="py-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-72">
              {pendingRequests.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5" />
                  No pending adjustment requests. Stock counts are fully verified!
                </div>
              ) : (
                pendingRequests.map((req, idx) => {
                  const reqKey = req.id || (req as any).requestId || `pending-req-${idx}`;
                  const reasonDisplay =
                    req.items && req.items[0]?.ReasonLabel
                      ? req.items[0].ReasonLabel
                      : req.items && req.items[0]?.ReasonCode
                      ? req.items[0].ReasonCode
                      : req.requestTitle || 'Stock Discrepancy';

                  return (
                    <div key={reqKey} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 px-1 rounded">
                            {req.id || (req as any).requestId || `SAR-${idx + 1}`}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {req.items && req.items[0] ? req.items[0].ItemName : req.requestTitle || 'Stock Item'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          By {req.requesterName} ({req.requesterId}) • {reasonDisplay}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onOpenQuickAction('adjustment')}
                        className="px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 rounded-lg hover:bg-amber-100 cursor-pointer transition shrink-0"
                      >
                        Authorize
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Widget 4: Stock Distribution by Category */}
        {widgets.categoryDistribution && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Category Stock Distribution
                </h3>
              </div>
            </div>

            <div className="py-4 space-y-3 flex-1">
              {/* Stationery */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">Stationery Supplies</span>
                  <span className="text-teal-600 dark:text-teal-400">
                    {stationeryItems.length} SKUs (
                    {stationeryItems.reduce((acc, s) => acc + (Number(s.Qty) || 0), 0)} units)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full"
                    style={{
                      width: `${totalSkus ? (stationeryItems.length / totalSkus) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Cleaning */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">Cleaning &amp; Hygiene</span>
                  <span className="text-sky-600 dark:text-sky-400">
                    {cleaningItems.length} SKUs (
                    {cleaningItems.reduce((acc, s) => acc + (Number(s.Qty) || 0), 0)} units)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full"
                    style={{
                      width: `${totalSkus ? (cleaningItems.length / totalSkus) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* General */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-800 dark:text-slate-200">General Hardware</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {generalItems.length} SKUs (
                    {generalItems.reduce((acc, s) => acc + (Number(s.Qty) || 0), 0)} units)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{
                      width: `${totalSkus ? (generalItems.length / totalSkus) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Widget 5: Department Consumption Breakdown */}
        {widgets.departmentConsumption && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Top Department Consumption
                </h3>
              </div>
            </div>

            <div className="py-2 flex-1 divide-y divide-slate-100 dark:divide-slate-800/80 overflow-y-auto max-h-72">
              {topDepts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No department issues logged yet.
                </div>
              ) : (
                topDepts.map(([dept, qty], index) => (
                  <div key={dept || `dept-${index}`} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                        {index + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {dept}
                      </span>
                    </div>
                    <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {qty} units issued
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Widget 6: System Storage & Database Health */}
        {widgets.systemStorageStatus && (
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Offline Database &amp; Vault Health
                </h3>
              </div>
              <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded-full">
                <Check className="w-3 h-3" />
                <span>100% Offline Ready</span>
              </div>
            </div>

            <div className="py-3 space-y-2.5 text-xs">
              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">SQLite 3 WASM Engine</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Sandboxed &amp; Active</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">Automatic Backup Vault Snapshots</span>
                <span className="font-bold text-slate-900 dark:text-white">{backups.length} points</span>
              </div>
              <div className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-slate-600 dark:text-slate-300">IndexedDB Local Persistence</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">Synchronized</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customize Widgets Modal */}
      {isCustomizeOpen && (
        <DraggableResizableModal
          onClose={() => setIsCustomizeOpen(false)}
          modalId="customize-widgets-modal"
          zIndex="z-50"
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col"
        >
          <div
            data-drag-handle="true"
            className="p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Customize Dashboard Widgets
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsCustomizeOpen(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-2 py-1 rounded cursor-pointer"
            >
              Done
            </button>
          </div>

          <div className="p-5 space-y-3 flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Select which executive widgets to display on your landing dashboard:
            </p>

            <div className="space-y-2">
              {[
                { key: 'quickLaunchpad', label: 'Fast Procurement Launchpad', desc: 'One-click shortcuts to key actions' },
                { key: 'lowStock', label: 'Low Stock & Threshold Alerts', desc: 'Monitor items nearing zero' },
                { key: 'recentActivity', label: 'Recent Inventory Movements', desc: 'Live feed of deliveries & issues' },
                { key: 'pendingAdjustments', label: 'Pending Stock Adjustments', desc: 'Authorizations awaiting review' },
                { key: 'categoryDistribution', label: 'Category Stock Distribution', desc: 'Stationery vs Cleaning vs General' },
                { key: 'departmentConsumption', label: 'Top Department Consumption', desc: 'Departments requisitioning the most items' },
                { key: 'systemStorageStatus', label: 'Offline Database & Vault Health', desc: 'SQLite storage and snapshot stats' },
              ].map((w) => (
                <label
                  key={w.key}
                  className="flex items-start space-x-3 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(widgets[w.key as keyof DashboardWidgetConfig])}
                    onChange={() => toggleWidget(w.key as keyof DashboardWidgetConfig)}
                    className="w-4 h-4 mt-0.5 text-emerald-600 rounded focus:ring-emerald-500 cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{w.label}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{w.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="pt-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={resetWidgets}
                className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer"
              >
                Reset Defaults
              </button>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
              >
                Save &amp; Close
              </button>
            </div>
          </div>
        </DraggableResizableModal>
      )}
    </div>
  );
};
