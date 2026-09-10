import React, { useState, useEffect } from 'react';
import { Edit3, CheckCircle2, AlertCircle, Package, Search, Trash2, Save, ShieldAlert } from 'lucide-react';
import { StockItem, ItemCategory } from '../../../types';
import { searchStockItems } from '../../../utils/searchEngine';
import { StockItemDropUpSelect } from '../../common/StockItemDropUpSelect';

interface EditStockItemTabProps {
  stockItems: StockItem[];
  initialItemId?: string;
  onUpdateStockItemName: (itemId: string, newName: string) => void;
  onUpdateStockItem?: (updatedItem: StockItem) => void;
  onDeleteStockItem?: (itemId: string) => void;
  onSwitchToBulkEditMode?: () => void;
}

export const EditStockItemTab: React.FC<EditStockItemTabProps> = ({
  stockItems,
  initialItemId,
  onUpdateStockItemName,
  onUpdateStockItem,
  onDeleteStockItem,
  onSwitchToBulkEditMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'Stationery' | 'Cleaning' | 'General'>('All');

  const indexedItems = searchStockItems(stockItems, searchQuery, categoryFilter);

  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId || indexedItems[0]?.ItemID || stockItems[0]?.ItemID || ''
  );
  
  // Full Edit Form Fields State
  const [editForm, setEditForm] = useState<StockItem>(() => {
    const item = stockItems.find((i) => i.ItemID === (initialItemId || indexedItems[0]?.ItemID || stockItems[0]?.ItemID));
    if (item) {
      return { ...item };
    }
    return {
      ItemID: '',
      ItemName: '',
      Category: 'Stationery',
      Qty: 0,
      ReorderLevel: 5,
      Unit: 'Units',
    };
  });

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Sync edit form whenever selected item or stockItems list updates
  useEffect(() => {
    const item = stockItems.find((i) => i.ItemID === selectedItemId) || stockItems[0];
    if (item) {
      setSelectedItemId(item.ItemID);
      setEditForm({ ...item });
    }
  }, [selectedItemId, stockItems]);

  const handleSelectItem = (id: string) => {
    setSelectedItemId(id);
    const item = stockItems.find((i) => i.ItemID === id);
    if (item) {
      setEditForm({ ...item });
    }
    setFeedback(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!editForm.ItemID) {
      setFeedback({ type: 'error', message: 'Please select a stock item to edit.' });
      return;
    }

    const trimmedName = editForm.ItemName.trim();
    if (!trimmedName) {
      setFeedback({ type: 'error', message: 'Stock item description/name cannot be empty.' });
      return;
    }

    if (onUpdateStockItem) {
      onUpdateStockItem({
        ...editForm,
        ItemName: trimmedName,
      });
    } else {
      onUpdateStockItemName(editForm.ItemID, trimmedName);
    }

    setFeedback({
      type: 'success',
      message: `Successfully saved full details for item '${editForm.ItemID}' (${trimmedName}) in Master_Stock!`,
    });
  };

  const handleDelete = (itemToDelete: StockItem) => {
    if (
      window.confirm(
        `Are you sure you want to PERMANENTLY DELETE item '${itemToDelete.ItemID}' — "${itemToDelete.ItemName}" from Master_Stock?\n\nThis CRUD action cannot be undone.`
      )
    ) {
      if (onDeleteStockItem) {
        onDeleteStockItem(itemToDelete.ItemID);
        setFeedback({
          type: 'success',
          message: `Item '${itemToDelete.ItemID}' (${itemToDelete.ItemName}) permanently removed from inventory.`,
        });
      }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-lg">
            <Edit3 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>3. Edit Stock Item & Full CRUD Dialogue</span>
              <span className="text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono px-2 py-0.5 rounded font-semibold">
                frmEditStockItem
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Full CRUD authority granted to all authorized users across Stationery, Cleaning, and General categories.
            </p>
          </div>
        </div>
        {onSwitchToBulkEditMode && (
          <button
            type="button"
            onClick={onSwitchToBulkEditMode}
            className="flex items-center justify-center space-x-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            title="Open Master Stock Sheet with Bulk Edit Mode active to update multiple records at once"
          >
            <Edit3 className="w-4 h-4" />
            <span>Launch Bulk Edit Mode</span>
          </button>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center space-x-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/50 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Form & Selection */}
      <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            Select Inventory Item to Modify / Delete:
          </label>

          {/* Search Engine Input */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter search by letter, code, name..."
                className="w-full pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 font-medium"
              />
            </div>

            <div className="flex items-center space-x-1 bg-slate-200 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-300 dark:border-slate-700">
              {(['All', 'Stationery', 'Cleaning', 'General'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                    categoryFilter === cat
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <StockItemDropUpSelect
            id="edit-stock-item-drop-up-select"
            stockItems={stockItems}
            selectedItemId={selectedItemId}
            onSelectItem={(item) => handleSelectItem(item.ItemID)}
            placeholder="-- Select stock item to edit --"
            direction="down"
          />
        </div>

        {/* Full Details Edit Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={editForm.Category}
              onChange={(e) => setEditForm({ ...editForm, Category: e.target.value as ItemCategory })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            >
              <option value="Stationery">Stationery</option>
              <option value="Cleaning">Cleaning</option>
              <option value="General">General</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Current Stock Quantity (Qty)
            </label>
            <input
              type="number"
              min="0"
              value={editForm.Qty}
              onChange={(e) => setEditForm({ ...editForm, Qty: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reorder Level Threshold
            </label>
            <input
              type="number"
              min="0"
              value={editForm.ReorderLevel}
              onChange={(e) => setEditForm({ ...editForm, ReorderLevel: Math.max(0, parseInt(e.target.value, 10) || 0) })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Unit Measurement
            </label>
            <input
              type="text"
              value={editForm.Unit}
              onChange={(e) => setEditForm({ ...editForm, Unit: e.target.value })}
              placeholder="e.g. Boxes, Packs, Bottles"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Stock Item Name / Description:
          </label>
          <input
            type="text"
            value={editForm.ItemName}
            onChange={(e) => setEditForm({ ...editForm, ItemName: e.target.value })}
            placeholder="Enter item description..."
            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          />
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => {
              const current = stockItems.find((s) => s.ItemID === selectedItemId);
              if (current) handleDelete(current);
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center space-x-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Stock Item Permanently</span>
          </button>

          <button
            type="submit"
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow transition flex items-center space-x-2 ml-auto"
          >
            <Save className="w-4 h-4" />
            <span>Save Stock Details in Master_Stock</span>
          </button>
        </div>
      </form>

      {/* Item Inventory Table Reference */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
          <Package className="w-4 h-4 text-amber-500" />
          <span>Master_Stock Inventory Directory ({stockItems.length} Total Items)</span>
        </h4>
        <div className="max-h-56 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left font-mono text-[11px]">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 sticky top-0">
              <tr>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700">ItemID</th>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700">Category</th>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700">Item Name</th>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-right">Qty</th>
                <th className="p-2 border-b border-slate-200 dark:border-slate-700 text-center">CRUD Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {stockItems.map((item) => (
                <tr
                  key={item.ItemID}
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    item.ItemID === selectedItemId ? 'bg-amber-500/10 font-bold' : ''
                  }`}
                >
                  <td className="p-2 text-amber-600 dark:text-amber-400 font-bold">{item.ItemID}</td>
                  <td className="p-2">{item.Category}</td>
                  <td className="p-2 font-sans">{item.ItemName}</td>
                  <td className="p-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                    {item.Qty} {item.Unit}
                  </td>
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleSelectItem(item.ItemID)}
                        className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 rounded"
                        title="Select & Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 rounded"
                        title="Delete Item Permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
