import React, { useState, useMemo } from 'react';
import {
  Send,
  Building2,
  UserCheck,
  User,
  Mail,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Minus,
  Plus,
  Loader2,
  FileText,
  Layers,
} from 'lucide-react';
import { StockItem, Department, Manager, IssueCartItem } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface BulkIssueVoucherModalProps {
  isOpen?: boolean;
  selectedItems: StockItem[];
  allStockItems?: StockItem[];
  departments: Department[];
  managers?: Manager[];
  issuerId: string;
  issuerName: string;
  onConfirmExecute: (
    dept: Department,
    cart: IssueCartItem[],
    customSivRef?: string
  ) => void | Promise<void>;
  onClose: () => void;
}

interface EditableIssueRow {
  ItemID: string;
  ItemName: string;
  Category: StockItem['Category'];
  Unit: string;
  AvailableQty: number;
  RequestedQty: number;
}

export const BulkIssueVoucherModal: React.FC<BulkIssueVoucherModalProps> = ({
  isOpen = true,
  selectedItems,
  allStockItems = [],
  departments,
  managers = [],
  issuerId,
  issuerName,
  onConfirmExecute,
  onClose,
}) => {
  const [recipientType, setRecipientType] = useState<'department' | 'manager'>('department');
  const [selectedDeptId, setSelectedDeptId] = useState<string>(departments[0]?.DeptID || '');
  const [selectedManagerId, setSelectedManagerId] = useState<string>(managers[0]?.ManagerID || '');
  const [sivRef, setSivRef] = useState<string>(
    () => `SIV-${Math.floor(100000 + Math.random() * 900000)}`
  );
  const [batchQtyInput, setBatchQtyInput] = useState<string>('1');
  const [addItemId, setAddItemId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [rows, setRows] = useState<EditableIssueRow[]>(() =>
    selectedItems.map((item) => ({
      ItemID: item.ItemID,
      ItemName: item.ItemName,
      Category: item.Category,
      Unit: item.Unit || 'Units',
      AvailableQty: item.Qty || 0,
      RequestedQty: item.Qty > 0 ? 1 : 0,
    }))
  );

  const selectedDept = useMemo(() => {
    if (recipientType === 'manager') {
      const mgr = managers.find((m) => m.ManagerID === selectedManagerId) || managers[0];
      if (!mgr) return null;
      return {
        DeptID: mgr.ManagerID,
        DeptName: `${mgr.ManagerName} (Manager Direct)`,
        DeptHeadName: mgr.ManagerName,
        DeptHeadEmail: mgr.Email,
      } as Department;
    }
    return (
      departments.find((d) => d.DeptID === selectedDeptId) ||
      departments[0] || {
        DeptID: 'DEP01',
        DeptName: 'General Stores Requisition',
        DeptHeadName: 'Department Head',
        DeptHeadEmail: 'stores@paramount.co.zw',
      }
    );
  }, [recipientType, selectedDeptId, selectedManagerId, departments, managers]);

  const availableToAdd = useMemo(() => {
    const existingIds = new Set(rows.map((r) => r.ItemID));
    return allStockItems.filter((item) => !existingIds.has(item.ItemID) && item.Qty > 0);
  }, [allStockItems, rows]);

  const zeroStockRows = useMemo(
    () => rows.filter((r) => r.AvailableQty <= 0),
    [rows]
  );

  const validRows = useMemo(
    () => rows.filter((r) => r.AvailableQty > 0 && r.RequestedQty > 0 && r.RequestedQty <= r.AvailableQty),
    [rows]
  );

  const invalidQtyRows = useMemo(
    () => rows.filter((r) => r.AvailableQty > 0 && (r.RequestedQty <= 0 || r.RequestedQty > r.AvailableQty)),
    [rows]
  );

  const totalUnitsToIssue = useMemo(
    () => validRows.reduce((sum, r) => sum + r.RequestedQty, 0),
    [validRows]
  );

  const handleUpdateQty = (itemId: string, nextQty: number) => {
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((row) => {
        if (row.ItemID !== itemId) return row;
        const clamped = Math.max(0, Math.min(row.AvailableQty, Math.floor(nextQty || 0)));
        return { ...row, RequestedQty: clamped };
      })
    );
  };

  const handleRemoveRow = (itemId: string) => {
    setErrorMsg(null);
    setRows((prev) => prev.filter((row) => row.ItemID !== itemId));
  };

  const handleRemoveZeroStock = () => {
    setErrorMsg(null);
    setRows((prev) => prev.filter((row) => row.AvailableQty > 0));
  };

  const handleApplyBatchQty = () => {
    const parsed = parseInt(batchQtyInput, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    setErrorMsg(null);
    setRows((prev) =>
      prev.map((row) =>
        row.AvailableQty > 0
          ? { ...row, RequestedQty: Math.min(row.AvailableQty, parsed) }
          : row
      )
    );
  };

  const handleAppendItem = () => {
    if (!addItemId) return;
    const item = allStockItems.find((s) => s.ItemID === addItemId);
    if (!item) return;
    setRows((prev) => [
      ...prev,
      {
        ItemID: item.ItemID,
        ItemName: item.ItemName,
        Category: item.Category,
        Unit: item.Unit || 'Units',
        AvailableQty: item.Qty || 0,
        RequestedQty: item.Qty > 0 ? 1 : 0,
      },
    ]);
    setAddItemId('');
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setErrorMsg(null);

    if (!selectedDept) {
      setErrorMsg('Please select a target Department or Manager for this Stock Issue Voucher.');
      return;
    }

    if (zeroStockRows.length > 0) {
      setErrorMsg(
        `${zeroStockRows.length} selected item(s) have 0 stock available. Remove out-of-stock items before issuing.`
      );
      return;
    }

    if (invalidQtyRows.length > 0 || validRows.length === 0) {
      setErrorMsg('Please ensure every item has a valid positive issue quantity within available stock.');
      return;
    }

    const finalCart: IssueCartItem[] = validRows.map((r) => ({
      ItemID: r.ItemID,
      ItemName: r.ItemName,
      Category: r.Category,
      AvailableQty: r.AvailableQty,
      RequestedQty: r.RequestedQty,
      Qty: r.RequestedQty,
    }));

    setIsSubmitting(true);
    try {
      await onConfirmExecute(selectedDept, finalCart, sivRef.trim() || undefined);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unable to generate combined Stock Issue Voucher (SIV).');
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="bulk-issue-voucher-modal"
      initialWidth={860}
      className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-blue-600/80 w-full max-w-4xl overflow-hidden my-auto flex flex-col"
    >
      {/* Modal Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400">
            <Send className="w-4 h-4" />
          </div>
          <div>
            <span className="font-mono text-xs font-bold tracking-wide text-slate-100 block">
              Bulk Issue — Single Combined Stock Issue Voucher (SIV)
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              Issue multiple selected inventory lines to a department on 1 combined SIV PDF
            </span>
          </div>
        </div>
        {!isSubmitting && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-slate-800 cursor-pointer"
            aria-label="Close bulk issue modal"
          >
            ✕
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 text-xs font-medium flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            {zeroStockRows.length > 0 && (
              <button
                type="button"
                onClick={handleRemoveZeroStock}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
              >
                Remove 0-Stock Items
              </button>
            )}
          </div>
        )}

        {/* Section 1: Target Department & SIV Metadata */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              {recipientType === 'department' ? (
                <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              ) : (
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              )}
              <span>1. Select Recipient Department &amp; SIV Reference</span>
            </span>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setRecipientType('department')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                  recipientType === 'department'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Building2 className="w-3 h-3" />
                <span>Department</span>
              </button>
              {managers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRecipientType('manager')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    recipientType === 'manager'
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <UserCheck className="w-3 h-3" />
                  <span>Manager Direct</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                {recipientType === 'department' ? 'Target Department' : 'Authorized Manager'}
              </label>
              {recipientType === 'department' ? (
                <select
                  id="bulk-issue-dept-select"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
                >
                  {departments.map((d) => (
                    <option key={d.DeptID} value={d.DeptID}>
                      [{d.DeptID}] {d.DeptName}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  id="bulk-issue-manager-select"
                  value={selectedManagerId}
                  onChange={(e) => setSelectedManagerId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                >
                  {managers.map((m) => (
                    <option key={m.ManagerID} value={m.ManagerID}>
                      [{m.ManagerID}] {m.ManagerName}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                SIV Voucher Ref
              </label>
              <input
                id="bulk-issue-siv-ref"
                type="text"
                value={sivRef}
                onChange={(e) => setSivRef(e.target.value)}
                placeholder="SIV-XXXXXX"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-700 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Authorized Issuer
              </label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                {issuerName} ({issuerId})
              </div>
            </div>
          </div>

          {selectedDept && (
            <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Recipient Head: <strong className="text-slate-800 dark:text-slate-200">{selectedDept.DeptHeadName}</strong>
                </span>
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{selectedDept.DeptHeadEmail}</span>
              </span>
              <span className="ml-auto font-mono text-[10.5px] text-slate-400">
                Timestamp: {nowStr}
              </span>
            </div>
          )}
        </div>

        {/* Section 2: Interactive Multi-Item Issue Manifest */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                2. Combined SIV Line Items ({rows.length})
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Quick Set All Qty helper */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Set all qty:</span>
                <input
                  type="number"
                  min={1}
                  value={batchQtyInput}
                  onChange={(e) => setBatchQtyInput(e.target.value)}
                  className="w-12 px-1.5 py-0.5 text-center font-mono text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleApplyBatchQty}
                  className="px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-bold rounded transition cursor-pointer"
                >
                  Apply
                </button>
              </div>

              {availableToAdd.length > 0 && (
                <div className="flex items-center gap-1">
                  <select
                    value={addItemId}
                    onChange={(e) => setAddItemId(e.target.value)}
                    className="max-w-[200px] px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-[11px] text-slate-800 dark:text-slate-200"
                    aria-label="Add additional stock item to bulk issue"
                  >
                    <option value="">+ Add another item...</option>
                    {availableToAdd.map((item) => (
                      <option key={item.ItemID} value={item.ItemID}>
                        [{item.ItemID}] {item.ItemName} ({item.Qty} {item.Unit})
                      </option>
                    ))}
                  </select>
                  {addItemId && (
                    <button
                      type="button"
                      onClick={handleAppendItem}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      Add
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-500 dark:text-slate-400">
              No items remaining in this Bulk Issue batch. Use the selector above to add an item or close this dialog.
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[10px] uppercase border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                  <tr>
                    <th className="p-2.5">SKU</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5 text-right">Available</th>
                    <th className="p-2.5 text-center w-36">Issue Qty</th>
                    <th className="p-2.5 text-right">Balance After</th>
                    <th className="p-2.5 text-center w-14">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {rows.map((row) => {
                    const isOut = row.AvailableQty <= 0;
                    const balanceAfter = Math.max(0, row.AvailableQty - row.RequestedQty);
                    return (
                      <tr
                        key={row.ItemID}
                        className={
                          isOut
                            ? 'bg-rose-50/70 dark:bg-rose-950/30'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }
                      >
                        <td className="p-2.5 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {row.ItemID}
                        </td>
                        <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                          {row.ItemName}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {row.Category}
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums whitespace-nowrap">
                          {isOut ? (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">0 (Out of Stock)</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              {row.AvailableQty} {row.Unit}
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <div className="inline-flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                            <button
                              type="button"
                              disabled={isOut || row.RequestedQty <= 1}
                              onClick={() => handleUpdateQty(row.ItemID, row.RequestedQty - 1)}
                              className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                              aria-label={`Decrease quantity for ${row.ItemName}`}
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <input
                              type="number"
                              min={isOut ? 0 : 1}
                              max={row.AvailableQty}
                              disabled={isOut}
                              value={row.RequestedQty}
                              onChange={(e) => handleUpdateQty(row.ItemID, parseInt(e.target.value, 10))}
                              className="w-14 text-center py-1 text-xs font-mono font-bold tabular-nums bg-transparent text-slate-900 dark:text-slate-100 focus:outline-none"
                              aria-label={`Issue quantity for ${row.ItemName}`}
                            />
                            <button
                              type="button"
                              disabled={isOut || row.RequestedQty >= row.AvailableQty}
                              onClick={() => handleUpdateQty(row.ItemID, row.RequestedQty + 1)}
                              className="px-2 py-1 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer"
                              aria-label={`Increase quantity for ${row.ItemName}`}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {balanceAfter} {row.Unit}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.ItemID)}
                            disabled={isSubmitting}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition cursor-pointer"
                            title={`Remove ${row.ItemName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Consolidated Voucher Summary Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-700 dark:text-slate-300">
              Consolidates <strong className="text-slate-900 dark:text-slate-100 tabular-nums">{validRows.length}</strong> stock line(s)
              {' '}totaling <strong className="text-blue-700 dark:text-blue-300 font-mono tabular-nums">{totalUnitsToIssue}</strong> unit(s) into{' '}
              <strong>1 combined SIV</strong> for{' '}
              <strong className="text-slate-900 dark:text-slate-100">{selectedDept?.DeptName || 'Selected Department'}</strong>.
            </span>
          </div>
          <span className="font-mono text-[11px] font-bold text-blue-700 dark:text-blue-300">
            Ref: {sivRef}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-900 px-5 py-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <button
          type="button"
          onClick={onClose}
          disabled={isSubmitting}
          className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>

        <button
          id="btn-confirm-generate-combined-siv"
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting || validRows.length === 0 || zeroStockRows.length > 0 || invalidQtyRows.length > 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Combined SIV...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Generate Single Combined SIV ({validRows.length} Items)</span>
            </>
          )}
        </button>
      </div>
    </DraggableResizableModal>
  );
};
