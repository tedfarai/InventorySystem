import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertOctagon,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  Filter,
  X,
} from 'lucide-react';
import type { ReorderItemAnalysis, ReorderReportSummary } from '../../utils/reorderInventoryAnalysis';

interface LowStockWarningOverlayProps {
  summary: ReorderReportSummary;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onDismiss: () => void;
  onGenerateRequisition: (selectedItems: ReorderItemAnalysis[]) => void;
  onFilterLowStockSheet?: () => void;
  onOpenReorderReport?: () => void;
}

export const LowStockWarningOverlay: React.FC<LowStockWarningOverlayProps> = ({
  summary,
  isMinimized,
  onToggleMinimize,
  onDismiss,
  onGenerateRequisition,
  onFilterLowStockSheet,
  onOpenReorderReport,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    summary.items.map((item) => item.item.ItemID)
  );

  // Sync newly depleted items into selection automatically
  useEffect(() => {
    const validIds = new Set(summary.items.map((item) => item.item.ItemID));
    setSelectedIds((prev) => {
      const kept = prev.filter((id) => validIds.has(id));
      const newOnes = summary.items
        .map((item) => item.item.ItemID)
        .filter((id) => !prev.includes(id));
      if (kept.length === 0 && summary.items.length > 0) {
        return summary.items.map((item) => item.item.ItemID);
      }
      return [...kept, ...newOnes];
    });
  }, [summary.items]);

  const selectedAnalyses = useMemo(
    () => summary.items.filter((entry) => selectedIds.includes(entry.item.ItemID)),
    [summary.items, selectedIds]
  );

  const selectedUnitsTotal = useMemo(
    () => selectedAnalyses.reduce((sum, entry) => sum + entry.recommendedOrderQty, 0),
    [selectedAnalyses]
  );

  const allSelected = summary.items.length > 0 && selectedAnalyses.length === summary.items.length;
  const hasOutOfStock = summary.outOfStockCount > 0;

  const toggleItemSelection = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(summary.items.map((entry) => entry.item.ItemID));
    }
  };

  const handleGenerateClick = () => {
    const itemsToRequest = selectedAnalyses.length > 0 ? selectedAnalyses : summary.items;
    onGenerateRequisition(itemsToRequest);
  };

  return (
    <aside
      id="low-stock-warning-overlay"
      aria-label="Automated Low Stock Warning"
      className="fixed bottom-4 right-4 sm:bottom-5 sm:right-6 z-30 w-[min(calc(100vw-2rem),420px)] pointer-events-auto"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isMinimized ? (
          <motion.div
            key="minimized"
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-xl"
          >
            <button
              type="button"
              onClick={onToggleMinimize}
              className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
              title="Expand Low Stock Warning overlay"
            >
              <span
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  hasOutOfStock
                    ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-500/12 text-amber-600 dark:text-amber-400'
                }`}
              >
                {hasOutOfStock ? (
                  <AlertOctagon className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
              </span>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                  Low Stock Warning
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums truncate">
                  {summary.belowThresholdCount} below threshold · {summary.outOfStockCount} out
                </div>
              </div>
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleGenerateClick}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                <span>Requisition</span>
              </button>
              <button
                type="button"
                onClick={onToggleMinimize}
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Expand Low Stock Warning"
                aria-label="Expand Low Stock Warning"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                title="Dismiss overlay"
                aria-label="Dismiss Low Stock Warning"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700/90 shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    hasOutOfStock
                      ? 'bg-rose-500/12 text-rose-600 dark:text-rose-400 border border-rose-500/25'
                      : 'bg-amber-500/12 text-amber-600 dark:text-amber-400 border border-amber-500/25'
                  }`}
                >
                  {hasOutOfStock ? (
                    <AlertOctagon className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Low Stock Warning
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums mt-0.5">
                    {summary.outOfStockCount} out of stock
                    <span aria-hidden="true"> · </span>
                    {summary.criticalCount + summary.lowStockCount} low
                    <span aria-hidden="true"> · </span>
                    {summary.totalRecommendedUnits.toLocaleString()} rec. units
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleMinimize}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Minimize warning overlay"
                  aria-label="Minimize Low Stock Warning"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  title="Dismiss for now"
                  aria-label="Dismiss Low Stock Warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Sub-bar controls */}
            <div className="px-4 py-2 bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px]">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="w-3.5 h-3.5 rounded text-teal-600 accent-teal-600 cursor-pointer"
                />
                <span className="tabular-nums">
                  Selected {selectedAnalyses.length} of {summary.belowThresholdCount}
                </span>
              </label>

              <div className="flex items-center gap-3">
                {onFilterLowStockSheet && (
                  <button
                    type="button"
                    onClick={onFilterLowStockSheet}
                    className="inline-flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition cursor-pointer whitespace-nowrap shrink-0"
                    title="Filter Master Stock Sheet to show only low-stock and out-of-stock items"
                  >
                    <Filter className="w-3 h-3" />
                    <span>Filter Sheet</span>
                  </button>
                )}
                {onOpenReorderReport && (
                  <button
                    type="button"
                    onClick={onOpenReorderReport}
                    className="font-semibold text-teal-700 dark:text-teal-400 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                  >
                    Full Report
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Item List */}
            <div className="max-h-[210px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {summary.items.map((entry) => {
                const checked = selectedIds.includes(entry.item.ItemID);
                const isOos = entry.urgency === 'OUT_OF_STOCK';
                const isCrit = entry.urgency === 'CRITICAL';
                return (
                  <label
                    key={entry.item.ItemID}
                    className="flex items-center justify-between gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItemSelection(entry.item.ItemID)}
                        className="w-3.5 h-3.5 rounded text-teal-600 accent-teal-600 shrink-0 cursor-pointer"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate" title={entry.item.ItemName}>
                          {entry.item.ItemName}
                        </div>
                        <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                          {entry.item.ItemID}
                          <span aria-hidden="true"> · </span>
                          <span
                            className={
                              isOos
                                ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                : isCrit
                                ? 'text-amber-600 dark:text-amber-400 font-semibold'
                                : 'text-amber-600 dark:text-amber-300'
                            }
                          >
                            {isOos ? 'Out of Stock' : isCrit ? 'Critical' : 'Low Stock'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono tabular-nums shrink-0">
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        <span className={isOos ? 'text-rose-600 dark:text-rose-400 font-bold' : ''}>
                          {entry.currentQty}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500"> / {entry.reorderLevel}</span>
                      </div>
                      <div className="text-[10px] text-teal-700 dark:text-teal-400 font-semibold">
                        Order +{entry.recommendedOrderQty}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Footer Primary Action */}
            <div className="px-4 py-3 bg-slate-50/90 dark:bg-slate-950/70 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                id="btn-overlay-generate-purchase-requisition"
                type="button"
                disabled={selectedAnalyses.length === 0}
                onClick={handleGenerateClick}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white shadow-sm transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                <FilePlus2 className="w-4 h-4 shrink-0" />
                <span>
                  Generate Purchase Requisition
                  {selectedAnalyses.length > 0 ? ` (${selectedAnalyses.length})` : ''}
                </span>
              </button>
              <div className="flex items-center justify-between text-[10.5px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                <span>Est. replenishment volume</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedUnitsTotal.toLocaleString()} units
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
};
