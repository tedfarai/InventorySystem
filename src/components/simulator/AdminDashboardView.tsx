import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  XCircle,
  Zap,
  SlidersHorizontal,
  Search,
  Filter,
  Users,
  Eye,
  Check,
  Send,
  AlertTriangle,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  FileSpreadsheet,
  Package,
  Layers,
  Crown,
  FileCheck,
  ShieldCheck,
  Info,
} from 'lucide-react';
import {
  StockAdjustmentRequest,
  StockAdjustmentRequestItem,
  TimedAccessWindow,
  AdminUser,
} from '../../types';
import { VisualCountdownTimer } from './VisualCountdownTimer';

interface AdminDashboardViewProps {
  currentUser: AdminUser | null;
  adjustmentRequests: StockAdjustmentRequest[];
  activeTimedWindow: TimedAccessWindow | null;
  onApproveAndExecuteRequest: (requestId: string, adminNotes: string) => void;
  onGrantTimedAccess: (requestId: string, durationMinutes: number, adminNotes: string) => void;
  onRevokeTimedAccess: (requestId: string) => void;
  onRejectRequest: (requestId: string, adminNotes: string) => void;
  onOpenModalHub?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  currentUser,
  adjustmentRequests,
  activeTimedWindow,
  onApproveAndExecuteRequest,
  onGrantTimedAccess,
  onRevokeTimedAccess,
  onRejectRequest,
  onOpenModalHub,
}) => {
  const [selectedRequestId, setSelectedRequestId] = useState<string>(
    adjustmentRequests.find((r) => r.status === 'PENDING')?.id || adjustmentRequests[0]?.id || ''
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'TIMED_ACCESS_GRANTED' | 'APPROVED_AND_EXECUTED' | 'REJECTED' | 'EXPIRED'>('ALL');
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [timedDurationMinutes, setTimedDurationMinutes] = useState<number>(15);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';

  // Metrics
  const safeAdjustmentRequests = Array.isArray(adjustmentRequests) ? adjustmentRequests : [];
  const pendingCount = safeAdjustmentRequests.filter((r) => r?.status === 'PENDING').length;
  const timedAccessCount = safeAdjustmentRequests.filter((r) => r?.status === 'TIMED_ACCESS_GRANTED').length;
  const executedCount = safeAdjustmentRequests.filter((r) => r?.status === 'APPROVED_AND_EXECUTED').length;
  const totalItemsCount = safeAdjustmentRequests.reduce((sum, r) => sum + (Array.isArray(r?.items) ? r.items.length : 0), 0);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return safeAdjustmentRequests.filter((req) => {
      if (!req) return false;
      const matchesSearch =
        (req.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requesterName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requesterId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (req.requestTitle || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (Array.isArray(req.items) && req.items.some((it) => (it?.ItemID || '').toLowerCase().includes(searchQuery.toLowerCase()) || (it?.ItemName || '').toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesStatus = statusFilter === 'ALL' || req.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [safeAdjustmentRequests, searchQuery, statusFilter]);

  const selectedRequest = useMemo(() => {
    return safeAdjustmentRequests.find((r) => r && r.id === selectedRequestId) || filteredRequests[0] || null;
  }, [safeAdjustmentRequests, selectedRequestId, filteredRequests]);

  const handleApprove = (reqId: string) => {
    onApproveAndExecuteRequest(reqId, adminNotesInput.trim() || 'Directly approved and executed by Superior Admin Rachel Pickard');
    setActionFeedback(`Request #${reqId} approved & executed! Master_Stock updated, signed PDF voucher created.`);
    setAdminNotesInput('');
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleGrantAccess = (reqId: string) => {
    onGrantTimedAccess(
      reqId,
      timedDurationMinutes,
      adminNotesInput.trim() || `Granted ${timedDurationMinutes} minute timed access window.`
    );
    setActionFeedback(`Granted ${timedDurationMinutes} minutes timed access for #${reqId}.`);
    setAdminNotesInput('');
    setTimeout(() => setActionFeedback(null), 4500);
  };

  const handleReject = (reqId: string) => {
    onRejectRequest(reqId, adminNotesInput.trim() || 'Request returned / rejected by Superior Admin.');
    setActionFeedback(`Request #${reqId} rejected.`);
    setAdminNotesInput('');
    setTimeout(() => setActionFeedback(null), 4500);
  };

  return (
    <div className="space-y-4">
      {/* Superior Admin Badge & Title Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-100">
                Superior Admin Adjustment Management Hub & Authorization Console
              </h2>
              <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-800">
                Rachel Pickard (ADM001) Clearance
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Review staff physical stock discrepancies, 1-click authorize & execute directly to Master_Stock, or grant custom timed access windows.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenModalHub && (
            <button
              onClick={onOpenModalHub}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-lg shadow-xs transition flex items-center space-x-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Full Modal Hub</span>
            </button>
          )}
          <div className="text-xs font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-emerald-300">
            Active: <strong>{currentUser?.IssuerName || 'Rachel Pickard'}</strong>
          </div>
        </div>
      </div>

      {/* Active Timed Access Live Monitor */}
      {activeTimedWindow && activeTimedWindow.isActive && (
        <VisualCountdownTimer
          timedWindow={activeTimedWindow}
          onExpire={() => onRevokeTimedAccess(selectedRequestId)}
        />
      )}

      {/* Action Notification Message */}
      {actionFeedback && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 4 Summary Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 uppercase font-mono">Pending Requests</span>
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
          </div>
          <div className="text-xl font-bold text-amber-600 dark:text-amber-400 font-mono mt-1">
            {pendingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Awaiting authorization</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Active Timed Access</div>
          <div className="text-xl font-bold text-purple-600 dark:text-purple-400 font-mono mt-1">
            {timedAccessCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Sessions granted</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Directly Executed</div>
          <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-1">
            {executedCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Reconciled to Master_Stock</div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl shadow-xs">
          <div className="text-[10px] font-bold text-slate-500 uppercase font-mono">Total Items in Requests</div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100 font-mono mt-1">
            {totalItemsCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Physical items audited</div>
        </div>
      </div>

      {/* Split Pane: Request Selection Table (Left) + Detailed Inspector & Action Console (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT PANE: Requests Table Queue (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          
          {/* Search & Filter Header */}
          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by ID, staff, item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {(['ALL', 'PENDING', 'TIMED_ACCESS_GRANTED', 'APPROVED_AND_EXECUTED', 'REJECTED'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition font-mono ${
                    statusFilter === st
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {st === 'TIMED_ACCESS_GRANTED' ? 'TIMED ACCESS' : st === 'APPROVED_AND_EXECUTED' ? 'EXECUTED' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Request List Queue */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs divide-y divide-slate-200 dark:divide-slate-800 max-h-[580px] overflow-y-auto">
            {filteredRequests.map((req) => {
              const isSelected = req.id === selectedRequestId;
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

              return (
                <div
                  key={req.id}
                  onClick={() => setSelectedRequestId(req.id)}
                  className={`p-3 cursor-pointer transition text-xs space-y-1.5 ${
                    isSelected
                      ? 'bg-amber-500/10 dark:bg-amber-950/40 border-l-4 border-amber-500'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                      {req.id}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${statusBadgeColor}`}>
                      {req.status === 'APPROVED_AND_EXECUTED'
                        ? 'EXECUTED'
                        : req.status === 'TIMED_ACCESS_GRANTED'
                        ? 'TIMED ACCESS'
                        : req.status}
                    </span>
                  </div>

                  <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {req.requestTitle}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>By: {req.requesterName} ({req.requesterId})</span>
                    <span>{req.items.length} Items</span>
                  </div>
                </div>
              );
            })}

            {filteredRequests.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic text-xs">
                No adjustment requests match current search/filter.
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Request Detail Inspector & 1-Click Action Console (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {selectedRequest ? (
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-xs">
              
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                      {selectedRequest.id}
                    </span>
                    <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded text-[10px] font-mono font-bold border border-amber-300">
                      {selectedRequest.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {selectedRequest.requestTitle}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Requester: <strong>{selectedRequest.requesterName}</strong> ({selectedRequest.requesterId}) • Submitted: {selectedRequest.createdAt}
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <div className="text-slate-500 text-[10px] uppercase">Batch Scope:</div>
                  <div className="font-bold text-amber-600 dark:text-amber-400">{selectedRequest.items.length} Stock Items</div>
                </div>
              </div>

              {/* Items Breakdown Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between">
                  <span>Itemized Physical Count vs System Stock:</span>
                  <span className="font-mono text-[10px] text-slate-500">{selectedRequest.items.length} Items Listed</span>
                </div>

                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2">Item</th>
                      <th className="p-2 text-right">System</th>
                      <th className="p-2 text-right">Count</th>
                      <th className="p-2 text-right">Variance</th>
                      <th className="p-2">Reason & Ref</th>
                      <th className="p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {selectedRequest.items.map((it) => (
                      <tr key={it.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-2">
                          <strong className="text-slate-900 dark:text-slate-100">{it.ItemID}</strong>
                          <div className="text-[10px] text-slate-500 font-sans">{it.ItemName}</div>
                        </td>
                        <td className="p-2 text-right text-slate-600 dark:text-slate-400">{it.CurrentSystemQty} {it.Unit}</td>
                        <td className="p-2 text-right font-bold text-amber-600 dark:text-amber-400">{it.ProposedPhysicalQty} {it.Unit}</td>
                        <td className="p-2 text-right font-bold">
                          {it.VarianceQty < 0 ? (
                            <span className="text-red-600">{it.VarianceQty}</span>
                          ) : it.VarianceQty > 0 ? (
                            <span className="text-emerald-600">+{it.VarianceQty}</span>
                          ) : (
                            <span className="text-teal-600">0</span>
                          )}
                        </td>
                        <td className="p-2 text-[10px] font-sans">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{it.ReasonLabel}</div>
                          <div className="font-mono text-slate-400">{it.CountRef}</div>
                        </td>
                        <td className="p-2 text-[10px] font-sans text-slate-500">{it.Notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Superior Admin Action Console */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center space-x-2">
                  <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Superior Admin Execution Console (Rachel Pickard)
                  </h4>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase font-mono">
                    Superior Admin Audit Remarks / Voucher Notes:
                  </label>
                  <input
                    type="text"
                    value={adminNotesInput}
                    onChange={(e) => setAdminNotesInput(e.target.value)}
                    placeholder="Enter approval remarks, voucher sign-off notes, or rejection reason..."
                    className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs"
                  />
                </div>

                {/* Main Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  
                  {/* Action 1: 1-Click Authorize & Execute to Master_Stock */}
                  <button
                    type="button"
                    onClick={() => handleApprove(selectedRequest.id)}
                    disabled={selectedRequest.status === 'APPROVED_AND_EXECUTED'}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>1-Click Authorize & Execute Directly</span>
                  </button>

                  {/* Action 2: Grant Custom Timed Access */}
                  <div className="flex space-x-1">
                    <select
                      value={timedDurationMinutes}
                      onChange={(e) => setTimedDurationMinutes(Number(e.target.value))}
                      className="px-2 py-1.5 bg-white dark:bg-slate-900 border border-purple-500 rounded-xl text-xs font-bold font-mono text-purple-700 dark:text-purple-300"
                    >
                      <option value={10}>10 Min</option>
                      <option value={15}>15 Min</option>
                      <option value={30}>30 Min</option>
                      <option value={45}>45 Min</option>
                      <option value={60}>60 Min</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => handleGrantAccess(selectedRequest.id)}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-1"
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Grant Timed Access</span>
                    </button>
                  </div>
                </div>

                {/* Secondary Actions: Reject / Revoke */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
                  {selectedRequest.status === 'TIMED_ACCESS_GRANTED' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onRevokeTimedAccess(selectedRequest.id);
                        setActionFeedback(`Revoked timed access for #${selectedRequest.id}`);
                        setTimeout(() => setActionFeedback(null), 3000);
                      }}
                      className="text-amber-600 hover:text-amber-800 font-bold hover:underline"
                    >
                      Revoke Timed Access Session
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">
                      Standard workflow: 1-Click execution signs PDF voucher & writes Movement Logs.
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleReject(selectedRequest.id)}
                    disabled={selectedRequest.status === 'APPROVED_AND_EXECUTED'}
                    className="text-rose-600 hover:text-rose-800 font-bold text-xs hover:underline disabled:opacity-40"
                  >
                    Reject / Return Request
                  </button>
                </div>
              </div>

              {/* Status History Notes if any */}
              {selectedRequest.superiorAdminNotes && (
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 rounded-xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200">
                  <div className="font-bold flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    <span>Superior Admin Review Remarks:</span>
                  </div>
                  <div className="mt-1 pl-5">
                    {selectedRequest.superiorAdminNotes}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 italic text-xs">
              Select a stock adjustment request from the left queue to view details and execute.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
