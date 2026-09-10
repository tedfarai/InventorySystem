import React from 'react';
import {
  Building2,
  PackagePlus,
  Edit3,
  ArrowRightLeft,
  Send,
  LogOut,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  SlidersHorizontal,
  Database,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { ProcurementTabType } from './ProcurementOperationsDialog';

interface NavigationDialogProps {
  issuerName: string;
  issuerId: string;
  onSelectOption: (option: ProcurementTabType) => void;
  onOpenBackupRecovery?: () => void;
  onOpenReorderReport?: () => void;
  belowThresholdCount?: number;
  onClose: () => void;
  onLogout: () => void;
}

export const NavigationDialog: React.FC<NavigationDialogProps> = ({
  issuerName,
  issuerId,
  onSelectOption,
  onOpenBackupRecovery,
  onOpenReorderReport,
  belowThresholdCount = 0,
  onClose,
  onLogout,
}) => {
  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-emerald-600/60 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* UserForm Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="font-mono text-xs font-bold tracking-wide text-slate-200">
              frmNavigation — Main Procurement Switchboard
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5 rounded hover:bg-slate-800"
            title="Close Switchboard & Return to Master_Stock Sheet"
          >
            ✕
          </button>
        </div>

        {/* UserForm Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between bg-slate-200 dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-300 dark:border-slate-700">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                {issuerName.charAt(0)}
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">Authenticated Issuer</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{issuerName}</div>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border border-emerald-500/30">
                <ShieldCheck className="w-3.5 h-3.5" /> ID: {issuerId}
              </span>
            </div>
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Select Procurement Dialogue Tab
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Choose an action below to open a dialogue tab, or close this window to work directly in the workbook.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Edit Departments Dialogue */}
            <button
              onClick={() => onSelectOption('departments')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Building2 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  1. Edit Departments
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage department directory records & head emails.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>

            {/* 2. Create New Stock Dialogue */}
            <button
              onClick={() => onSelectOption('createStock')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <PackagePlus className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  2. Create New Stock
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Add new stock items with auto-generated ItemIDs.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>

            {/* 3. Edit Stock Item Name */}
            <button
              onClick={() => onSelectOption('editStockItem')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Edit3 className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  3. Edit Stock Name
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Select an existing stock item and rename its description in Master_Stock.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>

            {/* 4. Enter New Delivery/Update Stock */}
            <button
              onClick={() => onSelectOption('delivery')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  4. Stock Delivery (GRN)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Increment Master_Stock levels & log deliveries.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>

            {/* 5. Issue Out Requests */}
            <button
              onClick={() => onSelectOption('issue')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Send className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                  5. Issue Out Requests
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Process stock requisitions & generate issue slips.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>

            {/* 6. Physical Stock Adjustment */}
            <button
              onClick={() => onSelectOption('adjustment')}
              className="group p-3.5 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 hover:border-amber-500 dark:hover:border-amber-500 rounded-xl shadow-sm hover:shadow-md transition text-left flex flex-col justify-between"
            >
              <div>
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition">
                  6. Stock Adjustment
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Physical count discrepancy correction & audit vouchers.
                </p>
              </div>
              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <span>Launch Dialogue Tab</span>
                <span>→</span>
              </div>
            </button>
          </div>

          {/* Generate Reorder Report Banner (All items below safety threshold compiled to printable PDF) */}
          {onOpenReorderReport && (
            <button
              id="switchboard-reorder-report-btn"
              onClick={onOpenReorderReport}
              className="w-full p-3.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border-2 border-rose-300 dark:border-rose-700/60 rounded-xl shadow-xs transition flex items-center justify-between group text-left cursor-pointer"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Generate Reorder Report (Safety Threshold Audit)
                    </span>
                    {belowThresholdCount > 0 ? (
                      <span className="bg-rose-500 text-white text-[10px] font-mono font-black px-2 py-0.2 rounded-full animate-pulse">
                        {belowThresholdCount} Below Threshold
                      </span>
                    ) : (
                      <span className="bg-emerald-600 text-white text-[10px] font-mono font-bold px-2 py-0.2 rounded-full">
                        Stock Optimal
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-rose-700 dark:text-rose-300">
                    Compile all inventory items below safety stock levels into an official printable PDF summary for the procurement manager.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-rose-700 dark:text-rose-300 group-hover:translate-x-1 transition-transform shrink-0">
                View & Print PDF →
              </span>
            </button>
          )}

          {/* Dedicated Backup & Disaster Recovery Center Banner Button (Strictly Superior Admin Rachel Pickard - ADM001 Only) */}
          {onOpenBackupRecovery && issuerId === 'ADM001' && (
            <button
              onClick={onOpenBackupRecovery}
              className="w-full p-3 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border-2 border-purple-300 dark:border-purple-700/60 rounded-xl shadow-xs transition flex items-center justify-between group text-left"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-110 transition-transform">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-900 dark:text-purple-200">
                    7. Backup & Disaster Recovery Center (Superior Admin Only)
                  </div>
                  <div className="text-[11px] text-purple-700 dark:text-purple-300">
                    Automated snapshots (Hourly + Mon-Fri 16:30 COB), 30-day retention & 1-click restore.
                  </div>
                </div>
              </div>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 group-hover:translate-x-1 transition-transform">
                Launch Vault →
              </span>
            </button>
          )}

          <div className="pt-2 flex items-center justify-between border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={onClose}
              className="flex items-center space-x-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow transition"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Go to Master_Stock Sheet</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
