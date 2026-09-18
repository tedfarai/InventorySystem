import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ArrowRight,
  PackagePlus,
  Send,
  Trash2,
  SlidersHorizontal,
  Download,
  Copy,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { StockItem, AdminUser, Department, IssueCartItem } from '../../types';
import { searchStockItems } from '../../utils/searchEngine';
import { SearchHighlightText } from '../common/SearchHighlightText';
import { BulkStockActionsBar } from './BulkStockActionsBar';
import { BulkBatchUpdateModal } from './BulkBatchUpdateModal';
import { BulkDeleteConfirmationModal } from './BulkDeleteConfirmationModal';
import { BulkDeliveryConfirmationModal, BulkDeliveryReviewItem } from './BulkDeliveryConfirmationModal';

interface ModernMasterStockSheetProps {
  stockItems: StockItem[];
  currentUser: AdminUser | null;
  onAddNewStockItem?: (item: StockItem) => void;
  onUpdateStockItem?: (item: StockItem) => void;
  onDeleteStockItem?: (itemId: string) => void;
  onQuickRestock?: (item: StockItem) => void;
  onQuickIssue?: (item: StockItem) => void;
  onQuickEdit?: (item: StockItem) => void;
  onOpenReorderReport?: () => void;
  onSaveBulkDeliveries?: (deliveries: { itemId: string; addQty: number }[], deliveryNoteRef?: string) => Promise<any>;
  onTriggerIssueModal?: (cart: IssueCartItem[]) => void;
  onOpenAdjustmentRequests?: () => void;
}

export const ModernMasterStockSheet: React.FC<ModernMasterStockSheetProps> = ({
  stockItems = [],
  currentUser,
  onAddNewStockItem,
  onUpdateStockItem,
  onDeleteStockItem,
  onQuickRestock,
  onQuickIssue,
  onQuickEdit,
  onOpenReorderReport,
  onSaveBulkDeliveries,
  onTriggerIssueModal,
  onOpenAdjustmentRequests,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');
  const [selectedStockItemIds, setSelectedStockItemIds] = useState<string[]>([]);
  const [expandedStockItemIds, setExpandedStockItemIds] = useState<string[]>([]);

  // Bulk operation modal states
  const [showBatchUpdateModal, setShowBatchUpdateModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkDeliveryConfirmModal, setShowBulkDeliveryConfirmModal] = useState(false);
  const [bulkDeliveryReviewItems, setBulkDeliveryReviewItems] = useState<BulkDeliveryReviewItem[]>([]);

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];

  // Real-time multi-token search & filter
  const filteredStock = useMemo(() => {
    return searchStockItems(safeStockItems, searchQuery, categoryFilter);
  }, [safeStockItems, searchQuery, categoryFilter]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      All: safeStockItems.length,
      Stationery: safeStockItems.filter((i) => i && i.Category === 'Stationery').length,
      Cleaning: safeStockItems.filter((i) => i && i.Category === 'Cleaning').length,
      General: safeStockItems.filter((i) => i && i.Category === 'General').length,
    };
  }, [safeStockItems]);

  // Low stock count calculation
  const lowStockCount = useMemo(() => {
    return safeStockItems.filter((i) => i && (Number(i.Qty) || 0) <= (Number(i.ReorderLevel) || 10)).length;
  }, [safeStockItems]);

  // Selection calculations
  const selectedStockItems = useMemo(() => {
    return safeStockItems.filter((i) => i && selectedStockItemIds.includes(i.ItemID));
  }, [safeStockItems, selectedStockItemIds]);

  const isAllVisibleSelected =
    filteredStock.length > 0 && filteredStock.every((item) => selectedStockItemIds.includes(item.ItemID));

  const handleToggleSelectRow = (itemId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStockItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleExpandedRow = (itemId: string) => {
    setExpandedStockItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const handleToggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIds = new Set(filteredStock.map((i) => i.ItemID));
      setSelectedStockItemIds((prev) => prev.filter((id) => !visibleIds.has(id)));
    } else {
      const visibleIds = filteredStock.map((i) => i.ItemID);
      setSelectedStockItemIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectByStatus = (status: 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK') => {
    if (status === 'OUT_OF_STOCK') {
      const oosIds = stockItems.filter((i) => (i.Qty || 0) <= 0).map((i) => i.ItemID);
      setSelectedStockItemIds(oosIds);
    } else if (status === 'LOW_STOCK') {
      const lowIds = stockItems
        .filter((i) => (i.Qty || 0) > 0 && (i.Qty || 0) <= (i.ReorderLevel || 10))
        .map((i) => i.ItemID);
      setSelectedStockItemIds(lowIds);
    } else {
      setSelectedStockItemIds(stockItems.map((i) => i.ItemID));
    }
  };

  const handleClearSelection = () => {
    setSelectedStockItemIds([]);
  };

  // Bulk actions
  const handleTriggerBulkRestock = (items: StockItem[]) => {
    if (items.length === 0) return;
    const deliveryItems: BulkDeliveryReviewItem[] = items.map((i) => ({
      itemId: i.ItemID,
      itemName: i.ItemName,
      category: i.Category,
      currentQty: i.Qty,
      addQty: i.Qty <= i.ReorderLevel ? Math.max(10, i.ReorderLevel * 2 - i.Qty) : 10,
      unit: i.Unit,
    }));
    setBulkDeliveryReviewItems(deliveryItems);
    setShowBulkDeliveryConfirmModal(true);
  };

  const handleConfirmBulkDeliveryModal = async (
    deliveryNoteRef?: string,
    updatedDeliveries?: BulkDeliveryReviewItem[]
  ) => {
    const deliveriesToSave = updatedDeliveries || bulkDeliveryReviewItems;
    if (onSaveBulkDeliveries) {
      await onSaveBulkDeliveries(
        deliveriesToSave.map((d) => ({ itemId: d.itemId, addQty: d.addQty })),
        deliveryNoteRef
      );
    }
    setShowBulkDeliveryConfirmModal(false);
    handleClearSelection();
  };

  const handleTriggerBulkIssue = (items: StockItem[]) => {
    if (items.length === 0) return;
    const cartItems: IssueCartItem[] = items
      .filter((i) => i.Qty > 0)
      .map((i) => ({
        ItemID: i.ItemID,
        ItemName: i.ItemName,
        Category: i.Category,
        AvailableQty: i.Qty,
        RequestedQty: 1,
      }));

    if (cartItems.length === 0) {
      alert('All selected items currently have 0 available quantity in stock.');
      return;
    }
    if (onTriggerIssueModal) {
      onTriggerIssueModal(cartItems);
    }
  };

  const handleApplyBatchUpdate = (updates: {
    category?: 'Stationery' | 'Cleaning' | 'General';
    reorderLevel?: number;
    reorderLevelDelta?: number;
  }) => {
    selectedStockItems.forEach((item) => {
      const updated = { ...item };
      if (updates.category) updated.Category = updates.category;
      if (updates.reorderLevel !== undefined) updated.ReorderLevel = updates.reorderLevel;
      if (updates.reorderLevelDelta !== undefined) {
        updated.ReorderLevel = Math.max(0, (updated.ReorderLevel || 10) + updates.reorderLevelDelta);
      }
      if (onUpdateStockItem) {
        onUpdateStockItem(updated);
      }
    });
    handleClearSelection();
  };

  const handleExportSelectedCsv = () => {
    if (selectedStockItems.length === 0) return;
    const headers = ['ItemID', 'ItemName', 'Category', 'AvailableQty', 'Unit', 'ReorderLevel', 'StockStatus'];
    const rows = selectedStockItems.map((i) => {
      const status =
        (i.Qty || 0) <= 0
          ? 'Out of Stock'
          : (i.Qty || 0) <= (i.ReorderLevel || 10)
          ? 'Low Stock'
          : 'Optimal';
      return [
        `"${i.ItemID}"`,
        `"${i.ItemName.replace(/"/g, '""')}"`,
        `"${i.Category}"`,
        i.Qty,
        `"${i.Unit}"`,
        i.ReorderLevel,
        `"${status}"`,
      ].join(',');
    });
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Stock_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopySelectedClipboard = () => {
    if (selectedStockItems.length === 0) return;
    const header = 'ItemID\tItemName\tCategory\tAvailableQty\tUnit\tReorderLevel\tStockStatus';
    const lines = selectedStockItems.map((i) => {
      const status =
        (i.Qty || 0) <= 0
          ? 'Out of Stock'
          : (i.Qty || 0) <= (i.ReorderLevel || 10)
          ? 'Low Stock'
          : 'Optimal';
      return `${i.ItemID}\t${i.ItemName}\t${i.Category}\t${i.Qty}\t${i.Unit}\t${i.ReorderLevel}\t${status}`;
    });
    const text = [header, ...lines].join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleConfirmBulkDelete = () => {
    if (onDeleteStockItem) {
      selectedStockItems.forEach((i) => onDeleteStockItem(i.ItemID));
    }
    handleClearSelection();
  };

  return (
    <div className="space-y-4">
      {/* Category Filter Tabs & Search Header (Sticky on Mobile) */}
      <div className="sticky top-14 sm:top-16 z-20 bg-slate-50 dark:bg-slate-900 py-3 -mx-4 px-4 sm:mx-0 sm:px-0 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          {/* Category Filter Tabs */}
          <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => {
              const isActive = categoryFilter === cat;
              const count = categoryCounts[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-semibold ${
                      isActive
                        ? 'bg-emerald-700 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              id="stock-inventory-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU or item name..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                title="Clear Search"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Safety Reorder Alert Banner */}
      {lowStockCount > 0 && onOpenReorderReport && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/80 p-3 sm:p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 truncate">
                Safety Stock Threshold Alert
              </h4>
              <p className="text-[11px] text-rose-700 dark:text-rose-400 truncate">
                {lowStockCount} item{lowStockCount === 1 ? '' : 's'} at or below safety reorder level.
              </p>
            </div>
          </div>
          <button
            onClick={onOpenReorderReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs cursor-pointer transition min-h-[38px]"
          >
            <span>View Reorder Report</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Bulk Stock Selection Bar */}
      {selectedStockItemIds.length > 0 && (
        <BulkStockActionsBar
          selectedCount={selectedStockItems.length}
          totalFilteredCount={filteredStock.length}
          totalStockCount={safeStockItems.length}
          isAllSelected={isAllVisibleSelected}
          isPartiallySelected={selectedStockItems.length > 0 && !isAllVisibleSelected}
          selectedItems={selectedStockItems}
          onToggleSelectAll={handleToggleSelectAllVisible}
          onSelectByStatus={handleSelectByStatus}
          onClearSelection={handleClearSelection}
          onBulkRestock={handleTriggerBulkRestock}
          onBulkIssue={handleTriggerBulkIssue}
          onBulkAdjustment={(items) => {
            if (onOpenAdjustmentRequests) onOpenAdjustmentRequests();
          }}
          onOpenBatchUpdateModal={() => setShowBatchUpdateModal(true)}
          onExportSelectedCsv={handleExportSelectedCsv}
          onCopySelectedClipboard={handleCopySelectedClipboard}
          onBulkDelete={() => {
            if (!isSuperiorAdmin) {
              alert('Access Denied: Only Superior Admin Rachel Pickard (ADM001) can permanently delete stock items.');
              return;
            }
            setShowBulkDeleteModal(true);
          }}
          isSuperiorAdmin={isSuperiorAdmin}
        />
      )}

      {/* Desktop / Tablet Table View (hidden on small mobile screens < 640px) */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-semibold select-none">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllVisibleSelected}
                    onChange={handleToggleSelectAllVisible}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    title="Select all visible items"
                  />
                </th>
                <th className="py-3 px-3 w-28">SKU</th>
                <th className="py-3 px-3 min-w-[200px]">Item Name</th>
                <th className="py-3 px-3 w-28">Category</th>
                <th className="py-3 px-3 text-right w-24">Qty</th>
                <th className="py-3 px-3 w-20">Unit</th>
                <th className="py-3 px-3 text-right w-24">Reorder Level</th>
                <th className="py-3 px-3 text-center w-28">Status</th>
                <th className="py-3 px-4 text-right w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredStock.map((item) => {
                const isSelected = selectedStockItemIds.includes(item.ItemID);
                const isExpanded = expandedStockItemIds.includes(item.ItemID);
                const isOutOfStock = (item.Qty || 0) <= 0;
                const isLowStock = !isOutOfStock && (item.Qty || 0) <= (item.ReorderLevel || 10);

                return (
                  <React.Fragment key={item.ItemID}>
                    <tr
                      onClick={() => handleToggleExpandedRow(item.ItemID)}
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 font-medium'
                          : 'bg-white dark:bg-slate-900'
                      }`}
                    >
                    <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectRow(item.ItemID)}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                      />
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                      <span className="inline-flex items-center gap-1.5">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-teal-600" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
                        <SearchHighlightText text={item.ItemID} query={searchQuery} />
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <SearchHighlightText text={item.ItemName} query={searchQuery} />
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`text-xs font-semibold ${
                          item.Category === 'Cleaning'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : item.Category === 'Stationery'
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        <SearchHighlightText text={item.Category} query={searchQuery} />
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {item.Qty}
                    </td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                      <SearchHighlightText text={item.Unit} query={searchQuery} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400">
                      {item.ReorderLevel}
                    </td>
                    <td className="py-3 px-3 text-center">
                      {isOutOfStock ? (
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          <SearchHighlightText text="Out of Stock" query={searchQuery} />
                        </span>
                      ) : isLowStock ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          <SearchHighlightText text="Low Stock" query={searchQuery} />
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          <SearchHighlightText text="Optimal" query={searchQuery} />
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {onQuickIssue && item.Qty > 0 && (
                          <button
                            onClick={() => onQuickIssue(item)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 cursor-pointer transition"
                            title="Issue stock"
                          >
                            Issue
                          </button>
                        )}
                        {onQuickEdit && (
                          <button
                            onClick={() => onQuickEdit(item)}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition"
                            title="Edit stock item"
                          >
                            Edit
                          </button>
                        )}
                        {onOpenAdjustmentRequests && (
                          <button
                            onClick={() => onOpenAdjustmentRequests()}
                            className="px-2 py-1 rounded-md text-[10px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 cursor-pointer transition"
                            title={`Adjust ${item.ItemID}`}
                          >
                            Adjustment
                          </button>
                        )}
                      </div>
                    </td>
                    </tr>
                    {isExpanded && (
                    <tr className="bg-slate-50/80 dark:bg-slate-950/60">
                      <td colSpan={9} className="px-12 py-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="block text-[10px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Last Supplier</span>
                            <SearchHighlightText text={item.LastSupplier || 'No supplier recorded'} query={searchQuery} className="font-semibold text-slate-800 dark:text-slate-200" />
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Last Received Date</span>
                            <SearchHighlightText text={item.LastReceivedDate || 'No receipt recorded'} query={searchQuery} className="font-semibold text-slate-800 dark:text-slate-200" />
                          </div>
                          <div>
                            <span className="block text-[10px] uppercase tracking-wide font-bold text-slate-500 dark:text-slate-400">Item History</span>
                            <SearchHighlightText text={item.Description || 'Movement history is available in the Movement Log.'} query={searchQuery} className="text-slate-600 dark:text-slate-300" />
                          </div>
                        </div>
                      </td>
                    </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Responsive Stacked Card List (<640px) */}
      <div className="sm:hidden space-y-2.5">
        {filteredStock.map((item) => {
          const isSelected = selectedStockItemIds.includes(item.ItemID);
          const isOutOfStock = (item.Qty || 0) <= 0;
          const isLowStock = !isOutOfStock && (item.Qty || 0) <= (item.ReorderLevel || 10);

          return (
            <div
              key={item.ItemID}
              onClick={() => handleToggleExpandedRow(item.ItemID)}
              className={`p-3.5 rounded-2xl border transition duration-150 cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/20'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleToggleSelectRow(item.ItemID)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                  />
                  <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">
                    <SearchHighlightText text={item.ItemID} query={searchQuery} />
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {item.Category}
                  </span>
                </div>

                <div>
                  {isOutOfStock ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      Out of Stock
                    </span>
                  ) : isLowStock ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      Low Stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                      Optimal
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                  <SearchHighlightText text={item.ItemName} query={searchQuery} />
                </h3>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
                <div className="flex items-baseline space-x-1.5">
                  <span className="text-xs text-slate-500 dark:text-slate-400">Available:</span>
                  <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">
                    {item.Qty}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {item.Unit}
                  </span>
                  <span className="text-[10px] text-slate-400 ml-2">
                    (Min: {item.ReorderLevel})
                  </span>
                </div>

                <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                  {onQuickRestock && (
                    <button
                      onClick={() => onQuickRestock(item)}
                      className="px-2.5 py-1.5 bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 rounded-lg text-xs font-bold border border-sky-200 dark:border-sky-800 flex items-center gap-1 min-h-[36px]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Receive</span>
                    </button>
                  )}
                  {onQuickIssue && item.Qty > 0 && (
                    <button
                      onClick={() => onQuickIssue(item)}
                      className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 min-h-[36px]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue</span>
                    </button>
                  )}
                  {onOpenAdjustmentRequests && (
                    <button
                      onClick={() => onOpenAdjustmentRequests()}
                      className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold min-h-[36px]"
                    >
                      Adjust
                    </button>
                  )}
                </div>
              </div>
              {expandedStockItemIds.includes(item.ItemID) && (
                <div className="mt-3 grid grid-cols-1 gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-2.5 text-xs">
                  <span><strong>Last Supplier:</strong> <SearchHighlightText text={item.LastSupplier || 'No supplier recorded'} query={searchQuery} /></span>
                  <span><strong>Last Received:</strong> {item.LastReceivedDate || 'No receipt recorded'}</span>
                  <span><strong>Item History:</strong> {item.Description || 'See Movement Log for item history.'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredStock.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500">
          <p className="text-sm font-semibold">No stock items match your search filter.</p>
          <p className="text-xs mt-1">Try clearing your search query or selecting &quot;All&quot; categories.</p>
        </div>
      )}

      {/* Bulk Batch Update Modal */}
      <BulkBatchUpdateModal
        isOpen={showBatchUpdateModal}
        selectedItems={selectedStockItems}
        onClose={() => setShowBatchUpdateModal(false)}
        onApplyUpdates={handleApplyBatchUpdate}
      />

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteConfirmationModal
        isOpen={showBulkDeleteModal}
        selectedItems={selectedStockItems}
        issuerName={currentUser?.IssuerName || 'Rachel Pickard'}
        issuerId={currentUser?.IssuerID || 'ADM001'}
        onClose={() => setShowBulkDeleteModal(false)}
        onConfirm={handleConfirmBulkDelete}
      />

      {/* Bulk Delivery Review & Confirmation Modal */}
      <BulkDeliveryConfirmationModal
        isOpen={showBulkDeliveryConfirmModal}
        deliveries={bulkDeliveryReviewItems}
        items={bulkDeliveryReviewItems}
        issuerId={currentUser?.IssuerID || 'ADM001'}
        issuerName={currentUser?.IssuerName || 'Rachel Pickard'}
        onClose={() => setShowBulkDeliveryConfirmModal(false)}
        onConfirm={handleConfirmBulkDeliveryModal}
      />
    </div>
  );
};
