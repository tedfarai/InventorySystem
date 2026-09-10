import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Plus,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  X,
  AlertTriangle,
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Zap,
  Info,
  Search,
  Check,
  Copy,
  FolderOpen,
  ArrowRight,
  ShieldAlert,
  ListFilter,
  Eye,
  Package,
  Layers,
} from 'lucide-react';
import {
  StockItem,
  AdminUser,
  StockAdjustmentRequest,
  StockAdjustmentRequestItem,
  AdjustmentReasonCode,
  TimedAccessWindow,
  ItemCategory,
} from '../../types';
import { searchStockItems } from '../../utils/searchEngine';
import { StockItemDropUpSelect } from '../common/StockItemDropUpSelect';
import { VisualCountdownTimer } from './VisualCountdownTimer';

interface StockAdjustmentRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  stockItems: StockItem[];
  userRequests: StockAdjustmentRequest[];
  activeTimedWindow: TimedAccessWindow | null;
  onSubmitRequest: (reqData: Omit<StockAdjustmentRequest, 'id' | 'createdAt' | 'status'>) => StockAdjustmentRequest | Promise<StockAdjustmentRequest>;
  onOpenDirectAdjustmentTab?: () => void;
}

const REASON_OPTIONS: { code: AdjustmentReasonCode; label: string; description: string }[] = [
  {
    code: 'COUNT_DISCREPANCY',
    label: 'Physical Stocktake Count Discrepancy',
    description: 'Variance discovered during periodic routine or cycle stock physical counts.',
  },
  {
    code: 'DAMAGED_STOCK',
    label: 'Damaged / Broken Goods in Storage',
    description: 'Stock physically compromised, broken packaging, or damaged during warehouse handling.',
  },
  {
    code: 'EXPIRED_OBSOLETE',
    label: 'Expired / Obsolete Material Write-Off',
    description: 'Chemicals, cleaning solutions, or materials past validity date or superseded.',
  },
  {
    code: 'AUDIT_CORRECTION',
    label: 'Inventory Audit Reconciliation',
    description: 'Correcting historical administrative bookkeeping or data entry discrepancies.',
  },
  {
    code: 'FOUND_STOCK',
    label: 'Found Surplus Unrecorded Stock',
    description: 'Physical inventory found in storage that was previously unrecorded or misallocated.',
  },
];

export const StockAdjustmentRequestModal: React.FC<StockAdjustmentRequestModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  stockItems,
  userRequests,
  activeTimedWindow,
  onSubmitRequest,
  onOpenDirectAdjustmentTab,
}) => {
  // Navigation tabs: 'create' | 'history' | 'notify'
  const [activeTab, setActiveTab] = useState<'create' | 'history' | 'notify'>('create');
  
  // Wizard steps within 'create' tab: 1 = Build List, 2 = Review & Confirm
  const [wizardStep, setWizardStep] = useState<1 | 2>(1);

  // Request Header Info
  const [requestTitle, setRequestTitle] = useState('');

  // Cart / Staging List of Adjustment Items (like Issue Request cart)
  const [itemList, setItemList] = useState<StockAdjustmentRequestItem[]>([]);

  // Item Form Selection Fields
  const [selectedItemId, setSelectedItemId] = useState<string>(stockItems[0]?.ItemID || '');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [itemCategoryFilter, setItemCategoryFilter] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');
  const [physicalCountInput, setPhysicalCountInput] = useState<string>('');
  const [reasonCode, setReasonCode] = useState<AdjustmentReasonCode>('COUNT_DISCREPANCY');
  const [countRefInput, setCountRefInput] = useState<string>(`COUNT-${new Date().getFullYear()}-0${Math.floor(10 + Math.random() * 90)}`);
  const [auditNotes, setAuditNotes] = useState<string>('');

  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Selected Stock Item details
  const selectedItem = useMemo(
    () => stockItems.find((i) => i.ItemID === selectedItemId) || stockItems[0],
    [stockItems, selectedItemId]
  );

  const systemQty = selectedItem ? selectedItem.Qty : 0;
  const parsedPhysicalQty = parseInt(physicalCountInput, 10);
  const isValidPhysicalQty = !isNaN(parsedPhysicalQty) && parsedPhysicalQty >= 0;
  const variance = isValidPhysicalQty ? parsedPhysicalQty - systemQty : 0;

  // Filtered Stock Items via Search Engine
  const filteredStockList = useMemo(() => {
    return searchStockItems(stockItems, itemSearchQuery, itemCategoryFilter);
  }, [stockItems, itemSearchQuery, itemCategoryFilter]);

  // Request list calculations
  const totalNetVariance = useMemo(() => {
    const list = Array.isArray(itemList) ? itemList : [];
    return list.reduce((sum, it) => sum + (it?.VarianceQty || 0), 0);
  }, [itemList]);

  const totalNegativeVariance = useMemo(() => {
    const list = Array.isArray(itemList) ? itemList : [];
    return list.filter((i) => (i?.VarianceQty || 0) < 0).reduce((sum, it) => sum + (it?.VarianceQty || 0), 0);
  }, [itemList]);

  const totalPositiveVariance = useMemo(() => {
    const list = Array.isArray(itemList) ? itemList : [];
    return list.filter((i) => (i?.VarianceQty || 0) > 0).reduce((sum, it) => sum + (it?.VarianceQty || 0), 0);
  }, [itemList]);

  if (!isOpen) return null;

  // Handle Add Item to Adjustment Staging Cart
  const handleAddItemToRequest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!selectedItem) {
      setErrorMsg('Please select a valid stock item from the Master Stock list.');
      return;
    }

    if (!isValidPhysicalQty) {
      setErrorMsg('Please enter a valid non-negative physical count number (e.g. 0, 10, 50).');
      return;
    }

    // Check if item is already in list
    const existingIndex = itemList.findIndex((it) => it.ItemID === selectedItem.ItemID);
    const chosenReason = REASON_OPTIONS.find((r) => r.code === reasonCode) || REASON_OPTIONS[0];

    const newItem: StockAdjustmentRequestItem = {
      ItemID: selectedItem.ItemID,
      ItemName: selectedItem.ItemName,
      Category: selectedItem.Category,
      CurrentSystemQty: systemQty,
      ProposedPhysicalQty: parsedPhysicalQty,
      VarianceQty: variance,
      Unit: selectedItem.Unit,
      ReasonCode: chosenReason.code,
      ReasonLabel: chosenReason.label,
      CountRef: countRefInput.trim() || `COUNT-${Date.now()}`,
      Notes: auditNotes.trim() || 'Physical inventory discrepancy count reported.',
    };

    if (existingIndex >= 0) {
      // Update existing item in cart
      setItemList((prev) => {
        const copy = [...prev];
        copy[existingIndex] = newItem;
        return copy;
      });
      setFeedbackMsg(`Updated count for "${selectedItem.ItemName}" in your adjustment request list.`);
    } else {
      // Append new item to cart
      setItemList((prev) => [...prev, newItem]);
      setFeedbackMsg(`Added "${selectedItem.ItemName}" (${variance >= 0 ? '+' : ''}${variance} ${selectedItem.Unit}) to adjustment list.`);
    }

    setPhysicalCountInput('');
    setAuditNotes('');
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleRemoveItem = (itemId: string) => {
    setItemList((prev) => prev.filter((it) => it.ItemID !== itemId));
  };

  // Submit full request to Superior Admin Rachel Pickard
  const handleSubmitFullRequest = async () => {
    if (itemList.length === 0) {
      setErrorMsg('Please add at least one stock item to your adjustment list.');
      return;
    }

    const title = requestTitle.trim() || `Stock Adjustment Request (${itemList.length} Items) — ${new Date().toLocaleDateString()}`;

    try {
      const newReq = await onSubmitRequest({
        requesterId: currentUser?.IssuerID || 'ADM002',
        requesterName: currentUser?.IssuerName || 'Authorized Staff',
        requesterRole: currentUser?.Role || 'Staff Member',
        requestTitle: title,
        items: itemList,
      });

      const reqId = newReq?.id || 'SAR-' + Date.now();

      // Reset wizard
      setItemList([]);
      setRequestTitle('');
      setWizardStep(1);
      setActiveTab('history');
      setFeedbackMsg(`Success! Stock Adjustment Request #${reqId} submitted for Superior Admin authorization.`);
      setTimeout(() => setFeedbackMsg(null), 6000);
    } catch (err: any) {
      setErrorMsg(`Failed to submit request: ${err?.message || 'Unknown error'}`);
    }
  };

  const safeUserRequests = Array.isArray(userRequests) ? userRequests : [];
  const myRequests = safeUserRequests.filter(
    (r) => r && (currentUser?.IssuerID === 'ADM001' || r.requesterId === currentUser?.IssuerID)
  );

  const hasActiveTimedPass = activeTimedWindow && activeTimedWindow.isActive && (
    currentUser?.IssuerID === 'ADM001' || activeTimedWindow.grantedToIssuerId === currentUser?.IssuerID
  );

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-amber-500/80 w-full max-w-5xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm text-slate-100">
                  Stock Item Adjustment Request & Authorization Portal
                </span>
                <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-800">
                  Staff: {currentUser?.IssuerName || 'Staff'} ({currentUser?.IssuerID || 'ADM'})
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard users create structured adjustment lists. Only Superior Admin (Rachel Pickard) can execute adjustments or grant custom-timed access.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* Security Protocol Banner Notice */}
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-900 dark:text-amber-200">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Security Protocol:</strong> "Only Superior Admin can do stock adjustments, contact the Superior Admin User, Create Your Stock Adjustment List and Notify the Superior Admin to Do or Authorize Your Request"
            </span>
          </div>

          {hasActiveTimedPass && (
            <div className="bg-purple-600 text-white px-3 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 shrink-0 shadow-xs animate-pulse">
              <Zap className="w-3.5 h-3.5" />
              <span>Active Timed Access Granted!</span>
            </div>
          )}
        </div>

        {/* Visual Countdown Timer for Staff when Timed Access is Granted */}
        {hasActiveTimedPass && (
          <div className="p-4 bg-slate-950 border-b border-purple-800/60">
            <VisualCountdownTimer
              timedWindow={activeTimedWindow}
              onLaunchAdjustment={() => {
                onClose();
                if (onOpenDirectAdjustmentTab) onOpenDirectAdjustmentTab();
              }}
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-slate-100 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 px-5 pt-2 flex items-center justify-between">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'create'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>1. Create Adjustment Request ({itemList.length} items)</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'history'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>2. Request History & Status ({myRequests.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notify')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition border-t-2 ${
                activeTab === 'notify'
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-500 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>3. Notify Rachel Pickard</span>
            </button>
          </div>
        </div>

        {/* Feedback / Alert notifications */}
        {feedbackMsg && (
          <div className="m-5 mb-0 p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-5 mb-0 p-3 bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-5 sm:p-6 max-h-[72vh] overflow-y-auto">

          {/* TAB 1: MULTI-STEP CREATION WIZARD */}
          {activeTab === 'create' && (
            <div className="space-y-5">

              {/* Wizard Step Breadcrumb Navigation */}
              <div className="flex items-center justify-between bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center space-x-3 text-xs font-bold">
                  <div
                    onClick={() => setWizardStep(1)}
                    className={`flex items-center space-x-2 cursor-pointer px-3 py-1.5 rounded-lg transition ${
                      wizardStep === 1
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900/20 flex items-center justify-center font-mono text-[11px]">1</span>
                    <span>Select Items & Staging Cart ({itemList.length})</span>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400" />

                  <div
                    onClick={() => itemList.length > 0 && setWizardStep(2)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition ${
                      itemList.length === 0
                        ? 'text-slate-400 opacity-50 cursor-not-allowed'
                        : wizardStep === 2
                        ? 'bg-amber-500 text-slate-950 shadow-xs cursor-pointer'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 cursor-pointer'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-slate-900/20 flex items-center justify-center font-mono text-[11px]">2</span>
                    <span>Review & Submit Batch</span>
                  </div>
                </div>

                <div className="text-xs font-mono text-slate-500">
                  {itemList.length} Item(s) in Current Batch
                </div>
              </div>

              {/* WIZARD STEP 1: ITEM SELECTION & STAGING CART (Like Issuing List Creation) */}
              {wizardStep === 1 && (
                <div className="space-y-5">
                  
                  {/* Top Item Selection Card */}
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                          Select Stock Item from Master Stock
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {filteredStockList.length} items available
                      </span>
                    </div>

                    {/* Filter & Search Bar for Inventory */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="relative sm:col-span-2">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Search Master Stock by Item ID, Name, or Description..."
                          value={itemSearchQuery}
                          onChange={(e) => setItemSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex items-center space-x-1">
                        {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setItemCategoryFilter(cat)}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${
                              itemCategoryFilter === cat
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Uniform Drop-Up Selector */}
                    <div>
                      <StockItemDropUpSelect
                        id="modal-stock-adjustment-drop-up-select"
                        stockItems={filteredStockList}
                        selectedItemId={selectedItemId}
                        onSelectItem={(item) => {
                          setSelectedItemId(item.ItemID);
                          setPhysicalCountInput('');
                        }}
                        placeholder="-- Select stock item for physical count verification --"
                        direction="up"
                      />
                    </div>

                    {/* Side-by-Side Verification Cards */}
                    {selectedItem && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-mono">
                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Current System Qty:</span>
                          <strong className="text-slate-900 dark:text-slate-100 text-base">{systemQty} {selectedItem.Unit}</strong>
                        </div>

                        <div className="bg-amber-50/60 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-300 dark:border-amber-700">
                          <label className="text-[10px] text-amber-900 dark:text-amber-200 block font-bold uppercase">
                            Verified Physical Count:
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="Enter physical count"
                            value={physicalCountInput}
                            onChange={(e) => setPhysicalCountInput(e.target.value)}
                            className="w-full mt-1 px-2.5 py-1 bg-white dark:bg-slate-900 border border-amber-500 rounded-lg text-sm font-bold text-slate-900 dark:text-white"
                            required
                          />
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                          <span className="text-[10px] text-slate-500 block uppercase font-bold">Calculated Variance:</span>
                          <div className="text-base font-bold mt-1">
                            {!isValidPhysicalQty ? (
                              <span className="text-slate-400 text-xs italic font-sans">Input physical count</span>
                            ) : variance < 0 ? (
                              <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                <TrendingDown className="w-4 h-4" /> {variance} {selectedItem.Unit} (Shortage)
                              </span>
                            ) : variance > 0 ? (
                              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <TrendingUp className="w-4 h-4" /> +{variance} {selectedItem.Unit} (Surplus)
                              </span>
                            ) : (
                              <span className="text-teal-600 dark:text-teal-400">0 {selectedItem.Unit} (Match)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Discrepancy Reason, Count Tag, & Notes */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Discrepancy Reason Code:
                        </label>
                        <select
                          value={reasonCode}
                          onChange={(e) => setReasonCode(e.target.value as AdjustmentReasonCode)}
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200"
                        >
                          {REASON_OPTIONS.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Count Sheet Reference / Audit Tag:
                        </label>
                        <input
                          type="text"
                          value={countRefInput}
                          onChange={(e) => setCountRefInput(e.target.value)}
                          placeholder="e.g. COUNT-2026-Q3-01"
                          className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Justification & Location Notes:
                      </label>
                      <input
                        type="text"
                        value={auditNotes}
                        onChange={(e) => setAuditNotes(e.target.value)}
                        placeholder="Explain reason, damage condition, or storage shelf location for Rachel Pickard..."
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>

                    {/* Add to List Button */}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleAddItemToRequest()}
                        disabled={!selectedItem || !isValidPhysicalQty}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Item to Adjustment List Cart</span>
                      </button>
                    </div>
                  </div>

                  {/* Staging Cart Table (Like Requisition List) */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-amber-600" />
                        <span>Items on this Adjustment Request List ({itemList.length}):</span>
                      </span>

                      <div className="flex items-center space-x-3 text-[11px] font-mono">
                        <span className="text-slate-500">
                          Net: <strong className={totalNetVariance < 0 ? 'text-red-600' : 'text-emerald-600'}>{totalNetVariance} units</strong>
                        </span>
                        {totalNegativeVariance < 0 && (
                          <span className="text-red-600">Loss/Damaged: {totalNegativeVariance}</span>
                        )}
                        {totalPositiveVariance > 0 && (
                          <span className="text-emerald-600">Found: +{totalPositiveVariance}</span>
                        )}
                      </div>
                    </div>

                    {itemList.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 italic text-xs">
                        No items added yet. Select a stock item above, input your physical count, and click "Add Item to Adjustment List Cart".
                      </div>
                    ) : (
                      <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          <tr>
                            <th className="p-2.5">Item Code & Name</th>
                            <th className="p-2.5 text-right">System Qty</th>
                            <th className="p-2.5 text-right">Physical Count</th>
                            <th className="p-2.5 text-right">Variance</th>
                            <th className="p-2.5">Reason & Reference</th>
                            <th className="p-2.5">Audit Notes</th>
                            <th className="p-2.5 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {itemList.map((it) => (
                            <tr key={it.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <td className="p-2.5 font-mono">
                                <strong className="text-slate-900 dark:text-slate-100">{it.ItemID}</strong>
                                <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">{it.ItemName}</div>
                              </td>
                              <td className="p-2.5 text-right font-mono">{it.CurrentSystemQty} {it.Unit}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                                {it.ProposedPhysicalQty} {it.Unit}
                              </td>
                              <td className="p-2.5 text-right font-mono font-bold">
                                {it.VarianceQty < 0 ? (
                                  <span className="text-red-600">{it.VarianceQty} {it.Unit}</span>
                                ) : it.VarianceQty > 0 ? (
                                  <span className="text-emerald-600">+{it.VarianceQty} {it.Unit}</span>
                                ) : (
                                  <span className="text-teal-600">0 {it.Unit}</span>
                                )}
                              </td>
                              <td className="p-2.5">
                                <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                                  {it.ReasonLabel}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">{it.CountRef}</span>
                              </td>
                              <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400">
                                {it.Notes}
                              </td>
                              <td className="p-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(it.ItemID)}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950"
                                  title="Remove from list"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Navigation Button to Step 2 */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="text-xs text-slate-500">
                      Step 1 of 2: Build your adjustment item list.
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (itemList.length === 0) {
                          setErrorMsg('Please add at least one stock item to your adjustment list.');
                          return;
                        }
                        setErrorMsg(null);
                        setWizardStep(2);
                      }}
                      disabled={itemList.length === 0}
                      className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                    >
                      <span>Proceed to Step 2: Review & Submit ({itemList.length} Items)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* WIZARD STEP 2: REVIEW & SUBMIT BATCH */}
              {wizardStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Review Stock Adjustment Request Summary</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Requester:</span>
                        <div className="font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                          {currentUser?.IssuerName || 'Staff'} ({currentUser?.IssuerID || 'ADM'})
                        </div>
                        <div className="text-[10px] text-slate-400 font-sans">{currentUser?.Role || 'Staff Member'}</div>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Batch Scope:</span>
                        <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                          {itemList.length} Items Listed
                        </div>
                        <div className="text-[10px] text-slate-500">Net Variance: {totalNetVariance} Units</div>
                      </div>

                      <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Target Reviewer:</span>
                        <div className="font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                          Rachel Pickard (ADM001)
                        </div>
                        <div className="text-[10px] text-slate-500">Procurement Superior Admin</div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Request Batch Title / Description (Optional):
                      </label>
                      <input
                        type="text"
                        value={requestTitle}
                        onChange={(e) => setRequestTitle(e.target.value)}
                        placeholder={`e.g. Q3 Stationery Physical Inventory Discrepancy Reconciliation (${itemList.length} Items)`}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  {/* Summary Table of All Items */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                    <div className="bg-slate-100 dark:bg-slate-800 px-4 py-2 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                      Itemized Breakdown ({itemList.length} items):
                    </div>
                    <table className="w-full text-xs text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        <tr>
                          <th className="p-2.5">Item</th>
                          <th className="p-2.5 text-right">System Qty</th>
                          <th className="p-2.5 text-right">Physical Count</th>
                          <th className="p-2.5 text-right">Variance</th>
                          <th className="p-2.5">Reason Code</th>
                          <th className="p-2.5">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {itemList.map((it) => (
                          <tr key={it.ItemID}>
                            <td className="p-2.5 font-mono">
                              <strong>{it.ItemID}</strong> - {it.ItemName}
                            </td>
                            <td className="p-2.5 text-right font-mono">{it.CurrentSystemQty} {it.Unit}</td>
                            <td className="p-2.5 text-right font-mono font-bold text-amber-600">{it.ProposedPhysicalQty} {it.Unit}</td>
                            <td className="p-2.5 text-right font-mono font-bold">
                              {it.VarianceQty < 0 ? (
                                <span className="text-red-600">{it.VarianceQty} {it.Unit}</span>
                              ) : it.VarianceQty > 0 ? (
                                <span className="text-emerald-600">+{it.VarianceQty} {it.Unit}</span>
                              ) : (
                                <span className="text-teal-600">0</span>
                              )}
                            </td>
                            <td className="p-2.5 text-[11px]">{it.ReasonLabel}</td>
                            <td className="p-2.5 text-[11px] text-slate-500">{it.Notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Submission Action Bar */}
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center space-x-1.5"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back to Edit Items</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSubmitFullRequest}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
                    >
                      <Send className="w-4 h-4" />
                      <span>Confirm & Submit Request to Rachel Pickard</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MY SUBMITTED REQUESTS STATUS & HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="space-y-3">
                {myRequests.map((req) => {
                  const statusBadgeColor =
                    req.status === 'APPROVED_AND_EXECUTED'
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300'
                      : req.status === 'TIMED_ACCESS_GRANTED'
                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300'
                      : req.status === 'EXPIRED'
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-400'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300';

                  const isTimedActive = req.status === 'TIMED_ACCESS_GRANTED' && req.timedAccessWindow?.isActive;

                  return (
                    <div
                      key={req.id}
                      className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-xs text-slate-900 dark:text-slate-100">
                              {req.id}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusBadgeColor}`}>
                              {req.status === 'APPROVED_AND_EXECUTED'
                                ? 'APPROVED & DIRECTLY EXECUTED BY SUPERIOR ADMIN'
                                : req.status === 'TIMED_ACCESS_GRANTED'
                                ? 'CUSTOM TIMED ACCESS GRANTED'
                                : req.status === 'EXPIRED'
                                ? 'TIMED SESSION EXPIRED'
                                : req.status === 'REJECTED'
                                ? 'REJECTED / RETURNED'
                                : 'PENDING SUPERIOR ADMIN AUTHORIZATION'}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-1">
                            {req.requestTitle}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Created: {req.createdAt} by {req.requesterName} ({req.requesterId})
                          </div>
                        </div>

                        {isTimedActive && onOpenDirectAdjustmentTab && (
                          <button
                            onClick={() => {
                              onClose();
                              onOpenDirectAdjustmentTab();
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center space-x-1.5 shrink-0"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Launch Authorized Adjustment →</span>
                          </button>
                        )}
                      </div>

                      {/* Items Preview */}
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Requested Stock Items ({req.items.length}):
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {req.items.map((it) => (
                            <div
                              key={it.ItemID}
                              className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex justify-between items-center"
                            >
                              <div>
                                <strong className="font-mono text-slate-800 dark:text-slate-200">{it.ItemID}</strong>
                                <span className="text-slate-600 dark:text-slate-400 block text-[11px]">{it.ItemName}</span>
                                <span className="text-[10px] text-slate-500">{it.ReasonLabel}</span>
                              </div>
                              <div className="text-right font-mono">
                                <div className="text-slate-500 text-[10px]">Sys: {it.CurrentSystemQty} → Phys: {it.ProposedPhysicalQty}</div>
                                <div className="font-bold text-xs">
                                  {it.VarianceQty < 0 ? (
                                    <span className="text-red-600">{it.VarianceQty} {it.Unit}</span>
                                  ) : it.VarianceQty > 0 ? (
                                    <span className="text-emerald-600">+{it.VarianceQty} {it.Unit}</span>
                                  ) : (
                                    <span className="text-teal-600">0</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Reviewer Notes */}
                      {req.superiorAdminNotes && (
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200">
                          <strong>Superior Admin Notes ({req.reviewedBy || 'Rachel Pickard'}):</strong> {req.superiorAdminNotes}
                        </div>
                      )}
                    </div>
                  );
                })}

                {myRequests.length === 0 && (
                  <div className="p-8 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    You have not submitted any stock adjustment requests yet. Click "1. Create Adjustment Request" above to start.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFY RACHEL PICKARD */}
          {activeTab === 'notify' && (
            <div className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-sm">
                    RP
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Superior Super Admin Notification Desk
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Contact Rachel Pickard (Procurement Manager / ADM001) for immediate authorization or access windows.
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs font-mono">
                  <div className="text-slate-500 text-[11px]">Draft Notification Memo:</div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-200 text-xs leading-relaxed">
                    "Hi Rachel, I have conducted a physical cycle count and submitted Stock Adjustment Request with {itemList.length > 0 ? itemList.length : 'my'} item(s) to be reconciled. Kindly review the list on the Superior Admin Management Hub to either authorize direct execution or grant me custom timed access to complete the adjustments. Thank you — {currentUser?.IssuerName || 'Staff'} ({currentUser?.IssuerID || 'ADM'})"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const text = `Hi Rachel, I have conducted a physical cycle count and submitted Stock Adjustment Request. Kindly review on the Superior Admin Management Hub. — ${currentUser?.IssuerName || 'Staff'} (${currentUser?.IssuerID || 'ADM'})`;
                    navigator.clipboard.writeText(text);
                    setCopiedNotification(true);
                    setTimeout(() => setCopiedNotification(false), 2500);
                  }}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
                >
                  {copiedNotification ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Notification to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Urgent Notification Message to Clipboard</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
