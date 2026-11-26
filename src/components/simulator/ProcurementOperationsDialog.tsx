import React from 'react';
import { Building2, PackagePlus, Edit3, ArrowRightLeft, Send, ShieldCheck, SlidersHorizontal, Minus, Square, Minimize2, X, type LucideIcon } from 'lucide-react';
import { StockItem, Department, Manager, IssueCartItem, AdjustmentReasonCode, ReceivedDocument, AdminUser, TimedAccessWindow, StockAdjustmentRequest } from '../../types';
import { EditDepartmentsTab } from './tabs/EditDepartmentsTab';
import { CreateStockTab } from './tabs/CreateStockTab';
import { EditStockItemTab } from './tabs/EditStockItemTab';
import { StockDeliveryTab } from './tabs/StockDeliveryTab';
import { IssueRequestTab } from './tabs/IssueRequestTab';
import { StockAdjustmentTab } from './tabs/StockAdjustmentTab';
import { DraggableResizableModal, useDraggableModal } from '../common/DraggableResizableModal';

export type ProcurementTabType = 'departments' | 'createStock' | 'editStockItem' | 'delivery' | 'issue' | 'adjustment';

const formDetails: Record<ProcurementTabType, { id: string; title: string; icon: LucideIcon }> = {
  departments: { id: 'frmEditDepartmentsManagers', title: 'Edit Departments & Managers', icon: Building2 },
  createStock: { id: 'frmCreateStock', title: 'Create Stock', icon: PackagePlus },
  editStockItem: { id: 'frmEditStockItem', title: 'Edit Stock Item', icon: Edit3 },
  delivery: { id: 'frmStockDelivery', title: 'Stock Delivery', icon: ArrowRightLeft },
  issue: { id: 'frmIssueOut', title: 'Issue Out', icon: Send },
  adjustment: { id: 'frmStockAdjustment', title: 'Stock Adjustment', icon: SlidersHorizontal },
};

const ProcurementDialogTitleBar: React.FC<{ title: string; issuerId: string; icon: LucideIcon }> = ({
  title,
  issuerId,
  icon: Icon,
}) => {
  const windowControls = useDraggableModal();
  if (!windowControls) return null;

  return (
    <div
      data-drag-handle="true"
      className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700 cursor-grab active:cursor-grabbing select-none"
    >
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="font-semibold text-sm text-slate-100 truncate">
          {title}
        </span>
        <span className="hidden md:inline-flex items-center gap-1 bg-slate-800 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-700 shrink-0">
          <ShieldCheck className="w-3 h-3" /> {issuerId}
        </span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={windowControls.toggleMinimize}
          className="p-2 rounded text-white hover:bg-slate-700 transition cursor-pointer"
          title="Minimize"
          aria-label="Minimize window"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={windowControls.toggleMaximize}
          className="p-2 rounded text-white hover:bg-emerald-700 transition cursor-pointer"
          title={windowControls.isMaximized ? 'Restore window' : 'Maximize'}
          aria-label={windowControls.isMaximized ? 'Restore window' : 'Maximize window'}
        >
          {windowControls.isMaximized ? <Minimize2 className="w-4 h-4" /> : <Square className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          onClick={windowControls.close}
          className="p-2 rounded text-white hover:bg-rose-600 transition cursor-pointer"
          title="Close"
          aria-label="Close window"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

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
  onSaveDelivery: (itemId: string, addQty: number, deliveryNoteRef?: string, supplier?: string, unitPrice?: number) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
  onSaveBulkDeliveries?: (deliveries: { itemId: string; addQty: number; supplier?: string; unitPrice?: number }[], deliveryNoteRef?: string, defaultSupplier?: string) => Promise<ReceivedDocument | void> | ReceivedDocument | void;
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
  const form = formDetails[initialTab];

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId={`procurement-operations-dialog-${initialTab}`}
      title={form.title}
      showControls={false}
      initialWidth={Math.round(window.innerWidth * 0.70)}
      initialHeight={Math.round(window.innerHeight * 0.94)}
      className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-emerald-600/70 w-full overflow-hidden my-auto"
    >
      <ProcurementDialogTitleBar title={`${form.id} — ${form.title}`} issuerId={issuerId} icon={form.icon} />

      <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto">
          {initialTab === 'departments' && (
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

          {initialTab === 'createStock' && (
            <CreateStockTab
              stockItems={stockItems}
              onAddNewStockItem={onAddNewStockItem}
            />
          )}

          {initialTab === 'editStockItem' && (
            <EditStockItemTab
              stockItems={stockItems}
              initialItemId={initialItemId}
              onUpdateStockItemName={onUpdateStockItemName}
              onUpdateStockItem={onUpdateStockItem}
              onDeleteStockItem={onDeleteStockItem}
            />
          )}

          {initialTab === 'delivery' && (
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

          {initialTab === 'issue' && (
            <IssueRequestTab
              stockItems={stockItems}
              departments={departments}
              managers={managers}
              initialItemId={initialItemId}
              initialItemIds={initialItemIds}
              onTriggerPreview={onTriggerIssuePreview}
            />
          )}

          {initialTab === 'adjustment' && onSaveAdjustment && (
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
    </DraggableResizableModal>
  );
};
