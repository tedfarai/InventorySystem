import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Layers,
  Database,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Copy,
  Check,
  Cpu,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { StockItem, MovementLogEntry, Department } from '../../types';
import { sqliteBridge } from '../../utils/sqliteBridge';

interface SqliteConsoleModalProps {
  stockItems: StockItem[];
  movementLogs: MovementLogEntry[];
  departments: Department[];
}

interface QueryPreset {
  id: string;
  name: string;
  category: string;
  excelFormula: string;
  sqlQuery: string;
  explanation: string;
}

const PRESET_QUERIES: QueryPreset[] = [
  {
    id: 'sumifs-issued',
    name: 'SUMIFS Replacement: Total Units Issued per Category',
    category: 'Formula Replacement (SUMIFS)',
    excelFormula: `=SUMIFS(Movement_Log!$E:$E, Movement_Log!$B:$B, "ISSUE", Movement_Log!$F:$F, A2)`,
    sqlQuery: `SELECT 
  s.category AS Category,
  COUNT(DISTINCT s.item_id) AS Total_SKUs,
  SUM(s.qty) AS Current_Stock_On_Hand,
  COALESCE(SUM(CASE WHEN m.type = 'ISSUE' THEN m.qty ELSE 0 END), 0) AS Total_Units_Issued
FROM master_stock s
LEFT JOIN movement_log m ON s.item_id = m.item_id
GROUP BY s.category
ORDER BY Total_Units_Issued DESC;`,
    explanation: 'Replaces multi-range Excel SUMIFS formulas with a grouped aggregate query executing asynchronously against SQLite.',
  },
  {
    id: 'vlookup-movement',
    name: 'VLOOKUP Replacement: Movement Log + Department Info',
    category: 'Lookup Replacement (VLOOKUP / INDEX-MATCH)',
    excelFormula: `=VLOOKUP(D2, Admin_Config!$F$2:$I$50, 2, FALSE)`,
    sqlQuery: `SELECT 
  m.id AS Log_ID,
  m.timestamp AS Event_Time,
  m.type AS Movement_Type,
  m.item_id AS SKU,
  m.item_name AS Description,
  m.qty AS Quantity,
  COALESCE(d.dept_name, 'Central Store') AS Department_Name,
  COALESCE(d.dept_head_name, 'Storekeeper') AS Approver_Head,
  m.issuer_name AS Logged_By
FROM movement_log m
LEFT JOIN departments d ON m.dept_id = d.dept_id
ORDER BY m.timestamp DESC
LIMIT 15;`,
    explanation: 'Replaces volatile Excel VLOOKUP formulas with a clean relational SQL LEFT JOIN between movement_log and departments.',
  },
  {
    id: 'low-stock-alert',
    name: 'Conditional Stock Reorder Thresholds',
    category: 'Inventory Intelligence',
    excelFormula: `=IF(D2<=E2, "REORDER", "HEALTHY")`,
    sqlQuery: `SELECT 
  item_id AS SKU,
  item_name AS Description,
  category AS Category,
  qty AS Stock_On_Hand,
  reorder_level AS Min_Threshold,
  (reorder_level - qty) AS Deficit_Units,
  CASE 
    WHEN qty <= 0 THEN 'CRITICAL DEPLETION'
    WHEN qty <= reorder_level THEN 'REORDER REQUIRED'
    ELSE 'HEALTHY'
  END AS Stock_Status
FROM master_stock
ORDER BY (qty - reorder_level) ASC;`,
    explanation: 'Identifies all inventory items requiring procurement reorders, sorting by critical stock deficit.',
  },
  {
    id: 'velocity-report',
    name: 'Stock Velocity & Consumption Turnover',
    category: 'Procurement Analytics',
    excelFormula: `=SUMIFS(...) / AVERAGE(...)`,
    sqlQuery: `SELECT 
  s.item_id AS SKU,
  s.item_name AS Item_Name,
  s.category AS Category,
  s.qty AS Current_Stock,
  COUNT(CASE WHEN m.type = 'ISSUE' THEN 1 END) AS Issue_Frequency,
  COALESCE(SUM(CASE WHEN m.type = 'ISSUE' THEN m.qty ELSE 0 END), 0) AS Total_Issued_Qty
FROM master_stock s
LEFT JOIN movement_log m ON s.item_id = m.item_id
GROUP BY s.item_id
ORDER BY Total_Issued_Qty DESC;`,
    explanation: 'Calculates high-velocity items and requisition frequency across all organizational departments.',
  },
  {
    id: 'schema-pragma',
    name: 'Database PRAGMA & Tables Introspection',
    category: 'Database Metadata',
    excelFormula: `VBA Sheets("Master_Stock").ListObjects`,
    sqlQuery: `SELECT 
  name AS Table_Name, 
  type AS Object_Type, 
  sql AS SQL_Definition 
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%';`,
    explanation: 'Inspects active SQLite tables, relations, and data definition constraints directly.',
  },
];

export const SqliteConsoleModal: React.FC<SqliteConsoleModalProps> = () => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sumifs-issued');
  const [customSql, setCustomSql] = useState<string>(PRESET_QUERIES[0].sqlQuery);
  const [copiedQuery, setCopiedQuery] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryExecutionTime, setQueryExecutionTime] = useState<number>(0.2);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [resultColumns, setResultColumns] = useState<string[]>([]);
  const [resultRows, setResultRows] = useState<any[][]>([]);

  const activePreset = PRESET_QUERIES.find((p) => p.id === selectedPresetId) || PRESET_QUERIES[0];

  const runQuery = async (queryText: string) => {
    setIsExecuting(true);
    setQueryError(null);
    const startTime = performance.now();
    try {
      const res = await sqliteBridge.executeRawQuery(queryText);
      const elapsed = Math.max(0.1, Number((performance.now() - startTime).toFixed(2)));
      setQueryExecutionTime(elapsed);
      setResultColumns(Array.isArray(res?.columns) ? res.columns : []);
      setResultRows(Array.isArray(res?.values) ? res.values : []);
    } catch (err: any) {
      setQueryError(err.message || 'SQLite query execution failed');
      setResultColumns([]);
      setResultRows([]);
    } finally {
      setIsExecuting(false);
    }
  };

  const safeColumns = Array.isArray(resultColumns) ? resultColumns : [];
  const safeRows = Array.isArray(resultRows) ? resultRows : [];

  useEffect(() => {
    runQuery(customSql);
  }, []);

  const handleSelectPreset = (preset: QueryPreset) => {
    setSelectedPresetId(preset.id);
    setCustomSql(preset.sqlQuery);
    runQuery(preset.sqlQuery);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(customSql);
    setCopiedQuery(true);
    setTimeout(() => setCopiedQuery(false), 2000);
  };

  const handleManualExecute = () => {
    runQuery(customSql);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight">Offline SQLite 3 Query Studio</h2>
              <p className="text-xs text-slate-400">
                Formula Replacement Engine: Excel SUMIFS, VLOOKUP, and INDEX/MATCH translated to native asynchronous SQLite queries.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono">
          <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-teal-400 flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" /> SQLite 3 Wasm Active
          </span>
          <span className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Async Bridge
          </span>
        </div>
      </div>

      {/* Preset Query Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {PRESET_QUERIES.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-teal-950/40 border-teal-500/80 shadow-lg shadow-teal-950/50'
                  : 'bg-slate-900/70 border-slate-800 hover:bg-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="space-y-1.5">
                <span className="text-[10px] font-mono uppercase tracking-wider text-teal-400 font-bold block">
                  {preset.category}
                </span>
                <h4 className="text-xs font-bold text-white line-clamp-2">{preset.name}</h4>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                <span className="font-mono text-[10px] bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  SQL
                </span>
                {isSelected && <span className="text-teal-400 font-bold text-[11px]">Active</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* SQL Editor & Formula Comparison Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive SQL Editor */}
        <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-xs font-mono text-slate-400 ml-2 font-bold">SQL Query Console</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopySql}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-mono transition cursor-pointer border border-slate-700"
              >
                {copiedQuery ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedQuery ? 'Copied' : 'Copy SQL'}</span>
              </button>

              <button
                onClick={handleManualExecute}
                disabled={isExecuting}
                className="flex items-center space-x-1.5 px-4 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow-md shadow-teal-950/40 cursor-pointer disabled:opacity-50"
              >
                {isExecuting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Run Async Query</span>
              </button>
            </div>
          </div>

          {/* SQL Text Area */}
          <div className="relative">
            <textarea
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              rows={9}
              className="w-full bg-slate-950 text-teal-300 font-mono text-xs p-4 rounded-2xl border border-slate-800 focus:border-teal-500 focus:outline-none leading-relaxed resize-none shadow-inner"
              placeholder="Enter SQLite query (e.g. SELECT * FROM master_stock WHERE qty <= reorder_level)..."
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-400 gap-2">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-300">Tables:</span>
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-400">master_stock</span>
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-400">movement_log</span>
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-400">departments</span>
              <span className="font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-teal-400">admin_users</span>
            </div>
            <div className="font-mono text-emerald-400">
              Query Executed in <span className="font-bold">{queryExecutionTime} ms</span>
            </div>
          </div>
        </div>

        {/* Right: Excel vs SQLite Transformation Explainer */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>VBA Formula Replacement Logic</span>
            </div>

            {/* Excel Formula Box */}
            <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-1.5">
              <div className="text-[10px] font-mono uppercase text-rose-400 font-bold flex items-center gap-1.5">
                <span>Excel 32-Bit Formula</span>
              </div>
              <code className="text-xs font-mono text-slate-300 block break-all bg-slate-900 p-2 rounded-xl border border-slate-800/80">
                {activePreset.excelFormula}
              </code>
            </div>

            {/* Explanation Box */}
            <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="text-[10px] font-mono uppercase text-teal-400 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>SQLite Advantage</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePreset.explanation}
              </p>
            </div>
          </div>

          <div className="p-3 bg-teal-950/30 border border-teal-800/50 rounded-2xl text-[11px] text-teal-300/90">
            <strong>100% Offline Persistence:</strong> All changes made via the app are saved directly to the SQLite3 database file.
          </div>
        </div>
      </div>

      {/* Query Result Dataset */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Live Query Output Table</h3>
            <span className="text-xs font-mono text-slate-400">({safeRows.length} rows returned)</span>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Format: <span className="text-teal-400">SQLite Tabular Stream</span>
          </div>
        </div>

        {queryError ? (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-xs text-rose-300 flex items-start space-x-2 font-mono">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Query Execution Error:</span>
              <p className="mt-1">{queryError}</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse font-mono">
              <thead className="bg-slate-950 sticky top-0 border-b border-slate-800 text-teal-400 uppercase text-[10px] tracking-wider z-10">
                <tr>
                  {safeColumns.map((col, idx) => (
                    <th key={idx} className="p-3 font-bold border-r border-slate-800/50 last:border-r-0">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                {safeRows.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(1, safeColumns.length)} className="p-6 text-center text-slate-500 italic">
                      No records matched this query in the SQLite database.
                    </td>
                  </tr>
                ) : (
                  safeRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-slate-800/60 transition-colors">
                      {row.map((cellValue, cellIdx) => {
                        const isNum = typeof cellValue === 'number';
                        const isWarning =
                          typeof cellValue === 'string' &&
                          (cellValue.includes('REORDER') || cellValue.includes('CRITICAL'));

                        return (
                          <td
                            key={cellIdx}
                            className={`p-3 border-r border-slate-800/30 last:border-r-0 whitespace-nowrap ${
                              isNum
                                ? 'text-right font-bold text-white'
                                : isWarning
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-300'
                            }`}
                          >
                            {cellValue !== null && cellValue !== undefined ? String(cellValue) : <span className="text-slate-600">NULL</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
