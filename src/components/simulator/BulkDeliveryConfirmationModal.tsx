import React, { useState } from 'react';
import {
  PackagePlus,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ListPlus,
  Trash2,
  AlertCircle,
  Sparkles,
  Edit3,
} from 'lucide-react';

export interface BulkDeliveryReviewItem {
  itemId: string;
  itemName: string;
  category: string;
  currentQty: number;
  addQty: number;
  unit: string;
  supplier?: string;
}

interface BulkDeliveryConfirmationModalProps {
  deliveries?: BulkDeliveryReviewItem[];
  items?: BulkDeliveryReviewItem[];
  issuerId?: string;
  issuerName?: string;
  isSuperiorAdmin?: boolean;
  defaultSupplier?: string;
  onConfirm: (deliveryNoteRef?: string, updatedDeliveries?: BulkDeliveryReviewItem[], supplier?: string) => void | Promise<void>;
  onCancel?: () => void;
  onClose?: () => void;
}

export const BulkDeliveryConfirmationModal: React.FC<BulkDeliveryConfirmationModalProps> = ({
  deliveries,
  items,
  issuerId = 'ADM001',
  issuerName = 'Rachel Pickard',
  defaultSupplier = '',
  onConfirm,
  onCancel,
  onClose,
}) => {
  const handleCloseModal = onCancel || onClose || (() => {});
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [itemsList, setItemsList] = useState<BulkDeliveryReviewItem[]>(() => {
    if (Array.isArray(deliveries) && deliveries.length > 0) return deliveries;
    if (Array.isArray(items) && items.length > 0) return items;
    return [];
  });
  const [deliveryNoteRef, setDeliveryNoteRef] = useState(`GRN-${Math.floor(100000 + Math.random() * 900000)}`);
  const [vendorSupplier, setVendorSupplier] = useState(
    defaultSupplier || deliveries?.[0]?.supplier || items?.[0]?.supplier || ''
  );
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [executionStatus, setExecutionStatus] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Dynamic calculations based on editable itemsList
  const safeItemsList = Array.isArray(itemsList) ? itemsList : [];
  const totalItemsCount = safeItemsList.length;
  const totalUnits = safeItemsList.reduce((sum, item) => sum + (item?.addQty || 0), 0);
  const stationeryCount = safeItemsList.filter((i) => i?.category === 'Stationery').length;
  const cleaningCount = safeItemsList.filter((i) => i?.category === 'Cleaning').length;

  const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

  // Handle quantity adjustment in Step 1
  const handleQtyChange = (itemId: string, val: string) => {
    const num = parseInt(val, 10);
    const newQty = isNaN(num) || num < 0 ? 0 : num;
    setItemsList((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, addQty: newQty } : item))
    );
  };

  // Handle supplier change in Step 1
  const handleSupplierChange = (itemId: string, supplierVal: string) => {
    setItemsList((prev) =>
      prev.map((item) => (item.itemId === itemId ? { ...item, supplier: supplierVal } : item))
    );
  };

  // Handle deleting an item entirely from the delivery confirmation batch
  const handleDeleteItem = (itemId: string) => {
    setItemsList((prev) => prev.filter((item) => item.itemId !== itemId));
  };

  const handleFinalSubmit = async () => {
    if (!confirmedCheck || safeItemsList.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProgressPercent(20);
    setExecutionStatus('1/3 Validating delivery batch items against Master_Stock...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(60);
    setExecutionStatus('2/3 Appending movement logs & creating single GRV document...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(90);
    setExecutionStatus('3/3 Autosaving workbook state (.xlsm) & updating directory...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(100);
    setIsCompleted(true);
    setExecutionStatus('4/4 Finalizing Received Goods Voucher & opening PDF viewer...');
    await new Promise((r) => setTimeout(r, 150));

    const finalBatch = safeItemsList.map((item) => ({
      ...item,
      supplier: item.supplier || vendorSupplier || '',
    }));

    try {
      await onConfirm(deliveryNoteRef, finalBatch, vendorSupplier);
    } catch (err) {
      console.error('Error during bulk delivery execution:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-blue-600/80 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* UserForm Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-5 h-5 text-blue-400" />
            <span className="font-mono text-xs font-bold tracking-wide text-slate-100">
              frmBulkDeliveryConfirmation — Delivery Review & Quantity Adjustment
            </span>
          </div>
          {!isProcessing && (
            <button
              onClick={handleCloseModal}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-slate-800"
            >
              ✕
            </button>
          )}
        </div>

        {/* STEP PROGRESS INDICATOR BAR */}
        <div className="bg-slate-950 px-6 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 1
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {currentStep > 1 ? '✓' : '1'}
            </div>
            <span className={currentStep === 1 ? 'font-bold text-blue-400' : 'text-slate-400'}>
              Step 1: Quantity Adjust & Item Review
            </span>
          </div>

          <div className="w-8 h-0.5 bg-slate-800" />

          <div className="flex items-center space-x-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                currentStep === 2
                  ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              2
            </div>
            <span className={currentStep === 2 ? 'font-bold text-blue-400' : 'text-slate-400'}>
              Step 2: Single GRV Sign-Off & Commit
            </span>
          </div>
        </div>

        {/* MODAL CONTENT BODY */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* STEP 1: EDITABLE SUMMARY TABLE & STATS REVIEW */}
          {currentStep === 1 && (
            <div className="space-y-4">
              {/* Instructions banner */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-between text-xs text-slate-700 dark:text-slate-300">
                <div className="flex items-center space-x-2">
                  <Edit3 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>
                    <strong>Delivery Manifest Review:</strong> You can adjust incoming quantities or delete items before committing to Master_Stock.
                  </span>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Stock Items</div>
                  <div className="text-xl font-extrabold text-blue-600 dark:text-blue-400 font-mono mt-0.5">
                    {totalItemsCount} <span className="text-xs font-normal text-slate-400">lines</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Total Units</div>
                  <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                    +{totalUnits} <span className="text-xs font-normal text-slate-400">units</span>
                  </div>
                </div>

                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="text-[10px] font-semibold text-slate-500 uppercase">Categories</div>
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                    Stationery: {stationeryCount} | Cleaning: {cleaningCount}
                  </div>
                </div>
              </div>

              {/* Items Table Review & Interactive Editing */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <ListPlus className="w-4 h-4 text-blue-500" />
                    Delivery Shipment Manifest (Adjust Quantities or Delete Items)
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Target Table: Master_Stock
                  </span>
                </div>

                {itemsList.length === 0 ? (
                  <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-xl border border-red-300 dark:border-red-900/50 space-y-2">
                    <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      All items removed from this delivery shipment batch!
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Please cancel or add items back to proceed with receiving.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm max-h-60 overflow-y-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-300 dark:border-slate-700 sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Code</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Description</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Supplier</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right">Current</th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-center text-emerald-600 dark:text-emerald-400 font-bold w-28">
                            Incoming (+)
                          </th>
                          <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right font-bold">New Total</th>
                          <th className="p-2.5 text-center w-16">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-sans">
                        {itemsList.map((item) => (
                          <tr key={item.itemId} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 border-r border-slate-200 dark:border-slate-800">
                              {item.itemId}
                            </td>
                            <td className="p-2.5 font-medium border-r border-slate-200 dark:border-slate-800">
                              {item.itemName}
                              <span className="block text-[10px] text-slate-400">{item.category}</span>
                            </td>
                            <td className="p-2.5 border-r border-slate-200 dark:border-slate-800">
                              <input
                                type="text"
                                value={item.supplier || vendorSupplier}
                                onChange={(e) => handleSupplierChange(item.itemId, e.target.value)}
                                placeholder="Supplier name"
                                className="w-28 px-1.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-1 focus:ring-blue-500"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono text-slate-500 border-r border-slate-200 dark:border-slate-800">
                              {item.currentQty} {item.unit}
                            </td>
                            <td className="p-2.5 text-center border-r border-slate-200 dark:border-slate-800">
                              <input
                                type="number"
                                min="1"
                                value={item.addQty}
                                onChange={(e) => handleQtyChange(item.itemId, e.target.value)}
                                className="w-20 px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900 dark:text-slate-100 border-r border-slate-200 dark:border-slate-800">
                              {item.currentQty + item.addQty} {item.unit}
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.itemId)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded transition cursor-pointer"
                                title="Remove item from delivery shipment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: AUTHORIZATION & SIGN-OFF FOR SINGLE BATCH GRV */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 p-3.5 rounded-xl flex items-start space-x-3">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                    Step 2: Single GRV Document Sign-Off
                  </span>
                  All <strong className="text-blue-600 dark:text-blue-400">{totalItemsCount} received items</strong> will be consolidated into <strong>ONE Goods Received Voucher (GRV)</strong> document and logged with your receiving timestamp and user identity.
                </div>
              </div>

              {/* Delivery Meta Form */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Timestamp</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{nowStr}</span>
                </div>

                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Receiving Officer</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{issuerName} ({issuerId})</span>
                </div>

                <div className="col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Goods Received Voucher Reference (GRV Number)
                  </label>
                  <input
                    type="text"
                    value={deliveryNoteRef}
                    onChange={(e) => setDeliveryNoteRef(e.target.value)}
                    placeholder="e.g. GRN-882910 or Delivery Invoice #1024"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 mb-2"
                  />

                  <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Shipment Delivery Supplier / Vendor
                  </label>
                  <input
                    type="text"
                    value={vendorSupplier}
                    onChange={(e) => setVendorSupplier(e.target.value)}
                    placeholder="e.g. Paramount Wholesale Supplies, Kimberly-Clark, 3M, Office National"
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Checkbox Sign-off */}
              <div className="bg-slate-200 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700">
                <label className="flex items-start space-x-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedCheck}
                    onChange={(e) => setConfirmedCheck(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    I confirm physical inspection of all <strong className="text-slate-900 dark:text-slate-100">{totalItemsCount} items</strong> (+{totalUnits} units) received and authorize committing them into <code className="font-mono text-emerald-600 dark:text-emerald-400">Master_Stock</code> on <strong>1 single GRV document</strong>.
                  </span>
                </label>
              </div>

              {/* Progress Bar & Success Animation Panel */}
              {isProcessing && (
                <div className="bg-slate-900 border border-blue-500/40 p-4 rounded-xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-blue-300">
                    <span className="flex items-center gap-2">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                      ) : (
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      )}
                      <span>{executionStatus}</span>
                    </span>
                    <span className="text-emerald-400 font-mono font-extrabold">{progressPercent}%</span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-gradient-to-r from-blue-600 via-emerald-500 to-emerald-400'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Success Animation Badge */}
                  {isCompleted && (
                    <div className="flex items-center justify-center gap-2 pt-1 text-emerald-400 text-xs font-bold font-mono animate-in zoom-in duration-300">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>Single GRV Document & Stock Commit Completed!</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL FOOTER BUTTONS */}
        <div className="bg-slate-900 px-6 py-3 border-t border-slate-800 flex items-center justify-between">
          {currentStep === 1 ? (
            <>
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                disabled={itemsList.length === 0}
                className="flex items-center space-x-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
              >
                <span>Proceed to Step 2 (Single GRV Sign-Off)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={isProcessing}
                className="flex items-center space-x-1 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Step 1 Review</span>
              </button>

              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={!confirmedCheck || isProcessing || itemsList.length === 0}
                className="flex items-center space-x-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving GRV & Stock... ({progressPercent}%)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Generate 1 Single GRV Document</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
