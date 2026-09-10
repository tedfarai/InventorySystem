import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  AlertTriangle,
  ShieldCheck,
  Crown,
  UserCheck,
  Search,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { AdminUser } from '../../types';

interface LoginDialogProps {
  admins: AdminUser[];
  onSuccess: (admin: AdminUser) => void;
  onCancel: () => void;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ admins, onSuccess, onCancel }) => {
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(() => {
    // Default to first active admin or null
    return admins.find((a) => a.Active) || admins[0] || null;
  });
  const [workId, setWorkId] = useState<string>(() => {
    const first = admins.find((a) => a.Active) || admins[0];
    return first ? first.IssuerID : '';
  });
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Filter registered users based on search
  const filteredAdmins = admins.filter((admin) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      admin.IssuerName.toLowerCase().includes(q) ||
      admin.IssuerID.toLowerCase().includes(q) ||
      admin.Role.toLowerCase().includes(q)
    );
  });

  // Handle clicking a user card
  const handleSelectUser = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setWorkId(admin.IssuerID);
    setPassword('');
    setErrorMsg('');
    // Auto-focus password input
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const targetAdmin = selectedAdmin || admins.find((a) => a.IssuerID.toLowerCase() === workId.trim().toLowerCase());
    const trimmedPass = password.trim();

    if (!targetAdmin) {
      setErrorMsg('Please click your user name from the registered users list above.');
      return;
    }

    if (!trimmedPass) {
      setErrorMsg(`Please enter the password for ${targetAdmin.IssuerName}.`);
      passwordInputRef.current?.focus();
      return;
    }

    if (targetAdmin.SecretPassword === trimmedPass && targetAdmin.Active) {
      onSuccess(targetAdmin);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setErrorMsg('Maximum login attempts (3) exceeded. Security lockout engaged.');
      } else {
        setErrorMsg(`Incorrect password for ${targetAdmin.IssuerName}. (${3 - nextAttempts} attempt${3 - nextAttempts === 1 ? '' : 's'} remaining)`);
        setPassword('');
        passwordInputRef.current?.focus();
      }
    }
  };

  // Get initials for user avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Color generator for avatar based on role or name
  const getAvatarColor = (role: string, isSuperior: boolean) => {
    if (isSuperior) return 'bg-amber-500/20 text-amber-500 dark:text-amber-400 border-amber-500/40';
    if (role.toLowerCase().includes('manager')) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
    if (role.toLowerCase().includes('supervisor')) return 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40';
    if (role.toLowerCase().includes('controller')) return 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40';
    return 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/40';
  };

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Title Bar */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-wide text-white">
                  Paramount Procurement System
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
                  Workbook_Open Auth
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Registered User Directory &amp; Security Authentication
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-white text-xs font-bold w-6 h-6 rounded-lg hover:bg-slate-800 flex items-center justify-center transition"
            title="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Header instructions & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Select Your User Profile ({admins.length} Registered Users)</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click your name below to select your account and enter your password.
              </p>
            </div>

            {/* Quick Filter Bar */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff name..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Registered Users Grid */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1.5 rounded-2xl bg-slate-100/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80">
              {filteredAdmins.map((adm) => {
                const isSelected = selectedAdmin?.IssuerID === adm.IssuerID;
                const isSuperior = adm.IssuerID === 'ADM001';
                const avatarColor = getAvatarColor(adm.Role, isSuperior);

                return (
                  <button
                    key={adm.IssuerID}
                    type="button"
                    onClick={() => handleSelectUser(adm)}
                    className={`group relative text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${avatarColor}`}
                      >
                        {getInitials(adm.IssuerName)}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-emerald-900 dark:text-emerald-300 font-extrabold' : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {adm.IssuerName}
                          </span>
                          {isSuperior && (
                            <span
                              title="Superior Admin (ADM001)"
                              className="inline-flex items-center gap-0.5 px-1 py-0.2 bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded text-[9px] font-bold"
                            >
                              <Crown className="w-2.5 h-2.5" />
                              <span>Superior</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {adm.IssuerID}
                          </span>
                          <span className="truncate">{adm.Role}</span>
                        </div>
                      </div>
                    </div>

                    {/* Selection Checkmark / Arrow */}
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {filteredAdmins.length === 0 && (
                <div className="col-span-2 py-6 text-center text-xs text-slate-500 italic">
                  No registered users match &quot;{searchQuery}&quot;. Try clearing the search filter.
                </div>
              )}
            </div>
          </div>

          {/* Password Entry Form for Selected User */}
          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 pt-1">
            {/* Selected User Highlight Card */}
            {selectedAdmin && (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {getInitials(selectedAdmin.IssuerName)}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Signing in as:</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{selectedAdmin.IssuerName}</span>
                      <span className="text-[10px] font-mono bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-300">
                        {selectedAdmin.IssuerID}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {selectedAdmin.Role}
                    </p>
                  </div>
                </div>
                <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-semibold">
                  Account Selected
                </div>
              </div>
            )}

            {/* Error banner */}
            {errorMsg && (
              <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-medium animate-in fade-in duration-150">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Password input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Secret Password for {selectedAdmin ? selectedAdmin.IssuerName : 'Selected User'}
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Manual Entry Enforced
                </span>
              </div>
              <div className="relative">
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  id="login-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={`Enter password for ${selectedAdmin ? selectedAdmin.IssuerName : 'account'}...`}
                  disabled={attempts >= 3}
                  autoComplete="off"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="w-full px-4 py-2.5 pl-10 pr-10 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition shadow-inner"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-2 gap-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 italic text-center sm:text-left">
                * Click any registered user above to switch accounts.
              </span>
              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={attempts >= 3 || !selectedAdmin}
                  className="flex-1 sm:flex-none flex items-center justify-center space-x-1.5 px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 dark:disabled:bg-slate-800 rounded-xl shadow-md transition cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Authenticate &amp; Log In</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
