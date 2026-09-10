import React, { useState, useEffect } from 'react';
import { PackagePlus, Sparkles, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';
import { StockItem, ItemCategory } from '../../../types';

interface CreateStockTabProps {
  stockItems: StockItem[];
  onAddNewStockItem: (item: StockItem) => void;
}

export const CreateStockTab: React.FC<CreateStockTabProps> = ({
  stockItems,
  onAddNewStockItem,
}) => {
  const [category, setCategory] = useState<ItemCategory>('Stationery');
  const [itemName, setItemName] = useState('');
  const [initialQty, setInitialQty] = useState<number | ''>(25);
  const [reorderLevel, setReorderLevel] = useState<number | ''>(10);
  const [unit, setUnit] = useState('Boxes');
  const [customUnit, setCustomUnit] = useState('');

  const [assignedCode, setAssignedCode] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Helper function to auto-assign stock_item_code based on assigned Category
  const computeAssignedCode = (cat: ItemCategory): string => {
    if (cat === 'Stationery') {
      const stationeryItems = stockItems.filter(
        (i) => i.Category === 'Stationery' || i.ItemID.startsWith('ST-')
      );
      const nums = stationeryItems
        .map((i) => {
          const match = i.ItemID.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));

      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 1;
      return `ST-${String(nextNum).padStart(3, '0')}`;
    } else if (cat === 'Cleaning') {
      const cleaningItems = stockItems.filter(
        (i) => i.Category === 'Cleaning' || i.ItemID.startsWith('CL-')
      );
      const nums = cleaningItems
        .map((i) => {
          const match = i.ItemID.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));

      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 101;
      return `CL-${String(nextNum).padStart(3, '0')}`;
    } else {
      const generalItems = stockItems.filter(
        (i) => i.Category === 'General' || i.ItemID.startsWith('GN-')
      );
      const nums = generalItems
        .map((i) => {
          const match = i.ItemID.match(/\d+/);
          return match ? parseInt(match[0], 10) : 0;
        })
        .filter((n) => !isNaN(n));

      const nextNum = nums.length > 0 ? Math.max(...nums) + 1 : 201;
      return `GN-${String(nextNum).padStart(3, '0')}`;
    }
  };

  // Automatically update stock_item_code whenever category or stockItems changes
  useEffect(() => {
    setAssignedCode(computeAssignedCode(category));
  }, [category, stockItems]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!itemName.trim()) {
      setErrorMsg('Please enter a valid stock item name/description.');
      return;
    }

    if (initialQty === '' || Number(initialQty) < 0) {
      setErrorMsg('Please enter a valid initial quantity (0 or greater).');
      return;
    }

    const finalUnit = unit === 'Custom' ? customUnit.trim() || 'Units' : unit;

    const newStockItem: StockItem = {
      ItemID: assignedCode,
      ItemName: itemName.trim(),
      Category: category,
      Qty: Number(initialQty),
      ReorderLevel: reorderLevel !== '' ? Number(reorderLevel) : 10,
      Unit: finalUnit,
    };

    onAddNewStockItem(newStockItem);

    setSuccessMsg(
      `New Stock Item "${newStockItem.ItemName}" successfully created with auto-assigned code [${newStockItem.ItemID}]!`
    );

    // Reset Form
    setItemName('');
    setInitialQty(25);
    setReorderLevel(10);
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="bg-slate-200 dark:bg-slate-900/80 p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 flex items-start space-x-3">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
          <PackagePlus className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            Create New Stock Dialogue — Add New Master Inventory Item
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            Register new stationery or cleaning stock items into <code className="font-mono bg-slate-300 dark:bg-slate-800 px-1 rounded">Master_Stock</code>. Select the category below and the system will automatically format and assign the appropriate stock item code.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3 rounded-lg text-xs flex items-center gap-2 font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-700 text-rose-300 p-3 rounded-lg text-xs flex items-center gap-2 font-medium">
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Assign Category */}
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
            1. Assign Stock Category <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setCategory('Stationery')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between ${
                category === 'Stationery'
                  ? 'bg-blue-950/60 border-blue-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <div>
                <div className="font-bold text-xs">Stationery</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Papers, Pens, Supplies</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${category === 'Stationery' ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                ST-
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('Cleaning')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between ${
                category === 'Cleaning'
                  ? 'bg-purple-950/60 border-purple-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <div>
                <div className="font-bold text-xs">Cleaning</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Soaps, Cleaners, Cloths</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${category === 'Cleaning' ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                CL-
              </span>
            </button>

            <button
              type="button"
              onClick={() => setCategory('General')}
              className={`p-3 rounded-xl border-2 text-left transition flex items-center justify-between ${
                category === 'General'
                  ? 'bg-amber-950/60 border-amber-500 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
              }`}
            >
              <div>
                <div className="font-bold text-xs">General</div>
                <div className="text-[10px] text-slate-400 mt-0.5">Tools, First Aid, Gear</div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${category === 'General' ? 'bg-amber-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                GN-
              </span>
            </button>
          </div>
        </div>

        {/* Step 2: System Assigned Stock Item Code Display */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Tag className="w-4 h-4 text-amber-400" />
            <div>
              <span className="text-xs text-slate-400">System Auto-Assigned Stock Item Code:</span>
              <div className="text-[11px] text-slate-500">Based on assigned category [{category}]</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-base font-mono font-extrabold text-emerald-400 bg-emerald-950/80 px-3 py-1 rounded-lg border border-emerald-500/40 tracking-wider">
              {assignedCode}
            </span>
            <span className="text-[10px] bg-slate-800 text-emerald-300 px-2 py-0.5 rounded font-mono border border-slate-700">
              Auto-Generated
            </span>
          </div>
        </div>

        {/* Step 3: Item Name and Details */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Stock Item Name / Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Heavy Duty Whiteboard Cleaner Spray 500ml"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Initial Stock Qty
              </label>
              <input
                type="number"
                min="0"
                value={initialQty}
                onChange={(e) => setInitialQty(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reorder Threshold Qty
              </label>
              <input
                type="number"
                min="1"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Boxes">Boxes</option>
                <option value="Packs">Packs</option>
                <option value="Reams">Reams</option>
                <option value="Containers">Containers</option>
                <option value="Bottles">Bottles</option>
                <option value="Units">Units</option>
                <option value="Drums">Drums</option>
                <option value="Rolls">Rolls</option>
                <option value="Cans">Cans</option>
                <option value="Custom">Custom Unit...</option>
              </select>
            </div>
          </div>

          {unit === 'Custom' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Specify Custom Unit Name
              </label>
              <input
                type="text"
                value={customUnit}
                onChange={(e) => setCustomUnit(e.target.value)}
                placeholder="e.g. Cartons, Sets, Barrels"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Live Preview Card */}
        {itemName.trim() && (
          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-xs space-y-1">
            <div className="text-[11px] font-bold text-emerald-400 font-mono uppercase flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Preview Row Entry for Master_Stock
            </div>
            <div className="flex flex-wrap items-center justify-between text-slate-200 pt-1">
              <span className="font-mono font-bold text-emerald-400">{assignedCode}</span>
              <span className="font-bold">{itemName}</span>
              <span className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">{category}</span>
              <span className="font-mono text-emerald-300 font-bold">{initialQty || 0} {unit === 'Custom' ? customUnit || 'Units' : unit}</span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Create & Register Stock Item [{assignedCode}]</span>
          </button>
        </div>
      </form>
    </div>
  );
};
