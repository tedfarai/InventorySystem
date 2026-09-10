import React, { useState } from 'react';
import {
  User,
  Shield,
  KeyRound,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Crown,
  Building2,
  Activity,
  X,
  AlertTriangle,
  BadgeCheck,
  Check,
} from 'lucide-react';
import { AdminUser } from '../../types';

interface AccountDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  onUpdateAdmin: (updatedAdmin: AdminUser) => Promise<void>;
  onShowToast: (title: string, type: 'success' | 'error' | 'info') => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateAdmin,
  onShowToast,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen || !currentUser) return null;

  const isSuperiorAdmin = currentUser.IssuerID === 'ADM001';

  const getInitials = (name?: string) => {
    if (!name) return 'PE';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      setErrorMsg('Please enter your current password.');
      return;
    }

    if (trimmedCurrent !== currentUser.SecretPassword) {
      setErrorMsg('Current password is incorrect. Please re-enter.');
      return;
    }

    if (!trimmedNew || trimmedNew.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    if (trimmedNew === trimmedCurrent) {
      setErrorMsg('New password cannot be identical to your current password.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMsg('New passwords do not match. Please re-type.');
      return;
    }

    try {
      setIsSubmitting(true);
      const updatedUser: AdminUser = {
        ...currentUser,
        SecretPassword: trimmedNew,
      };

      await onUpdateAdmin(updatedUser);
      setSuccessMsg('Account password changed successfully.');
      onShowToast('Account Password Updated', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setSuccessMsg('');
      }, 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update account password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/35 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 via-teal-800 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">User Account &amp; Profile</h2>
              <p className="text-xs text-emerald-100">Identity details and security credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: User Account Profile Details */}
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-extrabold text-base shadow-sm">
                  {getInitials(currentUser.IssuerName)}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {currentUser.IssuerName}
                    </h3>
                    {isSuperiorAdmin && (
                      <span className="inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-bold">
                        <Crown className="w-3 h-3 text-amber-500" />
                        <span>Superior Admin</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1.5 py-0.5 rounded text-[11px]">
                      {currentUser.IssuerID}
                    </span>
                    <span>{currentUser.Role}</span>
                  </div>
                </div>
              </div>

              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Active Account</span>
              </div>
            </div>

            {/* Account Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs border-t border-slate-200 dark:border-slate-700">
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Access Level</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  {isSuperiorAdmin ? 'Full Master Administrative Privilege' : 'Departmental Staff Operator'}
                </div>
              </div>
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[10px] uppercase font-bold text-slate-400">Database Storage</div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                  Offline IndexedDB &amp; SQLite 3
                </div>
              </div>
            </div>

            {/* Privileges Checklist */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Assigned System Permissions:
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Master Stock Ledger View</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Issue Out Requests Generation</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Single &amp; Bulk Goods Receipt</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  {isSuperiorAdmin ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>
                    {isSuperiorAdmin ? 'Direct Count Adjustment' : 'Submit Adjustment Proposal'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Change Account Password */}
          <div className="p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-xs">
            <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-3">
              <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Change Account Password
              </h3>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 rounded-xl text-xs flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password..."
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 chars)..."
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password..."
                    className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Updating...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
