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
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { StockItem } from '../../types';

interface BulkStockActionsBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  totalStockCount: number;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
  selectedItems: StockItem[];
  onToggleSelectAll: () => void;
  onSelectByStatus: (status: 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK') => void;
  onClearSelection: () => void;
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
  totalStockCount,
  isAllSelected,
  isPartiallySelected,
  selectedItems,
  onToggleSelectAll,
  onSelectByStatus,
  onClearSelection,
  onBulkRestock,
  onBulkIssue,
  onBulkAdjustment,
  onOpenBatchUpdateModal,
  onExportSelectedCsv,
  onCopySelectedClipboard,
  onBulkDelete,
  isSuperiorAdmin,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const handleCopy = () => {
    onCopySelectedClipboard();
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div
      id="bulk-stock-actions-bar"
      className="bg-slate-900 text-white p-3 rounded-xl border border-teal-500/40 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Left side: Selection indicators & Quick Select Chips */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          id="toggle-select-all-filtered-btn"
          type="button"
          onClick={onToggleSelectAll}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
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

        {/* Selected Count Indicator Badge */}
        <div
          id="bulk-selected-items-badge"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-mono font-bold"
        >
          <Layers className="w-3.5 h-3.5 text-teal-400" />
          <span>
            <strong className="text-white font-extrabold">{selectedCount}</strong> item
            {selectedCount > 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Quick select filter chips */}
        <div className="hidden md:flex items-center gap-1 text-[11px]">
          <span className="text-slate-400 font-medium px-1">Quick Select:</span>
          <button
            type="button"
            onClick={() => onSelectByStatus('OUT_OF_STOCK')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700 rounded-md font-sans transition flex items-center gap-1"
          >
            <AlertOctagon className="w-3 h-3 text-rose-400" /> Out of Stock
          </button>
          <button
            type="button"
            onClick={() => onSelectByStatus('LOW_STOCK')}
            className="px-2 py-1 bg-slate-800/80 hover:bg-amber-950/60 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-700 rounded-md font-sans transition flex items-center gap-1"
          >
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Low Stock
          </button>
        </div>
      </div>

      {/* Right side: Bulk Action Buttons & Dropdown Menu */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Action 1: Bulk Restock (Delivery Receipt) */}
        <button
          id="bulk-action-restock-btn"
          type="button"
          onClick={() => onBulkRestock(selectedItems)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
          title="Receive stock delivery for all selected items"
        >
          <PackagePlus className="w-3.5 h-3.5" />
          <span>Receive / Restock ({selectedCount})</span>
        </button>

        {/* Action 2: Bulk Issue Request */}
        <button
          id="bulk-action-issue-btn"
          type="button"
          onClick={() => onBulkIssue(selectedItems)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition"
          title="Issue all selected items to department requisition cart"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Requisition Issue</span>
        </button>

        {/* Action 3: Batch Adjustment Request */}
        <button
          id="bulk-action-adjustment-btn"
          type="button"
          onClick={() => onBulkAdjustment(selectedItems)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          title="Create stock adjustment discrepancy request for selected items"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden md:inline">Adjustment</span>
        </button>

        {/* Action 4: Batch Update (Category / Reorder Level) */}
        <button
          id="bulk-action-batch-update-btn"
          type="button"
          onClick={onOpenBatchUpdateModal}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          title="Batch update category or reorder threshold"
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          <span>Batch Edit</span>
        </button>

        {/* Action 5: Export CSV */}
        <button
          id="bulk-action-export-csv-btn"
          type="button"
          onClick={onExportSelectedCsv}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
          title="Export selected items to CSV"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden lg:inline">CSV</span>
        </button>

        {/* Action 6: Copy formatted to clipboard */}
        <button
          id="bulk-action-copy-btn"
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold border border-slate-700 transition"
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
            onClick={() => onBulkDelete(selectedItems)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-200 hover:text-white rounded-lg text-xs font-semibold border border-rose-700 transition"
            title="Delete selected items from master inventory"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">Delete</span>
          </button>
        )}

        {/* Clear Selection Button */}
        <button
          id="bulk-action-clear-selection-btn"
          type="button"
          onClick={onClearSelection}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
