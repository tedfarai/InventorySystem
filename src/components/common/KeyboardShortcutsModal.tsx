import React from 'react';
import {
  Keyboard,
  Search,
  PlusCircle,
  FileText,
  Truck,
  Printer,
  Database,
  Users,
  Shield,
  X,
  Command,
  CornerDownLeft,
} from 'lucide-react';
import { DraggableResizableModal } from './DraggableResizableModal';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcutGroups = [
    {
      group: 'Quick Navigation & Search',
      items: [
        { keys: [`${modKey}`, 'S'], altKeys: [`${modKey}`, 'K'], label: 'Focus Master Stock Search Bar', icon: Search },
        { keys: ['Esc'], label: 'Close Active Modal / Reset Filter', icon: X },
        { keys: ['?'], altKeys: [`${modKey}`, '/'], label: 'Open Keyboard Shortcuts Guide', icon: Keyboard },
      ],
    },
    {
      group: 'Inventory Operations',
      items: [
        { keys: [`${modKey}`, 'Shift', 'N'], label: 'Create New Stock Item (ST/CL/GN)', icon: PlusCircle },
        { keys: [`${modKey}`, 'I'], label: 'Issue Stock Requisition Workflow', icon: FileText },
        { keys: [`${modKey}`, 'D'], label: 'Record Stock Delivery / Inbound GRN', icon: Truck },
        { keys: [`${modKey}`, 'P'], label: 'View Latest Document / Print Slip', icon: Printer },
      ],
    },
    {
      group: 'Administration & System',
      items: [
        { keys: [`${modKey}`, 'B'], label: 'Open Backup & Recovery Manager', icon: Database },
        { keys: [`${modKey}`, 'U'], label: 'User Sign-in / Access Controller', icon: Users },
        { keys: [`${modKey}`, 'Shift', 'A'], label: 'Superior Admin Authorization Hub', icon: Shield },
        { keys: [`${modKey}`, 'Shift', '1..7'], label: 'Switch Views (Simulator, Audit, Electron, etc.)', icon: Command },
      ],
    },
  ];

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="keyboard-shortcuts-modal"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-500/30">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              Global Keyboard Shortcuts
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Speed up workflows and inventory navigation with power user hotkeys
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Shortcuts Body */}
      <div className="p-6 overflow-y-auto space-y-6 flex-1 min-h-0">
          {shortcutGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 font-mono">
                {group.group}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 hover:border-teal-500/50 transition"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium truncate text-slate-700 dark:text-slate-200">
                          {item.label}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        {item.keys.map((k, kIdx) => (
                          <kbd
                            key={kIdx}
                            className="px-2 py-1 text-[11px] font-mono font-bold bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 rounded-md border border-slate-300 dark:border-slate-700 shadow-xs"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-1.5 font-mono text-[11px]">
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-bold">
              Esc
            </kbd>
            <span>anytime to close</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg transition cursor-pointer text-xs"
          >
            Got It
          </button>
        </div>
    </DraggableResizableModal>
  );
};
