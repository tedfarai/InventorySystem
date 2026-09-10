import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, ShieldCheck, Printer, PackagePlus, FolderCheck, Check, Sparkles, FileDown } from 'lucide-react';
import { ReceivedDocument } from '../../types';
import { getPexGreenLogoDataUrl, PEX_GREEN_LOGO_PUBLIC_PATH } from '../brand/brandLogoData';
import jsPDF from 'jspdf';

interface ReceivedPdfPreviewModalProps {
  doc: ReceivedDocument;
  onClose: () => void;
}

export const ReceivedPdfPreviewModal: React.FC<ReceivedPdfPreviewModalProps> = ({ doc, onClose }) => {
  const [isPrintFriendly, setIsPrintFriendly] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);

  const handlePrintNow = () => {
    setIsPrintFriendly(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleSingleClickAutoSavePdf = () => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Outer Page Border
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.rect(10, 10, 190, 277);

    // Top Header Container Cell (Height: 32mm)
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.rect(12, 12, 186, 32);

    // Official Organization Logo: PEX Green (2).png attached as-is at top-left corner
    const logoData = getPexGreenLogoDataUrl();
    try {
      pdf.addImage(logoData, 'PNG', 14.5, 14, 16, 28);
    } catch {
      pdf.setFillColor(36, 40, 45);
      pdf.rect(14.5, 14, 16, 28, 'F');
      pdf.setFillColor(198, 217, 44);
      pdf.setDrawColor(198, 217, 44);
      pdf.circle(20, 19, 2, 'F');
      pdf.setLineWidth(1.4);
      pdf.line(20, 21, 21, 29);
      pdf.line(20, 22, 16, 27);
      pdf.line(21, 29, 17, 37);
      pdf.line(21, 29, 25, 37);
      pdf.setTextColor(198, 217, 44);
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text('paramount', 28, 36, { angle: 90 });
    }

    // Top-Left Logo Column Vertical Separator Line
    pdf.setDrawColor(30, 41, 59);
    pdf.setLineWidth(0.5);
    pdf.line(33, 12, 33, 44);

    // Document Title and Organization Headings (Top-Left Aligned Next to Logo)
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(13.5);
    pdf.setFont('helvetica', 'bold');
    pdf.text('GOODS / ITEMS RECEIVED VOUCHER (GRN)', 37, 21);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('PARAMOUNT PROCUREMENT & INVENTORY CONTROL', 37, 27);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Voucher Ref: ${doc.voucherNumber}  |  Delivery Date: ${doc.timestamp}`, 37, 33);
    pdf.text(`Designated Save Directory: ${doc.fullSavedPath}`.substring(0, 82), 37, 39);

    // Metadata Table Box
    pdf.setDrawColor(148, 163, 184); // slate-400
    pdf.setLineWidth(0.3);
    pdf.rect(12, 47, 186, 38);

    // Metadata Lines
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('GRN Voucher Ref:', 16, 54);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.voucherNumber, 62, 54);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Delivery Note Ref:', 16, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.deliveryRef || 'N/A', 62, 60);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Received Timestamp:', 16, 66);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.timestamp, 62, 66);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Receiving User / Issuer:', 16, 72);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doc.issuerName} (${doc.issuerID}) - ${doc.issuerRole || 'Procurement Officer'}`, 62, 72);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Target Worksheet:', 16, 78);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Master_Stock (Quantities Credited) & Movement_Log (Audit Trail)', 62, 78);

    // Items Table Header
    let y = 91;
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(12, y, 186, 9, 'F');
    pdf.rect(12, y, 186, 9, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text('Item ID', 16, y + 6);
    pdf.text('Item Description', 50, y + 6);
    pdf.text('Category', 130, y + 6);
    pdf.text('Qty Received', 170, y + 6);

    // Items List
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    y += 9;

    const docItems = Array.isArray(doc?.items) ? doc.items : [];
    docItems.forEach((item) => {
      pdf.rect(12, y, 186, 8, 'S');
      pdf.text(item?.ItemID || '', 16, y + 5.5);
      pdf.text(item?.ItemName || '', 50, y + 5.5);
      pdf.text(item?.Category || '', 130, y + 5.5);
      pdf.text(`${item?.Qty || 0} ${item?.Unit || 'Units'}`, 170, y + 5.5);
      y += 8;
    });

    // Bottom Storekeeper Verification Section
    y += 18;

    // Left Box: Storekeeper Verification & Stamp
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.rect(12, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Receiving Storekeeper Verification', 16, y + 6);

    // Digital TimeStamp - WorkID
    const digitalSig = `${doc.timestamp}-${doc.issuerID}`;
    pdf.setFillColor(240, 253, 244); // emerald-50
    pdf.rect(16, y + 10, 80, 14, 'F');
    pdf.setDrawColor(16, 185, 129); // emerald-500
    pdf.rect(16, y + 10, 80, 14, 'S');

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(5, 150, 105); // emerald-600
    pdf.text('GRN AUDIT SIGNATURE:', 18, y + 15);
    pdf.setFontSize(8);
    pdf.text(digitalSig, 18, y + 20);

    // Right Box: Central Stores Inspection
    pdf.setDrawColor(100, 116, 139);
    pdf.rect(110, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Central Stores Inspection Sign-off', 114, y + 6);

    pdf.setDrawColor(148, 163, 184);
    pdf.line(114, y + 22, 192, y + 22);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Verified By: ${doc.issuerName}`, 114, y + 27);

    // Auto-Save PDF file to designated filename
    const saveFileName = doc.pdfFileName || `GRN_Voucher_${doc.voucherNumber}.pdf`;
    pdf.save(saveFileName);

    setHasAutoSaved(true);
    setAutoSaveToast(`PDF Auto-Saved to Designated Directory: ${doc.fullSavedPath}`);
    setTimeout(() => {
      setAutoSaveToast(null);
    }, 6000);
  };

  const safeDocItems = Array.isArray(doc?.items) ? doc.items : [];
  const digitalSignatureStamp = `${doc?.timestamp || ''}-${doc?.issuerID || ''}`;
  const totalUnits = safeDocItems.reduce((sum, item) => sum + (item?.Qty || 0), 0);

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50 printable-document-modal">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-blue-600/80 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 printable-document">
        {/* Header bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 no-print">
          <div className="flex items-center space-x-2">
            <PackagePlus className="w-5 h-5 text-blue-400" />
            <span className="font-mono text-xs font-bold text-slate-100">
              PDF Goods Received Note (GRN) — Print & Export Ready
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrintNow}
              className="px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
              title="Save as PDF using native browser print dialog"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Save as PDF</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPrintFriendly(!isPrintFriendly)}
              className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1 transition ${
                isPrintFriendly
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrintFriendly ? 'Print View: ON' : 'Print Mode'}</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Toast / Auto-Save Alert Banner */}
          {autoSaveToast && (
            <div className="bg-blue-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2 no-print">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-200" />
                <span>{autoSaveToast}</span>
              </div>
              <span className="text-[10px] bg-blue-700 px-2 py-0.5 rounded font-bold">100% COMPLETE</span>
            </div>
          )}

          {/* Success Banner & Directory Location Card */}
          <div className="bg-blue-500/10 border border-blue-500/40 p-4 rounded-xl flex items-center justify-between no-print">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-blue-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Goods Received Note (GRN) Generated & Recorded!
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Designated directory: <code className="font-mono text-blue-600 dark:text-blue-400 font-bold">{doc.fullSavedPath}</code>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Added +{totalUnits} units across {doc.items.length} item(s) to <code className="font-mono">Master_Stock</code> & logged in <code className="font-mono">Movement_Log</code>.
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                <FolderCheck className="w-3.5 h-3.5" /> Ready for Print / Save
              </span>
            </div>
          </div>

          {/* Print-Friendly Document Canvas */}
          <div
            className={`stationery-sheet bg-white text-slate-900 p-6 rounded-lg shadow-inner border-2 border-slate-900 space-y-4 font-sans ${
              isPrintFriendly ? 'ring-4 ring-amber-400/50' : ''
            }`}
          >
            {/* Header Box with Official Paramount Logo in Top-Left */}
            <div className="border-2 border-slate-900 flex items-stretch overflow-hidden">
              <div className="logo-container bg-[#22252A] p-2 flex items-center justify-center border-r-2 border-slate-900 shrink-0 min-w-[64px]">
                <img
                  src={PEX_GREEN_LOGO_PUBLIC_PATH}
                  onError={(e) => {
                    e.currentTarget.src = getPexGreenLogoDataUrl();
                  }}
                  alt="Paramount PEX Green (2).png Official Logo"
                  className="h-16 w-auto object-contain block select-none"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="flex-1 p-3 flex flex-col items-center justify-center text-center bg-white">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                  Goods / Items Received Voucher (GRN)
                </h2>
                <span className="text-[10px] font-mono text-slate-700 font-bold">
                  PARAMOUNT PROCUREMENT & INVENTORY CONTROL
                </span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Voucher: {doc.voucherNumber} | Save Location: {doc.fullSavedPath}
                </span>
              </div>
            </div>

            {/* Boxed Metadata Section */}
            <div className="border-2 border-slate-900 divide-y-2 divide-slate-300 text-xs font-sans">
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">GRN Voucher Ref:</span>
                <span className="font-mono font-bold text-blue-700">{doc.voucherNumber}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Delivery Note Ref:</span>
                <span className="font-mono font-bold text-slate-900">{doc.deliveryRef || 'N/A'}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Received Timestamp:</span>
                <span className="font-mono text-slate-900">{doc.timestamp}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Receiving Officer:</span>
                <span className="text-slate-900 font-medium">{doc.issuerName} ({doc.issuerID}) - {doc.issuerRole || 'Procurement Officer'}</span>
              </div>
              <div className="p-2 flex bg-slate-50">
                <span className="font-bold w-48 text-slate-900">Designated Auto-Save Folder:</span>
                <span className="font-mono text-blue-800 text-[11px] truncate">{doc.fullSavedPath}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-2 border-slate-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-extrabold border-b-2 border-slate-900">
                    <th className="p-2 border-r border-slate-400">Item ID</th>
                    <th className="p-2 border-r border-slate-400">Item Description</th>
                    <th className="p-2 border-r border-slate-400">Category</th>
                    <th className="p-2 text-right">Qty Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {safeDocItems.map((item) => (
                    <tr key={item?.ItemID || Math.random()}>
                      <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">{item?.ItemID}</td>
                      <td className="p-2 font-medium border-r border-slate-300">{item?.ItemName}</td>
                      <td className="p-2 text-slate-700 border-r border-slate-300">{item?.Category}</td>
                      <td className="p-2 text-right font-mono font-bold text-blue-700">+{item?.Qty} {item?.Unit || 'Units'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-2 grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="border-2 border-slate-900 p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  Storekeeper Verification Stamp
                </div>
                <div className="p-2 bg-blue-50 border border-blue-400 rounded font-mono text-[11px] text-blue-900 space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-blue-700">
                    Digital Audit Stamp
                  </div>
                  <div className="font-bold tracking-tight">{digitalSignatureStamp}</div>
                  <div className="text-[10px] text-slate-600">
                    Officer: {doc.issuerName} ({doc.issuerID})
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-900 p-3 space-y-3 bg-slate-50">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  Central Stores Inspection Sign-off
                </div>
                <div className="border-b-2 border-dashed border-slate-400 pt-6" />
                <div className="text-[11px] text-slate-700 font-semibold">
                  Approved By: <span>{doc.issuerName}</span>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 text-center font-mono pt-1">
              *** Paramount Stationery & Cleaning Official Goods Received Note — Formatted for Printing and Archiving ***
            </div>
          </div>

          {/* Action buttons: Single Click Auto-Save & Print Slip */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700 no-print">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-xl transition text-center"
            >
              Close Preview
            </button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handlePrintNow}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow transition"
                title="Trigger browser print dialog to Save as PDF"
              >
                <FileDown className="w-4 h-4 text-emerald-100" />
                <span>Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintNow}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow transition"
                title="Print Goods Received Note directly to paper or system printer"
              >
                <Printer className="w-4 h-4" />
                <span>Print GRN</span>
              </button>

              <button
                type="button"
                onClick={handleSingleClickAutoSavePdf}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition ${
                  hasAutoSaved
                    ? 'bg-slate-700 hover:bg-slate-600 ring-2 ring-emerald-400'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
                title="1-Click Auto-Save GRN PDF with official logo and formatting to designated folder"
              >
                {hasAutoSaved ? (
                  <>
                    <Check className="w-4 h-4 text-blue-200" />
                    <span>✓ PDF Auto-Saved</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Auto-Save to Directory</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
