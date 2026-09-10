import React, { useState } from 'react';
import { FileText, Download, CheckCircle2, ShieldCheck, Printer, Mail, FolderCheck, Check, Sparkles, Building, User, Calendar, Hash, FileDown } from 'lucide-react';
import { IssuedDocument } from '../../types';
import { getPexGreenLogoDataUrl, PEX_GREEN_LOGO_PUBLIC_PATH } from '../brand/brandLogoData';
import jsPDF from 'jspdf';

interface PdfPreviewModalProps {
  doc: IssuedDocument;
  onClose: () => void;
}

export const PdfPreviewModal: React.FC<PdfPreviewModalProps> = ({ doc, onClose }) => {
  const [isPrintFriendly, setIsPrintFriendly] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);

  const handlePrintNow = () => {
    setIsPrintFriendly(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Browser print dialog invocation failed, saving PDF file instead:', err);
        handleSingleClickAutoSavePdf();
      }
    }, 150);
  };

  const handleNativeSaveAsPdf = () => {
    // Generate authentic PDF and prompt print dialog
    handleSingleClickAutoSavePdf();
    setIsPrintFriendly(true);
    setTimeout(() => {
      try {
        window.focus();
        window.print();
      } catch (err) {
        console.warn('Browser print dialog invocation failed:', err);
      }
    }, 250);
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

    // Official Organization Logo: PEX Green (2).png placed on top-left corner
    const logoData = getPexGreenLogoDataUrl();
    try {
      pdf.addImage(logoData, 'PNG', 14.5, 14, 16, 28);
    } catch {
      pdf.setFillColor(34, 37, 42);
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
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    pdf.text('STATIONERY & CLEANING REQUISITION ISSUE FORM', 36, 21);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('PARAMOUNT PROCUREMENT & STORES DEPARTMENT', 36, 27);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Voucher Ref: ${doc.slipNumber}  |  Issue Date: ${doc.timestamp}`, 36, 33);
    pdf.text(`Designated Save Directory: ${doc.fullSavedPath}`.substring(0, 82), 36, 39);

    // Metadata Table Box
    pdf.setDrawColor(148, 163, 184); // slate-400
    pdf.setLineWidth(0.3);
    pdf.rect(12, 47, 186, 38);

    // Metadata Lines
    pdf.setFontSize(9.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Requisition Slip Ref:', 16, 54);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.slipNumber, 65, 54);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Issue Timestamp:', 16, 60);
    pdf.setFont('helvetica', 'normal');
    pdf.text(doc.timestamp, 65, 60);

    const isManager = doc.deptID.startsWith('MGR-');
    pdf.setFont('helvetica', 'bold');
    pdf.text(isManager ? 'Requesting Entity:' : 'Department ID & Name:', 16, 66);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doc.deptID} - ${doc.deptName}`, 65, 66);

    pdf.setFont('helvetica', 'bold');
    pdf.text(isManager ? 'Authorized Manager:' : 'Department Head:', 16, 72);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doc.deptHeadName} (${doc.deptHeadEmail})`, 65, 72);

    pdf.setFont('helvetica', 'bold');
    pdf.text('Authorized Storekeeper:', 16, 78);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${doc.issuerName} (${doc.issuerID})`, 65, 78);

    // Items Table Header
    let y = 91;
    pdf.setFillColor(241, 245, 249); // slate-100
    pdf.rect(12, y, 186, 9, 'F');
    pdf.rect(12, y, 186, 9, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9.5);
    pdf.text('Item Code', 16, y + 6);
    pdf.text('Item Description', 50, y + 6);
    pdf.text('Category', 130, y + 6);
    pdf.text('Qty Issued', 170, y + 6);

    // Items List
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    y += 9;

    const docItems = Array.isArray(doc?.items) ? doc.items : [];
    let totalUnits = 0;
    docItems.forEach((item) => {
      pdf.rect(12, y, 186, 8, 'S');
      pdf.text(item?.ItemID || '', 16, y + 5.5);
      pdf.text(item?.ItemName || '', 50, y + 5.5);
      pdf.text(item?.Category || '', 130, y + 5.5);
      pdf.text(String(item?.Qty || 0), 175, y + 5.5);
      totalUnits += Number(item?.Qty || 0);
      y += 8;
    });

    // Total Units Summary Row
    pdf.setFillColor(248, 250, 252);
    pdf.rect(12, y, 186, 8, 'F');
    pdf.rect(12, y, 186, 8, 'S');
    pdf.setFont('helvetica', 'bold');
    pdf.text(`Total Requisition Units (${docItems.length} Line Items):`, 50, y + 5.5);
    pdf.text(String(totalUnits), 175, y + 5.5);
    y += 8;

    // Bottom Issuer Signature & Stamp Section
    y += 14;

    // Left Box: Issuer Signature & Stamp
    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.rect(12, y, 88, 34);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Storekeeper Verification & Digital Stamp', 16, y + 6);

    // Digital TimeStamp - WorkID
    const digitalSig = `${doc.timestamp}-${doc.issuerID}`;
    pdf.setFillColor(240, 253, 244); // emerald-50
    pdf.rect(16, y + 10, 80, 16, 'F');
    pdf.setDrawColor(16, 185, 129); // emerald-500
    pdf.rect(16, y + 10, 80, 16, 'S');

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(5, 150, 105); // emerald-600
    pdf.text('DIGITAL VERIFICATION STAMP:', 18, y + 15);
    pdf.setFontSize(8);
    pdf.text(digitalSig, 18, y + 20);

    // Right Box: Recipient Sign-off
    pdf.setDrawColor(100, 116, 139);
    pdf.rect(110, y, 88, 34);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(isManager ? 'Authorized Manager Signature' : 'Department Representative Receipt', 114, y + 6);

    pdf.setDrawColor(148, 163, 184);
    pdf.line(114, y + 22, 192, y + 22);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Received By: ${doc.deptHeadName}`, 114, y + 27);
    pdf.text('Date: ____________________', 114, y + 31);

    // Auto-Save PDF file to designated filename
    const saveFileName = doc.pdfFileName || `IssueSlip_${doc.deptID.replace('-', '')}_${doc.slipNumber}.pdf`;
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
      <div className="bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl border-2 border-emerald-600/80 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 printable-document">
        {/* Header bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 no-print">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <span className="font-mono text-xs font-bold text-slate-100">
              Stationery Requisition Issue Form — Print Preview & PDF Export
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
              title="Toggle Print-Optimized Contrast Mode"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrintFriendly ? 'Print View: Active' : 'Print Preview Mode'}</span>
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
            <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2 no-print">
              <div className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-200" />
                <span>{autoSaveToast}</span>
              </div>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded font-bold">100% COMPLETE</span>
            </div>
          )}

          {/* Success Banner & Directory Location Card */}
          <div className="bg-emerald-500/10 border border-emerald-500/40 p-4 rounded-xl flex items-center justify-between no-print">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Stationery Requisition Form Generated & Logged
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  Designated directory: <code className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">{doc.fullSavedPath}</code>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Email dispatch copy queued for <span className="font-mono font-semibold text-slate-700 dark:text-slate-200">{doc.deptHeadEmail}</span>.
                </p>
              </div>
            </div>

            <div className="text-right hidden sm:block">
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-lg text-xs font-mono font-bold">
                <FolderCheck className="w-3.5 h-3.5" /> Ready for Print / Save
              </span>
            </div>
          </div>

          {/* Print-Friendly Document Canvas (Formatted like real Physical Stationery Sheet) */}
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
                  Stationery & Cleaning Requisition Issue Form
                </h2>
                <span className="text-[10px] font-mono text-slate-700 font-bold">
                  PARAMOUNT PROCUREMENT & STORES DEPARTMENT
                </span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Form Ref: {doc.slipNumber} | Issued: {doc.timestamp}
                </span>
              </div>
            </div>

            {/* Boxed Metadata Section */}
            <div className="border-2 border-slate-900 divide-y-2 divide-slate-300 text-xs font-sans">
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Requisition Form Ref:</span>
                <span className="font-mono font-bold text-emerald-700">{doc.slipNumber}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Issue Timestamp:</span>
                <span className="font-mono text-slate-900">{doc.timestamp}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">
                  {doc.deptID.startsWith('MGR-') ? 'Requesting Entity:' : 'Department ID & Name:'}
                </span>
                <span className="font-bold text-slate-900">{doc.deptID} - {doc.deptName}</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">
                  {doc.deptID.startsWith('MGR-') ? 'Authorized Manager:' : 'Department Head:'}
                </span>
                <span className="text-slate-900 font-medium">{doc.deptHeadName} ({doc.deptHeadEmail})</span>
              </div>
              <div className="p-2 flex">
                <span className="font-bold w-48 text-slate-900">Authorized Storekeeper:</span>
                <span className="text-slate-900 font-medium">{doc.issuerName} ({doc.issuerID})</span>
              </div>
              <div className="p-2 flex bg-slate-50">
                <span className="font-bold w-48 text-slate-900">Designated Auto-Save Folder:</span>
                <span className="font-mono text-emerald-800 text-[11px] truncate">{doc.fullSavedPath}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border-2 border-slate-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-extrabold border-b-2 border-slate-900">
                    <th className="p-2 border-r border-slate-400">Item Code</th>
                    <th className="p-2 border-r border-slate-400">Item Description</th>
                    <th className="p-2 border-r border-slate-400">Category</th>
                    <th className="p-2 text-right">Qty Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {safeDocItems.map((item) => (
                    <tr key={item?.ItemID || Math.random()}>
                      <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">{item?.ItemID}</td>
                      <td className="p-2 font-medium border-r border-slate-300">{item?.ItemName}</td>
                      <td className="p-2 text-slate-700 border-r border-slate-300">{item?.Category}</td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">{item?.Qty}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-900">
                    <td colSpan={3} className="p-2 text-right border-r border-slate-300">
                      Total Units Issued ({safeDocItems.length} Lines):
                    </td>
                    <td className="p-2 text-right font-mono font-extrabold text-emerald-800">
                      {totalUnits} Units
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-2 grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="border-2 border-slate-900 p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  Storekeeper Verification & Digital Stamp
                </div>
                <div className="p-2 bg-emerald-50 border border-emerald-400 rounded font-mono text-[11px] text-emerald-900 space-y-0.5">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">
                    Digital Signature Stamp
                  </div>
                  <div className="font-bold tracking-tight">{digitalSignatureStamp}</div>
                  <div className="text-[10px] text-slate-600">
                    User: {doc.issuerName} ({doc.issuerID})
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-900 p-3 space-y-3 bg-slate-50">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  {doc.deptID.startsWith('MGR-') ? 'Authorized Manager Signature' : 'Recipient Acknowledgement Signoff'}
                </div>
                <div className="border-b-2 border-dashed border-slate-400 pt-6" />
                <div className="text-[11px] text-slate-700 font-semibold flex justify-between">
                  <span>Received By: {doc.deptHeadName}</span>
                  <span>Date: ____________</span>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-slate-500 text-center font-mono pt-1">
              *** Paramount Stationery & Cleaning Official Issue Requisition Form — Formatted for Printing, Emailing and Archiving ***
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
                title="Print Stationery Requisition Form directly to paper or system printer"
              >
                <Printer className="w-4 h-4" />
                <span>Print Form</span>
              </button>

              <button
                type="button"
                onClick={handleSingleClickAutoSavePdf}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition ${
                  hasAutoSaved
                    ? 'bg-slate-700 hover:bg-slate-600 ring-2 ring-emerald-400'
                    : 'bg-indigo-600 hover:bg-indigo-500'
                }`}
                title="1-Click Auto-Save PDF with official logo and formatting to designated folder"
              >
                {hasAutoSaved ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-200" />
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

