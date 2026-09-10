import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  PackagePlus,
  Edit3,
  Trash2,
  PackageCheck,
  Table,
  ListPlus,
  Send,
  SlidersHorizontal,
  ShieldAlert,
  FileText,
  Building2,
  Activity,
  Users,
  Database,
  Archive,
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  Crown,
  Code2,
  BookOpen,
  FolderOpen,
  Lock,
  LayoutDashboard,
  UserCheck,
} from 'lucide-react';
import { AdminUser } from '../../types';
import { ProcurementTabType } from '../simulator/ProcurementOperationsDialog';

export type SidebarAction =
  | { type: 'NAVIGATE_SHEET'; sheet: 'Master_Stock' | 'Movement_Log' | 'Adjustment_Hub' | 'Admin_Config' }
  | { type: 'OPEN_TAB'; tab: ProcurementTabType; subMode?: string }
  | { type: 'OPEN_MODAL'; modal: 'reorderReport' | 'adjustmentRequests' | 'superiorAdjustmentManager' | 'userManagement' | 'backupRecovery' | 'folderConfig' | 'documentVault' | 'vbaHub' | 'setupGuide' | 'accountDetails' }
  | { type: 'NAVIGATE_APP_TAB'; appTab: 'simulator' | 'audit' | 'vba' | 'guide' | 'export' | 'dashboard' };

interface NavSubItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  action: (isSuperiorAdmin: boolean) => SidebarAction;
  requiresSuperiorAdmin?: boolean;
  requiresManager?: boolean;
  badge?: (props: { pendingRequestsCount: number; belowThresholdCount: number }) => React.ReactNode;
}

interface NavItemConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor?: string;
  type: 'direct' | 'accordion' | 'section-header';
  action?: (isSuperiorAdmin: boolean) => SidebarAction;
  children?: NavSubItemConfig[];
  requiresSuperiorAdmin?: boolean;
  requiresManager?: boolean;
  badge?: (props: { pendingRequestsCount: number; belowThresholdCount: number; isSuperiorAdmin: boolean }) => React.ReactNode;
  isActive?: (props: { activeSheet: string; activeAppTab: string }) => boolean;
}

interface SidebarAccordionNavProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AdminUser | null;
  onLogout: () => void;
  onSelectAction: (action: SidebarAction) => void;
  activeSheet?: string;
  activeAppTab?: string;
  belowThresholdCount?: number;
  pendingRequestsCount?: number;
}

export const SidebarAccordionNav: React.FC<SidebarAccordionNavProps> = ({
  isOpen,
  onClose,
  currentUser,
  onLogout,
  onSelectAction,
  activeSheet = 'Master_Stock',
  activeAppTab = 'simulator',
  belowThresholdCount = 0,
  pendingRequestsCount = 0,
}) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  const isSuperiorAdmin = currentUser?.IssuerID === 'ADM001';
  const roleLower = (currentUser?.Role || currentUser?.IssuerRole || '').toLowerCase();
  const isManagerOrSupervisor =
    isSuperiorAdmin ||
    roleLower.includes('manager') ||
    roleLower.includes('supervisor') ||
    roleLower.includes('administrator') ||
    roleLower.includes('controller');

  const toggleAccordion = (name: string) => {
    setOpenAccordion((prev) => (prev === name ? null : name));
  };

  const handleAction = (action: SidebarAction) => {
    onSelectAction(action);
    onClose();
  };

  // Centralized Navigation Items Configuration
  const NAV_CONFIG: NavItemConfig[] = [
    {
      id: 'executive_dashboard',
      label: 'Executive Dashboard',
      icon: LayoutDashboard,
      iconColor: 'text-teal-600 dark:text-teal-400',
      type: 'direct',
      action: () => ({ type: 'NAVIGATE_APP_TAB', appTab: 'dashboard' }),
      isActive: ({ activeAppTab: tab }) => tab === 'dashboard',
    },
    {
      id: 'master_stock',
      label: 'Master Stock Sheet',
      icon: FileSpreadsheet,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'direct',
      action: () => ({ type: 'NAVIGATE_SHEET', sheet: 'Master_Stock' }),
      isActive: ({ activeSheet: sheet, activeAppTab: tab }) =>
        sheet === 'Master_Stock' && tab === 'simulator',
    },
    {
      id: 'stockItems',
      label: 'Stock-Items +/− (Accordion Menu)',
      icon: PackagePlus,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'accordion',
      children: [
        {
          id: 'create_stock',
          label: '1. Create Stock Item',
          icon: PackagePlus,
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'createStock' }),
        },
        {
          id: 'edit_stock',
          label: '2. Edit Stock Item',
          icon: Edit3,
          iconColor: 'text-amber-600 dark:text-amber-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'editStockItem' }),
        },
        {
          id: 'delete_stock',
          label: '3. Delete Stock-Item (ADM001)',
          icon: Trash2,
          iconColor: 'text-rose-600 dark:text-rose-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'editStockItem' }),
          requiresSuperiorAdmin: true,
        },
      ],
    },
    {
      id: 'receive',
      label: 'Receive + (Accordion Menu)',
      icon: PackageCheck,
      iconColor: 'text-sky-600 dark:text-sky-400',
      type: 'accordion',
      children: [
        {
          id: 'single_entry',
          label: '1. Single Item Quick Entry',
          icon: PackageCheck,
          iconColor: 'text-sky-600 dark:text-sky-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'delivery', subMode: 'single' }),
        },
        {
          id: 'bulk_grid',
          label: '2. Interactive Bulk Stock Grid Entry',
          icon: Table,
          iconColor: 'text-sky-600 dark:text-sky-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'delivery', subMode: 'bulkGrid' }),
        },
        {
          id: 'bulk_manifest',
          label: '3. Bulk Delivery Que Manifest',
          icon: ListPlus,
          iconColor: 'text-sky-600 dark:text-sky-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'delivery', subMode: 'bulkQueue' }),
        },
      ],
    },
    {
      id: 'issue_out',
      label: 'Issue Out Requests',
      icon: Send,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'direct',
      action: () => ({ type: 'OPEN_TAB', tab: 'issue' }),
    },
    {
      id: 'adjustment',
      label: 'Stock Adjustment +/− (Accordion Menu)',
      icon: SlidersHorizontal,
      iconColor: 'text-amber-600 dark:text-amber-400',
      type: 'accordion',
      badge: ({ pendingRequestsCount: pending, isSuperiorAdmin: admin }) =>
        pending > 0 && admin ? (
          <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
            {pending}
          </span>
        ) : null,
      children: [
        {
          id: 'stock_adjustment_direct',
          label: '1. Stock Adjustment',
          icon: SlidersHorizontal,
          iconColor: 'text-amber-600 dark:text-amber-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'adjustment' }),
        },
        {
          id: 'stock_adjustment_portal',
          label: '2. Stock Item Adjustment Request & Authorization Portal',
          icon: ShieldAlert,
          iconColor: 'text-rose-600 dark:text-rose-400',
          action: (admin) =>
            admin
              ? { type: 'OPEN_MODAL', modal: 'superiorAdjustmentManager' }
              : { type: 'OPEN_MODAL', modal: 'adjustmentRequests' },
          badge: ({ pendingRequestsCount: pending }) =>
            pending > 0 ? (
              <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold shrink-0 ml-1">
                {pending}
              </span>
            ) : null,
        },
      ],
    },
    {
      id: 'reorder_report',
      label: 'Stock Re-Order & Safety Threshold Report',
      icon: FileText,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'direct',
      action: () => ({ type: 'OPEN_MODAL', modal: 'reorderReport' }),
      badge: ({ belowThresholdCount: below }) =>
        below > 0 ? (
          <span className="bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono">
            {below}
          </span>
        ) : null,
    },
    {
      id: 'departments',
      label: 'Departments Information +/− (Accordion Menu)',
      icon: Building2,
      iconColor: 'text-teal-600 dark:text-teal-400',
      type: 'accordion',
      children: [
        {
          id: 'edit_departments',
          label: '1. Edit Departments & Managers',
          icon: Building2,
          iconColor: 'text-teal-600 dark:text-teal-400',
          action: () => ({ type: 'OPEN_TAB', tab: 'departments' }),
        },
      ],
    },
    {
      id: 'movement_log',
      label: 'Movement Log',
      icon: Activity,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'direct',
      action: () => ({ type: 'NAVIGATE_SHEET', sheet: 'Movement_Log' }),
      isActive: ({ activeSheet: sheet }) => sheet === 'Movement_Log',
    },
    {
      id: 'user_account',
      label: 'Account',
      icon: UserCheck,
      iconColor: 'text-emerald-600 dark:text-emerald-400',
      type: 'direct',
      action: () => ({ type: 'OPEN_MODAL', modal: 'accountDetails' }),
    },
    {
      id: 'superior_admin_section',
      label: 'Superior Administration',
      icon: Crown,
      iconColor: 'text-amber-500',
      type: 'section-header',
      requiresSuperiorAdmin: true,
      children: [
        {
          id: 'user_management',
          label: 'User Management (ADM001)',
          icon: Users,
          iconColor: 'text-amber-500',
          action: () => ({ type: 'OPEN_MODAL', modal: 'userManagement' }),
          requiresSuperiorAdmin: true,
        },
        {
          id: 'backup_recovery',
          label: 'Backup & Recovery Vault',
          icon: Database,
          iconColor: 'text-emerald-500',
          action: () => ({ type: 'OPEN_MODAL', modal: 'backupRecovery' }),
          requiresSuperiorAdmin: true,
        },
        {
          id: 'folder_config',
          label: 'File Repository Paths',
          icon: FolderOpen,
          iconColor: 'text-slate-400',
          action: () => ({ type: 'OPEN_MODAL', modal: 'folderConfig' }),
          requiresSuperiorAdmin: true,
        },
      ],
    },
    {
      id: 'system_tools_section',
      label: 'System Document Vault & Tools',
      icon: Archive,
      iconColor: 'text-teal-500',
      type: 'section-header',
      children: [
        {
          id: 'document_vault',
          label: 'Central Document Vault',
          icon: Archive,
          iconColor: 'text-teal-500',
          action: () => ({ type: 'OPEN_MODAL', modal: 'documentVault' }),
        },
        {
          id: 'app_audit',
          label: 'Audit Analytics & Visualizer',
          icon: Activity,
          iconColor: 'text-emerald-500',
          action: () => ({ type: 'NAVIGATE_APP_TAB', appTab: 'audit' }),
        },
        {
          id: 'app_vba',
          label: 'VBA Code Hub & Generator',
          icon: Code2,
          iconColor: 'text-sky-500',
          action: () => ({ type: 'NAVIGATE_APP_TAB', appTab: 'vba' }),
        },
        {
          id: 'app_guide',
          label: 'Setup Guide & Architecture',
          icon: BookOpen,
          iconColor: 'text-teal-500',
          action: () => ({ type: 'NAVIGATE_APP_TAB', appTab: 'guide' }),
        },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-start pointer-events-auto" role="dialog" aria-modal="true">
          {/* Backdrop Overlay with Smooth Opacity Fade-in Transition (No blur to keep master stock sheet crisp) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 bg-slate-950/35"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Slide-in from Left Sidebar Panel */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280, mass: 0.8 }}
            className="relative z-10 w-84 max-w-[85vw] bg-white dark:bg-slate-900 h-full flex flex-col shadow-2xl border-r border-slate-200 dark:border-slate-800"
          >
            {/* Header with Title & Close Button */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                  PE
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    Mobile Menu
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Toggleable Navigation Drawer
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer transition min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Hide side bar"
                aria-label="Hide side bar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Identity Card */}
            {currentUser && (
              <div className="p-3.5 mx-3 mt-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {(currentUser.IssuerName || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.IssuerName || 'User'}
                      </span>
                      {isSuperiorAdmin && (
                        <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      <span className="font-mono text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-900/60 px-1 py-0.2 rounded text-emerald-800 dark:text-emerald-300">
                        {currentUser.IssuerID || 'ID'}
                      </span>
                      <span className="truncate">{currentUser.Role || currentUser.IssuerRole || 'Staff'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Scrollable Navigation Items mapped from centralized config */}
            <nav className="flex-1 overflow-y-auto p-3 space-y-1 text-xs">
              {NAV_CONFIG.map((item) => {
                // Permission verification
                if (item.requiresSuperiorAdmin && !isSuperiorAdmin) return null;
                if (item.requiresManager && !isManagerOrSupervisor) return null;

                const IconComponent = item.icon;

                // Section Header with sub-items
                if (item.type === 'section-header') {
                  return (
                    <div key={item.id} className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <IconComponent className={`w-3.5 h-3.5 ${item.iconColor || 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.children?.map((subItem) => {
                        if (subItem.requiresSuperiorAdmin && !isSuperiorAdmin) return null;
                        if (subItem.requiresManager && !isManagerOrSupervisor) return null;

                        const SubIcon = subItem.icon;
                        const actionToRun = subItem.action(isSuperiorAdmin);
                        const isSubActive =
                          actionToRun.type === 'NAVIGATE_APP_TAB' &&
                          actionToRun.appTab === activeAppTab;

                        return (
                          <button
                            key={subItem.id}
                            onClick={() => handleAction(actionToRun)}
                            className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer text-left hover:scale-[1.015] hover:shadow-xs ${
                              isSubActive
                                ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 border-l-4 border-emerald-600 font-bold shadow-2xs'
                                : 'border-l-4 border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <SubIcon className={`w-4 h-4 shrink-0 ${subItem.iconColor || 'text-slate-400'}`} />
                            <span className="truncate">{subItem.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                }

                // Direct Clickable Navigation Link
                if (item.type === 'direct') {
                  const isActive = item.isActive
                    ? item.isActive({ activeSheet, activeAppTab })
                    : false;

                  return (
                    <button
                      key={item.id}
                      onClick={() => item.action && handleAction(item.action(isSuperiorAdmin))}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer text-left hover:scale-[1.015] hover:shadow-xs ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 border-l-4 border-emerald-600 font-bold shadow-2xs'
                          : 'border-l-4 border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <IconComponent className={`w-4 h-4 shrink-0 ${item.iconColor || ''}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <div>
                          {item.badge({
                            pendingRequestsCount,
                            belowThresholdCount,
                            isSuperiorAdmin,
                          })}
                        </div>
                      )}
                    </button>
                  );
                }

                // Accordion Nav Group
                if (item.type === 'accordion') {
                  const isExpanded = openAccordion === item.id;

                  return (
                    <div key={item.id} className="space-y-0.5">
                      <button
                        onClick={() => toggleAccordion(item.id)}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-all duration-150 hover:scale-[1.015] hover:shadow-xs border-l-4 border-transparent text-left"
                      >
                        <div className="flex items-center space-x-2.5">
                          <IconComponent className={`w-4 h-4 shrink-0 ${item.iconColor || ''}`} />
                          <span>{item.label}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          {item.badge && (
                            <div>
                              {item.badge({
                                pendingRequestsCount,
                                belowThresholdCount,
                                isSuperiorAdmin,
                              })}
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden pl-5 pr-1 py-1 space-y-1 border-l-2 border-emerald-500/30 ml-4"
                          >
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon;

                              if (child.requiresSuperiorAdmin && !isSuperiorAdmin) {
                                return (
                                  <div
                                    key={child.id}
                                    className="flex items-center space-x-2 px-3 py-1.5 text-slate-400 dark:text-slate-500 text-[11px]"
                                  >
                                    <Lock className="w-3 h-3 shrink-0" />
                                    <span>{child.label} (ADM001 Only)</span>
                                  </div>
                                );
                              }

                              return (
                                <button
                                  key={child.id}
                                  onClick={() => handleAction(child.action(isSuperiorAdmin))}
                                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer font-medium text-left transition-all duration-150 hover:scale-[1.015] hover:shadow-2xs"
                                >
                                  <div className="flex items-center space-x-2 truncate">
                                    <ChildIcon className={`w-3.5 h-3.5 shrink-0 ${child.iconColor || ''}`} />
                                    <span className="truncate">{child.label}</span>
                                  </div>
                                  {child.badge && (
                                    <div>
                                      {child.badge({
                                        pendingRequestsCount,
                                        belowThresholdCount,
                                      })}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                return null;
              })}
            </nav>

            {/* Sidebar Footer with Logout Button */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs transition cursor-pointer border border-rose-200 dark:border-rose-900"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out Account</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
