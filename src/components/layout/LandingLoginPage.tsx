import React, { useState, useRef, useEffect } from 'react';
import {
  Lock,
  KeyRound,
  ShieldCheck,
  Crown,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Shield,
  User,
  AlertTriangle,
  Download,
  Building2,
  Package,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { ParamountLogo } from '../brand/ParamountLogo';
import { OfflineStatusBadge } from '../pwa/OfflineStatusBadge';
import { OfflinePasswordRecoveryModal } from '../auth/OfflinePasswordRecoveryModal';

interface LandingLoginPageProps {
  admins: AdminUser[];
  onSuccess: (admin: AdminUser) => void;
  isOffline?: boolean;
  onOpenInstallModal?: () => void;
  isInstallable?: boolean;
  onUpdateAdmin?: (admin: AdminUser) => Promise<void>;
}

export const LandingLoginPage: React.FC<LandingLoginPageProps> = ({
  admins = [],
  onSuccess,
  isOffline = false,
  onOpenInstallModal,
  isInstallable = false,
  onUpdateAdmin,
}) => {
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [isRecoveryModalOpen, setIsRecoveryModalOpen] = useState(false);
  const [recoveryTargetUser, setRecoveryTargetUser] = useState<AdminUser | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Filter registered users based on search safely
  const safeAdmins = Array.isArray(admins) ? admins : [];
  const filteredAdmins = safeAdmins.filter((admin) => {
    if (!admin) return false;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const name = (admin.IssuerName || '').toLowerCase();
    const id = (admin.IssuerID || '').toLowerCase();
    const role = (admin.Role || admin.IssuerRole || '').toLowerCase();
    return name.includes(q) || id.includes(q) || role.includes(q);
  });

  const handleSelectUser = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setPassword('');
    setErrorMsg('');
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleClearSelection = () => {
    setSelectedAdmin(null);
    setPassword('');
    setErrorMsg('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAdmin) {
      setErrorMsg('Please select your user profile from the list below.');
      return;
    }

    const trimmedPass = password.trim();
    if (!trimmedPass) {
      setErrorMsg(`Please enter the password for ${selectedAdmin.IssuerName || 'user'}.`);
      passwordInputRef.current?.focus();
      return;
    }

    if (selectedAdmin.SecretPassword === trimmedPass && selectedAdmin.Active) {
      onSuccess(selectedAdmin);
    } else {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 4) {
        setErrorMsg('Maximum login attempts exceeded. Security lockout engaged.');
      } else {
        setErrorMsg(
          `Incorrect password for ${selectedAdmin.IssuerName || 'user'}. (${4 - nextAttempts} attempt${
            4 - nextAttempts === 1 ? '' : 's'
          } remaining)`
        );
        setPassword('');
        passwordInputRef.current?.focus();
      }
    }
  };

  const getInitials = (name?: string) => {
    if (!name || typeof name !== 'string') return 'PE';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (role: string = '', isSuperior: boolean = false) => {
    const r = (role || '').toLowerCase();
    if (isSuperior) return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40';
    if (r.includes('manager')) return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40';
    if (r.includes('supervisor')) return 'bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/40';
    if (r.includes('controller')) return 'bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/40';
    return 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-400/40';
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Brand Header */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white shadow-sm shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                Paramount Exports
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Stationery &amp; Cleaning Inventory
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <OfflineStatusBadge isOffline={isOffline} showStorageIndicator={true} />
            {isInstallable && onOpenInstallModal && (
              <button
                onClick={onOpenInstallModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 cursor-pointer transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install PWA</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content: Hero & User Selection Grid */}
      <main className="flex-1 w-full px-4 sm:px-8 lg:px-12 py-6 sm:py-10 flex flex-col justify-center">
        <div className="w-full space-y-8">
          {/* Welcome Banner */}
          <div className="text-center space-y-2 max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-full text-emerald-700 dark:text-emerald-300 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified User Access Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Select Your User Profile
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click your name from the directory below to authenticate and enter the inventory management workspace.
            </p>
          </div>

          {/* User Grid Filter / Search & Quick Recovery Trigger */}
          <div className="max-w-xl mx-auto w-full flex flex-col sm:flex-row items-center gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, role, or ID (e.g., Rachel, ADM001)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-3 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  Clear
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setRecoveryTargetUser(null);
                setIsRecoveryModalOpen(true);
              }}
              title="Forgot Password? Recover credentials via administrative security questions or offline emergency bypass key"
              className="w-full sm:w-auto px-3.5 py-2.5 bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-slate-300 dark:border-slate-700 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 cursor-pointer shrink-0 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
              <span>Forgot Password?</span>
            </button>
          </div>

          {/* User Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredAdmins.map((admin) => {
              const isSelected = selectedAdmin?.IssuerID === admin.IssuerID;
              const isSuperior = admin.IssuerID === 'ADM001';
              const roleDisplay = admin.Role || admin.IssuerRole || 'Authorized Staff';
              const avatarColor = getAvatarColor(roleDisplay, isSuperior);

              return (
                <button
                  key={admin.IssuerID}
                  type="button"
                  onClick={() => handleSelectUser(admin)}
                  className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 relative group ${
                    isSelected
                      ? 'bg-emerald-50/90 dark:bg-emerald-950/50 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl border flex items-center justify-center font-bold text-sm shrink-0 transition-transform group-hover:scale-105 ${avatarColor}`}
                    >
                      {getInitials(admin.IssuerName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-sm font-bold truncate ${
                            isSelected
                              ? 'text-emerald-900 dark:text-emerald-200'
                              : 'text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {admin.IssuerName}
                        </span>
                        {isSuperior && (
                          <span
                            title="Superior Admin — Full System Privileges"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[10px] font-bold"
                          >
                            <Crown className="w-3 h-3 text-amber-500" />
                            <span>Superior Admin</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                        <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                          {admin.IssuerID}
                        </span>
                        <span className="truncate">{roleDisplay}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredAdmins.length === 0 && (
            <div className="text-center py-8 text-sm text-slate-500">
              No registered user matches &quot;{searchQuery}&quot;. Please check the spelling or clear the search.
            </div>
          )}

          {/* Password Authentication Modal / Card (renders when a user is selected) */}
          {selectedAdmin && (
            <div className="max-w-md mx-auto w-full bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-500 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {getInitials(selectedAdmin.IssuerName)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {selectedAdmin.IssuerName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedAdmin.Role} ({selectedAdmin.IssuerID})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {errorMsg && (
                <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Enter Password
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Security Verified
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      ref={passwordInputRef}
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter secret password..."
                      disabled={attempts >= 4}
                      autoFocus
                      className="w-full px-4 py-2.5 pl-10 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="w-1/2 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={attempts >= 4}
                    className="w-1/2 flex items-center justify-center space-x-1.5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 rounded-xl shadow-md transition cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Log In</span>
                  </button>
                </div>

                <div className="pt-2 text-center border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryTargetUser(selectedAdmin);
                      setIsRecoveryModalOpen(true);
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Forgot Password? Reset via security questions or offline emergency bypass key &rarr;</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>

      {/* Offline Password Recovery Modal */}
      {isRecoveryModalOpen && (
        <OfflinePasswordRecoveryModal
          isOpen={isRecoveryModalOpen}
          onClose={() => setIsRecoveryModalOpen(false)}
          admins={safeAdmins}
          preSelectedUser={recoveryTargetUser || selectedAdmin}
          onUpdateAdmin={
            onUpdateAdmin ||
            (async (u) => {
              const idx = safeAdmins.findIndex((a) => a.IssuerID === u.IssuerID);
              if (idx >= 0) safeAdmins[idx] = u;
            })
          }
          onRecoverySuccess={(updatedUser, newPass) => {
            setPassword(newPass);
            setSelectedAdmin(updatedUser);
            setIsRecoveryModalOpen(false);
            setErrorMsg('');
          }}
        />
      )}

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4 px-6 text-xs text-slate-500 text-center">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Paramount Exports — Stationery &amp; Cleaning Inventory System</span>
          <span className="text-slate-400">100% Offline SQLite &amp; Local Persistence</span>
        </div>
      </footer>
    </div>
  );
};
