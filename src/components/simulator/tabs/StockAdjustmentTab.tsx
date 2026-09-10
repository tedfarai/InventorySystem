import React, { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Clock,
  Zap,
  Lock,
  Plus,
  MessageSquare,
  Users,
  Check,
  Sparkles,
  Package,
  Layers,
  ChevronRight,
  Eye,
  XCircle,
} from 'lucide-react';
import {
  StockItem,
  AdjustmentReasonCode,
  AdminUser,
  TimedAccessWindow,
  StockAdjustmentRequest,
  StockAdjustmentRequestItem,
} from '../../../types';
import { StockItemDropUpSelect } from '../../common/StockItemDropUpSelect';

interface StockAdjustmentTabProps {
  stockItems: StockItem[];
  issuerName?: string;
  issuerId?: string;
  currentUser?: AdminUser | null;
  activeTimedWindow?: TimedAccessWindow | null;
  adjustmentRequests?: StockAdjustmentRequest[];
  onSaveAdjustment: (adjustmentData: {
    itemId: string;
    physicalQty: number;
    reasonCode: AdjustmentReasonCode;
    reasonLabel: string;
    countRef: string;
    notes: string;
    requestId?: string;
  }) => Promise<{ success: boolean; allAdjusted?: boolean; voucherNumber?: string } | void> | void;
  onOpenRequestsModal?: () => void;
  onOpenSuperiorManagerModal?: () => void;
  pendingRequestsCount?: number;
  onClose?: () => void;
}

const REASON_OPTIONS: { code: AdjustmentReasonCode; label: string; description: string }[] = [
  {
    code: 'COUNT_DISCREPANCY',
    label: 'Physical Stocktake Count Variance',
    description: 'Discrepancy identified during physical cycle count or monthly stocktake audit.',
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

export const StockAdjustmentTab: React.FC<StockAdjustmentTabProps> = ({
  stockItems,
  issuerName = 'Rachel Pickard',
  issuerId = 'ADM001',
  currentUser,
  activeTimedWindow,
  adjustmentRequests = [],
  onSaveAdjustment,
  onOpenRequestsModal,
  onOpenSuperiorManagerModal,
  pendingRequestsCount = 0,
  onClose,
}) => {
  const currentUserId = currentUser?.IssuerID || issuerId;
  const isSuperiorAdmin = currentUserId === 'ADM001';

  // Timer countdown for active timed window
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    if (!activeTimedWindow || !activeTimedWindow.isActive) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const end = new Date(activeTimedWindow.endTime).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((end - now) / 1000));
    };

    setRemainingSeconds(calculateRemaining());

    const interval = setInterval(() => {
      setRemainingSeconds(calculateRemaining());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimedWindow]);

  const hasValidTimedAccess =
    !isSuperiorAdmin &&
    activeTimedWindow &&
    activeTimedWindow.isActive &&
    (activeTimedWindow.grantedToIssuerId === currentUserId || activeTimedWindow.grantedToIssuerId === 'ADM005') &&
    remainingSeconds > 0;

  // Find active authorized request for the current user session
  const activeRequest = useMemo(() => {
    if (!adjustmentRequests || adjustmentRequests.length === 0) return null;

    // Direct match from activeTimedWindow requestId
    if (activeTimedWindow?.requestId) {
      const match = adjustmentRequests.find((r) => r.id === activeTimedWindow.requestId);
      if (match) return match;
    }

    // Match by status TIMED_ACCESS_GRANTED for current user
    const userTimedReq = adjustmentRequests.find(
      (r) =>
        r.status === 'TIMED_ACCESS_GRANTED' &&
        r.timedAccessWindow?.isActive &&
        (r.requesterId === currentUserId || r.timedAccessWindow?.grantedToIssuerId === currentUserId)
    );
    if (userTimedReq) return userTimedReq;

    // Fallback for Superior Admin if reviewing a timed request
    if (isSuperiorAdmin && activeTimedWindow?.isActive) {
      return adjustmentRequests.find((r) => r.id === activeTimedWindow.requestId) || null;
    }

    return null;
  }, [adjustmentRequests, activeTimedWindow, currentUserId, isSuperiorAdmin]);

  // Request item partitioning (Pending vs. Adjusted)
  const { pendingRequestItems, completedRequestItems, allRequestItemsAdjusted } = useMemo(() => {
    if (!activeRequest || !Array.isArray(activeRequest.items)) {
      return { pendingRequestItems: [], completedRequestItems: [], allRequestItemsAdjusted: false };
    }

    const completed = activeRequest.items.filter(
      (it) => it.isAdjusted || activeTimedWindow?.completedItemIds?.includes(it.ItemID)
    );
    const pending = activeRequest.items.filter(
      (it) => !it.isAdjusted && !activeTimedWindow?.completedItemIds?.includes(it.ItemID)
    );

    return {
      pendingRequestItems: pending,
      completedRequestItems: completed,
      allRequestItemsAdjusted: pending.length === 0 && activeRequest.items.length > 0,
    };
  }, [activeRequest, activeTimedWindow]);

  // Track session state if user just completed their request in this tab view
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [completedSummary, setCompletedSummary] = useState<{
    requestId: string;
    requestTitle: string;
    itemsCount: number;
    reconciledItems: { itemId: string; name: string; variance: number; unit: string }[];
  } | null>(null);

  // Accessible Stock Items:
  // - Timed user is STRICTLY restricted to only the pending items from their approved request
  // - Superior Admin gets full inventory (or pending items if executing a request)
  const accessibleStockItems = useMemo(() => {
    if (hasValidTimedAccess && activeRequest) {
      const pendingIds = pendingRequestItems.map((p) => p.ItemID);
      return stockItems.filter((i) => pendingIds.includes(i.ItemID));
    }
    if (isSuperiorAdmin) {
      return stockItems;
    }
    return [];
  }, [hasValidTimedAccess, activeRequest, pendingRequestItems, isSuperiorAdmin, stockItems]);

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Unrestricted Superior Admin state overrides (used only if Super Admin does ad-hoc manual adjustment)
  const [adminPhysicalCountInput, setAdminPhysicalCountInput] = useState<string>('');
  const [adminReasonCode, setAdminReasonCode] = useState<AdjustmentReasonCode>('COUNT_DISCREPANCY');
  const [adminCountRef, setAdminCountRef] = useState<string>(
    `COUNT-${new Date().getFullYear()}-0${Math.floor(10 + Math.random() * 90)}`
  );
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Synchronize selected item when accessible items list changes
  useEffect(() => {
    if (accessibleStockItems.length > 0) {
      if (!accessibleStockItems.some((i) => i.ItemID === selectedItemId)) {
        setSelectedItemId(accessibleStockItems[0].ItemID);
      }
    } else {
      setSelectedItemId('');
    }
  }, [accessibleStockItems, selectedItemId]);

  const selectedItem = stockItems.find((i) => i.ItemID === selectedItemId);
  const matchedRequestItem = activeRequest?.items?.find((i) => i.ItemID === selectedItemId);

  // If user is operating under request/timed access, variant is strictly locked to initial request
  const isEnforcingRequestVariant = Boolean(hasValidTimedAccess && activeRequest && matchedRequestItem);

  const effectivePhysicalQty = isEnforcingRequestVariant
    ? matchedRequestItem!.ProposedPhysicalQty
    : parseInt(adminPhysicalCountInput, 10);

  const effectiveVariance = isEnforcingRequestVariant
    ? matchedRequestItem!.VarianceQty
    : selectedItem && !isNaN(effectivePhysicalQty)
    ? effectivePhysicalQty - selectedItem.Qty
    : 0;

  const effectiveReasonCode: AdjustmentReasonCode = isEnforcingRequestVariant
    ? matchedRequestItem!.ReasonCode
    : adminReasonCode;

  const effectiveReasonLabel = isEnforcingRequestVariant
    ? matchedRequestItem!.ReasonLabel
    : REASON_OPTIONS.find((r) => r.code === adminReasonCode)?.label || 'Physical Stocktake Count Variance';

  const effectiveCountRef = isEnforcingRequestVariant
    ? matchedRequestItem!.CountRef
    : adminCountRef;

  const effectiveNotes = isEnforcingRequestVariant
    ? matchedRequestItem!.Notes
    : adminNotes;

  const isValidSubmit =
    Boolean(selectedItem) &&
    !isNaN(effectivePhysicalQty) &&
    effectivePhysicalQty >= 0 &&
    !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !isValidSubmit) return;

    setIsSubmitting(true);
    try {
      const result = await onSaveAdjustment({
        itemId: selectedItem.ItemID,
        physicalQty: effectivePhysicalQty,
        reasonCode: effectiveReasonCode,
        reasonLabel: effectiveReasonLabel,
        countRef: effectiveCountRef.trim() || `COUNT-${Date.now()}`,
        notes: effectiveNotes.trim() || 'Physical inventory audit reconciliation performed.',
        requestId: activeRequest?.id,
      });

      const isLastItem = pendingRequestItems.length <= 1;

      if (isEnforcingRequestVariant && (result?.allAdjusted || isLastItem)) {
        // All adjustments completed -> immediately close session and show completion view
        setSessionCompleted(true);
        setCompletedSummary({
          requestId: activeRequest.id,
          requestTitle: activeRequest.requestTitle,
          itemsCount: activeRequest.items.length,
          reconciledItems: activeRequest.items.map((it) => ({
            itemId: it.ItemID,
            name: it.ItemName,
            variance: it.VarianceQty,
            unit: it.Unit,
          })),
        });
        setSuccessMessage(
          `All requested adjustments for Request #${activeRequest.id} have been completed and reconciled on Master_Stock! The timed access window has now immediately closed.`
        );
      } else {
        // Individual item reconciled -> advance to next
        setSuccessMessage(
          `Stock for ${selectedItem.ItemName} (${selectedItem.ItemID}) reconciled to ${effectivePhysicalQty} ${selectedItem.Unit} (Variance: ${effectiveVariance > 0 ? `+${effectiveVariance}` : effectiveVariance}).`
        );
        setTimeout(() => setSuccessMessage(null), 4000);
      }

      setAdminPhysicalCountInput('');
      setAdminNotes('');
    } catch (err) {
      console.error('[StockAdjustmentTab] Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Format seconds to mm:ss
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ===========================================================================
  // SCENARIO A: ALL REQUESTED ADJUSTMENTS COMPLETED -> IMMEDIATE CLOSE VIEW
  // ===========================================================================
  if (sessionCompleted || (activeRequest && allRequestItemsAdjusted && !isSuperiorAdmin)) {
    const summary = completedSummary || {
      requestId: activeRequest?.id || 'SAR-COMPLETED',
      requestTitle: activeRequest?.requestTitle || 'Physical Stock Count Reconciliation',
      itemsCount: activeRequest?.items.length || 0,
      reconciledItems: (activeRequest?.items || []).map((it) => ({
        itemId: it.ItemID,
        name: it.ItemName,
        variance: it.VarianceQty,
        unit: it.Unit,
      })),
    };

    return (
      <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-slate-900 border-2 border-emerald-500/80 rounded-2xl p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/40 shadow-inner">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full text-xs font-mono font-bold border border-emerald-800">
              Adjustment Lifecycle Completed &amp; Closed
            </span>
            <h3 className="text-xl font-bold text-white">
              All Authorized Adjustments Completed
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              Every requested item on your authorized list for{' '}
              <strong className="text-emerald-400 font-mono">[{summary.requestId}]</strong> has been
              adjusted on <strong className="text-white">Master_Stock</strong> with the exact variants
              approved by the Superior Admin. In accordance with security protocol, your timed access window has now{' '}
              <strong className="text-emerald-300 underline">immediately closed</strong>.
            </p>
          </div>

          {/* Reconciled Items Breakdown Table */}
          <div className="max-w-xl mx-auto border border-slate-800 rounded-xl overflow-hidden bg-slate-950 text-left">
            <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 font-mono uppercase text-[11px]">
                Reconciled Items Ledger ({summary.reconciledItems.length} items)
              </span>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                Status: Closed &amp; Verified
              </span>
            </div>
            <div className="divide-y divide-slate-800/80 text-xs">
              {summary.reconciledItems.map((it) => (
                <div key={it.itemId} className="p-3 flex items-center justify-between hover:bg-slate-900/40">
                  <div>
                    <span className="font-mono text-slate-400 font-bold text-[11px]">[{it.itemId}]</span>{' '}
                    <span className="font-semibold text-slate-200">{it.name}</span>
                  </div>
                  <div className="text-right">
                    <span
                      className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                        it.variance < 0
                          ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                          : it.variance > 0
                          ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {it.variance > 0 ? `+${it.variance}` : it.variance} {it.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                <Check className="w-4 h-4" />
                <span>Close Window</span>
              </button>
            )}

            {onOpenRequestsModal && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Adjustment Request</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCENARIO B: STANDARD STAFF WITH NO ACTIVE TIMED ACCESS
  // ===========================================================================
  if (!isSuperiorAdmin && !hasValidTimedAccess) {
    return (
      <div className="space-y-6">
        <div className="bg-slate-900 rounded-2xl border-2 border-amber-500/80 shadow-xl overflow-hidden p-6 sm:p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center border border-amber-500/40 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <span className="bg-amber-950 text-amber-300 px-3 py-1 rounded-full text-xs font-mono font-bold border border-amber-800">
              Security Protocol — Superior Admin Clearance Required
            </span>
            <h3 className="text-lg font-bold text-slate-100">
              Stock Adjustment Access Restricted
            </h3>
            <p className="text-xs text-amber-200/90 leading-relaxed font-semibold bg-amber-950/40 p-3 rounded-xl border border-amber-900/60">
              "Only Superior Admin can do stock adjustments, contact the Superior Admin User, Create Your Stock Adjustment List and Notify the Superior Admin to Do or Authorize Your Request"
            </p>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-left max-w-xl mx-auto space-y-2 font-mono">
            <div className="text-slate-400 text-[11px]">Active Staff Session:</div>
            <div className="font-bold text-slate-200 flex justify-between">
              <span>{currentUser?.IssuerName || issuerName} ({currentUserId})</span>
              <span className="text-amber-400">{currentUser?.Role || 'Staff'}</span>
            </div>
            <div className="text-[11px] text-slate-500">
              Superior Super Admin: <strong>Rachel Pickard (ADM001)</strong>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            {onOpenRequestsModal && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Your Stock Adjustment List</span>
              </button>
            )}

            {onOpenRequestsModal && (
              <button
                type="button"
                onClick={onOpenRequestsModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center justify-center space-x-2"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Notify Superior Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // SCENARIO C: AUTHORIZED TIMED ACCESS ACTIVE (OR SUPERIOR ADMIN)
  // ===========================================================================
  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-500/40">
            <SlidersHorizontal className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-100">
                Physical Stock Count Adjustment &amp; Discrepancy Correction
              </h3>
              {isSuperiorAdmin ? (
                <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-purple-800">
                  Superior Admin Clearance
                </span>
              ) : (
                <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-800 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked to Request Variants
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {isSuperiorAdmin
                ? 'Full direct authorization to adjust Master_Stock or execute pending staff batches.'
                : `Strictly restricted to ${pendingRequestItems.length} requested item(s) with pre-authorized variants.`}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Superior Admin Management Hub Launcher Button */}
          {isSuperiorAdmin && onOpenSuperiorManagerModal && (
            <button
              type="button"
              onClick={onOpenSuperiorManagerModal}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1.5 shrink-0"
              title="Review pending requests from other users and grant timed access"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Review Requests {pendingRequestsCount > 0 && `(${pendingRequestsCount} Pending)`}</span>
            </button>
          )}

          <div className="flex items-center space-x-2 text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              Auditor: <strong className="text-emerald-300">{currentUser?.IssuerName || issuerName}</strong> (
              {currentUserId})
            </span>
          </div>
        </div>
      </div>

      {/* Active Timed Window & Request Enforcement Banner */}
      {hasValidTimedAccess && activeRequest && (
        <div className="bg-gradient-to-r from-purple-950/90 via-slate-900 to-purple-950/90 border-2 border-purple-400/90 text-white p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl animate-in fade-in">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="bg-purple-800 text-purple-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-600">
                ACTIVE REQUEST: {activeRequest.id}
              </span>
              <span className="text-xs font-bold text-purple-100">
                {activeRequest.requestTitle}
              </span>
            </div>
            <div className="text-xs text-purple-200/90 leading-snug">
              Governance Policy:{' '}
              <strong className="text-emerald-300">Strict Request Enforcement</strong> — only items from this request can be adjusted, and each item is locked to its authorized variance. When all{' '}
              <strong className="text-white font-mono">{activeRequest.items.length} items</strong> are reconciled, this window will immediately close.
            </div>

            {/* Item Progress Checklist */}
            <div className="flex items-center space-x-2 pt-1">
              <span className="text-[11px] font-mono text-purple-300">Progress:</span>
              <div className="flex items-center space-x-1.5">
                {activeRequest.items.map((it, idx) => {
                  const isDone = it.isAdjusted || activeTimedWindow?.completedItemIds?.includes(it.ItemID);
                  const isCurrent = it.ItemID === selectedItemId;
                  return (
                    <span
                      key={it.ItemID}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center space-x-1 border ${
                        isDone
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          : isCurrent
                          ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xs'
                          : 'bg-purple-900/60 text-purple-300 border-purple-700'
                      }`}
                    >
                      {isDone ? <Check className="w-3 h-3 text-emerald-400" /> : <Clock className="w-3 h-3" />}
                      <span>
                        {it.ItemID} ({idx + 1}/{activeRequest.items.length})
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="text-right font-mono bg-purple-950/90 px-4 py-2.5 rounded-xl border border-purple-400/60 shrink-0 self-start md:self-center">
            <span className="text-[10px] text-purple-300 block uppercase tracking-wider">Time Remaining:</span>
            <span className="text-lg font-bold text-emerald-300 tracking-wider">
              ⏱️ {formatTimer(remainingSeconds)}
            </span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 flex items-center space-x-2 text-xs font-medium text-emerald-800 dark:text-emerald-300 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        {/* Step 1: Select Item To Reconcile */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="stock-adjustment-item-select" className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>1. Select Requested Stock Item</span>
              {isEnforcingRequestVariant && (
                <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-mono font-bold border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" />
                  Locked to Authorized Request Items ({pendingRequestItems.length} Remaining)
                </span>
              )}
            </label>

            {selectedItem && (
              <span className="font-mono text-teal-700 dark:text-teal-400 lowercase text-[11px] font-normal">
                Category: {selectedItem.Category} • Unit: {selectedItem.Unit}
              </span>
            )}
          </div>

          {/* Search Filter for Dropdown if multiple items */}
          {accessibleStockItems.length > 5 && (
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="filter-requested-items-input"
                type="text"
                placeholder="Filter requested items..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-sans text-slate-800 dark:text-slate-200 placeholder-slate-400"
              />
            </div>
          )}

          <StockItemDropUpSelect
            id="stock-adjustment-item-drop-up-select"
            stockItems={accessibleStockItems}
            selectedItemId={selectedItemId}
            onSelectItem={(item) => setSelectedItemId(item.ItemID)}
            placeholder="-- Select stock item for physical count adjustment --"
            disabled={accessibleStockItems.length === 0 || isSubmitting}
            direction="down"
          />
        </div>

        {/* Step 2: System Count vs Physical Count with Locked Variant Enforcement */}
        {selectedItem && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
            {/* System Recorded Qty */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Current System Qty:
              </span>
              <div className="text-xl font-mono font-bold text-slate-800 dark:text-slate-200">
                {selectedItem.Qty} <span className="text-xs font-normal text-slate-400">{selectedItem.Unit}</span>
              </div>
              <p className="text-[10px] text-slate-400">Current value on Master_Stock</p>
            </div>

            {/* Target Physical Count */}
            <div className="space-y-1">
              <label htmlFor="target-physical-count-input" className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center justify-between">
                <span>Verified Physical Count:</span>
                {isEnforcingRequestVariant && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-mono font-bold">
                    <Lock className="w-3 h-3" /> Variant Locked
                  </span>
                )}
              </label>

              {isEnforcingRequestVariant ? (
                <div className="relative">
                  <input
                    id="target-physical-count-input"
                    type="number"
                    value={effectivePhysicalQty}
                    disabled={true}
                    readOnly={true}
                    className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/90 border-2 border-amber-500/40 dark:border-amber-400/40 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white cursor-not-allowed opacity-90"
                  />
                  <div className="absolute right-2 top-2">
                    <span className="text-[10px] font-sans font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-800 flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Payload Variant
                    </span>
                  </div>
                </div>
              ) : (
                <input
                  id="target-physical-count-input"
                  type="number"
                  min="0"
                  placeholder="Enter physical count"
                  value={adminPhysicalCountInput}
                  onChange={(e) => setAdminPhysicalCountInput(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border-2 border-amber-500/60 dark:border-amber-400/60 rounded-lg text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              )}

              <p className="text-[10px] text-slate-400">
                {isEnforcingRequestVariant
                  ? 'Strictly bound to initial request payload — cannot deviate'
                  : 'Exact quantity physically verified'}
              </p>
            </div>

            {/* Calculated Variance */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center justify-between">
                <span>Authorized Variance (Delta):</span>
                {isEnforcingRequestVariant && (
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                    Enforced Variant
                  </span>
                )}
              </span>
              <div className="text-xl font-mono font-bold flex items-center space-x-1.5">
                {effectiveVariance < 0 ? (
                  <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                    <TrendingDown className="w-5 h-5" /> {effectiveVariance} {selectedItem.Unit} (Shortage)
                  </span>
                ) : effectiveVariance > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <TrendingUp className="w-5 h-5" /> +{effectiveVariance} {selectedItem.Unit} (Surplus)
                  </span>
                ) : (
                  <span className="text-teal-600 dark:text-teal-400 flex items-center gap-1">
                    <CheckCircle2 className="w-5 h-5" /> 0 (Exact Match)
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400">
                {effectiveVariance !== 0
                  ? `Master_Stock will adjust from ${selectedItem.Qty} to ${effectivePhysicalQty}`
                  : 'No numeric change required'}
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Discrepancy Reason Code */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>2. Reason For Stock Adjustment / Discrepancy</span>
            {isEnforcingRequestVariant && (
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono flex items-center gap-1 font-bold">
                <Lock className="w-3 h-3" /> Locked to Authorized Variant
              </span>
            )}
          </label>

          {isEnforcingRequestVariant ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {REASON_OPTIONS.map((r) => {
                  const isAuthorizedReason = effectiveReasonCode === r.code;
                  return (
                    <div
                      key={r.code}
                      className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                        isAuthorizedReason
                          ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-500 text-amber-950 dark:text-amber-100 shadow-xs ring-1 ring-amber-400/50'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`reason-radio-${r.code}`}
                            name="requestLockedReason"
                            value={r.code}
                            checked={isAuthorizedReason}
                            disabled={true}
                            className="text-amber-600 focus:ring-amber-500 cursor-not-allowed"
                          />
                          <label
                            htmlFor={`reason-radio-${r.code}`}
                            className={`text-xs font-bold ${
                              isAuthorizedReason
                                ? 'text-amber-900 dark:text-amber-200'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {r.label}
                          </label>
                        </div>
                        {isAuthorizedReason ? (
                          <span className="text-[10px] font-mono font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Authorized
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
                            Disabled
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] pl-5 leading-tight">
                        {r.description}
                      </p>
                    </div>
                  );
                })}
              </div>
              <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/80 rounded-xl flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  Alternative reasons are strictly disabled in accordance with request #{activeRequest?.id} governance.
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REASON_OPTIONS.map((r) => (
                <label
                  key={r.code}
                  htmlFor={`admin-reason-radio-${r.code}`}
                  className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                    adminReasonCode === r.code
                      ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-200 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-1">
                    <input
                      id={`admin-reason-radio-${r.code}`}
                      type="radio"
                      name="adminReasonCode"
                      value={r.code}
                      checked={adminReasonCode === r.code}
                      onChange={() => setAdminReasonCode(r.code)}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-bold">{r.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5">
                    {r.description}
                  </p>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Step 4: Count Reference & Audit Remarks */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="stock-adj-count-ref-input" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Count Sheet Reference / Audit Tag</span>
              {isEnforcingRequestVariant && (
                <span className="text-[10px] text-amber-600 font-mono flex items-center gap-1 font-bold">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </label>
            {isEnforcingRequestVariant ? (
              <input
                id="stock-adj-count-ref-input"
                type="text"
                value={effectiveCountRef}
                disabled={true}
                readOnly={true}
                className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 font-bold cursor-not-allowed opacity-90"
              />
            ) : (
              <input
                id="stock-adj-count-ref-input"
                type="text"
                value={adminCountRef}
                onChange={(e) => setAdminCountRef(e.target.value)}
                placeholder="e.g. COUNT-2026-Q3-01"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-white"
                required
              />
            )}
          </div>

          <div className="space-y-1">
            <label htmlFor="stock-adj-notes-textarea" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Audit Explanation / Discrepancy Findings</span>
              {isEnforcingRequestVariant && (
                <span className="text-[10px] text-amber-600 font-mono flex items-center gap-1 font-bold">
                  <Lock className="w-2.5 h-2.5" /> Locked
                </span>
              )}
            </label>
            {isEnforcingRequestVariant ? (
              <textarea
                id="stock-adj-notes-textarea"
                rows={2}
                value={effectiveNotes || 'Pre-authorized findings from initial request.'}
                disabled={true}
                readOnly={true}
                className="w-full px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium cursor-not-allowed opacity-90"
              />
            ) : (
              <textarea
                id="stock-adj-notes-textarea"
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Explain count location, physical condition, packaging status..."
                className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400"
              />
            )}
          </div>
        </div>

        {/* Action Button & Confirmation */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center space-x-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>
              {isEnforcingRequestVariant
                ? `Fulfills item ${completedRequestItems.length + 1} of ${activeRequest?.items.length}. Window closes when all items complete.`
                : 'Generates immutable audit voucher in Stock_Adjustments\\'}
            </span>
          </div>

          <button
            type="submit"
            disabled={!isValidSubmit}
            className="w-full sm:w-auto flex items-center justify-center space-x-2 px-6 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition"
          >
            <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>
              {isEnforcingRequestVariant
                ? `Apply Authorized Adjustment (${effectiveVariance > 0 ? `+${effectiveVariance}` : effectiveVariance} ${selectedItem?.Unit || 'Units'})`
                : 'Record Discrepancy & Adjust Stock'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};
