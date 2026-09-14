import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  PackagePlus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Check,
  X,
  Search,
  Filter,
  ShieldCheck,
  Layers,
  ArrowRight,
  TrendingDown,
  Building2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { StockItem, AdminUser } from '../../types';
import {
  analyzeReorderInventory,
  generateReorderReportPdf,
  ReorderReportSummary,
  ReorderItemAnalysis,
} from '../../utils/reorderReportPdfGenerator';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface ReorderReportModalProps {
  stockItems: StockItem[];
  currentUser: AdminUser | null;
  masterFolderPath: string;
  onClose: () => void;
  onBulkRestock?: (items: StockItem[]) => void;
}

export const ReorderReportModal: React.FC<ReorderReportModalProps> = ({
  stockItems,
  currentUser,
  masterFolderPath,
  onClose,
  onBulkRestock,
}) => {
  const [filterCategory, setFilterCategory] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');
  const [filterUrgency, setFilterUrgency] = useState<'ALL' | 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Compute full analysis
  const summary: ReorderReportSummary = useMemo(() => {
    return analyzeReorderInventory(stockItems);
  }, [stockItems]);

  // Filter items based on local search and filter chips
  const filteredItems: ReorderItemAnalysis[] = useMemo(() => {
    return summary.items.filter((itemAnalysis) => {
      const matchesCategory = filterCategory === 'All' || itemAnalysis.item.Category === filterCategory;
      const matchesUrgency = filterUrgency === 'ALL' || itemAnalysis.urgency === filterUrgency;
      const matchesSearch =
        !searchQuery ||
        itemAnalysis.item.ItemID.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itemAnalysis.item.ItemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        itemAnalysis.item.Category.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesUrgency && matchesSearch;
    });
  }, [summary, filterCategory, filterUrgency, searchQuery]);

  const handleDownloadPdf = () => {
    setIsGeneratingPdf(true);
    try {
      const { pdf, fileName } = generateReorderReportPdf(summary, currentUser, masterFolderPath);
      pdf.save(fileName);
    } catch (err) {
      console.error('Failed to generate Reorder Report PDF:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyClipboard = () => {
    const headers = 'Item ID\tItem Description\tCategory\tOn-Hand Qty\tSafety Threshold\tDeficit\tRecommended Order\tStatus';
    const rows = summary.items.map((i) =>
      `${i.item.ItemID}\t${i.item.ItemName}\t${i.item.Category}\t${i.currentQty}\t${i.reorderLevel}\t-${i.shortageQty}\t+${i.recommendedOrderQty}\t${i.urgencyLabel}`
    );
    const fullText = [
      `PARAMOUNT PROCUREMENT & INVENTORY CONTROL - REORDER REPORT [${summary.reportRef}]`,
      `Generated: ${summary.generatedAt}`,
      `Total Items Below Safety Threshold: ${summary.belowThresholdCount} of ${summary.totalInventoryCount}`,
      `Total Recommended Units: ${summary.totalRecommendedUnits}`,
      '',
      headers,
      ...rows,
    ].join('\n');

    navigator.clipboard.writeText(fullText);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  const handleTriggerBulkRestock = () => {
    if (onBulkRestock && summary.items.length > 0) {
      onBulkRestock(summary.items.map((i) => i.item));
      onClose();
    }
  };

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="reorder-report-modal"
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col my-auto"
    >
      {/* MODAL HEADER */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/40 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Stock Reorder & Safety Threshold Report
              </h3>
              <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                {summary.belowThresholdCount} Needs Reorder
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Ref: {summary.reportRef} | Target: Rachel Pickard (Procurement Manager - ADM001)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            id="close-reorder-report-btn"
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Close Report"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* MODAL BODY */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* 1. EXECUTIVE KPI SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Card 1: Below Safety Threshold */}
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-3.5 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
                  Below Threshold
                </span>
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-rose-900 dark:text-rose-100 font-mono">
                  {summary.belowThresholdCount}
                </span>
                <span className="text-xs text-rose-700 dark:text-rose-400">
                  of {summary.totalInventoryCount} items
                </span>
              </div>
              <p className="text-[10px] text-rose-600 dark:text-rose-400">
                {Math.round((summary.belowThresholdCount / Math.max(1, summary.totalInventoryCount)) * 100)}% of stock catalog
              </p>
            </div>

            {/* Card 2: Out of Stock */}
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-3.5 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-red-800 dark:text-red-300 uppercase tracking-wider">
                  Out of Stock
                </span>
                <AlertOctagon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-red-900 dark:text-red-100 font-mono">
                  {summary.outOfStockCount}
                </span>
                <span className="text-xs text-red-700 dark:text-red-400">0 units on hand</span>
              </div>
              <p className="text-[10px] text-red-600 dark:text-red-400">Immediate purchase needed</p>
            </div>

            {/* Card 3: Critical / Low Stock */}
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3.5 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider">
                  Critical Shortage
                </span>
                <TrendingDown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-amber-900 dark:text-amber-100 font-mono">
                  {summary.criticalCount}
                </span>
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  + {summary.lowStockCount} Low
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400">≤ 50% safety stock level</p>
            </div>

            {/* Card 4: Recommended Units */}
            <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 p-3.5 rounded-xl space-y-1 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                  Replenishment Total
                </span>
                <PackagePlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-teal-900 dark:text-teal-100 font-mono">
                  {summary.totalRecommendedUnits.toLocaleString()}
                </span>
                <span className="text-xs text-teal-700 dark:text-teal-400">Units</span>
              </div>
              <p className="text-[10px] text-teal-600 dark:text-teal-400">Recommended order volume</p>
            </div>
          </div>

          {/* 2. REORDER FILTER & SEARCH BAR */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* Search input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="reorder-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by Item ID, Description, Category..."
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Urgency Filter */}
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs shrink-0">
              <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">Status:</span>
              <button
                type="button"
                onClick={() => setFilterUrgency('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  filterUrgency === 'ALL'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All ({summary.belowThresholdCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('OUT_OF_STOCK')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  filterUrgency === 'OUT_OF_STOCK'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-rose-600'
                }`}
              >
                Out of Stock ({summary.outOfStockCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterUrgency('CRITICAL')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                  filterUrgency === 'CRITICAL'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
                }`}
              >
                Critical ({summary.criticalCount})
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs shrink-0">
              <span className="text-[10px] font-mono text-slate-400 px-1 font-bold">Category:</span>
              {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-1 rounded text-[11px] font-semibold transition ${
                    filterCategory === cat
                      ? 'bg-slate-800 dark:bg-slate-700 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* 3. REORDER AUDIT TABLE */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
            <div className="max-h-[340px] overflow-y-auto">
              <table id="reorder-report-table" className="w-full text-xs text-left border-collapse font-sans">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 shadow-xs">
                  <tr>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Item ID</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Item Description</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Category</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Available Qty</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Safety Threshold</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Shortage Deficit</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-right">Recommended Order</th>
                    <th className="p-3 text-center">Urgency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center bg-slate-50 dark:bg-slate-900/50">
                        {summary.items.length === 0 ? (
                          <div className="flex flex-col items-center justify-center space-y-2 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-10 h-10" />
                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              All Inventory Items Are Fully Stocked
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                              Every stock item currently meets or exceeds its defined safety threshold. No items require reorder at this time.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2 text-slate-500 dark:text-slate-400">
                            <Search className="w-8 h-8 text-slate-400" />
                            <p className="text-xs font-semibold">No reorder items matched your filter criteria.</p>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchQuery('');
                                setFilterCategory('All');
                                setFilterUrgency('ALL');
                              }}
                              className="px-3 py-1 bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-lg text-xs font-semibold border border-teal-200 dark:border-teal-800"
                            >
                              Reset Filters
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((itemAnalysis) => {
                      const isOos = itemAnalysis.urgency === 'OUT_OF_STOCK';
                      const isCrit = itemAnalysis.urgency === 'CRITICAL';

                      return (
                        <tr
                          key={itemAnalysis.item.ItemID}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                            isOos
                              ? 'bg-rose-50/40 dark:bg-rose-950/20'
                              : isCrit
                              ? 'bg-amber-50/40 dark:bg-amber-950/20'
                              : ''
                          }`}
                        >
                          <td className="p-3 font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                            {itemAnalysis.item.ItemID}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800 font-semibold">
                            {itemAnalysis.item.ItemName}
                          </td>
                          <td className="p-3 border-r border-slate-200 dark:border-slate-800">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                itemAnalysis.item.Category === 'Stationery'
                                  ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200'
                                  : itemAnalysis.item.Category === 'Cleaning'
                                  ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-200'
                                  : 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200'
                              }`}
                            >
                              {itemAnalysis.item.Category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold border-r border-slate-200 dark:border-slate-800">
                            <span className={isOos ? 'text-rose-600 font-black' : isCrit ? 'text-amber-600' : 'text-slate-700 dark:text-slate-300'}>
                              {itemAnalysis.currentQty} {itemAnalysis.item.Unit || 'Units'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                            {itemAnalysis.reorderLevel}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400 border-r border-slate-200 dark:border-slate-800">
                            -{itemAnalysis.shortageQty}
                          </td>
                          <td className="p-3 text-right font-mono font-black text-teal-600 dark:text-teal-400 border-r border-slate-200 dark:border-slate-800">
                            +{itemAnalysis.recommendedOrderQty}
                          </td>
                          <td className="p-3 text-center">
                            {isOos ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                                <AlertOctagon className="w-3 h-3" /> OUT OF STOCK
                              </span>
                            ) : isCrit ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                <AlertTriangle className="w-3 h-3" /> CRITICAL
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                                LOW STOCK
                              </span>
                            )}
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

        {/* MODAL FOOTER ACTION BAR */}
        <div className="bg-slate-50 dark:bg-slate-950 px-5 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>ISO-9001 Safety Protocol</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy to Clipboard */}
            <button
              id="copy-reorder-summary-btn"
              type="button"
              onClick={handleCopyClipboard}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Copy reorder deficit list to clipboard"
            >
              {copiedNotification ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{copiedNotification ? 'Copied to Clipboard!' : 'Copy Summary'}</span>
            </button>

            {/* Print Friendly */}
            <button
              id="print-reorder-report-btn"
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-700 shadow-xs transition cursor-pointer"
              title="Print reorder report"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Report</span>
            </button>

            {/* 1-Click Restock All (GRN Delivery) */}
            {onBulkRestock && summary.items.length > 0 && (
              <button
                id="reorder-restock-all-btn"
                type="button"
                onClick={handleTriggerBulkRestock}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                title="Create Goods Received Voucher (GRN) for all items below safety threshold"
              >
                <PackagePlus className="w-4 h-4" />
                <span>Restock All ({summary.belowThresholdCount})</span>
              </button>
            )}

            {/* Download Printable PDF Summary */}
            <button
              id="download-reorder-pdf-btn"
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              title="Generate and download official PDF Reorder Summary for the Procurement Manager"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Compiling PDF...' : 'Download Official PDF Summary'}</span>
            </button>
          </div>
        </div>
    </DraggableResizableModal>
  );
};
