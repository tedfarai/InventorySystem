import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  PackagePlus,
  Printer,
  RotateCcw,
  X,
} from 'lucide-react';
import { AdminUser, StockItem } from '../../types';
import type { ReorderItemAnalysis } from '../../utils/reorderInventoryAnalysis';
import {
  buildPurchaseRequisition,
  createPurchaseRequisitionPdfBlob,
  formatPurchaseRequisitionText,
  generatePurchaseRequisitionPdf,
} from '../../utils/purchaseRequisitionGenerator';
import { formatCurrency } from '../../utils/currencyUtils';
import { DraggableResizableModal } from '../common/DraggableResizableModal';
import { useToast } from '../../context/ToastContext';

interface PurchaseRequisitionModalProps {
  itemsAnalysis: ReorderItemAnalysis[];
  currentUser: AdminUser | null;
  masterFolderPath: string;
  resolveSupplier?: (item: StockItem) => string;
  onProceedToBulkRestock?: (items: StockItem[]) => void;
  onClose: () => void;
}

export const PurchaseRequisitionModal: React.FC<PurchaseRequisitionModalProps> = ({
  itemsAnalysis,
  currentUser,
  masterFolderPath,
  resolveSupplier,
  onProceedToBulkRestock,
  onClose,
}) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'worksheet' | 'pdfPreview'>('worksheet');
  const [customQtys, setCustomQtys] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    itemsAnalysis.forEach((a) => {
      initial[a.item.ItemID] = a.recommendedOrderQty;
    });
    return initial;
  });
  const [notes, setNotes] = useState('');
  const [copied, setCopied] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const pdfIframeRef = useRef<HTMLIFrameElement>(null);

  const reqDoc = useMemo(
    () => buildPurchaseRequisition(itemsAnalysis, currentUser, customQtys, notes, resolveSupplier),
    [itemsAnalysis, currentUser, customQtys, notes, resolveSupplier]
  );

  // Generate PDF preview URL lazily or when switching to live preview tab
  useEffect(() => {
    if (activeTab !== 'pdfPreview') return;
    const { url } = createPurchaseRequisitionPdfBlob(reqDoc, masterFolderPath);
    setPdfBlobUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [activeTab, reqDoc, masterFolderPath]);

  const handleQtyChange = (itemId: string, rawValue: string) => {
    const parsed = parseInt(rawValue, 10);
    setCustomQtys((prev) => ({
      ...prev,
      [itemId]: Number.isFinite(parsed) && parsed > 0 ? parsed : 1,
    }));
  };

  const handleResetQuantities = () => {
    const reset: Record<string, number> = {};
    itemsAnalysis.forEach((a) => {
      reset[a.item.ItemID] = a.recommendedOrderQty;
    });
    setCustomQtys(reset);
    showToast('Order Quantities Reset', 'info', 'Restored safety-stock recommended replenishment quantities.');
  };

  const handleDownloadPdf = () => {
    try {
      const { pdf, fileName } = generatePurchaseRequisitionPdf(reqDoc, masterFolderPath);
      pdf.save(fileName);
      showToast(
        'Purchase Requisition Downloaded',
        'success',
        `${fileName} (${reqDoc.totalItemsCount} items, ${reqDoc.totalRequestedUnits.toLocaleString()} units)`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to generate PDF.';
      showToast('Requisition PDF Failed', 'error', message);
    }
  };

  const handlePrint = () => {
    if (activeTab === 'pdfPreview' && pdfIframeRef.current?.contentWindow) {
      try {
        pdfIframeRef.current.contentWindow.focus();
        pdfIframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback to window.print() below
      }
    }
    window.print();
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(formatPurchaseRequisitionText(reqDoc));
      setCopied(true);
      showToast('Copied Requisition Summary', 'success', `${reqDoc.reqNumber} copied to clipboard`);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      showToast('Clipboard Unavailable', 'warning', 'Could not copy to clipboard automatically.');
    }
  };

  const handleProceedToRestock = () => {
    if (!onProceedToBulkRestock) return;
    onProceedToBulkRestock(reqDoc.sourceItems);
    onClose();
  };

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="purchase-requisition-modal"
      initialWidth={940}
      initialHeight={660}
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col my-auto"
    >
      {/* Modal Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Purchase Requisition
              </h3>
              <span className="text-xs font-mono text-teal-300">
                {reqDoc.reqNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono truncate">
              {reqDoc.priority} Priority · {reqDoc.totalItemsCount} SKU(s) · {reqDoc.requestedByName} ({reqDoc.requestedById})
            </p>
          </div>
        </div>

        <button
          id="close-purchase-requisition-btn"
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
          title="Close Purchase Requisition"
          aria-label="Close Purchase Requisition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sub-Header Tabs + Metrics */}
      <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('worksheet')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'worksheet'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Requisition Worksheet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdfPreview')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'pdfPreview'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Official PDF Preview</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400 font-mono tabular-nums">
          <span>
            <strong className="text-rose-600 dark:text-rose-400">{reqDoc.outOfStockCount}</strong> Out of Stock
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-amber-600 dark:text-amber-400">{reqDoc.criticalCount + reqDoc.lowStockCount}</strong> Critical / Low
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-teal-700 dark:text-teal-300">{reqDoc.totalRequestedUnits.toLocaleString()}</strong> Units
          </span>
          {reqDoc.pricedItemCount > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                Est. <strong className="text-slate-900 dark:text-white">{formatCurrency(reqDoc.estimatedUsdTotal, 'USD', { showCode: true })}</strong>
              </span>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {activeTab === 'worksheet' ? (
          <>
            {/* Line Items Table */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Item Name</th>
                      <th className="py-2.5 px-3">Preferred Supplier</th>
                      <th className="py-2.5 px-3 text-right">On-Hand / Min</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Order Qty</th>
                      <th className="py-2.5 px-3 text-right">Est. Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {reqDoc.items.map((line) => {
                      const isOos = line.urgency === 'OUT_OF_STOCK';
                      const isCrit = line.urgency === 'CRITICAL';
                      return (
                        <tr key={line.itemId} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                            {line.itemId}
                          </td>
                          <td className="py-2.5 px-3 text-slate-900 dark:text-slate-100 font-medium min-w-[200px]">
                            <div className="truncate max-w-[260px]" title={line.itemName}>
                              {line.itemName}
                            </div>
                            <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                              {line.category} · {line.unit}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                            <div className="truncate max-w-[180px]" title={line.supplier}>
                              {line.supplier}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                            <span className={isOos ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-900 dark:text-slate-100 font-semibold'}>
                              {line.currentQty}
                            </span>
                            <span className="text-slate-400 dark:text-slate-500"> / {line.reorderLevel}</span>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold ${
                                isOos
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : isCrit
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-amber-500 dark:text-amber-300'
                              }`}
                            >
                              {isOos ? 'Out of Stock' : isCrit ? 'Critical Low' : 'Low Stock'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <input
                                type="number"
                                min={1}
                                value={line.requestedOrderQty}
                                onChange={(e) => handleQtyChange(line.itemId, e.target.value)}
                                aria-label={`Order quantity for ${line.itemName}`}
                                className="w-20 px-2 py-1 text-right font-mono tabular-nums text-xs font-bold bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                              />
                              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono w-10 text-left truncate">
                                {line.unit}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums whitespace-nowrap text-slate-700 dark:text-slate-300">
                            {line.unitPrice && line.unitPrice > 0
                              ? formatCurrency(line.estimatedLineTotal, line.currency, { showCode: true })
                              : 'Quote Req.'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notes & Justification */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="pr-notes-input"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Requisition Notes & Procurement Justification
                </label>
                <button
                  type="button"
                  onClick={handleResetQuantities}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-teal-600 dark:text-slate-400 dark:hover:text-teal-400 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Suggested Quantities</span>
                </button>
              </div>
              <textarea
                id="pr-notes-input"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={reqDoc.notes}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
              />
            </div>
          </>
        ) : (
          <div className="h-[430px] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950">
            {pdfBlobUrl ? (
              <iframe
                ref={pdfIframeRef}
                src={pdfBlobUrl}
                title={`Purchase Requisition ${reqDoc.reqNumber}`}
                className="w-full h-full border-0"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                Rendering Purchase Requisition PDF preview...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Footer */}
      <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="text-[11px] text-slate-500 dark:text-slate-400">
          Approving Authority: <strong className="text-slate-700 dark:text-slate-200">Rachel Pickard (ADM001)</strong>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>

          {onProceedToBulkRestock && (
            <button
              type="button"
              onClick={handleProceedToRestock}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border border-teal-600/30 bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition cursor-pointer whitespace-nowrap shrink-0"
            >
              <PackagePlus className="w-3.5 h-3.5" />
              <span>Receive Stock (GRN)</span>
            </button>
          )}

          <button
            id="btn-download-purchase-requisition-pdf"
            type="button"
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
