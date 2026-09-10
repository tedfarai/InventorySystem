import React, { useState } from 'react';
import {
  Cpu,
  Terminal,
  Workflow,
  Download,
  FolderArchive,
  Layers,
  Database,
  ShieldCheck,
  CheckCircle2,
  FileCode
} from 'lucide-react';
import { StockItem, MovementLogEntry, Department } from '../../types';
import { ElectronCodeViewer } from './ElectronCodeViewer';
import { SqliteConsoleModal } from './SqliteConsoleModal';
import { ElectronArchitectureGuide } from './ElectronArchitectureGuide';
import { downloadElectronProjectZip } from '../../utils/electronZipGenerator';

interface ElectronSuiteViewProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  departments: Department[];
}

export const ElectronSuiteView: React.FC<ElectronSuiteViewProps> = ({
  stockItems,
  movementLogs,
  departments,
}) => {
  const [subTab, setSubTab] = useState<'code' | 'sql' | 'architecture'>('code');
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      await downloadElectronProjectZip('Paramount_Procurement_Electron_Desktop.zip');
    } catch (err) {
      console.error('Failed to download ZIP:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-3 rounded-2xl shadow-sm transition-colors">
        <div className="flex items-center space-x-1.5 flex-wrap">
          <button
            onClick={() => setSubTab('code')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'code'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Complete Source Code &amp; ZIP Exporter</span>
          </button>

          <button
            onClick={() => setSubTab('sql')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'sql'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4 text-teal-400" />
            <span>Offline SQLite Query Studio</span>
          </button>

          <button
            onClick={() => setSubTab('architecture')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              subTab === 'architecture'
                ? 'bg-teal-600 text-white shadow-md'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Workflow className="w-4 h-4 text-blue-400" />
            <span>VBA ➔ Electron Architecture Map</span>
          </button>
        </div>

        {/* Quick ZIP Export Button */}
        <button
          onClick={handleDownloadZip}
          disabled={isZipping}
          className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-teal-400 rounded-xl text-xs font-bold border border-teal-500/30 transition cursor-pointer shadow-sm"
        >
          <FolderArchive className="w-4 h-4" />
          <span>{isZipping ? 'Generating ZIP...' : '1-Click Project .zip'}</span>
        </button>
      </div>

      {/* Sub-View Content */}
      {subTab === 'code' && <ElectronCodeViewer />}

      {subTab === 'sql' && (
        <SqliteConsoleModal
          stockItems={stockItems}
          movementLogs={movementLogs}
          departments={departments}
        />
      )}

      {subTab === 'architecture' && <ElectronArchitectureGuide />}
    </div>
  );
};
