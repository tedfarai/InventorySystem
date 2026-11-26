import React from 'react';
import {
  PackageCheck,
  SlidersHorizontal,
  X,
  Package,
  ShieldAlert,
  Send,
  Edit3,
  Download,
  Plus,
  Move,
  ArrowRight,
  Lock,
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
}) => {
  if (!isOpen || !item) return null;

  const isMultipleSelected = selectedItems.length >= 2 && selectedItems.some((s) => s.ItemID === item.ItemID);
  const targetItems = isMultipleSelected ? selectedItems : [item];

  const safeRequests = Array.isArray(adjustmentRequests) ? adjustmentRequests : [];
  const pendingAdjustmentInState = safeRequests.find((req) => req?.status === 'PENDING');
  const pendingAdjustmentForItem = safeRequests.find(
    (req) =>
      (req?.status === 'PENDING' || req?.status === 'TIMED_ACCESS_GRANTED') &&
      Array.isArray(req?.items) &&
      req.items.some((i) => i?.ItemID === item.ItemID)
  );

  const userHasPendingAdjustment = currentUser
    ? safeRequests.find((r) => r?.requesterId === currentUser.IssuerID && r?.status === 'PENDING')
    : undefined;

  const isAdjustmentDisabled = Boolean(pendingAdjustmentInState || pendingAdjustmentForItem || userHasPendingAdjustment);

  const hasActiveWorkflowLists =
    existingReceivingList.length > 0 ||
    existingIssueList.length > 0 ||
    existingEditList.length > 0 ||
    (existingAdjustmentList.length > 0 && !isAdjustmentDisabled);

  const viewportW = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportH = typeof window !== 'undefined' ? window.innerHeight : 768;
  const modalWidth = Math.min(396, Math.max(320, viewportW - 24));
  const modalHeight = Math.min(hasActiveWorkflowLists ? 580 : 495, Math.max(320, viewportH - 24));

  return (
    <DraggableResizableModal
      isOpen={isOpen}
      onClose={onClose}
      modalId={`stock-item-context-menu-${item.ItemID}`}
      aria-label={`Quick actions for ${item.ItemName}`}
      initialWidth={modalWidth}
      initialHeight={modalHeight}
      initialPosition={null}
      minWidth={320}
      minHeight={300}
      showControls={false}
      className="w-full bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-xs font-sans text-slate-800 dark:text-slate-200"
    >
      <div className="flex flex-col h-full min-h-0 p-3 sm:p-4">
        {/* Draggable Header (matches Table View Options styling) */}
        <div
          data-drag-handle="true"
          className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200 dark:border-slate-800 cursor-grab active:cursor-grabbing select-none shrink-0"
          title="Drag header to move popup anywhere on screen"
        >
          <div className="flex items-center space-x-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-slate-900 dark:text-white text-xs truncate">
                {item.ItemName}
              </h4>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400 font-mono truncate">
                {item.ItemID} · {item.Category}
                {isMultipleSelected ? ` · ${selectedItems.length} selected` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 shrink-0 ml-2">
            <span
              className="hidden sm:inline-flex items-center text-[10px] text-slate-400 dark:text-slate-500 pr-1 pointer-events-none"
              aria-hidden="true"
            >
              <Move className="w-3.5 h-3.5" />
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Close quick actions"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-0.5">
          {/* Compact Stock Snapshot */}
          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Available Qty
                </span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {item.Qty}{' '}
                  <span className="text-[10.5px] font-sans font-normal text-slate-500 dark:text-slate-400">
                    {item.Unit}
                  </span>
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Reorder Level
                </span>
                <span className="text-sm font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {item.ReorderLevel}{' '}
                  <span className="text-[10.5px] font-sans font-normal text-slate-500 dark:text-slate-400">
                    {item.Unit}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Rows (mirrors Table View Options row structure) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Quick Actions:</span>
              <span className="text-[9px] font-normal lowercase text-slate-400">click to open</span>
            </div>

            {/* 1. Receive */}
            <button
              type="button"
              id={isMultipleSelected ? 'context-menu-bulk-receive' : 'context-menu-quick-receive'}
              title={isMultipleSelected ? 'Open interactive bulk stock grid entry' : `Receive stock for ${item.ItemID}`}
              onClick={() => {
                onClose();
                onQuickReceive(targetItems, isMultipleSelected ? 'bulkGrid' : 'single');
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition select-none text-left group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                    {isMultipleSelected ? 'Bulk Receive' : 'Receive'}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isMultipleSelected
                      ? `Receive ${targetItems.length} selected items (BRV)`
                      : 'Record incoming delivery (GRN)'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
            </button>

            {/* 2. Issue Out */}
            <button
              type="button"
              id={isMultipleSelected ? 'context-menu-bulk-issue' : 'context-menu-quick-issue'}
              title={isMultipleSelected ? 'Create an issue request for selected items' : `Issue ${item.ItemID}`}
              onClick={() => {
                onClose();
                onQuickIssue(targetItems);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition select-none text-left group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Send className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                    {isMultipleSelected ? 'Bulk Issue' : 'Issue Out'}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isMultipleSelected
                      ? `Issue ${targetItems.length} selected items (SIV)`
                      : 'Dispatch stock to a department (SIV)'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
            </button>

            {/* 3. Edit Item */}
            <button
              type="button"
              id={isMultipleSelected ? 'context-menu-bulk-stock-edit' : 'context-menu-quick-edit'}
              title={isMultipleSelected ? `Edit ${targetItems.length} selected items` : `Edit ${item.ItemID}`}
              onClick={() => {
                onClose();
                if (isMultipleSelected && onBulkStockEdit) onBulkStockEdit(targetItems);
                else onQuickEdit(item);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition select-none text-left group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                    {isMultipleSelected ? 'Bulk Edit' : 'Edit Item'}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isMultipleSelected
                      ? `Batch update ${targetItems.length} selected items`
                      : 'Update item name, pricing, and threshold'}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
            </button>

            {/* 4. Export CSV */}
            <button
              type="button"
              id="context-menu-export-item"
              title={isMultipleSelected ? 'Export selected items to CSV' : `Export ${item.ItemID} to CSV`}
              onClick={() => {
                onClose();
                onExportItem(targetItems);
              }}
              className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition select-none text-left group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 shrink-0">
                  <Download className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                    Export CSV
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isMultipleSelected
                      ? `Download ${targetItems.length} selected rows as CSV`
                      : `Download ${item.ItemID} stock details as CSV`}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
            </button>

            {/* 5. Adjust Stock */}
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
              className={`w-full flex items-center justify-between p-2 rounded-xl border transition select-none text-left group ${
                isAdjustmentDisabled
                  ? 'bg-slate-100/70 dark:bg-slate-950/60 border-dashed border-slate-300 dark:border-slate-800 opacity-60 cursor-not-allowed'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer'
              }`}
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-900 dark:text-white block truncate">
                    {isMultipleSelected ? 'Bulk Adjust' : 'Adjust Stock'}
                  </span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {isAdjustmentDisabled
                      ? 'Locked while pending adjustment is active'
                      : 'Record physical count & variance adjustment'}
                  </p>
                </div>
              </div>
              {isAdjustmentDisabled ? (
                <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition shrink-0 ml-2" />
              )}
            </button>
          </div>

          {/* Pending Adjustment Notice */}
          {isAdjustmentDisabled && (
            <div className="p-2 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800/80 rounded-xl text-[10.5px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>An active pending stock adjustment request prevents another adjustment.</span>
            </div>
          )}

          {/* Active Workflow Lists (when queues already exist) */}
          {hasActiveWorkflowLists && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Add To Active List:</span>
                <span className="text-[9px] font-normal lowercase text-slate-400">in progress</span>
              </div>

              {existingReceivingList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddToList?.('receiving', targetItems);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 cursor-pointer transition select-none text-left group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
                      <PackageCheck className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      Receiving Manifest ({existingReceivingList.length})
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 ml-2" />
                </button>
              )}

              {existingIssueList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddToList?.('issue', targetItems);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 cursor-pointer transition select-none text-left group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                      <Send className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      Issue Requisition Cart ({existingIssueList.length})
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 ml-2" />
                </button>
              )}

              {existingEditList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddToList?.('editing', targetItems);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 cursor-pointer transition select-none text-left group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 shrink-0">
                      <Edit3 className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      Batch Edit Selection ({existingEditList.length})
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0 ml-2" />
                </button>
              )}

              {existingAdjustmentList.length > 0 && !isAdjustmentDisabled && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onAddToList?.('adjustment', targetItems);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-xl border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-teal-400 cursor-pointer transition select-none text-left group"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                      Adjustment Draft ({existingAdjustmentList.length})
                    </span>
                  </div>
                  <Plus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ml-2" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer (matches Table View Options styling) */}
        <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-slate-200 dark:border-slate-800 text-[10.5px] shrink-0">
          <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Move className="w-3 h-3 text-slate-400" />
            Drag header to move
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </DraggableResizableModal>
  );
};
