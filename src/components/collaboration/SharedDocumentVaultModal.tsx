/**
 * ===============================================================================
 * CENTRAL SHARED DOCUMENT CLOUD VAULT
 * Provides unified access to all vouchers, issue slips, GRN receipts, and master files
 * from a single synchronized cloud repository for multi-user collaboration.
 * ===============================================================================
 */

import React, { useState, useMemo } from 'react';
import {
  Folder,
  FileText,
  Download,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Share2,
  Calendar,
  User,
  Building2,
  X,
  Copy,
  ExternalLink,
  Layers,
  Database,
  ArrowUpDown,
} from 'lucide-react';
import {
  IssuedDocument,
  ReceivedDocument,
  AdjustmentDocument,
  BackupSnapshot,
  StockItem,
} from '../../types';
import { DraggableResizableModal } from '../common/DraggableResizableModal';

interface SharedDocumentVaultModalProps {
  isOpen: boolean;
  onClose: () => void;
  issuedDocs?: IssuedDocument[];
  receivedDocs?: ReceivedDocument[];
  adjustmentDocs?: AdjustmentDocument[];
  backups?: BackupSnapshot[];
  stockItems?: StockItem[];
  masterFolderPath?: string;
  onViewDoc?: (doc: any) => void;
  onExportExcelWorkbook?: () => void;
  onExportSqliteBackup?: () => void;
}

type DocCategory = 'ALL' | 'ISSUES' | 'DELIVERIES' | 'ADJUSTMENTS' | 'BACKUPS';

export const SharedDocumentVaultModal: React.FC<SharedDocumentVaultModalProps> = ({
  isOpen,
  onClose,
  issuedDocs = [],
  receivedDocs = [],
  adjustmentDocs = [],
  backups = [],
  stockItems = [],
  masterFolderPath = 'C:\\Stationery & Cleaning',
  onViewDoc,
  onExportExcelWorkbook,
  onExportSqliteBackup,
}) => {
  const [activeCategory, setActiveCategory] = useState<DocCategory>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const safeIssuedDocs = Array.isArray(issuedDocs) ? issuedDocs : [];
  const safeReceivedDocs = Array.isArray(receivedDocs) ? receivedDocs : [];
  const safeAdjustmentDocs = Array.isArray(adjustmentDocs) ? adjustmentDocs : [];
  const safeBackups = Array.isArray(backups) ? backups : [];
  const safeStockItems = Array.isArray(stockItems) ? stockItems : [];

  // Normalize all documents into a unified list
  const unifiedDocuments = useMemo(() => {
    const list: Array<{
      id: string;
      docType: 'ISSUE' | 'DELIVERY' | 'ADJUSTMENT' | 'BACKUP';
      title: string;
      subtitle: string;
      timestamp: string;
      creator: string;
      itemCount: number;
      fileName: string;
      raw: any;
      badgeColor: string;
    }> = [];

    // 1. Issued Docs
    safeIssuedDocs.forEach((d) => {
      if (!d) return;
      list.push({
        id: d.slipNumber,
        docType: 'ISSUE',
        title: `Requisition Slip ${d.slipNumber}`,
        subtitle: `Issued to ${d.deptName || 'Department'}`,
        timestamp: d.timestamp || '',
        creator: d.issuerName || d.issuerID || 'Authorized Issuer',
        itemCount: Array.isArray(d.items) ? d.items.length : 0,
        fileName: d.pdfFileName || `${d.slipNumber}.pdf`,
        raw: d,
        badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
      });
    });

    // 2. Received Docs (GRN)
    safeReceivedDocs.forEach((d) => {
      if (!d) return;
      list.push({
        id: d.voucherNumber,
        docType: 'DELIVERY',
        title: `Goods Receipt ${d.voucherNumber}`,
        subtitle: `Ref: ${d.deliveryRef || 'Standard Delivery'}`,
        timestamp: d.timestamp || '',
        creator: d.issuerName || d.issuerID || 'Storekeeper',
        itemCount: Array.isArray(d.items) ? d.items.length : 0,
        fileName: d.pdfFileName || `${d.voucherNumber}.pdf`,
        raw: d,
        badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      });
    });

    // 3. Adjustment Docs
    safeAdjustmentDocs.forEach((d) => {
      if (!d) return;
      list.push({
        id: d.voucherNumber,
        docType: 'ADJUSTMENT',
        title: `Adjustment Certificate ${d.voucherNumber}`,
        subtitle: d.reasonLabel || d.reasonCode || 'Stock Adjustment',
        timestamp: d.timestamp || '',
        creator: d.issuerName || d.issuerID || 'Controller',
        itemCount: Array.isArray(d.items) ? d.items.length : 0,
        fileName: d.pdfFileName || `${d.voucherNumber}.pdf`,
        raw: d,
        badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      });
    });

    // 4. Backups
    safeBackups.forEach((d) => {
      if (!d) return;
      list.push({
        id: d.id,
        docType: 'BACKUP',
        title: `Cloud Snapshot ${d.id}`,
        subtitle: `${d.type} Snapshot (${d.itemCount ?? safeStockItems.length} items)`,
        timestamp: d.timestamp || '',
        creator: d.issuerName || d.issuerId || 'Automated Engine',
        itemCount: d.itemCount ?? safeStockItems.length,
        fileName: d.fileName || `${d.id}.sqlite.bak`,
        raw: d,
        badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
      });
    });

    // Sort newest first
    return list.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
  }, [safeIssuedDocs, safeReceivedDocs, safeAdjustmentDocs, safeBackups, safeStockItems]);

  // Filtered list
  const filteredDocs = useMemo(() => {
    return unifiedDocuments.filter((doc) => {
      const matchesCategory =
        activeCategory === 'ALL' ||
        (activeCategory === 'ISSUES' && doc.docType === 'ISSUE') ||
        (activeCategory === 'DELIVERIES' && doc.docType === 'DELIVERY') ||
        (activeCategory === 'ADJUSTMENTS' && doc.docType === 'ADJUSTMENT') ||
        (activeCategory === 'BACKUPS' && doc.docType === 'BACKUP');

      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        doc.id.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q) ||
        doc.subtitle.toLowerCase().includes(q) ||
        doc.creator.toLowerCase().includes(q) ||
        doc.fileName.toLowerCase().includes(q);

      return matchesCategory && matchesQuery;
    });
  }, [unifiedDocuments, activeCategory, searchQuery]);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadJson = (docItem: any) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(docItem.raw, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${docItem.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!isOpen) return null;

  return (
    <DraggableResizableModal
      onClose={onClose}
      modalId="shared-document-vault-modal"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col overflow-hidden my-auto"
    >
      {/* Header */}
      <div
        data-drag-handle="true"
        className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between cursor-grab active:cursor-grabbing select-none shrink-0"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
            <Folder className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Central Document Cloud Vault
              </h2>
              <span className="bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                Single Source of Truth
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Shared central repository of all requisition slips, goods received notes, adjustments &amp; exports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onExportExcelWorkbook && (
            <button
              onClick={onExportExcelWorkbook}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              title="Download Master Excel Spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Master Excel</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

        {/* Toolbar & Filters */}
        <div className="px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {(
              [
                { id: 'ALL', label: 'All Files', count: unifiedDocuments.length },
                { id: 'ISSUES', label: 'Issue Slips', count: safeIssuedDocs.length },
                { id: 'DELIVERIES', label: 'GRN Receipts', count: safeReceivedDocs.length },
                { id: 'ADJUSTMENTS', label: 'Adjustments', count: safeAdjustmentDocs.length },
                { id: 'BACKUPS', label: 'Snapshots', count: safeBackups.length },
              ] as const
            ).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeCategory === cat.id
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeCategory === cat.id ? 'bg-teal-700 text-teal-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}>
                  {cat.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reference, creator, dept..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8.5 pr-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Content Area (Split Grid with Document List & Preview Inspector) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 overflow-hidden">
          {/* Document List (7 cols) */}
          <div className="md:col-span-7 flex flex-col h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/30">
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredDocs.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No documents found
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm">
                    {searchQuery ? `No files matching "${searchQuery}"` : 'Files generated during requisitions and stock receipts will appear here instantly.'}
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedItem?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedItem(doc)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                        isSelected
                          ? 'bg-teal-50/80 dark:bg-teal-950/30 border-teal-500/60 shadow-xs'
                          : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${doc.badgeColor}`}>
                            {doc.docType}
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white truncate font-mono">
                            {doc.id}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {doc.timestamp}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                            {doc.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {doc.subtitle}
                          </p>
                        </div>

                        <div className="text-right text-[11px] text-slate-500 shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <User className="w-3 h-3 text-slate-400" />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{doc.creator}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{doc.itemCount} item(s)</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Document Preview & Details Inspector (5 cols) */}
          <div className="md:col-span-5 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900 p-6 space-y-4">
            {selectedItem ? (
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                {/* Selected Header */}
                <div className="pb-3 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                  <div>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${selectedItem.badgeColor}`}>
                      {selectedItem.docType}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1.5 font-mono">
                      {selectedItem.id}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedItem.title}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopyId(selectedItem.id)}
                      title="Copy Reference ID"
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                    >
                      {copiedId === selectedItem.id ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDownloadJson(selectedItem)}
                      title="Download JSON Payload"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>
                  </div>
                </div>

                {/* Metadata Details */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Timestamp</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {selectedItem.timestamp}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Authorized Issuer</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                      {selectedItem.creator}
                    </span>
                  </div>
                </div>

                {/* Items in document */}
                <div className="flex-1 overflow-hidden flex flex-col">
                  <div className="flex items-center justify-between pb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      Document Line Items ({selectedItem.itemCount})
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 p-2 space-y-1">
                    {selectedItem.raw.items && selectedItem.raw.items.length > 0 ? (
                      selectedItem.raw.items.map((it: any, idx: number) => (
                        <div key={idx} className="p-2 text-xs flex items-center justify-between bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800/50">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">
                              {it.ItemID}
                            </span>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400">{it.ItemName}</p>
                          </div>
                          <div className="text-right">
                            <span className="font-bold font-mono text-teal-600 dark:text-teal-400">
                              {it.Qty !== undefined ? it.Qty : it.VarianceQty !== undefined ? (it.VarianceQty > 0 ? `+${it.VarianceQty}` : it.VarianceQty) : 1}
                            </span>
                            <span className="text-[10px] text-slate-400 ml-1">
                              {it.Unit || 'Units'}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-500">
                        Snapshot contains entire database state ({selectedItem.itemCount} stock items).
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
                <FileText className="w-12 h-12 stroke-1 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Select a document to inspect
                </p>
                <p className="text-xs text-slate-500 max-w-xs">
                  Review line items, issuer sign-offs, timestamps, and export JSON or PDF slips.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-500" />
            <span>Central Cloud Database: <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{safeStockItems.length} Master Items</span></span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition-colors cursor-pointer"
          >
            Close Vault
          </button>
        </div>
    </DraggableResizableModal>
  );
};
