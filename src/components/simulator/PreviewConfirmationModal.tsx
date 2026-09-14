import React, { useState } from 'react';
import {
  FileText,
  Mail,
  Save,
  CheckCircle,
  ShieldCheck,
  FolderCheck,
  Loader2,
  Sparkles,
  CheckCircle2,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Department, IssueCartItem } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface PreviewConfirmationModalProps {
  dept: Department;
  cart: IssueCartItem[];
  issuerId: string;
  issuerName: string;
  onConfirmExecute: (finalCart: IssueCartItem[]) => void | Promise<void>;
  onCancel: () => void;
}

export const PreviewConfirmationModal: React.FC<PreviewConfirmationModalProps> = ({
  dept,
  cart,
  issuerId,
  issuerName,
  onConfirmExecute,
  onCancel,
}) => {
  const [activeCart, setActiveCart] = useState<IssueCartItem[]>(cart);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepStatus, setStepStatus] = useState<string>('Ready to execute automated VBA sequence');
  const [progressPercent, setProgressPercent] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const nowStr = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
  const timestampFile = new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').substring(0, 15);
  const pdfFileName = `Issued_Items/IssueSlip_${dept.DeptID.replace('-', '')}_${timestampFile}.pdf`;

  const handleDeleteItem = (itemId: string) => {
    setActiveCart((prev) => prev.filter((item) => item.ItemID !== itemId));
  };

  const handleExecute = async () => {
    if (activeCart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    setProgressPercent(25);
    setStepStatus('1/4 Validating stock levels in Master_Stock...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(50);
    setStepStatus('2/4 Deducting quantities & appending Movement_Log...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(75);
    setStepStatus('3/4 Generating PDF Issue Slip...');
    await new Promise((r) => setTimeout(r, 180));

    setProgressPercent(100);
    setIsCompleted(true);
    setStepStatus('4/4 Opening PDF Issue Slip Preview...');
    await new Promise((r) => setTimeout(r, 150));

    try {
      await onConfirmExecute(activeCart);
    } catch (err) {
      console.error('Error during issue confirmation:', err);
    }
  };

  return (
    <DraggableResizableModal
      onClose={onCancel}
      modalId="preview-confirmation-modal"
      className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-emerald-600/80 w-full max-w-xl overflow-hidden my-auto"
    >
      {/* UserForm Header */}
      <div
        data-drag-handle="true"
        className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          <span className="font-mono text-xs font-bold tracking-wide text-slate-100">
            VBA Dialogue Preview Confirmation — Issue Slip Execution
          </span>
        </div>
        {!isProcessing && (
          <button onClick={onCancel} className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer">
            ✕
          </button>
        )}
      </div>

      {/* Modal Body */}
      <div className="p-6 space-y-5 flex-1 min-h-0 overflow-y-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-lg flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-700 dark:text-slate-300">
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                Sequential Workflow Preview & Recipient Verification
              </span>
              Please review all issue request parameters below. You can delete items from the list before confirming the execution of the automated VBA routine in Excel.
            </div>
          </div>

          {/* Details Summary Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Issue Timestamp</span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">{nowStr}</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Authorized Issuer</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{issuerName} ({issuerId})</span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                {dept.DeptID.startsWith('MGR-') ? 'Requesting Target' : 'Target Department'}
              </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {dept.DeptName} ({dept.DeptID})
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                {dept.DeptID.startsWith('MGR-') ? 'Authorized Manager & Email' : 'Dept Head & Recipient Email'}
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100 truncate block">{dept.DeptHeadName}</span>
              <span className="font-mono text-[10px] text-slate-500 truncate block">{dept.DeptHeadEmail}</span>
            </div>
          </div>

          {/* Items Summary Table with Delete Capability */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200">
              <span>Items to Issue ({activeCart.length})</span>
              <span className="text-[11px] text-slate-500 font-normal">Click trash icon to remove an item before confirm</span>
            </div>

            {activeCart.length === 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-lg text-center text-xs text-amber-800 dark:text-amber-200 space-y-2">
                <div className="flex items-center justify-center space-x-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>All items have been removed from this issue request.</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Please cancel or go back to add at least one stock item before executing the issue sequence.
                </p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-2">Item ID</th>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Quantity</th>
                      <th className="p-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeCart.map((item) => (
                      <tr key={item.ItemID} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{item.ItemID}</td>
                        <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{item.ItemName}</td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100">{item.RequestedQty}</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.ItemID)}
                            disabled={isProcessing}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded transition"
                            title={`Remove ${item.ItemName} from issue request`}
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

          {/* Action Chain Checklist */}
          <div className="bg-slate-200/70 dark:bg-slate-900/60 p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs space-y-2">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <FolderCheck className="w-4 h-4 text-emerald-500" />
              Automated VBA Action Sequence to Execute:
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-300 list-disc list-inside text-[11px] font-mono">
              <li>Update <code className="text-emerald-600 dark:text-emerald-400 font-bold">Master_Stock</code> and record in <code className="text-emerald-600 dark:text-emerald-400 font-bold">Movement_Log</code></li>
              <li>Create directory <code className="text-slate-800 dark:text-slate-200">Issued_Items\</code> using VBA <code className="text-blue-600 dark:text-blue-400">Dir / MkDir</code></li>
              <li>Export PDF Slip: <code className="text-slate-800 dark:text-slate-200 break-all">{pdfFileName}</code></li>
              <li>Autosave workbook as <code className="text-slate-800 dark:text-slate-200">.xlsm</code> (FileFormat 52)</li>
            </ul>
          </div>

          {/* Progress Banner & Bar */}
          {isProcessing && (
            <div className="bg-emerald-950 text-emerald-200 p-4 rounded-xl border border-emerald-700 space-y-2.5 font-mono animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 animate-bounce" />
                  ) : (
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                  )}
                  <span className="font-bold text-white">{stepStatus}</span>
                </div>
                <span className="font-extrabold text-emerald-400">{progressPercent}%</span>
              </div>

              {/* Progress Bar Track */}
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-emerald-800">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-300 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {isCompleted && (
                <div className="flex items-center justify-center gap-2 pt-1 text-emerald-300 text-xs font-bold animate-in zoom-in duration-300">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Issue Request Batch Processed & Saved Successfully!</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing || activeCart.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-500 rounded-lg shadow-lg transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{isProcessing ? `Executing... (${progressPercent}%)` : 'Confirm & Execute Issue Sequence'}</span>
            </button>
          </div>
        </div>
    </DraggableResizableModal>
  );
};
