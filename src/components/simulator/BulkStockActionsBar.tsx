import React, { useState } from 'react';
import {
  CheckSquare,
  Square,
  MinusSquare,
  PackagePlus,
  Send,
  SlidersHorizontal,
  Download,
  Copy,
  Trash2,
  X,
  Layers,
  AlertTriangle,
  AlertOctagon,
  Check,
  Sparkles,
} from 'lucide-react';
import { StockItem } from '../../types';

interface BulkStockActionsBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  totalStockCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  isMultiSelectMode?: boolean;
  selectedItems: StockItem[];
  onToggleSelectAll: () => void;
  onSelectByStatus: (status: 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK') => void;
  onClearSelection: () => void;
  onExitMultiSelectMode?: () => void;
  onBulkRestock: (items: StockItem[]) => void;
  onBulkIssue: (items: StockItem[]) => void;
  onBulkAdjustment: (items: StockItem[]) => void;
  onOpenBatchUpdateModal: () => void;
  onExportSelectedCsv: () => void;
  onCopySelectedClipboard: () => void;
  onBulkDelete?: (items: StockItem[]) => void;
  isSuperiorAdmin: boolean;
}

export const BulkStockActionsBar: React.FC<BulkStockActionsBarProps> = ({
  selectedCount,
  totalFilteredCount,
  isAllSelected,
  isPartiallySelected,
  isMultiSelectMode = false,
  selectedItems,
  onToggleSelectAll,
  onSelectByStatus,
  onClearSelection,
  onExitMultiSelectMode,
  onBulkRestock,
  onBulkIssue,
  onBulkAdjustment,
  onOpenBatchUpdateModal,
  onExportSelectedCsv,
  onCopySelectedClipboard,
  onBulkDelete,
  isSuperiorAdmin,
}) => {
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleCopy = () => {
    onCopySelectedClipboard();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const hasSelection = selectedCount > 0;

  return (
    <div
      id="bulk-stock-actions-bar"
      className="bg-slate-900 text-white p-3 rounded-xl border border-teal-500/40 shadow-lg flex flex-wrap items-center justify-between gap-3"
    >
      {/* Left side: Selection indicators & Quick Select Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          id="toggle-select-all-filtered-btn"
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition whitespace-nowrap shrink-0 cursor-pointer"
          title={isAllSelected ? 'Deselect all visible items' : 'Select all visible items'}
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 text-teal-400" />
          ) : isPartiallySelected ? (
            <MinusSquare className="w-4 h-4 text-teal-400" />
          ) : (
            <Square className="w-4 h-4 text-slate-400" />
          )}
          <span>{isAllSelected ? 'Deselect Visible' : `Select Visible (${totalFilteredCount})`}</span>
        </button>

        {/* Selected Count Indicator */}
        <div
          id="bulk-selected-items-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/15 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-mono font-bold whitespace-nowrap shrink-0 tabular-nums"
        >
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>
            <strong className="text-white font-extrabold">{selectedCount}</strong> item
            {selectedCount === 1 ? '' : 's'} selected
          </span>
        </div>

        {isMultiSelectMode && !hasSelection && (
          <span className="text-[11px] text-slate-300 hidden sm:inline">
            Click rows below to select items for a combined SIV or BRV voucher
          </span>
        )}

        {/* Quick select status buttons */}
        <div className="hidden xl:flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 font-medium px-1">Quick Select:</span>
          <button
            type="button"
            onClick={() => onSelectByStatus('OUT_OF_STOCK')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700 rounded-md font-sans transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <AlertOctagon className="w-3 h-3 text-rose-400" /> Out of Stock
          </button>
          <button
            type="button"
            onClick={() => onSelectByStatus('LOW_STOCK')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-700 rounded-md font-sans transition flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Low Stock
          </button>
        </div>
      </div>

      {/* Right side: Bulk Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Primary Action 1: Bulk Issue (Combined SIV) */}
        <button
          id="bulk-action-issue-btn"
          type="button"
          disabled={!hasSelection}
          onClick={() => onBulkIssue(selectedItems)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 border border-transparent"
          title="Issue selected items to a department on 1 combined Stock Issue Voucher (SIV)"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Bulk Issue{hasSelection ? ` (${selectedCount})` : ''}</span>
        </button>

        {/* Primary Action 2: Interactive Bulk Receive (Combined BRV) */}
        <button
          id="bulk-action-interactive-receive-btn"
          type="button"
          disabled={!hasSelection}
          onClick={() => onBulkRestock(selectedItems)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0 border border-transparent"
          title="Open interactive bulk receive grid to generate 1 combined Bulk Receive Voucher (BRV) for a department"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Interactive Bulk Receive{hasSelection ? ` (${selectedCount})` : ''}</span>
        </button>

        {/* Action 3: Batch Stock Adjustment */}
        <button
          id="bulk-action-adjustment-btn"
          type="button"
          disabled={!hasSelection}
          onClick={() => onBulkAdjustment(selectedItems)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          title="Create physical count adjustment or discrepancy authorization request for selected items"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Batch Adjustment</span>
        </button>

        {/* Action 4: Batch Update */}
        <button
          id="bulk-action-batch-update-btn"
          type="button"
          disabled={!hasSelection}
          onClick={onOpenBatchUpdateModal}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          title="Batch update category or reorder threshold"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span className="hidden md:inline">Batch Edit</span>
        </button>

        {/* Action 5: Export CSV */}
        <button
          id="bulk-action-export-csv-btn"
          type="button"
          disabled={!hasSelection}
          onClick={onExportSelectedCsv}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          title="Export selected items to CSV"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">CSV</span>
        </button>

        {/* Action 6: Copy formatted to clipboard */}
        <button
          id="bulk-action-copy-btn"
          type="button"
          disabled={!hasSelection}
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
          title="Copy selected items to clipboard"
        >
          {copiedNotification ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span className="hidden xl:inline">{copiedNotification ? 'Copied!' : 'Copy'}</span>
        </button>

        {/* Action 7: Bulk Delete (Admin Only) */}
        {isSuperiorAdmin && onBulkDelete && (
          <button
            id="bulk-action-delete-btn"
            type="button"
            disabled={!hasSelection}
            onClick={() => onBulkDelete(selectedItems)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 disabled:opacity-50 text-rose-200 hover:text-white rounded-lg text-xs font-semibold border border-rose-700 transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
            title="Delete selected items from master inventory"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Delete</span>
          </button>
        )}

        {/* Clear / Exit Multi-Select Button */}
        <button
          id="bulk-action-clear-selection-btn"
          type="button"
          onClick={() => {
            onClearSelection();
            if (isMultiSelectMode && onExitMultiSelectMode) {
              onExitMultiSelectMode();
            }
          }}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          title={isMultiSelectMode ? 'Clear selection & exit Multi-Select Mode' : 'Clear selection'}
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
