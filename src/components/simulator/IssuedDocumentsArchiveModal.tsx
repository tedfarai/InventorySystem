import React, { useState } from 'react';
import { FileText, Printer, Download, Search, Filter, FolderCheck, Calendar, Building, User, Eye, Sparkles } from 'lucide-react';
import { IssuedDocument } from '../../types';

interface IssuedDocumentsArchiveModalProps {
  issuedDocs: IssuedDocument[];
  onOpenPreview: (doc: IssuedDocument) => void;
  onClose: () => void;
}

export const IssuedDocumentsArchiveModal: React.FC<IssuedDocumentsArchiveModalProps> = ({
  issuedDocs = [],
  onOpenPreview,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');

  const safeIssuedDocs = Array.isArray(issuedDocs) ? issuedDocs : [];
  const departments = Array.from(new Set(safeIssuedDocs.map((d) => d?.deptName))).filter(Boolean);

  const filteredDocs = safeIssuedDocs.filter((doc) => {
    if (!doc) return false;
    const matchesDept = deptFilter === 'ALL' || doc.deptName === deptFilter;
    const query = searchQuery.toLowerCase();
    const matchesQuery =
      !query ||
      (doc.slipNumber || '').toLowerCase().includes(query) ||
      (doc.deptName || '').toLowerCase().includes(query) ||
      (doc.deptID || '').toLowerCase().includes(query) ||
      (doc.deptHeadName || '').toLowerCase().includes(query) ||
      (doc.issuerName || '').toLowerCase().includes(query) ||
      (doc.items || []).some(
        (item) =>
          (item?.ItemName || '').toLowerCase().includes(query) ||
          (item?.ItemID || '').toLowerCase().includes(query)
      );
    return matchesDept && matchesQuery;
  });

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                Issued Documents & Stationery Requisitions Archive
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {safeIssuedDocs.length} Total Issued
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Browse, preview, and print official stationery & cleaning issue vouchers with company branding
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[240px] flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search slip #, department, item, or issuer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredDocs.length}</strong> of{' '}
            <strong>{safeIssuedDocs.length}</strong> documents
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-y-auto flex-1 p-4">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No Issued Documents Found</p>
              <p className="text-xs mt-1">
                {safeIssuedDocs.length === 0
                  ? 'No stationery items have been issued yet. Use "Issue Out" to generate vouchers.'
                  : 'Try adjusting your search criteria or department filters.'}
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-mono text-[11px] uppercase border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Slip Ref</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Date & Time</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Requesting Dept / Entity</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Head / Manager</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700 text-center">Items (Units)</th>
                    <th className="p-3 border-r border-slate-200 dark:border-slate-700">Issuer</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                  {filteredDocs.map((doc) => {
                    const docItems = Array.isArray(doc.items) ? doc.items : [];
                    const totalQty = docItems.reduce((s, i) => s + (i?.Qty || 0), 0);
                    return (
                      <tr
                        key={doc.slipNumber + doc.timestamp}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition"
                      >
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 border-r border-slate-200 dark:border-slate-800">
                          {doc.slipNumber}
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          {doc.timestamp}
                        </td>
                        <td className="p-3 font-semibold border-r border-slate-200 dark:border-slate-800">
                          <span className="text-slate-900 dark:text-slate-100">{doc.deptName}</span>
                          <span className="block text-[10px] text-slate-500 font-mono">{doc.deptID}</span>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800">
                          {doc.deptHeadName}
                        </td>
                        <td className="p-3 text-center border-r border-slate-200 dark:border-slate-800">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {docItems.length} items ({totalQty} units)
                          </span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-400 border-r border-slate-200 dark:border-slate-800">
                          {doc.issuerName}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              onOpenPreview(doc);
                            }}
                            className="inline-flex items-center space-x-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition"
                            title="Open print-preview modal with official logo and stationery styling"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print Preview</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <FolderCheck className="w-4 h-4 text-emerald-500" />
            <span>
              All Issued Documents automatically include the official Paramount logo (PEX Green) and print-optimized stationery formatting.
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg transition"
          >
            Close Archive
          </button>
        </div>
      </div>
    </div>
  );
};
