import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Plus,
  Trash2,
  ShoppingBag,
  Eye,
  CheckCircle2,
  Package,
  Layers,
  AlertTriangle,
  Minus,
  Check,
  Building2,
  User,
  Mail,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Users,
} from 'lucide-react';
import { StockItem, Department, Manager, IssueCartItem } from '../../../types';
import { StockItemDropUpSelect } from '../../common/StockItemDropUpSelect';

interface IssueRequestTabProps {
  stockItems: StockItem[];
  departments: Department[];
  managers?: Manager[];
  initialItemId?: string;
  initialItemIds?: string[];
  onTriggerPreview: (dept: Department, cart: IssueCartItem[]) => void;
}

export const IssueRequestTab: React.FC<IssueRequestTabProps> = ({
  stockItems,
  departments,
  managers = [],
  initialItemId,
  initialItemIds,
  onTriggerPreview,
}) => {
  const [recipientType, setRecipientType] = useState<'department' | 'manager'>('department');
  const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.DeptID || '');
  const [selectedManagerId, setSelectedManagerId] = useState(managers[0]?.ManagerID || '');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Selected item ID state
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialItemId || initialItemIds?.[0] || stockItems[0]?.ItemID || ''
  );
  const [requestQty, setRequestQty] = useState<number | ''>(1);
  const [cart, setCart] = useState<IssueCartItem[]>(() => {
    if (initialItemIds && initialItemIds.length > 1) {
      return initialItemIds
        .map((id) => stockItems.find((s) => s.ItemID === id))
        .filter((s): s is StockItem => Boolean(s))
        .map((item) => ({
          ItemID: item.ItemID,
          ItemName: item.ItemName,
          Category: item.Category,
          AvailableQty: item.Qty,
          RequestedQty: Math.min(1, Math.max(1, item.Qty)),
          Qty: item.Qty,
        }));
    }
    return [];
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDept = departments.find((d) => d.DeptID === selectedDeptId) || departments[0];
  const selectedManager = managers.find((m) => m.ManagerID === selectedManagerId) || managers[0];
  const selectedStockItem = stockItems.find((i) => i.ItemID === selectedItemId);

  // Item selection handler (from dropdown list or search list)
  const handleSelectItem = (item: StockItem) => {
    setSelectedItemId(item.ItemID);
    setIsDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    if (requestQty === '' || requestQty <= 0) {
      setRequestQty(1);
    }
  };

  const handleAddToCart = () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedStockItem) {
      setErrorMsg('Please select a stock item from the Master Stock dropdown list.');
      return;
    }

    if (!requestQty || Number(requestQty) <= 0) {
      setErrorMsg('Please enter a valid requested quantity greater than 0.');
      return;
    }

    const qtyNum = Number(requestQty);

    // Check existing in cart for THIS specific item only
    const existingInCart = cart.find((c) => c.ItemID === selectedStockItem.ItemID);
    const existingQtyInCart = existingInCart ? existingInCart.RequestedQty : 0;

    if (qtyNum + existingQtyInCart > selectedStockItem.Qty) {
      setErrorMsg(
        `Insufficient stock for "${selectedStockItem.ItemName}"! Requested ${qtyNum + existingQtyInCart} ${selectedStockItem.Unit}, but only ${selectedStockItem.Qty} available in Master_Stock.`
      );
      return;
    }

    if (existingInCart) {
      // If the exact same item already exists in the cart, increment its quantity
      setCart((prev) =>
        prev.map((c) =>
          c.ItemID === selectedStockItem.ItemID ? { ...c, RequestedQty: c.RequestedQty + qtyNum } : c
        )
      );
      setSuccessMsg(`Updated quantity (+${qtyNum}) for "${selectedStockItem.ItemName}".`);
    } else {
      // Add a distinct, new unique row to the cart
      setCart((prev) => [
        ...prev,
        {
          ItemID: selectedStockItem.ItemID,
          ItemName: selectedStockItem.ItemName,
          Category: selectedStockItem.Category,
          AvailableQty: selectedStockItem.Qty,
          RequestedQty: qtyNum,
        },
      ]);
      setSuccessMsg(`Added new item "${selectedStockItem.ItemName}" (${qtyNum} ${selectedStockItem.Unit}) to requisition cart.`);
    }

    // Reset request quantity cleanly to 1
    setRequestQty(1);
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    const stockItem = stockItems.find((s) => s.ItemID === itemId);
    if (!stockItem) return;

    if (newQty <= 0) {
      handleRemoveFromCart(itemId);
      return;
    }

    if (newQty > stockItem.Qty) {
      setErrorMsg(`Cannot exceed available stock of ${stockItem.Qty} ${stockItem.Unit} for ${stockItem.ItemName}.`);
      return;
    }

    setErrorMsg('');
    setCart((prev) =>
      prev.map((c) => (c.ItemID === itemId ? { ...c, RequestedQty: newQty } : c))
    );
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.ItemID !== itemId));
    setSuccessMsg('');
  };

  const handleProceedToPreview = () => {
    setErrorMsg('');
    if (cart.length === 0) {
      setErrorMsg('Please add at least one stock item to the issue request cart.');
      return;
    }

    if (recipientType === 'department') {
      if (!selectedDept) {
        setErrorMsg('Please select a requesting department.');
        return;
      }
      onTriggerPreview(selectedDept, cart);
    } else {
      if (!selectedManager) {
        setErrorMsg('Please select an authorized requesting manager.');
        return;
      }
      // Construct a department-compatible object for Manager requisition
      const managerRequisitionTarget: Department = {
        DeptID: selectedManager.ManagerID,
        DeptName: `${selectedManager.ManagerName} (Manager Direct)`,
        DeptHeadName: selectedManager.ManagerName,
        DeptHeadEmail: selectedManager.Email,
      };
      onTriggerPreview(managerRequisitionTarget, cart);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header Info */}
      <div className="bg-slate-200 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 flex items-start space-x-3">
        <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
          <Send className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            Issue Out Requests Dialogue — Requisition Form
          </h3>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            Select requesting entity (Department or Manager), pick items from the Master Stock dropdown/search list, and submit to generate the official Issue Slip PDF.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-950/80 border border-rose-700 text-rose-300 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-300 p-3 rounded-lg text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Select Requesting Recipient: Department OR Manager */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {recipientType === 'department' ? (
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
            1. Select Requesting Entity ({recipientType === 'department' ? 'Department' : 'Manager Direct'})
          </label>

          {/* Toggle between Department and Manager Requisition */}
          <div className="flex items-center space-x-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setRecipientType('department')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                recipientType === 'department'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Department</span>
            </button>

            <button
              type="button"
              onClick={() => setRecipientType('manager')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-[11px] font-bold transition ${
                recipientType === 'manager'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Manager Direct</span>
            </button>
          </div>
        </div>

        {recipientType === 'department' ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Department
              </label>
              <select
                value={selectedDeptId}
                onChange={(e) => setSelectedDeptId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
              >
                {departments.map((d) => (
                  <option key={d.DeptID} value={d.DeptID}>
                    [{d.DeptID}] {d.DeptName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Department Head
              </label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedDept ? selectedDept.DeptHeadName : 'Not Found'}</span>
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Recipient Email
              </label>
              <div className="px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{selectedDept ? selectedDept.DeptHeadEmail : '-'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Authorized Manager
              </label>
              <select
                value={selectedManagerId}
                onChange={(e) => setSelectedManagerId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-lg text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
              >
                {managers.map((m) => (
                  <option key={m.ManagerID} value={m.ManagerID}>
                    [{m.ManagerID}] {m.ManagerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Manager Full Name
              </label>
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center space-x-1.5 truncate">
                <UserCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{selectedManager ? selectedManager.ManagerName : 'Select Manager'}</span>
              </div>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Manager Email Address
              </label>
              <div className="px-3 py-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-xs font-mono text-blue-900 dark:text-blue-200 flex items-center space-x-1.5 truncate">
                <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="truncate">{selectedManager ? selectedManager.Email : '-'}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. Stock Item Selection Area */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            2. Stock Item Selection & Quantity Configuration
          </label>
          <span className="text-[10px] text-slate-500 font-mono">
            {stockItems.length} total items in Master_Stock
          </span>
        </div>

        {/* ========================================================================= */}
        {/* TOP: PRIMARY QUICK SELECTION DROP-UP LIST */}
        {/* ========================================================================= */}
        <div className="space-y-1.5" ref={dropdownRef}>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                Primary Stock Item Drop-Up List (Quick Selection)
              </label>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Click to open upwards and select any item directly from the master inventory list
              </p>
            </div>
            {selectedStockItem && (
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                Active: [{selectedStockItem.ItemID}] {selectedStockItem.ItemName}
              </span>
            )}
          </div>

          {/* Uniform Interactive Drop-up Trigger */}
          <StockItemDropUpSelect
            id="issue-stock-item-drop-up-select"
            stockItems={stockItems}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            placeholder="-- Click here to select a stock item from Master Stock drop-up list --"
            direction="up"
          />
        </div>

        {/* ========================================================================= */}
        {/* C. SELECTED STOCK ITEM CONFIGURATION & QUANTITY STEPPER CARD */}
        {/* ========================================================================= */}
        {selectedStockItem ? (
          <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border-2 border-purple-300 dark:border-purple-800 rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 font-mono">
                  Currently Selected Item
                </span>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  [{selectedStockItem.ItemID}] {selectedStockItem.ItemName}
                </h4>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-500 block">Stock Available in Master_Stock</span>
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedStockItem.Qty} {selectedStockItem.Unit}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-purple-200 dark:border-purple-900/60">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Request Qty:
                </span>
                <div className="flex items-center border border-slate-300 dark:border-slate-600 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setRequestQty((prev) => Math.max(1, Number(prev || 1) - 1))}
                    className="px-2 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={selectedStockItem.Qty}
                    value={requestQty}
                    onChange={(e) => setRequestQty(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-14 text-center py-1.5 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setRequestQty((prev) => Math.min(selectedStockItem.Qty, Number(prev || 0) + 1))
                    }
                    className="px-2 py-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center space-x-1">
                {[1, 2, 5, 10].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setRequestQty(Math.min(selectedStockItem.Qty, preset))}
                    className="px-2 py-1 text-[10px] font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-300 transition"
                  >
                    +{preset}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                className="ml-auto flex items-center space-x-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg shadow-md transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Item to Cart</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
            Select a stock item from the dropdown list above to configure quantity.
          </div>
        )}
      </div>

      {/* 3. Requisition Cart Summary Table */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-4 h-4 text-emerald-500" />
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Requisition Cart Items ({cart.length} unique items)
            </h4>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setSuccessMsg('Cart cleared.');
              }}
              className="text-xs text-rose-500 hover:text-rose-600 font-semibold flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Cart</span>
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs italic">
            No stock items added to requisition cart yet. Choose an item from the dropdown list above and click "Add Item to Cart".
          </div>
        ) : (
          <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Item ID</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Description</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700">Category</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-right">Avail</th>
                  <th className="p-2.5 border-r border-slate-200 dark:border-slate-700 text-center">Req Qty</th>
                  <th className="p-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                {cart.map((item) => (
                  <tr key={item.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono font-bold text-purple-600 dark:text-purple-400 border-r border-slate-100 dark:border-slate-800">
                      {item.ItemID}
                    </td>
                    <td className="p-2.5 font-medium border-r border-slate-100 dark:border-slate-800">
                      {item.ItemName}
                    </td>
                    <td className="p-2.5 text-slate-500 border-r border-slate-100 dark:border-slate-800">
                      {item.Category}
                    </td>
                    <td className="p-2.5 text-right font-mono text-slate-500 border-r border-slate-100 dark:border-slate-800">
                      {item.AvailableQty}
                    </td>
                    <td className="p-2.5 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.ItemID, item.RequestedQty - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-mono font-bold text-slate-900 dark:text-slate-100">
                          {item.RequestedQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQty(item.ItemID, item.RequestedQty + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="p-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item.ItemID)}
                        className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded transition"
                        title="Remove item from cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-2 flex items-center justify-between">
        <div className="text-xs text-slate-500 font-medium">
          {cart && cart.length > 0 && (
            <span>
              Total Items: <strong className="text-slate-800 dark:text-slate-200 font-mono">{cart.length}</strong> | Total Units:{' '}
              <strong className="text-slate-800 dark:text-slate-200 font-mono">
                {(Array.isArray(cart) ? cart : []).reduce((acc, c) => acc + (c?.RequestedQty || 0), 0)}
              </strong>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleProceedToPreview}
          disabled={cart.length === 0}
          className="flex items-center space-x-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4" />
          <span>Preview Issue Slip & Execute Requisition</span>
        </button>
      </div>
    </div>
  );
};
