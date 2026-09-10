import React, { useState } from 'react';
import { Code2, Copy, Check, Search, Download, FileCode, Shield, Layers } from 'lucide-react';
import { VBA_MODULES } from '../../data/vbaCodeTemplates';

export const VbaCodeHub: React.FC = () => {
  const [selectedModuleId, setSelectedModuleId] = useState(VBA_MODULES[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const activeModule = VBA_MODULES.find((m) => m.id === selectedModuleId) || VBA_MODULES[0];

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyAllCombined = () => {
    const combined = VBA_MODULES.map(
      (m) => `'===============================================================================\n' FILE: ${m.name}\n' TYPE: ${m.type}\n' ${m.description}\n'===============================================================================\n\n${m.code}\n\n`
    ).join('\n');

    navigator.clipboard.writeText(combined);
    setCopiedId('ALL');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredModules = VBA_MODULES.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-teal-700 dark:text-teal-400">
            <Code2 className="w-6 h-6 text-teal-600 dark:text-teal-400" />
            VBA Macro Code Repository
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
            Complete production-ready VBA source code for 32-bit/64-bit Excel. Includes <code className="font-mono text-teal-700 dark:text-teal-400 font-semibold">Workbook_Open</code>, masked UserForms, stock deduction routines, <code className="font-mono text-teal-700 dark:text-teal-400 font-semibold">mod_ThemeEngine</code> for Light/Dark mode toggling, <code className="font-mono text-teal-700 dark:text-teal-400 font-semibold">ExportAsFixedFormat</code> PDF issue voucher generation, and FileFormat 52 autosave.
          </p>
        </div>

        <button
          onClick={handleCopyAllCombined}
          className="flex items-center space-x-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white rounded-xl text-xs font-bold shadow-sm transition"
        >
          {copiedId === 'ALL' ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
          <span>{copiedId === 'ALL' ? 'All VBA Code Copied!' : 'Copy Entire VBA Suite'}</span>
        </button>
      </div>

      {/* Code Explorer Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Module List Sidebar */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 shadow-xs">
          <div className="relative">
            <input
              type="text"
              placeholder="Filter VBA modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-xs font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-teal-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
          </div>

          <div className="space-y-1">
            {filteredModules.map((module) => (
              <button
                key={module.id}
                onClick={() => setSelectedModuleId(module.id)}
                className={`w-full text-left p-3 rounded-lg text-xs transition border flex items-start justify-between ${
                  selectedModuleId === module.id
                    ? 'bg-teal-50 dark:bg-slate-800 border-teal-500 text-teal-900 dark:text-white shadow-xs font-medium'
                    : 'bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="font-mono font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                    <FileCode className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                    <span>{module.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{module.description}</div>
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ml-2 border ${
                    module.type === 'Class'
                      ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      : module.type === 'UserForm'
                      ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  {module.type}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Code Viewer Panel */}
        <div className="lg:col-span-8 bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col shadow-xs">
          {/* Active File Header */}
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-mono font-bold text-sm text-teal-400">{activeModule.name}</span>
              <span className="text-xs text-slate-400 font-mono">({activeModule.type})</span>
            </div>

            <button
              onClick={() => handleCopyCode(activeModule.id, activeModule.code)}
              className="flex items-center space-x-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold border border-slate-700 transition"
            >
              {copiedId === activeModule.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-teal-400" />
                  <span className="text-teal-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3 bg-slate-900/80 border-b border-slate-800 text-xs text-slate-400">
            {activeModule.description}
          </div>

          {/* Syntax Highlighted Code Viewer */}
          <div className="p-4 overflow-x-auto font-mono text-xs leading-relaxed text-slate-200 bg-slate-950 min-h-[450px] max-h-[600px] overflow-y-auto">
            <pre>
              <code>{activeModule.code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
