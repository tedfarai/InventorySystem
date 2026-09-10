import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Layers,
  CheckCircle2,
  X,
  AlertTriangle,
  FolderSync,
  Tag,
  ShieldAlert,
} from 'lucide-react';
import { StockItem } from '../../types';

interface BulkBatchUpdateModalProps {
  isOpen: boolean;
  selectedItems: StockItem[];
  onClose: () => void;
  onApplyBatchUpdate?: (updates: {
    category?: 'Stationery' | 'Cleaning' | 'General';
    reorderLevel?: number;
    reorderLevelDelta?: number;
  }) => void;
  onApplyUpdates?: (updates: {
    category?: 'Stationery' | 'Cleaning' | 'General';
    reorderLevel?: number;
    reorderLevelDelta?: number;
  }) => void;
}

export const BulkBatchUpdateModal: React.FC<BulkBatchUpdateModalProps> = ({
  isOpen,
  selectedItems,
  onClose,
  onApplyBatchUpdate,
  onApplyUpdates,
}) => {
  const [updateCategory, setUpdateCategory] = useState(false);
  const [newCategory, setNewCategory] = useState<'Stationery' | 'Cleaning' | 'General'>('Stationery');

  const [updateReorderLevel, setUpdateReorderLevel] = useState(false);
  const [reorderMode, setReorderMode] = useState<'fixed' | 'delta'>('fixed');
  const [fixedReorderValue, setFixedReorderValue] = useState<number>(15);
  const [deltaReorderValue, setDeltaReorderValue] = useState<number>(5);

  if (!isOpen || selectedItems.length === 0) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!updateCategory && !updateReorderLevel) {
      alert('Please select at least one property to batch update.');
      return;
    }

    const payload: {
      category?: 'Stationery' | 'Cleaning' | 'General';
      reorderLevel?: number;
      reorderLevelDelta?: number;
    } = {};

    if (updateCategory) {
      payload.category = newCategory;
    }

    if (updateReorderLevel) {
      if (reorderMode === 'fixed') {
        payload.reorderLevel = Math.max(0, fixedReorderValue);
      } else {
        payload.reorderLevelDelta = deltaReorderValue;
      }
    }

    if (onApplyBatchUpdate) {
      onApplyBatchUpdate(payload);
    } else if (onApplyUpdates) {
      onApplyUpdates(payload);
    }
    onClose();
  };

  return (
    <div
      id="bulk-batch-update-modal-backdrop"
      className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto"
    >
      <div
        id="bulk-batch-update-modal-content"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-teal-500/20 text-teal-400 rounded-lg">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-100">Batch Update Selected Stock Items</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Modifying {selectedItems.length} inventory item{selectedItems.length > 1 ? 's' : ''} simultaneously
              </p>
            </div>
          </div>
          <button
            id="close-batch-update-modal-btn"
            onClick={onClose}
            type="button"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Items summary chips */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 max-h-28 overflow-y-auto">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-slate-400 block mb-1.5">
            Selected Items ({selectedItems.length})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {selectedItems.map((item) => (
              <span
                key={item.ItemID}
                className="inline-flex items-center gap-1 text-[11px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300"
              >
                <strong className="text-teal-600 dark:text-teal-400">{item.ItemID}</strong>: {item.ItemName}
              </span>
            ))}
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* 1. Category Batch Reassignment */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                id="batch-toggle-category-chk"
                type="checkbox"
                checked={updateCategory}
                onChange={(e) => setUpdateCategory(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Batch Reassign Category
              </span>
            </label>

            {updateCategory && (
              <div className="pl-6 pt-1 space-y-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Select new master category to assign to all {selectedItems.length} selected items:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(['Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border text-center transition ${
                        newCategory === cat
                          ? cat === 'Stationery'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : cat === 'Cleaning'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. Reorder Level Batch Update */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                id="batch-toggle-reorder-chk"
                type="checkbox"
                checked={updateReorderLevel}
                onChange={(e) => setUpdateReorderLevel(e.target.checked)}
                className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <FolderSync className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Batch Update Reorder Level Threshold
              </span>
            </label>

            {updateReorderLevel && (
              <div className="pl-6 pt-1 space-y-3">
                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="reorderMode"
                      checked={reorderMode === 'fixed'}
                      onChange={() => setReorderMode('fixed')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Set Exact Fixed Value</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="reorderMode"
                      checked={reorderMode === 'delta'}
                      onChange={() => setReorderMode('delta')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Adjust by Delta (+ / -)</span>
                  </label>
                </div>

                {reorderMode === 'fixed' ? (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      New Reorder Threshold (Units):
                    </label>
                    <input
                      id="batch-fixed-reorder-input"
                      type="number"
                      min="0"
                      max="1000"
                      value={fixedReorderValue}
                      onChange={(e) => setFixedReorderValue(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      Increment / Decrement (e.g. +5 or -5):
                    </label>
                    <input
                      id="batch-delta-reorder-input"
                      type="number"
                      min="-50"
                      max="100"
                      value={deltaReorderValue}
                      onChange={(e) => setDeltaReorderValue(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              id="confirm-batch-update-btn"
              type="submit"
              disabled={!updateCategory && !updateReorderLevel}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:pointer-events-none rounded-lg shadow-xs transition flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply Batch Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
