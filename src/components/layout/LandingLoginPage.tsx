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
  UserCheck,
  HelpCircle,
  RotateCcw,
  Layers,
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
  const [showInstallBanner, setShowInstallBanner] = useState(true);

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
      setErrorMsg('Please select your user profile from the left side panel.');
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
    if (isSuperior) return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40';
    if (r.includes('manager')) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';
    if (r.includes('supervisor')) return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/40';
    if (r.includes('controller')) return 'bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/40';
    return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-400/40';
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
                id="btn-login-install-pwa"
                type="button"
                onClick={onOpenInstallModal}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer transition whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Install PWA</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* PWA In-App Install Floating Banner */}
      {isInstallable && onOpenInstallModal && showInstallBanner && (
        <aside
          id="pwa-install-banner-login"
          className="pwa-install-banner fixed bottom-4 left-4 right-4 z-40 mx-auto flex max-w-2xl items-center gap-4 rounded-2xl p-4 shadow-2xl bg-white dark:bg-slate-900 border border-emerald-500/30"
          aria-live="polite"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
            <Download className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm text-slate-900 dark:text-white">Install Paramount Stock</strong>
            <span className="block text-xs text-slate-600 dark:text-slate-300">
              Install app for full workspace features and reliable offline document access.
            </span>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              id="btn-login-install-now"
              type="button"
              onClick={onOpenInstallModal}
              className="min-h-11 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
            >
              Install Now
            </button>
            <button
              id="btn-login-install-later"
              type="button"
              onClick={() => setShowInstallBanner(false)}
              className="min-h-11 rounded-xl bg-slate-200 px-4 text-xs font-bold text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-200 cursor-pointer whitespace-nowrap"
            >
              Maybe Later
            </button>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-10 flex flex-col justify-center">
        <div className="w-full max-w-6xl mx-auto space-y-6">
          {/* Welcome Banner / Introductory Section */}
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

          {/* SPLIT 2-COLUMN MODERN LOGIN CONTAINER WITH VERTICAL BORDER */}
          <div
            id="login-split-portal-card"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2">
              {/* ======================================================== */}
              {/* LEFT HALF: REGISTERED USERNAMES (2 COLUMNS, SCROLLABLE) */}
              {/* ======================================================== */}
              <div className="p-5 sm:p-6 lg:p-7 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40">
                <div className="space-y-4">
                  {/* Left Half Header & Search */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
                        <UserCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                          Registered Users
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Click your card to select your username
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-full self-start sm:self-auto whitespace-nowrap">
                      {filteredAdmins.length} Active Users
                    </span>
                  </div>

                  {/* Search Input for Quick User Lookup */}
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      id="input-search-users"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter by name, role, or ID (e.g. Rachel, ADM001)..."
                      className="w-full pl-10 pr-16 py-2.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs transition"
                    />
                    {searchQuery && (
                      <button
                        id="btn-clear-search-users"
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-2.5 text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-1.5 py-0.5 rounded cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Scrollable 2-Column User Grid (Displays 2 names per row going down) */}
                  <div
                    id="users-scrollable-grid-container"
                    className="overflow-y-auto max-h-[460px] sm:max-h-[500px] pr-1.5 space-y-2.5"
                    tabIndex={0}
                    aria-label="Registered users directory list"
                  >
                    {filteredAdmins.length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                        <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
                        <p>No registered user matches &quot;{searchQuery}&quot;.</p>
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold cursor-pointer"
                        >
                          Reset Search Filter
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {filteredAdmins.map((admin) => {
                          const isSelected = selectedAdmin?.IssuerID === admin.IssuerID;
                          const isSuperior = admin.IssuerID === 'ADM001';
                          const roleDisplay = admin.Role || admin.IssuerRole || 'Authorized Staff';
                          const avatarColor = getAvatarColor(roleDisplay, isSuperior);

                          return (
                            <button
                              key={admin.IssuerID}
                              id={`user-card-${admin.IssuerID}`}
                              type="button"
                              onClick={() => handleSelectUser(admin)}
                              className={`text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5 relative group ${
                                isSelected
                                  ? 'bg-emerald-50/90 dark:bg-emerald-950/60 border-emerald-500 dark:border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-xs'
                              }`}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                <div
                                  className={`w-9 h-9 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105 ${avatarColor}`}
                                >
                                  {getInitials(admin.IssuerName)}
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={`text-xs font-bold truncate block ${
                                        isSelected
                                          ? 'text-emerald-950 dark:text-emerald-200'
                                          : 'text-slate-900 dark:text-slate-100'
                                      }`}
                                    >
                                      {admin.IssuerName}
                                    </span>
                                    {isSuperior && (
                                      <Crown
                                        className="w-3 h-3 text-amber-500 shrink-0"
                                        title="Superior Admin"
                                      />
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold shrink-0">
                                      {admin.IssuerID}
                                    </span>
                                    <span className="truncate">{roleDisplay}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0">
                                {isSelected ? (
                                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </div>
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                    <ArrowRight className="w-3 h-3" />
                                  </div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Left Half Footer Info */}
                <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                  <span>Showing {filteredAdmins.length} registered profiles</span>
                  <span className="font-mono text-[10px] text-emerald-600 dark:text-emerald-400">Offline SQLite Verified</span>
                </div>
              </div>

              {/* ======================================================== */}
              {/* RIGHT HALF: DYNAMIC PASSWORD / WELCOME AUTHENTICATION    */}
              {/* ======================================================== */}
              <div
                id="login-right-auth-panel"
                className="p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white dark:bg-slate-900"
              >
                {!selectedAdmin ? (
                  /* Initial State: Prompt to select a user from the left side panel */
                  <div className="text-center py-6 sm:py-10 space-y-5 animate-in fade-in duration-200">
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-xs">
                      <Lock className="w-8 h-8" />
                    </div>

                    <div className="space-y-2 max-w-md mx-auto">
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Select Your Username &amp; Enter Your Password
                      </h3>
                    </div>

                    {/* Quick Guidance Visual Pill */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-600 rotate-180" />
                      <span>Choose your user card on the left to begin</span>
                    </div>

                  </div>
                ) : (
                  /* Active State: User has clicked a username -> Show Welcome Back & Password Login */
                  <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">
                    {/* Welcome Header */}
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                        <Sparkles className="w-3 h-3" />
                        <span>User Selected</span>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        Welcome Back! {selectedAdmin.IssuerName}
                      </h3>
                      <p className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        Enter Your Password
                      </p>
                    </div>

                    {/* User Profile Summary Card with Change Button */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-xs shrink-0 ${getAvatarColor(
                            selectedAdmin.Role || selectedAdmin.IssuerRole,
                            selectedAdmin.IssuerID === 'ADM001'
                          )}`}
                        >
                          {getInitials(selectedAdmin.IssuerName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {selectedAdmin.IssuerName}
                            </span>
                            {selectedAdmin.IssuerID === 'ADM001' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 rounded text-[9px] font-bold">
                                <Crown className="w-2.5 h-2.5 text-amber-500" />
                                <span>Superior Admin</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono text-[10px] bg-white dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                              {selectedAdmin.IssuerID}
                            </span>
                            <span className="truncate">{selectedAdmin.Role || selectedAdmin.IssuerRole}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        id="btn-change-selected-user"
                        type="button"
                        onClick={handleClearSelection}
                        className="text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white px-2.5 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold transition cursor-pointer whitespace-nowrap"
                      >
                        Change
                      </button>
                    </div>

                    {/* Error Alert Box */}
                    {errorMsg && (
                      <div
                        id="login-error-alert"
                        className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-3 rounded-xl text-xs font-medium"
                      >
                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Password Authentication Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label
                            htmlFor="input-login-password"
                            className="text-xs font-bold text-slate-700 dark:text-slate-300"
                          >
                            Enter Your Password
                          </label>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Security Verified
                          </span>
                        </div>
                        <div className="relative">
                          <input
                            id="input-login-password"
                            ref={passwordInputRef}
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={`Enter password for ${selectedAdmin.IssuerName}...`}
                            disabled={attempts >= 4}
                            autoFocus
                            className="w-full px-4 py-3 pl-10 pr-10 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono transition"
                          />
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                          <button
                            id="btn-toggle-password-visibility"
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded cursor-pointer"
                            title={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Submit & Cancel Buttons */}
                      <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
                        <button
                          id="btn-submit-login"
                          type="submit"
                          disabled={attempts >= 4}
                          className="w-full sm:flex-1 flex items-center justify-center space-x-2 py-3 px-6 text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-400 rounded-xl shadow-md transition cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                          <span>Log In</span>
                        </button>
                        <button
                          id="btn-cancel-user-selection"
                          type="button"
                          onClick={handleClearSelection}
                          className="w-full sm:w-auto py-3 px-6 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Prominent Forgot Your Password Button */}
                      <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                          id="btn-user-forgot-password"
                          type="button"
                          onClick={() => {
                            setRecoveryTargetUser(selectedAdmin);
                            setIsRecoveryModalOpen(true);
                          }}
                          className="w-full py-2.5 px-4 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Forgot Your Password?</span>
                        </button>
                        <p className="text-[10px] text-center text-slate-400 mt-1.5">
                          Recover credentials via security questions or offline emergency bypass key.
                        </p>
                      </div>
                    </form>
                  </div>
                )}
              </div>
            </div>
          </div>
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

