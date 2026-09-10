import React, { useState } from 'react';
import { PackagePlus, ArrowLeft, CheckCircle, Truck } from 'lucide-react';
import { StockItem } from '../../types';
import { StockItemDropUpSelect } from '../common/StockItemDropUpSelect';

interface StockDeliveryDialogProps {
  stockItems: StockItem[];
  onSaveDelivery: (itemId: string, addQty: number, supplier?: string) => void;
  onBack: () => void;
}

export const StockDeliveryDialog: React.FC<StockDeliveryDialogProps> = ({
  stockItems,
  onSaveDelivery,
  onBack,
}) => {
  const [selectedItemId, setSelectedItemId] = useState(stockItems[0]?.ItemID || '');
  const [addQty, setAddQty] = useState<number | ''>(10);
  const selectedItem = stockItems.find((i) => i.ItemID === selectedItemId);
  const [supplier, setSupplier] = useState(selectedItem?.LastSupplier || '');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSelectItem = (item: StockItem) => {
    setSelectedItemId(item.ItemID);
    if (item.LastSupplier && !supplier) {
      setSupplier(item.LastSupplier);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedItemId) {
      setErrorMsg('Please select an item.');
      return;
    }

    if (!addQty || Number(addQty) <= 0) {
      setErrorMsg('Please enter a valid positive delivery quantity.');
      return;
    }

    onSaveDelivery(selectedItemId, Number(addQty), supplier.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border-2 border-emerald-600/60 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* UserForm Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-semibold tracking-wide text-slate-200">
              frmStockDelivery — Enter New Delivery / Update Stocks
            </span>
          </div>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* UserForm Body */}
        <div className="p-6 space-y-4">
          <div className="text-xs text-slate-600 dark:text-slate-300">
            Select an existing stock item to record incoming delivery inventory. This will increment <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Master_Stock</code>, record supplier tracking, and add an entry to <code className="font-mono bg-slate-200 dark:bg-slate-700 px-1 rounded">Movement_Log</code>.
          </div>

          {errorMsg && (
            <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-300 text-rose-700 dark:text-rose-300 p-2.5 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Select Item from Master_Stock
              </label>
              <StockItemDropUpSelect
                id="dialog-delivery-item-drop-up-select"
                stockItems={stockItems}
                selectedItemId={selectedItemId}
                onSelectItem={handleSelectItem}
                placeholder="-- Select stock item from drop-up --"
                direction="down"
              />
            </div>

            {selectedItem && (
              <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-1">
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Category:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedItem.Category}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Current Available Stock:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {selectedItem.Qty} {selectedItem.Unit}
                  </span>
                </div>
                {selectedItem.LastSupplier && (
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Last Recorded Supplier:</span>
                    <span className="font-semibold text-sky-600 dark:text-sky-400">{selectedItem.LastSupplier}</span>
                  </div>
                )}
              </div>
            )}

            {/* Supplier Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Supplier / Vendor Name
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  list="common-suppliers-list"
                  value={supplier}
                  onChange={(e) => setSupplier(e.target.value)}
                  placeholder="e.g. Paramount Wholesale, Kimberly-Clark, 3M, Office Depot"
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
                />
                <datalist id="common-suppliers-list">
                  <option value="Paramount Wholesale Supplies" />
                  <option value="Kimberly-Clark Professional" />
                  <option value="Diversey Hygiene Supplies" />
                  <option value="3M Commercial Solutions" />
                  <option value="Office National Stationery" />
                  <option value="Bic South Africa" />
                  <option value="Rexel Staples & Office" />
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Received Delivery Quantity
              </label>
              <input
                type="number"
                min="1"
                value={addQty}
                onChange={(e) => setAddQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            {selectedItem && addQty !== '' && (
              <div className="text-xs text-slate-500 dark:text-slate-400 italic">
                New calculated inventory level will be: <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{selectedItem.Qty + Number(addQty)} {selectedItem.Unit}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={onBack}
                className="flex items-center space-x-1 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Menu</span>
              </button>

              <button
                type="submit"
                className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Update Master_Stock & Log</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
