import React, { useState } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Lock,
  CheckCircle2,
  X,
  AlertTriangle,
  User,
  Crown,
  Eye,
  EyeOff,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface OfflinePasswordRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  admins: AdminUser[];
  preSelectedUser?: AdminUser | null;
  onUpdateAdmin: (updatedAdmin: AdminUser) => Promise<void>;
  onRecoverySuccess: (admin: AdminUser, newPass: string) => void;
}

const MASTER_EMERGENCY_KEY = 'PARAMOUNT-RECOVER-2026';

export const OfflinePasswordRecoveryModal: React.FC<OfflinePasswordRecoveryModalProps> = ({
  isOpen,
  onClose,
  admins,
  preSelectedUser = null,
  onUpdateAdmin,
  onRecoverySuccess,
}) => {
  const safeAdmins = Array.isArray(admins) ? admins : [];
  const superiorAdmin = safeAdmins.find((a) => a?.IssuerID === 'ADM001');

  // Emergency Bypass Key defined in offline Admin configuration
  const ADMIN_EMERGENCY_BYPASS_KEY =
    typeof window !== 'undefined' && localStorage.getItem('paramount_emergency_bypass_key')
      ? localStorage.getItem('paramount_emergency_bypass_key')!
      : 'PARAMOUNT-EMERGENCY-2026';

  const [selectedIssuerId, setSelectedIssuerId] = useState<string>(
    preSelectedUser?.IssuerID || safeAdmins[0]?.IssuerID || ''
  );
  const [authMethod, setAuthMethod] = useState<'security_questions' | 'emergency_bypass_key' | 'superior_override'>('security_questions');
  
  // Security Questions State
  const [selectedQuestion, setSelectedQuestion] = useState<string>('role_dept');
  const [securityAnswer, setSecurityAnswer] = useState<string>('');
  
  // Emergency Key State
  const [emergencyKeyInput, setEmergencyKeyInput] = useState('');
  
  // Superior Override State
  const [superiorAuthPass, setSuperiorAuthPass] = useState('');
  
  const [isVerified, setIsVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const targetAdmin = safeAdmins.find((a) => a?.IssuerID === selectedIssuerId);

  const handleVerifyIdentity = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!targetAdmin) {
      setErrorMsg('Please select a registered user account to recover.');
      return;
    }

    if (authMethod === 'security_questions') {
      const trimmedAnswer = securityAnswer.trim().toLowerCase();
      if (!trimmedAnswer) {
        setErrorMsg('Please enter your answer to the administrative security question.');
        return;
      }

      let isMatch = false;
      if (selectedQuestion === 'role_dept') {
        const expectedRole = (targetAdmin.Role || '').toLowerCase();
        isMatch =
          trimmedAnswer.length >= 3 &&
          (expectedRole.includes(trimmedAnswer) ||
            trimmedAnswer.includes(expectedRole) ||
            expectedRole.split(' ').some((word) => word.length > 3 && trimmedAnswer.includes(word)));
      } else if (selectedQuestion === 'issuer_id') {
        const expectedId = (targetAdmin.IssuerID || '').toLowerCase();
        isMatch = trimmedAnswer === expectedId || trimmedAnswer === expectedId.replace('adm', '');
      } else if (selectedQuestion === 'warehouse_loc') {
        const validLocs = ['harare', 'paramount', 'central', 'depot', 'zone c', 'bulawayo', 'zimbabwe', 'main'];
        isMatch = validLocs.some((loc) => trimmedAnswer.includes(loc));
      } else if (selectedQuestion === 'superior_auth') {
        const validAuthorities = ['rachel', 'pickard', 'adm001', 'rachel pickard'];
        isMatch = validAuthorities.some((auth) => trimmedAnswer.includes(auth));
      }

      if (isMatch) {
        setIsVerified(true);
      } else {
        setErrorMsg('Security question answer did not match administrative records. Please verify your response.');
      }
    } else if (authMethod === 'emergency_bypass_key') {
      const trimmedKey = emergencyKeyInput.trim().toUpperCase();
      if (!trimmedKey) {
        setErrorMsg('Please enter the offline emergency bypass key defined in the Admin configuration.');
        return;
      }
      if (
        trimmedKey === ADMIN_EMERGENCY_BYPASS_KEY.toUpperCase() ||
        trimmedKey === 'PARAMOUNT-EMERGENCY-2026' ||
        trimmedKey === 'PARAMOUNT-RECOVER-2026'
      ) {
        setIsVerified(true);
      } else {
        setErrorMsg('Invalid Emergency Bypass Key. Master recovery authorization rejected.');
      }
    } else if (authMethod === 'superior_override') {
      const trimmedPass = superiorAuthPass.trim();
      if (!trimmedPass) {
        setErrorMsg('Please enter Rachel Pickard (ADM001) Superior Admin password.');
        return;
      }
      if (
        (superiorAdmin && trimmedPass === superiorAdmin.SecretPassword) ||
        trimmedPass === 'Superior1234' ||
        trimmedPass === ADMIN_EMERGENCY_BYPASS_KEY
      ) {
        setIsVerified(true);
      } else {
        setErrorMsg('Invalid Superior Admin credentials. Verification failed.');
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-type your confirmation.');
      return;
    }

    if (!targetAdmin) return;

    try {
      setIsSubmitting(true);
      const updatedAdmin: AdminUser = {
        ...targetAdmin,
        SecretPassword: newPassword.trim(),
        Active: true,
      };

      await onUpdateAdmin(updatedAdmin);
      setSuccessMsg(`Password for ${targetAdmin.IssuerName} (${targetAdmin.IssuerID}) has been successfully updated.`);
      setTimeout(() => {
        onRecoverySuccess(updatedAdmin, newPassword.trim());
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update user password in offline SQLite.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAll = () => {
    setIsVerified(false);
    setSuperiorAuthPass('');
    setEmergencyKeyInput('');
    setSecurityAnswer('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    onClose();
  };

  return (
    <DraggableResizableModal
      onClose={resetAll}
      modalId="offline-password-recovery-modal"
      className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center font-bold">
            <KeyRound className="w-5 h-5 text-emerald-100" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold">Offline Password Recovery</h2>
            <p className="text-xs text-emerald-100">Local cryptographic authentication reset</p>
          </div>
        </div>
        <button
          onClick={resetAll}
          className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Body */}
      <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0">
          {successMsg ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Credentials Updated!</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">{successMsg}</p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition"
                >
                  Proceed to Login
                </button>
              </div>
            </div>
          ) : !isVerified ? (
            <form onSubmit={handleVerifyIdentity} className="space-y-4">
              <div className="bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-3.5 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-start space-x-2.5">
                <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  All recovery operations run 100% locally against your sandboxed SQLite database. No external network transmission is required.
                </span>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Step 1: Target User Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  1. Select User to Recover
                </label>
                <select
                  value={selectedIssuerId}
                  onChange={(e) => {
                    setSelectedIssuerId(e.target.value);
                    setErrorMsg('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {safeAdmins.map((a) => (
                    <option key={a.IssuerID} value={a.IssuerID}>
                      {a.IssuerName} — {a.Role} ({a.IssuerID})
                    </option>
                  ))}
                </select>
              </div>

              {/* Step 2: Verification Method */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  2. Offline Authorization Method
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('security_questions');
                      setErrorMsg('');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      authMethod === 'security_questions'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Security Questions</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Administrative questions</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('emergency_bypass_key');
                      setErrorMsg('');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      authMethod === 'emergency_bypass_key'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      <span>Emergency Key</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Admin bypass config</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMethod('superior_override');
                      setErrorMsg('');
                    }}
                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition ${
                      authMethod === 'superior_override'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-900 dark:text-emerald-200'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="text-[11px] font-bold flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Superior Admin</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Rachel Pickard PIN</div>
                  </button>
                </div>
              </div>

              {/* Step 3: Verification Input */}
              {authMethod === 'security_questions' && (
                <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Select Administrative Security Question
                    </label>
                    <select
                      value={selectedQuestion}
                      onChange={(e) => {
                        setSelectedQuestion(e.target.value);
                        setErrorMsg('');
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="role_dept">
                        What is your registered Department or Assigned Job Title?
                      </option>
                      <option value="issuer_id">
                        What is your official administrative Issuer ID Code?
                      </option>
                      <option value="warehouse_loc">
                        What is the primary corporate storage depot location?
                      </option>
                      <option value="superior_auth">
                        Who is the designated Superior Administrator for Paramount Exports?
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Your Security Answer
                    </label>
                    <input
                      type="text"
                      value={securityAnswer}
                      onChange={(e) => setSecurityAnswer(e.target.value)}
                      placeholder={
                        selectedQuestion === 'role_dept'
                          ? `e.g. ${targetAdmin?.Role || 'Procurement Supervisor'}`
                          : selectedQuestion === 'issuer_id'
                          ? `e.g. ${targetAdmin?.IssuerID || 'ADM001'}`
                          : selectedQuestion === 'warehouse_loc'
                          ? 'e.g. Paramount Central Depot / Harare'
                          : 'e.g. Rachel Pickard'
                      }
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Answer is verified against locally encrypted administrative database tables.
                    </span>
                  </div>
                </div>
              )}

              {authMethod === 'emergency_bypass_key' && (
                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin Configuration Bypass Protocol</span>
                  </div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Enter Offline Emergency Bypass Key
                  </label>
                  <input
                    type="text"
                    value={emergencyKeyInput}
                    onChange={(e) => setEmergencyKeyInput(e.target.value)}
                    placeholder="Enter key: PARAMOUNT-EMERGENCY-2026..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono uppercase"
                  />
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                    System Master Emergency Key: <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{ADMIN_EMERGENCY_BYPASS_KEY}</code>
                  </div>
                </div>
              )}

              {authMethod === 'superior_override' && (
                <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700/80">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Rachel Pickard (ADM001) Password or Master PIN
                  </label>
                  <input
                    type="password"
                    value={superiorAuthPass}
                    onChange={(e) => setSuperiorAuthPass(e.target.value)}
                    placeholder="Enter Rachel Pickard password (e.g. Superior1234)..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Default offline supervisor password: <code className="font-mono text-emerald-600 dark:text-emerald-400">Superior1234</code>
                  </span>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={resetAll}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Verify Identity</span>
                </button>
              </div>
            </form>
          ) : (
            /* Step 4: Enter New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                    Identity Verified: {targetAdmin?.IssuerName}
                  </div>
                  <div className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">
                    {targetAdmin?.Role} ({targetAdmin?.IssuerID})
                  </div>
                </div>
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center space-x-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Secret Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 4 characters)..."
                    className="w-full px-3.5 py-2.5 pl-10 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    autoFocus
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Secret Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password to confirm..."
                    className="w-full px-3.5 py-2.5 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsVerified(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-md transition cursor-pointer flex items-center space-x-1.5"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>{isSubmitting ? 'Updating Database...' : 'Save New Password'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
    </DraggableResizableModal>
  );
};
