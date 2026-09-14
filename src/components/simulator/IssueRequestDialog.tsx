import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Building2,
  User,
  Mail,
  ShieldAlert,
  Package,
  Check,
  Minus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { StockItem, Department, IssueCartItem } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface IssueRequestDialogProps {
  stockItems: StockItem[];
  departments: Department[];
  onTriggerPreview: (
    dept: Department,
    items: IssueCartItem[]
  ) => void;
  onBack: () => void;
}

export const IssueRequestDialog: React.FC<IssueRequestDialogProps> = ({
  stockItems,
  departments,
  onTriggerPreview,
  onBack,
}) => {
  const [deptId, setDeptId] = useState('DEPT-101');
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);

  // Drop-up list state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Item Queue & Selection state
  const [selectedItemId, setSelectedItemId] = useState<string>(
    stockItems[0]?.ItemID || ''
  );
  const [reqQty, setReqQty] = useState<number | ''>(1);
  const [cart, setCart] = useState<IssueCartItem[]>([]);
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

  // Auto-fill Dept Head Name & Email on Dept ID change
  useEffect(() => {
    const found = departments.find(
      (d) => d.DeptID.toLowerCase() === deptId.trim().toLowerCase()
    );
    setSelectedDept(found || null);
  }, [deptId, departments]);

  const activeStockItem = stockItems.find((i) => i.ItemID === selectedItemId);

  // Direct item click handler (from dropdown list or search results)
  const handleSelectItem = (item: StockItem) => {
    setSelectedItemId(item.ItemID);
    setIsDropdownOpen(false);
    setErrorMsg('');
    setSuccessMsg('');
    if (reqQty === '' || reqQty <= 0) {
      setReqQty(1);
    }
  };

  const handleAddToCart = () => {
    setErrorMsg('');
    setSuccessMsg('');
    if (!selectedItemId || !activeStockItem) {
      setErrorMsg('Please select a stock item from the Master Stock dropdown list.');
      return;
    }

    const qtyNum = Number(reqQty);
    if (!reqQty || qtyNum <= 0) {
      setErrorMsg('Please enter a valid requested quantity.');
      return;
    }

    // Check existing in cart for THIS specific item only
    const existingInCart = cart.find((c) => c.ItemID === selectedItemId);
    const existingQtyInCart = existingInCart ? existingInCart.RequestedQty : 0;
    const totalRequested = existingQtyInCart + qtyNum;

    // VALIDATION: Check against available Master_Stock Qty
    if (totalRequested > activeStockItem.Qty) {
      setErrorMsg(
        `Insufficient Stock! Item "${activeStockItem.ItemName}" has only ${activeStockItem.Qty} ${activeStockItem.Unit} available (Requested total: ${totalRequested}).`
      );
      return;
    }

    if (existingInCart) {
      // If the exact same item was previously in the cart, update its quantity
      setCart(
        cart.map((c) =>
          c.ItemID === selectedItemId ? { ...c, RequestedQty: c.RequestedQty + qtyNum } : c
        )
      );
      setSuccessMsg(`Updated quantity for "${activeStockItem.ItemName}" (+${qtyNum}).`);
    } else {
      // Add a distinct, new unique row to the cart
      setCart([
        ...cart,
        {
          ItemID: activeStockItem.ItemID,
          ItemName: activeStockItem.ItemName,
          Category: activeStockItem.Category,
          AvailableQty: activeStockItem.Qty,
          RequestedQty: qtyNum,
        },
      ]);
      setSuccessMsg(`Added new item "${activeStockItem.ItemName}" (${qtyNum} ${activeStockItem.Unit}) to queue.`);
    }

    setReqQty(1);
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
    setCart(cart.filter((c) => c.ItemID !== itemId));
    setSuccessMsg('');
  };

  const handleProceedToPreview = () => {
    setErrorMsg('');
    if (!selectedDept) {
      setErrorMsg('Please enter a valid Department ID from Admin_Config.');
      return;
    }

    if (cart.length === 0) {
      setErrorMsg('Please add at least one item to the issue request queue.');
      return;
    }

    // Final Validation against stock again
    for (const item of cart) {
      const liveItem = stockItems.find((s) => s.ItemID === item.ItemID);
      if (!liveItem || item.RequestedQty > liveItem.Qty) {
        setErrorMsg(
          `Validation Error: Stock level for "${item.ItemName}" has changed or is insufficient.`
        );
        return;
      }
    }

    onTriggerPreview(selectedDept, cart);
  };

  return (
    <DraggableResizableModal
      onClose={onBack}
      modalId="issue-request-dialog-modal"
      className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-emerald-600/60 w-full max-w-3xl overflow-hidden flex flex-col my-auto"
    >
      {/* UserForm Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 shrink-0 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2">
          <Send className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs font-semibold tracking-wide text-slate-200">
            frmIssueRequest — Issue Out Stationery & Cleaning Items
          </span>
        </div>
        <button
          onClick={onBack}
          className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-slate-800 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* UserForm Body */}
      <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {errorMsg && (
            <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-lg text-xs font-medium">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center space-x-2 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 p-3 rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Section 1: Department Lookup */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Step 1: Department Auto-Lookup
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                Admin_Config Reference Table
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Department ID
                </label>
                <input
                  type="text"
                  value={deptId}
                  onChange={(e) => setDeptId(e.target.value)}
                  placeholder="DEPT-101"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Auto-filled Dept Head
                </label>
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedDept ? selectedDept.DeptHeadName : 'Not Found'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Auto-filled Recipient Email
                </label>
                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{selectedDept ? selectedDept.DeptHeadEmail : '-'}</span>
                </div>
              </div>
            </div>

            {selectedDept ? (
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded border border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
                <span>Verified: {selectedDept.DeptName}</span>
                <span className="font-mono text-[10px]">Ready for Issue Slip Generation</span>
              </div>
            ) : (
              <div className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Enter valid Dept ID (e.g. DEPT-101, DEPT-102, DEPT-103, DEPT-105).</span>
              </div>
            )}
          </div>

          {/* Section 2: Stock Item Selection Area */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                Step 2: Stock Item Selection & Quantity Configuration
              </label>
              <span className="text-[10px] text-slate-500 font-mono">
                {stockItems.length} items in Master_Stock
              </span>
            </div>

            {/* TOP: PRIMARY QUICK SELECTION DROP-UP */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
                    Primary Stock Item Drop-Up List (Quick Selection)
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Click to open upwards and choose any item directly from the master inventory list
                  </p>
                </div>
                {activeStockItem && (
                  <span className="text-[11px] text-purple-600 dark:text-purple-400 font-mono font-bold">
                    Active: [{activeStockItem.ItemID}] {activeStockItem.ItemName}
                  </span>
                )}
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen((prev) => !prev)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-purple-500/80 rounded-xl text-xs font-medium text-slate-900 dark:text-slate-100 flex items-center justify-between shadow-sm hover:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 transition text-left"
                >
                  {activeStockItem ? (
                    <div className="flex items-center space-x-2.5 truncate">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase font-mono ${
                          activeStockItem.Category === 'Stationery'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                            : activeStockItem.Category === 'Cleaning'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        {activeStockItem.Category}
                      </span>
                      <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                        {activeStockItem.ItemID}
                      </span>
                      <span className="font-semibold truncate">{activeStockItem.ItemName}</span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 ml-auto pl-2 shrink-0">
                        ({activeStockItem.Qty} {activeStockItem.Unit} available)
                      </span>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">
                      -- Click here to select a stock item from Master Stock drop-up list --
                    </span>
                  )}

                  <div className="flex items-center space-x-1 text-slate-400 pl-2 shrink-0">
                    {isDropdownOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </button>

                {/* Drop-up Menu Overlay positioned directly above the trigger */}
                {isDropdownOpen && (
                  <div className="absolute z-30 w-full bottom-full mb-1.5 max-h-56 overflow-y-auto bg-white dark:bg-slate-800 border-2 border-purple-500 rounded-xl shadow-2xl divide-y divide-slate-100 dark:divide-slate-700 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 bg-slate-100 dark:bg-slate-900/90 text-[11px] font-bold text-slate-500 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
                      <span>All Items in Master Stock List ({stockItems.length})</span>
                      <span className="text-[10px] text-purple-600 dark:text-purple-400">Click any item to select</span>
                    </div>

                    {stockItems.map((item) => {
                      const isSelected = item.ItemID === selectedItemId;
                      const inCart = cart.find((c) => c.ItemID === item.ItemID);

                      return (
                        <button
                          key={item.ItemID}
                          type="button"
                          onClick={() => handleSelectItem(item)}
                          className={`w-full text-left p-2.5 hover:bg-purple-50 dark:hover:bg-purple-950/50 flex items-center justify-between gap-2 transition ${
                            isSelected ? 'bg-purple-100/80 dark:bg-purple-950/80 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1 truncate">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[10px] ${
                                isSelected
                                  ? 'bg-purple-600 text-white'
                                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              {isSelected ? <Check className="w-3 h-3" /> : <Package className="w-3 h-3" />}
                            </div>

                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase shrink-0 font-mono ${
                                item.Category === 'Stationery'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300'
                                  : item.Category === 'Cleaning'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300'
                              }`}
                            >
                              {item.Category}
                            </span>

                            <span className="font-mono text-purple-700 dark:text-purple-300 text-xs shrink-0">
                              {item.ItemID}
                            </span>

                            <span className="text-xs text-slate-900 dark:text-slate-100 truncate">
                              {item.ItemName}
                            </span>

                            {inCart && (
                              <span className="text-[9px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1 py-0.2 rounded font-mono shrink-0">
                                In Cart: {inCart.RequestedQty}
                              </span>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                              {item.Qty} {item.Unit}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* C. ACTIVE SELECTED ITEM CONFIGURATION & QUANTITY */}
            {activeStockItem && (
              <div className="p-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-purple-600 dark:text-purple-400 uppercase">
                    Ready to Add:
                  </span>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    [{activeStockItem.ItemID}] {activeStockItem.ItemName} ({activeStockItem.Qty} {activeStockItem.Unit} avail)
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1">
                    <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Qty:</label>
                    <input
                      type="number"
                      min="1"
                      max={activeStockItem.Qty}
                      value={reqQty}
                      onChange={(e) => setReqQty(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-xs font-mono font-bold text-center text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="py-1.5 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1 shadow transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Queue</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Selected Items Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Selected Issue Queue ({cart.length} unique items)
              </span>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-rose-500 hover:underline"
                >
                  Clear Queue
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                No items added yet. Choose an item from the Master Stock dropdown list above and click "Add to Queue".
              </div>
            ) : (
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700 font-semibold">
                    <tr>
                      <th className="p-2">Item ID</th>
                      <th className="p-2">Description</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-center">Req Qty</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cart.map((item) => (
                      <tr key={item.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-purple-600 dark:text-purple-400 font-bold">{item.ItemID}</td>
                        <td className="p-2 font-medium text-slate-900 dark:text-slate-100">{item.ItemName}</td>
                        <td className="p-2 text-slate-500">{item.Category}</td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateCartQty(item.ItemID, item.RequestedQty - 1)}
                              className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
                            >
                              -
                            </button>
                            <span className="font-mono font-bold text-slate-900 dark:text-slate-100 px-1">
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
                        <td className="p-2 text-center">
                          <button
                            onClick={() => handleRemoveFromCart(item.ItemID)}
                            className="p-1 text-slate-400 hover:text-rose-500 rounded transition"
                            title="Remove item"
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
        </div>

        {/* Dialog Action Buttons */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center space-x-1 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={handleProceedToPreview}
            disabled={!selectedDept || cart.length === 0}
            className="flex items-center space-x-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 rounded-lg shadow transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Preview & Confirm Issue Request ({cart.length} items)</span>
          </button>
        </div>
    </DraggableResizableModal>
  );
};
