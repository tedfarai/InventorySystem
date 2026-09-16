import React, { useState } from 'react';
import {
  SlidersHorizontal,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  TrendingDown,
  TrendingUp,
  FileText,
  UserCheck,
  XCircle,
  Play,
  RotateCcw,
  Search,
  Filter,
  Check,
  ArrowRight,
  Lock,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  StockItem,
  AdminUser,
  StockAdjustmentRequest,
  StockAdjustmentRequestItem,
  TimedAccessWindow,
  AdjustmentReasonCode,
} from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface SuperiorAdminAdjustmentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  stockItems: StockItem[];
  requests: StockAdjustmentRequest[];
  activeTimedWindow?: TimedAccessWindow | null;
  onApproveAndExecuteRequest: (requestId: string, adminNotes: string) => void;
  onGrantTimedAccess: (requestId: string, durationMinutes: number, adminNotes: string) => void;
  onRevokeTimedAccess: (requestId: string) => void;
  onRejectRequest: (requestId: string, adminNotes: string) => void;
}

export const SuperiorAdminAdjustmentManagerModal: React.FC<SuperiorAdminAdjustmentManagerModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  stockItems,
  requests,
  activeTimedWindow,
  onApproveAndExecuteRequest,
  onGrantTimedAccess,
  onRevokeTimedAccess,
  onRejectRequest,
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<StockAdjustmentRequest | null>(null);

  // Timed Access Modal Sub-dialog State
  const [timedModalRequest, setTimedModalRequest] = useState<StockAdjustmentRequest | null>(null);
  const [customDurationMinutes, setCustomDurationMinutes] = useState<number>(30);
  const [timedNotes, setTimedNotes] = useState<string>('Authorized by Rachel Pickard for physical count discrepancy entry.');

  // Direct Execution Confirmation Sub-dialog State
  const [executeModalRequest, setExecuteModalRequest] = useState<StockAdjustmentRequest | null>(null);
  const [executionNotes, setExecutionNotes] = useState<string>('Authorized and executed directly by Rachel Pickard.');

  // Rejection Notes State
  const [rejectModalRequest, setRejectModalRequest] = useState<StockAdjustmentRequest | null>(null);
  const [rejectNotes, setRejectNotes] = useState<string>('Physical count requires secondary audit verification before authorization.');

  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  // Non-Superior Admin Guard
  if (!isSuperiorAdmin) {
    return (
      <DraggableResizableModal
        onClose={onClose}
        modalId="adjustment-manager-access-restricted"
        className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md border-2 border-rose-600 text-center space-y-4 shadow-2xl my-auto flex flex-col"
      >
        <div data-drag-handle="true" className="cursor-grab active:cursor-grabbing select-none shrink-0">
          <XCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-2">Access Restricted</h3>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 flex-1">
          Only Rachel Pickard (Superior Super Admin - ADM001) has clearance to manage stock adjustment requests and grant timed access windows.
        </p>
        <div className="shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </DraggableResizableModal>
    );
  }

  const safeRequests = Array.isArray(requests) ? requests : [];

  const filteredRequests = safeRequests.filter((r) => {
    if (!r) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = (r.id || '').toLowerCase().includes(q);
      const matchTitle = (r.requestTitle || '').toLowerCase().includes(q);
      const matchRequester = ((r.requesterName || '') + ' ' + (r.requesterId || '')).toLowerCase().includes(q);
      const matchItem = Array.isArray(r.items) && r.items.some((it) => (it?.ItemName || '').toLowerCase().includes(q) || (it?.ItemID || '').toLowerCase().includes(q));
      if (!matchId && !matchTitle && !matchRequester && !matchItem) return false;
    }
    return true;
  });

  const pendingCount = safeRequests.filter((r) => r?.status === 'PENDING').length;
  const activeTimedCount = safeRequests.filter((r) => r?.status === 'TIMED_ACCESS_GRANTED' && r?.timedAccessWindow?.isActive).length;

  const handleConfirmDirectExecution = () => {
    if (!executeModalRequest) return;
    onApproveAndExecuteRequest(executeModalRequest.id, executionNotes);
    setActionFeedback(`Request #${executeModalRequest.id} authorized & executed directly into Master_Stock!`);
    setExecuteModalRequest(null);
    setSelectedRequest(null);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleConfirmGrantTimedAccess = () => {
    if (!timedModalRequest) return;
    onGrantTimedAccess(timedModalRequest.id, customDurationMinutes, timedNotes);
    setActionFeedback(
      `Custom timed access (${customDurationMinutes} min) granted to ${timedModalRequest.requesterName} (${timedModalRequest.requesterId}) for ${timedModalRequest.items.length} requested items.`
    );
    setTimedModalRequest(null);
    setSelectedRequest(null);
    setTimeout(() => setActionFeedback(null), 5000);
  };

  const handleConfirmReject = () => {
    if (!rejectModalRequest) return;
    onRejectRequest(rejectModalRequest.id, rejectNotes);
    setActionFeedback(`Request #${rejectModalRequest.id} rejected and returned with notes.`);
    setRejectModalRequest(null);
    setSelectedRequest(null);
    setTimeout(() => setActionFeedback(null), 4500);
  };

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="superior-admin-adjustment-manager-modal"
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-purple-600/80 w-full max-w-5xl overflow-hidden my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-950 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm text-slate-100">
                Stock Adjustment Authorization & Timed Access Manager
              </span>
              <span className="bg-purple-950 text-purple-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-purple-800">
                Superior Super Admin: Rachel Pickard (ADM001)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review staff stock adjustment request batches, directly authorize 1-click execution, or grant custom-timed access windows.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          ✕ Close
        </button>
      </div>

        {/* Metric Summary Ribbon */}
        <div className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Total Requests</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{safeRequests.length} Batches</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Pending Authorization</span>
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{pendingCount} Awaiting Action</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Active Timed Windows</span>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{activeTimedCount} Active Passes</span>
          </div>

          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Authority Level</span>
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Exclusive Sole Sign-Off</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div className="m-5 mb-0 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 p-3.5 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Main Body */}
        <div className="p-5 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-5">
          {/* Search & Filter Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by Request ID, Requester, Title, or Stock Item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center space-x-1 shrink-0 overflow-x-auto">
              {(['ALL', 'PENDING', 'APPROVED_AND_EXECUTED', 'TIMED_ACCESS_GRANTED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                    filterStatus === st
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {st === 'ALL'
                    ? 'All Requests'
                    : st === 'APPROVED_AND_EXECUTED'
                    ? 'Directly Executed'
                    : st === 'TIMED_ACCESS_GRANTED'
                    ? 'Timed Pass Granted'
                    : st}
                </button>
              ))}
            </div>
          </div>

          {/* Requests List */}
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const statusBadgeColor =
                req.status === 'APPROVED_AND_EXECUTED'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : req.status === 'TIMED_ACCESS_GRANTED'
                  ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                  : req.status === 'REJECTED'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                  : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800';

              const isPending = req.status === 'PENDING';
              const isTimed = req.status === 'TIMED_ACCESS_GRANTED' && req.timedAccessWindow?.isActive;

              return (
                <div
                  key={req.id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-purple-700 dark:text-purple-400">
                          {req.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${statusBadgeColor}`}>
                          {req.status === 'APPROVED_AND_EXECUTED'
                            ? 'DIRECTLY EXECUTED & APPROVED'
                            : req.status === 'TIMED_ACCESS_GRANTED'
                            ? 'TIMED ACCESS WINDOW ACTIVE'
                            : req.status === 'REJECTED'
                            ? 'REJECTED'
                            : 'PENDING SUPERIOR ADMIN ACTION'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {req.createdAt}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-1">
                        {req.requestTitle}
                      </h4>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Requester: <strong>{req.requesterName}</strong> ({req.requesterId} - {req.requesterRole})
                      </div>
                    </div>

                    {/* Superior Admin Action Buttons */}
                    <div className="flex items-center space-x-2 shrink-0">
                      {isPending && (
                        <>
                          {/* Option 1: 1-Click Authorize & Execute Directly */}
                          <button
                            type="button"
                            onClick={() => setExecuteModalRequest(req)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                            title="Execute all item adjustments immediately on Master_Stock on behalf of requester"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>1-Click Authorize & Execute</span>
                          </button>

                          {/* Option 2: Grant Custom Timed Access Pass */}
                          <button
                            type="button"
                            onClick={() => setTimedModalRequest(req)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                            title="Grant requester a custom timed window to adjust ONLY the items on their list"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Grant Timed Access Pass</span>
                          </button>

                          {/* Option 3: Reject / Recount */}
                          <button
                            type="button"
                            onClick={() => setRejectModalRequest(req)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {isTimed && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-mono text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                            <Zap className="w-3.5 h-3.5" /> Window Active ({req.timedAccessWindow?.durationMinutes}m)
                          </span>
                          <button
                            type="button"
                            onClick={() => onRevokeTimedAccess(req.id)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold"
                          >
                            Revoke Access
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Item List Table */}
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                        <tr>
                          <th className="p-2">Item ID & Description</th>
                          <th className="p-2 text-right">System Qty</th>
                          <th className="p-2 text-right">Physical Count</th>
                          <th className="p-2 text-right">Variance</th>
                          <th className="p-2">Discrepancy Reason & Tag</th>
                          <th className="p-2">Audit Finding Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {req.items.map((it) => (
                          <tr key={it.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-mono">
                              <strong className="text-slate-800 dark:text-slate-200">{it.ItemID}</strong>
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">{it.ItemName}</div>
                            </td>
                            <td className="p-2 text-right font-mono">{it.CurrentSystemQty} {it.Unit}</td>
                            <td className="p-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                              {it.ProposedPhysicalQty} {it.Unit}
                            </td>
                            <td className="p-2 text-right font-mono font-bold">
                              {it.VarianceQty < 0 ? (
                                <span className="text-red-600">{it.VarianceQty} {it.Unit}</span>
                              ) : it.VarianceQty > 0 ? (
                                <span className="text-emerald-600">+{it.VarianceQty} {it.Unit}</span>
                              ) : (
                                <span className="text-teal-600">0</span>
                              )}
                            </td>
                            <td className="p-2">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">{it.ReasonLabel}</span>
                              <span className="text-[10px] font-mono text-slate-500">{it.CountRef}</span>
                            </td>
                            <td className="p-2 text-[11px] text-slate-600 dark:text-slate-400">{it.Notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Review / Admin Notes Footer */}
                  {req.superiorAdminNotes && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-800/80 rounded-lg text-[11px] font-mono text-slate-700 dark:text-slate-300">
                      <strong>Superior Admin Log ({req.reviewedBy}):</strong> {req.superiorAdminNotes}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                No stock adjustment requests found matching filter "{filterStatus}".
              </div>
            )}
          </div>
        </div>

        {/* SUB-MODAL: GRANT CUSTOM TIMED ACCESS PASS */}
        {timedModalRequest && (
          <DraggableResizableModal
            onClose={() => setTimedModalRequest(null)}
            modalId="grant-timed-access-modal"
            zIndex="z-60"
            className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-purple-500 shadow-2xl w-full max-w-lg overflow-hidden my-auto flex flex-col"
          >
            <div
              data-drag-handle="true"
              className="bg-purple-600 text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span className="font-bold text-sm">Grant Custom-Timed Stock Adjustment Access</span>
              </div>
              <button
                onClick={() => setTimedModalRequest(null)}
                className="text-white/80 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1 font-mono text-[11px]">
                <div><strong>Requester:</strong> {timedModalRequest.requesterName} ({timedModalRequest.requesterId})</div>
                <div><strong>Batch Title:</strong> {timedModalRequest.requestTitle}</div>
                <div><strong>Permitted Items ({timedModalRequest.items.length}):</strong> {timedModalRequest.items.map((i) => i.ItemID).join(', ')}</div>
              </div>

              <div className="space-y-2">
                <label className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider block">
                  Select Access Window Duration:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setCustomDurationMinutes(mins)}
                      className={`py-2 rounded-lg font-mono font-bold text-xs transition ${
                        customDurationMinutes === mins
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {mins} Mins
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-slate-500 font-mono text-[11px]">Or Custom Minutes:</span>
                  <input
                    type="number"
                    min="5"
                    max="480"
                    value={customDurationMinutes}
                    onChange={(e) => setCustomDurationMinutes(Math.max(5, parseInt(e.target.value, 10) || 5))}
                    className="w-24 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold"
                  />
                  <span className="text-slate-500 text-[11px]">Minutes</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Authorization Memo / Notes:
                </label>
                <textarea
                  rows={2}
                  value={timedNotes}
                  onChange={(e) => setTimedNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 p-3 rounded-xl border border-purple-200 dark:border-purple-800 text-[11px] text-purple-900 dark:text-purple-200 flex items-start space-x-2">
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Access Scope:</strong> {timedModalRequest.requesterName} will be granted access to the Stock Adjustment dialogue for <strong>{customDurationMinutes} minutes</strong>, strictly restricted to adjust the <strong>{timedModalRequest.items.length} items</strong> on this approved list.
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setTimedModalRequest(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGrantTimedAccess}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Activate {customDurationMinutes}-Min Timed Pass</span>
              </button>
            </div>
          </DraggableResizableModal>
        )}

        {/* SUB-MODAL: DIRECT EXECUTION CONFIRMATION */}
        {executeModalRequest && (
          <DraggableResizableModal
            onClose={() => setExecuteModalRequest(null)}
            modalId="direct-execution-confirmation-modal"
            zIndex="z-60"
            className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-500 shadow-2xl w-full max-w-lg overflow-hidden my-auto flex flex-col"
          >
            <div
              data-drag-handle="true"
              className="bg-emerald-600 text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-bold text-sm">Direct Stock Adjustment Authorization</span>
              </div>
              <button
                onClick={() => setExecuteModalRequest(null)}
                className="text-white/80 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs flex-1 min-h-0 overflow-y-auto">
              <p className="leading-relaxed text-slate-700 dark:text-slate-300">
                You are about to directly execute and apply the following stock discrepancy reconciliation batch into <strong>Master_Stock</strong>:
              </p>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 font-mono text-[11px] space-y-1">
                <div><strong>Batch Ref:</strong> {executeModalRequest.id} — {executeModalRequest.requestTitle}</div>
                <div><strong>Requester:</strong> {executeModalRequest.requesterName} ({executeModalRequest.requesterId})</div>
                <div><strong>Total Stock Items to Adjust:</strong> {executeModalRequest.items.length} items</div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Superior Admin Execution Memo:
                </label>
                <textarea
                  rows={2}
                  value={executionNotes}
                  onChange={(e) => setExecutionNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setExecuteModalRequest(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDirectExecution}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Authorize & Execute into Master_Stock</span>
              </button>
            </div>
          </DraggableResizableModal>
        )}

        {/* SUB-MODAL: REJECTION NOTES */}
        {rejectModalRequest && (
          <DraggableResizableModal
            onClose={() => setRejectModalRequest(null)}
            modalId="reject-stock-adjustment-modal"
            zIndex="z-60"
            className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-rose-500 shadow-2xl w-full max-w-md overflow-hidden my-auto flex flex-col"
          >
            <div
              data-drag-handle="true"
              className="bg-rose-600 text-white p-4 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-sm">Reject Stock Adjustment Request</span>
              </div>
              <button
                onClick={() => setRejectModalRequest(null)}
                className="text-white/80 hover:text-white font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs flex-1 min-h-0 overflow-y-auto">
              <div className="space-y-1">
                <label className="font-bold text-slate-800 dark:text-slate-200">
                  Reason for Rejection / Recount Instructions:
                </label>
                <textarea
                  rows={3}
                  value={rejectNotes}
                  onChange={(e) => setRejectNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setRejectModalRequest(null)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </DraggableResizableModal>
        )}
    </DraggableResizableModal>
  );
};
