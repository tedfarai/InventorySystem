import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PackageCheck,
  SlidersHorizontal,
  X,
  Package,
  ShieldAlert,
  Send,
  Edit3,
  Download,
  ListPlus,
  Plus,
} from 'lucide-react';
import { StockItem, StockAdjustmentRequest, AdminUser } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface StockItemContextMenuModalProps {
  isOpen: boolean;
  item: StockItem | null;
  selectedItems?: StockItem[];
  onClose: () => void;
  onQuickReceive: (items: StockItem[], mode: 'single' | 'bulkGrid') => void;
  onQuickIssue: (items: StockItem[]) => void;
  onQuickEdit: (item: StockItem) => void;
  onExportItem: (items: StockItem[]) => void;
  onQuickAdjust: (item: StockItem) => void;
  onBulkAdjustment?: (items: StockItem[]) => void;
  onBulkStockEdit?: (items: StockItem[]) => void;
  existingReceivingList?: { ItemID: string; ItemName?: string }[];
  existingIssueList?: { ItemID: string; ItemName?: string; RequestedQty?: number }[];
  existingEditList?: { ItemID: string; ItemName?: string }[];
  existingAdjustmentList?: { ItemID: string; ItemName?: string }[];
  onAddToList?: (targetProcess: 'receiving' | 'issue' | 'editing' | 'adjustment', items: StockItem[]) => void;
  adjustmentRequests?: StockAdjustmentRequest[];
  currentUser: AdminUser | null;
  position?: { x: number; y: number } | null;
}

export const StockItemContextMenuModal: React.FC<StockItemContextMenuModalProps> = ({
  isOpen,
  item,
  selectedItems = [],
  onClose,
  onQuickReceive,
  onQuickIssue,
  onQuickEdit,
  onExportItem,
  onQuickAdjust,
  onBulkAdjustment,
  onBulkStockEdit,
  existingReceivingList = [],
  existingIssueList = [],
  existingEditList = [],
  existingAdjustmentList = [],
  onAddToList,
  adjustmentRequests = [],
  currentUser,
  position,
}) => {
  if (!isOpen || !item) return null;

  // Active items in context: if multiple items are selected and include this item, treat all selected items as the target set
  const isMultipleSelected = selectedItems.length >= 2 && selectedItems.some((s) => s.ItemID === item.ItemID);
  const targetItems = isMultipleSelected ? selectedItems : [item];

  // Check if an existing adjustment request with status 'PENDING' is detected in the state
  const safeRequests = Array.isArray(adjustmentRequests) ? adjustmentRequests : [];
  const pendingAdjustmentInState = safeRequests.find((req) => req?.status === 'PENDING');
  const pendingAdjustmentForItem = safeRequests.find(
    (req) =>
      (req?.status === 'PENDING' || req?.status === 'TIMED_ACCESS_GRANTED') &&
      Array.isArray(req?.items) &&
      req.items.some((i) => i?.ItemID === item.ItemID)
  );

  // Check if current user has an unapproved pending adjustment
  const userHasPendingAdjustment = currentUser
    ? safeRequests.find(
        (r) => r?.requesterId === currentUser.IssuerID && r?.status === 'PENDING'
      )
    : undefined;

  // 'Add to Adjustment' option MUST be disabled if an existing adjustment request with status 'PENDING' is detected in the state
  const isAdjustmentDisabled = Boolean(pendingAdjustmentInState || pendingAdjustmentForItem || userHasPendingAdjustment);

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId={`stock-item-context-menu-${item.ItemID}`}
      initialWidth={Math.min(760, Math.max(380, Math.round(window.innerWidth * 0.70)))}
      initialHeight={Math.min(580, Math.max(320, Math.round(window.innerHeight * 0.60)))}
      initialPosition={position}
      minWidth={320}
      minHeight={180}
      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden m-auto"
    >
      {/* Header with Item Context */}
      <div
        data-drag-handle="true"
        className="p-3.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
            <Package className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-1.5 py-0.2 rounded">
                {item.ItemID}
              </span>
              <span className="text-[10px] font-bold uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {item.Category}
              </span>
              {isMultipleSelected && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 rounded font-mono">
                  {selectedItems.length} Selected
                </span>
              )}
            </div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {item.ItemName}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current Balances */}
      <div className="p-3 bg-white dark:bg-slate-900 space-y-2.5 flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] uppercase font-bold text-slate-400">Available Qty</span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {item.Qty} <span className="text-[10px] font-normal text-slate-500">{item.Unit}</span>
              </div>
            </div>
            <div className="p-2 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[9px] uppercase font-bold text-slate-400">Reorder Level</span>
              <div className="text-sm font-extrabold text-slate-900 dark:text-white mt-0.5">
                {item.ReorderLevel}{' '}
                <span className="text-[10px] font-normal text-slate-500">{item.Unit}</span>
              </div>
            </div>
          </div>

          {/* Active Lists Prompt (If any in-progress receiving, editing, or adjustment list exists) */}
          {(existingReceivingList.length > 0 ||
            existingIssueList.length > 0 ||
            existingEditList.length > 0 ||
            existingAdjustmentList.length > 0) && (
            <div className="p-3 bg-indigo-50/90 dark:bg-indigo-950/70 border border-indigo-300 dark:border-indigo-700/80 rounded-xl space-y-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950 dark:text-indigo-200">
                <ListPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span>Active Workflow Lists Detected</span>
              </div>
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-snug">
                Would you like to add <strong className="font-mono">[{item.ItemID}]</strong> to an existing active list?
              </p>

              <div className="grid grid-cols-1 gap-1.5 pt-0.5">
                {existingReceivingList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddToList?.('receiving', targetItems);
                    }}
                    className="w-full text-left p-2 bg-white dark:bg-slate-900 hover:bg-sky-50 dark:hover:bg-sky-950/80 border border-sky-300 dark:border-sky-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between group transition cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <PackageCheck className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                      <span className="truncate">Add to Receiving Manifest ({existingReceivingList.length} items)</span>
                    </span>
                    <Plus className="w-3.5 h-3.5 text-sky-600 group-hover:scale-125 transition-transform shrink-0 ml-1" />
                  </button>
                )}

                {existingIssueList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddToList?.('issue', targetItems);
                    }}
                    className="w-full text-left p-2 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between group transition cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Send className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">Add to Requisition Issue Cart ({existingIssueList.length} items)</span>
                    </span>
                    <Plus className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-125 transition-transform shrink-0 ml-1" />
                  </button>
                )}

                {existingEditList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddToList?.('editing', targetItems);
                    }}
                    className="w-full text-left p-2 bg-white dark:bg-slate-900 hover:bg-purple-50 dark:hover:bg-purple-950/80 border border-purple-300 dark:border-purple-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between group transition cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <Edit3 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                      <span className="truncate">Add to Batch Edit Selection ({existingEditList.length} items)</span>
                    </span>
                    <Plus className="w-3.5 h-3.5 text-purple-600 group-hover:scale-125 transition-transform shrink-0 ml-1" />
                  </button>
                )}

                {existingAdjustmentList.length > 0 && !isAdjustmentDisabled && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onAddToList?.('adjustment', targetItems);
                    }}
                    className="w-full text-left p-2 bg-white dark:bg-slate-900 hover:bg-amber-50 dark:hover:bg-amber-950/80 border border-amber-300 dark:border-amber-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between group transition cursor-pointer shadow-2xs"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Add to Adjustment Draft ({existingAdjustmentList.length} items)</span>
                    </span>
                    <Plus className="w-3.5 h-3.5 text-amber-600 group-hover:scale-125 transition-transform shrink-0 ml-1" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2 pt-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Quick Actions &amp; Direct Entry:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <button
                type="button"
                id={isMultipleSelected ? 'context-menu-bulk-receive' : 'context-menu-quick-receive'}
                title={isMultipleSelected ? 'Open interactive bulk stock grid entry' : `Receive stock for ${item.ItemID}`}
                onClick={() => {
                  onClose();
                  onQuickReceive(targetItems, isMultipleSelected ? 'bulkGrid' : 'single');
                }}
                className="min-h-[76px] p-2 rounded-xl border border-sky-200 dark:border-sky-800 bg-white dark:bg-slate-800/90 hover:bg-sky-50 dark:hover:bg-sky-950/50 text-sky-700 dark:text-sky-300 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
              >
                <PackageCheck className="w-5 h-5" />
                <span>{isMultipleSelected ? 'Bulk Receive' : 'Receive'}</span>
              </button>
              <button
                type="button"
                id={isMultipleSelected ? 'context-menu-bulk-issue' : 'context-menu-quick-issue'}
                title={isMultipleSelected ? 'Create an issue request for selected items' : `Issue ${item.ItemID}`}
                onClick={() => {
                  onClose();
                  onQuickIssue(targetItems);
                }}
                className="min-h-[76px] p-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-800/90 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
              >
                <Send className="w-5 h-5" />
                <span>{isMultipleSelected ? 'Bulk Issue' : 'Issue Out'}</span>
              </button>
              <button
                type="button"
                id={isMultipleSelected ? 'context-menu-bulk-stock-edit' : 'context-menu-quick-edit'}
                title={isMultipleSelected ? `Edit ${targetItems.length} selected items` : `Edit ${item.ItemID}`}
                onClick={() => {
                  onClose();
                  if (isMultipleSelected && onBulkStockEdit) onBulkStockEdit(targetItems);
                  else onQuickEdit(item);
                }}
                className="min-h-[76px] p-2 rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800/90 hover:bg-purple-50 dark:hover:bg-purple-950/50 text-purple-700 dark:text-purple-300 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
              >
                <Edit3 className="w-5 h-5" />
                <span>{isMultipleSelected ? 'Bulk Edit' : 'Edit Item'}</span>
              </button>
              <button
                type="button"
                id="context-menu-export-item"
                title={isMultipleSelected ? 'Export selected items to CSV' : `Export ${item.ItemID} to CSV`}
                onClick={() => {
                  onClose();
                  onExportItem(targetItems);
                }}
                className="min-h-[76px] p-2 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-slate-800/90 hover:bg-teal-50 dark:hover:bg-teal-950/50 text-teal-700 dark:text-teal-300 flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition cursor-pointer"
              >
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                id={isMultipleSelected ? 'context-menu-bulk-request-adjustment' : 'context-menu-add-adjustment'}
                disabled={isAdjustmentDisabled}
                title={isAdjustmentDisabled ? 'A pending adjustment request already exists' : 'Open stock adjustment workflow'}
                onClick={() => {
                  if (isAdjustmentDisabled) return;
                  onClose();
                  if (isMultipleSelected && onBulkAdjustment) onBulkAdjustment(targetItems);
                  else onQuickAdjust(item);
                }}
                className={`min-h-[76px] p-2 rounded-xl border flex flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition ${
                  isAdjustmentDisabled
                    ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed opacity-60'
                    : 'bg-white dark:bg-slate-800/90 hover:bg-amber-50 dark:hover:bg-amber-950/50 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 cursor-pointer'
                }`}
              >
                <SlidersHorizontal className="w-5 h-5" />
                <span>{isMultipleSelected ? 'Bulk Adjust' : 'Adjust Stock'}</span>
              </button>
            </div>
            {isAdjustmentDisabled && (
              <div className="p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 rounded-lg text-[10px] text-amber-800 dark:text-amber-200 flex items-start gap-1.5">
                <ShieldAlert className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>An active pending stock adjustment request prevents another adjustment.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition"
          >
            Dismiss
          </button>
        </div>
    </DraggableResizableModal>
  );
};
