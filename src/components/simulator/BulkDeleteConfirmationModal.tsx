import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { StockItem } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface BulkDeleteConfirmationModalProps {
  isOpen: boolean;
  selectedItems: StockItem[];
  issuerName: string;
  issuerId: string;
  onConfirm?: () => void;
  onConfirmDelete?: () => void;
  onClose: () => void;
}

export const BulkDeleteConfirmationModal: React.FC<BulkDeleteConfirmationModalProps> = ({
  isOpen,
  selectedItems,
  issuerName,
  issuerId,
  onConfirm,
  onConfirmDelete,
  onClose,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');

  if (!isOpen || selectedItems.length === 0) return null;

  const requiresConfirmation = selectedItems.length >= 3;
  const isConfirmed = !requiresConfirmation || typedConfirmation.trim().toUpperCase() === 'DELETE';

  const handleConfirm = () => {
    if (!isConfirmed) return;
    const confirmAction = onConfirm ?? onConfirmDelete ?? (() => {});
    confirmAction();
    onClose();
  };

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="bulk-delete-confirmation-modal"
      className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-rose-600/70 w-full max-w-lg overflow-hidden my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="bg-rose-950 text-white px-5 py-4 flex items-center justify-between border-b border-rose-900 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Confirm Bulk Stock Deletion</h3>
            <p className="text-[11px] text-rose-300 font-mono">
              Admin Action authorized by {issuerName} ({issuerId})
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          type="button"
          className="text-rose-400 hover:text-white p-1 rounded-lg hover:bg-rose-900 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-900 dark:text-rose-200 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">
                You are about to permanently delete {selectedItems.length} inventory item{selectedItems.length > 1 ? 's' : ''} from the Master Stock database.
              </p>
              <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                This will remove the item master records from future requisitions and restock operations. Historical movement logs will be retained for audit integrity.
              </p>
            </div>
          </div>

          {/* List of items to delete */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block">
              Items to be removed ({selectedItems.length}):
            </span>
            <div className="max-h-36 overflow-y-auto space-y-1 border border-slate-200 dark:border-slate-800 rounded-lg p-2 bg-slate-50 dark:bg-slate-950">
              {selectedItems.map((item) => (
                <div
                  key={item.ItemID}
                  className="flex items-center justify-between text-xs font-mono py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                >
                  <span className="font-bold text-rose-600 dark:text-rose-400">{item.ItemID}</span>
                  <span className="text-slate-800 dark:text-slate-200 truncate mx-2">{item.ItemName}</span>
                  <span className="text-[10px] text-slate-500 font-sans">{item.Qty} {item.Unit}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Security confirmation typed text */}
          {requiresConfirmation && (
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                To confirm, please type <strong className="font-mono text-rose-600 dark:text-rose-400">DELETE</strong> below:
              </label>
              <input
                id="bulk-delete-confirm-input"
                type="text"
                value={typedConfirmation}
                onChange={(e) => setTypedConfirmation(e.target.value)}
                placeholder="Type DELETE to enable confirmation"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            id="confirm-bulk-delete-btn"
            type="button"
            disabled={!isConfirmed}
            onClick={handleConfirm}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}
          </button>
        </div>
    </DraggableResizableModal>
  );
};
