import React, { useState } from 'react';
import { FolderOpen, HardDrive, CheckCircle2, ShieldCheck, FolderPlus, Sparkles, Folder } from 'lucide-react';

interface MasterFolderConfigModalProps {
  currentPath: string;
  onSavePath: (newPath: string) => void;
  onClose: () => void;
}

export const MasterFolderConfigModal: React.FC<MasterFolderConfigModalProps> = ({
  currentPath,
  onSavePath,
  onClose,
}) => {
  const [selectedLocation, setSelectedLocation] = useState(currentPath);
  const [customPathInput, setCustomPathInput] = useState(currentPath);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Quick Preset Locations
  const presets = [
    { label: 'Default System Path (C:\\Stationery & Cleaning)', path: 'C:\\Stationery & Cleaning' },
    { label: 'Public Documents Directory (C:\\Users\\Public\\Documents\\Stationery & Cleaning)', path: 'C:\\Users\\Public\\Documents\\Stationery & Cleaning' },
    { label: 'Custom Corporate Network Drive (Z:\\Company_Procurement\\Stationery & Cleaning)', path: 'Z:\\Company_Procurement\\Stationery & Cleaning' },
    { label: 'D Drive Archive (D:\\Stationery & Cleaning)', path: 'D:\\Stationery & Cleaning' },
  ];

  const handleSelectPreset = (path: string) => {
    setSelectedLocation(path);
    setCustomPathInput(path);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPath = customPathInput.trim() || 'C:\\Stationery & Cleaning';
    onSavePath(finalPath);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const formattedPath = customPathInput.endsWith('\\') ? customPathInput : `${customPathInput}\\`;

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl shadow-2xl border-2 border-amber-500/80 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-5 h-5 text-amber-400" />
            <span className="font-mono text-xs font-bold text-slate-100">
              Master Folder Location Configuration — Stationery & Cleaning
            </span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold">
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-xl flex items-start space-x-3 text-xs text-slate-700 dark:text-slate-300">
            <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                Automatic Document Hierarchy Storage
              </span>
              All generated Goods Received Vouchers (GRNs) and Issued Items Slips will strictly and automatically save inside your chosen Master Folder and its two dedicated subfolders.
            </div>
          </div>

          {/* Folder Structure Live Visualizer */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono text-slate-300">
            <div className="text-amber-400 font-bold flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <FolderPlus className="w-4 h-4 text-amber-400" />
              Active Folder Tree Hierarchy:
            </div>

            <div className="space-y-1.5 pl-2 pt-1 text-[11px]">
              <div className="flex items-center space-x-2 text-amber-300 font-bold">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>{formattedPath}</span>
                <span className="text-[10px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded font-normal">
                  Master Folder
                </span>
              </div>

              <div className="pl-6 space-y-1 border-l-2 border-slate-800">
                <div className="flex items-center space-x-2 text-blue-400">
                  <Folder className="w-3.5 h-3.5 text-blue-400" />
                  <span>{formattedPath}Received_Items\</span>
                  <span className="text-[10px] text-slate-400 font-sans italic">
                    (Stores Goods Received Vouchers / GRNs)
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-emerald-400">
                  <Folder className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{formattedPath}Issued_Items\</span>
                  <span className="text-[10px] text-slate-400 font-sans italic">
                    (Stores Generated Issue Slips)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Location Selection Presets */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Select or Choose Local / Network Save Location:
            </label>

            <div className="space-y-1.5">
              {presets.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  onClick={() => handleSelectPreset(p.path)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs flex items-center justify-between transition ${
                    selectedLocation === p.path
                      ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                      : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center space-x-2">
                    <HardDrive className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{p.label}</span>
                  </span>
                  {selectedLocation === p.path && (
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Path Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Custom Folder Path Location Input
            </label>
            <input
              type="text"
              value={customPathInput}
              onChange={(e) => {
                setCustomPathInput(e.target.value);
                setSelectedLocation(e.target.value);
              }}
              placeholder="e.g. C:\Stationery & Cleaning"
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {savedSuccess && (
            <div className="bg-emerald-950 border border-emerald-600 text-emerald-300 p-3 rounded-lg text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>Master folder path saved successfully! Automatic saving updated.</span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center space-x-2 px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Chosen Master Folder Location</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
