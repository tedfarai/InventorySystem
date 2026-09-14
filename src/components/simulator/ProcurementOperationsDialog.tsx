import React, { useState } from 'react';
import { Building2, PackagePlus, Edit3, ArrowRightLeft, Send, Layers, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react';
import { StockItem, Department, Manager, IssueCartItem, AdjustmentReasonCode, ReceivedDocument, AdminUser, TimedAccessWindow, StockAdjustmentRequest } from '../../types';
import { EditDepartmentsTab } from './tabs/EditDepartmentsTab';
import { CreateStockTab } from './tabs/CreateStockTab';
import { EditStockItemTab } from './tabs/EditStockItemTab';
import { StockDeliveryTab } from './tabs/StockDeliveryTab';
import { IssueRequestTab } from './tabs/IssueRequestTab';
import { StockAdjustmentTab } from './tabs/StockAdjustmentTab';

export type ProcurementTabType = 'departments' | 'createStock' | 'editStockItem' | 'delivery' | 'issue' | 'adjustment';

interface ProcurementOperationsDialogProps {
  initialTab?: ProcurementTabType;
  initialItemId?: string;
  initialItemIds?: string[];
  initialDeliveryMode?: 'single' | 'bulkQueue' | 'bulkGrid';
  stockItems: StockItem[];
  departments: Department[];
  managers?: Manager[];
  issuerName?: string;
  issuerId?: string;
  currentUser?: AdminUser | null;
  activeTimedWindow?: TimedAccessWindow | null;
  adjustmentRequests?: StockAdjustmentRequest[];
  onOpenRequestsModal?: () => void;
  onOpenSuperiorManagerModal?: () => void;
  pendingRequestsCount?: number;
  onSaveDelivery: (itemId: string, addQty: number, deliveryNoteRef?: string, supplier?: string) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
  onSaveBulkDeliveries?: (deliveries: { itemId: string; addQty: number; supplier?: string }[], deliveryNoteRef?: string, defaultSupplier?: string) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
  onTriggerReceivedDocPreview?: (doc: ReceivedDocument) => void;
  onSaveAdjustment?: (adjustmentData: {
    itemId: string;
    physicalQty: number;
    reasonCode: AdjustmentReasonCode;
    reasonLabel: string;
    countRef: string;
    notes: string;
    requestId?: string;
  }) => Promise<{ success: boolean; allAdjusted?: boolean; voucherNumber?: string } | void> | void;
  onAddNewStockItem: (item: StockItem) => void;
  onUpdateStockItemName: (itemId: string, newName: string) => void;
  onUpdateStockItem?: (updatedItem: StockItem) => void;
  onDeleteStockItem?: (itemId: string) => void;
  onAddDepartment: (dept: Department) => void;
  onUpdateDepartment: (dept: Department) => void;
  onDeleteDepartment: (deptId: string) => void;
  onAddManager?: (mgr: Manager) => void;
  onUpdateManager?: (mgr: Manager) => void;
  onDeleteManager?: (mgrId: string) => void;
  onTriggerIssuePreview: (dept: Department, cart: IssueCartItem[]) => void;
  onClose: () => void;
}

export const ProcurementOperationsDialog: React.FC<ProcurementOperationsDialogProps> = ({
  initialTab = 'departments',
  initialItemId,
  initialItemIds,
  initialDeliveryMode,
  stockItems,
  departments,
  managers = [],
  issuerName = 'Sarah Jenkins',
  issuerId = 'ADM001',
  currentUser,
  activeTimedWindow,
  adjustmentRequests = [],
  onOpenRequestsModal,
  onOpenSuperiorManagerModal,
  pendingRequestsCount = 0,
  onSaveDelivery,
  onSaveBulkDeliveries,
  onTriggerReceivedDocPreview,
  onSaveAdjustment,
  onAddNewStockItem,
  onUpdateStockItemName,
  onUpdateStockItem,
  onDeleteStockItem,
  onAddDepartment,
  onUpdateDepartment,
  onDeleteDepartment,
  onAddManager,
  onUpdateManager,
  onDeleteManager,
  onTriggerIssuePreview,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ProcurementTabType>(initialTab);

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-emerald-600/70 w-full max-w-4xl overflow-hidden my-auto animate-in fade-in zoom-in duration-200">
        {/* UserForm Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold tracking-wide text-slate-200">
              frmProcurementOperations — Stock & Inventory Management Dialogue
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="hidden sm:inline-flex items-center gap-1 bg-slate-800 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700">
              <ShieldCheck className="w-3 h-3" /> Issuer: {issuerId}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 rounded hover:bg-slate-800 transition"
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* 6 OPERATIONAL DIALOGUE TABS */}
        <div className="bg-slate-200 dark:bg-slate-900 border-b border-slate-300 dark:border-slate-700 px-2 pt-2 flex flex-wrap gap-1 select-none">
          {/* Tab 1: Edit Departments Dialogue */}
          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'departments'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Edit Departments & Managers</span>
          </button>

          {/* Tab 2: Create New Stock Dialogue */}
          <button
            onClick={() => setActiveTab('createStock')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'createStock'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5" />
            <span>2. Create Stock</span>
          </button>

          {/* Tab 3: Edit Stock Item Name */}
          <button
            onClick={() => setActiveTab('editStockItem')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'editStockItem'
                ? 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-amber-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>3. Edit Stock</span>
          </button>

          {/* Tab 4: Enter New Delivery/Update Stock */}
          <button
            onClick={() => setActiveTab('delivery')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'delivery'
                ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 border-blue-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>4. Stock Delivery</span>
          </button>

          {/* Tab 5: Issue Out Requests */}
          <button
            onClick={() => setActiveTab('issue')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'issue'
                ? 'bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border-emerald-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>5. Issue Out</span>
          </button>

          {/* Tab 6: Physical Stock Count & Adjustment */}
          <button
            onClick={() => setActiveTab('adjustment')}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-t-xl text-xs font-bold transition border-t-2 ${
              activeTab === 'adjustment'
                ? 'bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 border-amber-500 shadow-sm'
                : 'bg-slate-300/60 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border-transparent'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>6. Stock Adjustment</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'departments' && (
            <EditDepartmentsTab
              departments={departments}
              onAddDepartment={onAddDepartment}
              onUpdateDepartment={onUpdateDepartment}
              onDeleteDepartment={onDeleteDepartment}
              managers={managers}
              onAddManager={onAddManager}
              onUpdateManager={onUpdateManager}
              onDeleteManager={onDeleteManager}
            />
          )}

          {activeTab === 'createStock' && (
            <CreateStockTab
              stockItems={stockItems}
              onAddNewStockItem={onAddNewStockItem}
            />
          )}

          {activeTab === 'editStockItem' && (
            <EditStockItemTab
              stockItems={stockItems}
              initialItemId={initialItemId}
              onUpdateStockItemName={onUpdateStockItemName}
              onUpdateStockItem={onUpdateStockItem}
              onDeleteStockItem={onDeleteStockItem}
            />
          )}

          {activeTab === 'delivery' && (
            <StockDeliveryTab
              stockItems={stockItems}
              issuerName={issuerName}
              issuerId={issuerId}
              initialMode={initialDeliveryMode}
              initialItemId={initialItemId}
              initialSelectedIds={initialItemIds}
              onSaveDelivery={onSaveDelivery}
              onSaveBulkDeliveries={onSaveBulkDeliveries}
              onDeliverySuccess={(doc) => {
                if (onTriggerReceivedDocPreview) {
                  onTriggerReceivedDocPreview(doc);
                }
              }}
            />
          )}

          {activeTab === 'issue' && (
            <IssueRequestTab
              stockItems={stockItems}
              departments={departments}
              managers={managers}
              initialItemId={initialItemId}
              initialItemIds={initialItemIds}
              onTriggerPreview={onTriggerIssuePreview}
            />
          )}

          {activeTab === 'adjustment' && onSaveAdjustment && (
            <StockAdjustmentTab
              stockItems={stockItems}
              issuerName={issuerName}
              issuerId={issuerId}
              currentUser={currentUser}
              activeTimedWindow={activeTimedWindow}
              adjustmentRequests={adjustmentRequests}
              onSaveAdjustment={onSaveAdjustment}
              onOpenRequestsModal={onOpenRequestsModal}
              onOpenSuperiorManagerModal={onOpenSuperiorManagerModal}
              pendingRequestsCount={pendingRequestsCount}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};
