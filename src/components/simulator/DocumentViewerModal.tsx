import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Printer,
  PackagePlus,
  FolderCheck,
  Building2,
  UserCheck,
  CheckCircle2,
  Sparkles,
  Mail,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  FileDown,
} from 'lucide-react';
import { IssuedDocument, ReceivedDocument, AdjustmentDocument } from '../../types';
import { getPexGreenLogoDataUrl, PEX_GREEN_LOGO_PUBLIC_PATH } from '../brand/brandLogoData';
import jsPDF from 'jspdf';

export type DisplayableDocument =
  | { type: 'ISSUE'; data: IssuedDocument }
  | { type: 'DELIVERY'; data: ReceivedDocument }
  | { type: 'ADJUSTMENT'; data: AdjustmentDocument };

interface DocumentViewerModalProps {
  document: DisplayableDocument;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document: docObj,
  onClose,
}) => {
  const isDelivery = docObj.type === 'DELIVERY';
  const isAdjustment = docObj.type === 'ADJUSTMENT';
  const isIssue = docObj.type === 'ISSUE';
  const [isPrintFriendly, setIsPrintFriendly] = useState(false);
  const [hasAutoSaved, setHasAutoSaved] = useState(false);
  const [autoSaveToast, setAutoSaveToast] = useState<string | null>(null);
  const [logoSrc, setLogoSrc] = useState<string>(PEX_GREEN_LOGO_PUBLIC_PATH);

  const handleNativeSaveAsPdf = () => {
    setIsPrintFriendly(true);
    // Trigger native browser print dialog which allows 'Save as PDF'
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintNow = () => {
    setIsPrintFriendly(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPdf = () => {
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
    pdf.setFontSize(13);
    pdf.setFont('helvetica', 'bold');
    const docTitle = isDelivery
      ? 'GOODS / ITEMS RECEIVED VOUCHER (GRN)'
      : isAdjustment
      ? 'STOCK ADJUSTMENT & PHYSICAL COUNT VOUCHER'
      : 'STATIONERY & CLEANING ITEM ISSUE SLIP';
    pdf.text(docTitle, 37, 21);

    pdf.setFontSize(8.5);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(71, 85, 105);
    pdf.text('PARAMOUNT PROCUREMENT & INVENTORY CONTROL', 37, 27);

    // Saved Location & Reference Notice in Header
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139);
    const saveLoc = `Save Location: ${docObj.data.fullSavedPath}`;
    const refNum = isDelivery
      ? (docObj.data as ReceivedDocument).voucherNumber
      : isAdjustment
      ? (docObj.data as AdjustmentDocument).voucherNumber
      : (docObj.data as IssuedDocument).slipNumber;
    pdf.text(`Voucher Ref: ${refNum}  |  Generated: ${docObj.data.timestamp}`, 37, 33);
    pdf.text(saveLoc.substring(0, 82), 37, 39);

    // Metadata Table Box
    pdf.setDrawColor(148, 163, 184); // slate-400
    pdf.setLineWidth(0.3);
    pdf.rect(12, 47, 186, 44);

    // Metadata Lines
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);

    if (isDelivery) {
      const delDoc = docObj.data as ReceivedDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Voucher GRN Ref:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.voucherNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Delivery Note Ref:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.deliveryRef || 'N/A', 62, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Received Timestamp:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.timestamp, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Receiving User / Issuer:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${delDoc.issuerName} (${delDoc.issuerID}) - ${delDoc.issuerRole || 'Procurement Officer'}`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(delDoc.folderPath, 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Target Worksheet:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Master_Stock (Quantities Updated) & Movement_Log (Read-Only Audit Trail)', 62, 84);
    } else if (isAdjustment) {
      const adjDoc = docObj.data as AdjustmentDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Adjustment Voucher Ref:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.voucherNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Count Reference / Tag:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.countRef, 62, 60);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Discrepancy Reason:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${adjDoc.reasonLabel} [${adjDoc.reasonCode}]`, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Auditor / Controller:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${adjDoc.issuerName} (${adjDoc.issuerID})`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Audit Remarks / Notes:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.notes ? adjDoc.notes.substring(0, 60) : 'Physical inventory discrepancy reconciled.', 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text(adjDoc.folderPath, 62, 84);
    } else {
      const issueDoc = docObj.data as IssuedDocument;
      pdf.setFont('helvetica', 'bold');
      pdf.text('Slip Reference:', 16, 54);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.slipNumber, 62, 54);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Issue Timestamp:', 16, 60);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.timestamp, 62, 60);

      const isManager = issueDoc.deptID?.startsWith('MGR-');
      pdf.setFont('helvetica', 'bold');
      pdf.text(isManager ? 'Requesting Entity:' : 'Target Department:', 16, 66);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.deptID} - ${issueDoc.deptName}`, 62, 66);

      pdf.setFont('helvetica', 'bold');
      pdf.text(isManager ? 'Authorized Manager:' : 'Department Head:', 16, 72);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.deptHeadName} (${issueDoc.deptHeadEmail})`, 62, 72);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Authorized Issuer:', 16, 78);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${issueDoc.issuerName} (${issueDoc.issuerID})`, 62, 78);

      pdf.setFont('helvetica', 'bold');
      pdf.text('Storage Directory:', 16, 84);
      pdf.setFont('helvetica', 'normal');
      pdf.text(issueDoc.folderPath, 62, 84);
    }

    // Items Table Header
    let y = 97;
    pdf.setFillColor(241, 245, 249);
    pdf.rect(12, y, 186, 9, 'F');
    pdf.rect(12, y, 186, 9, 'S');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);

    if (isAdjustment) {
      pdf.text('Item Code', 15, y + 6);
      pdf.text('Item Description', 42, y + 6);
      pdf.text('System Qty', 105, y + 6);
      pdf.text('Physical Count', 132, y + 6);
      pdf.text('Variance Delta', 165, y + 6);
    } else {
      pdf.text('Item Code', 16, y + 6);
      pdf.text('Item Description', 50, y + 6);
      pdf.text('Category', 130, y + 6);
      pdf.text(isDelivery ? 'Qty Received' : 'Qty Issued', 170, y + 6);
    }

    // Items List
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    y += 9;

    if (isAdjustment) {
      const adjItems = Array.isArray((docObj.data as AdjustmentDocument).items) ? (docObj.data as AdjustmentDocument).items : [];
      adjItems.forEach((item) => {
        pdf.rect(12, y, 186, 8.5, 'S');
        pdf.text(item?.ItemID || '', 15, y + 5.5);
        pdf.text(item?.ItemName || '', 42, y + 5.5);
        pdf.text(`${item?.SystemQty || 0} ${item?.Unit || ''}`, 105, y + 5.5);
        pdf.text(`${item?.PhysicalQty || 0} ${item?.Unit || ''}`, 132, y + 5.5);
        const varStr = (item?.VarianceQty || 0) > 0 ? `+${item.VarianceQty}` : `${item?.VarianceQty || 0}`;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${varStr} ${item?.Unit || ''}`, 165, y + 5.5);
        pdf.setFont('helvetica', 'normal');
        y += 8.5;
      });
    } else {
      const itemsList = Array.isArray(docObj.data?.items) ? docObj.data.items : [];
      itemsList.forEach((item) => {
        pdf.rect(12, y, 186, 8, 'S');
        pdf.text(item?.ItemID || '', 16, y + 5.5);
        pdf.text(item?.ItemName || '', 50, y + 5.5);
        pdf.text(item?.Category || '', 130, y + 5.5);
        pdf.text(String(item?.Qty || 0), 175, y + 5.5);
        y += 8;
      });
    }

    // Bottom Signatures & Digital Stamp Section
    y += 18;

    pdf.setDrawColor(100, 116, 139);
    pdf.setLineWidth(0.4);
    pdf.rect(12, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      isDelivery
        ? 'Receiver / Inspector Signature'
        : isAdjustment
        ? 'Physical Stock Counter / Auditor'
        : 'Issuer Signature & Stamp',
      16,
      y + 6
    );

    const timeData = docObj.data;
    const digitalSig = `${timeData.timestamp}-${timeData.issuerID}`;
    pdf.setFillColor(isDelivery ? 239 : isAdjustment ? 254 : 240, isDelivery ? 246 : isAdjustment ? 243 : 253, isDelivery ? 255 : isAdjustment ? 199 : 244);
    pdf.rect(16, y + 10, 80, 14, 'F');
    pdf.setDrawColor(isDelivery ? 37 : isAdjustment ? 217 : 16, isDelivery ? 99 : isAdjustment ? 119 : 185, isDelivery ? 235 : isAdjustment ? 6 : 129);
    pdf.rect(16, y + 10, 80, 14, 'S');

    pdf.setFont('courier', 'bold');
    pdf.setFontSize(8.5);
    pdf.setTextColor(isDelivery ? 29 : isAdjustment ? 180 : 5, isDelivery ? 78 : isAdjustment ? 83 : 150, isDelivery ? 216 : isAdjustment ? 9 : 105);
    pdf.text('DIGITAL VERIFICATION STAMP:', 18, y + 15);
    pdf.setFontSize(8);
    pdf.text(digitalSig, 18, y + 20);

    // Right Box: Verification / Approval Sign
    pdf.setDrawColor(100, 116, 139);
    pdf.rect(110, y, 88, 32);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.setTextColor(15, 23, 42);
    pdf.text(
      isDelivery
        ? 'Warehouse Master Verification'
        : isAdjustment
        ? 'Procurement Manager Signoff (ADM001)'
        : (docObj.data as IssuedDocument).deptID?.startsWith('MGR-')
        ? 'Authorized Manager Signature'
        : 'Department Head Signature',
      114,
      y + 6
    );

    pdf.setDrawColor(148, 163, 184);
    pdf.line(114, y + 22, 192, y + 22);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    const signName = isDelivery
      ? `Receiver: ${docObj.data.issuerName}`
      : isAdjustment
      ? `Approved: Rachel Pickard (Procurement Manager)`
      : `Recipient: ${(docObj.data as IssuedDocument).deptHeadName}`;
    pdf.text(signName, 114, y + 27);

    // Save File Name
    const fileName = isDelivery
      ? `Stationery_&_Cleaning_GRN_Voucher_${(docObj.data as ReceivedDocument).voucherNumber}.pdf`
      : isAdjustment
      ? `Stationery_&_Cleaning_Stock_Adjustment_${(docObj.data as AdjustmentDocument).voucherNumber}.pdf`
      : `Stationery_&_Cleaning_IssueSlip_${(docObj.data as IssuedDocument).slipNumber}.pdf`;

    pdf.save(fileName);

    setHasAutoSaved(true);
    setAutoSaveToast(`PDF Auto-Saved to Designated Directory: ${docObj.data.fullSavedPath}`);
    setTimeout(() => {
      setAutoSaveToast(null);
    }, 6000);
  };

  const digitalSignatureStamp = `${docObj.data.timestamp}-${docObj.data.issuerID}`;

  return (
    <div className="fixed inset-0 bg-slate-950/35 flex items-center justify-center p-4 z-50 printable-document-modal">
      <div
        className={`bg-slate-100 dark:bg-slate-800 rounded-xl shadow-2xl border-2 ${
          isDelivery
            ? 'border-blue-600/80'
            : isAdjustment
            ? 'border-amber-600/80'
            : 'border-emerald-600/80'
        } w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 printable-document`}
      >
        {/* Header Bar */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-700 no-print">
          <div className="flex items-center space-x-2">
            {isDelivery ? (
              <PackagePlus className="w-5 h-5 text-blue-400" />
            ) : isAdjustment ? (
              <SlidersHorizontal className="w-5 h-5 text-amber-400" />
            ) : (
              <FileText className="w-5 h-5 text-emerald-400" />
            )}
            <span className="font-mono text-xs font-bold text-slate-100">
              {isDelivery
                ? 'Goods / Items Received Voucher (GRN) Document Viewer'
                : isAdjustment
                ? 'Stock Adjustment & Count Discrepancy Voucher Viewer'
                : 'Stationery & Cleaning Item Issue Slip Viewer'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleNativeSaveAsPdf}
              className="px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow transition"
              title="Save as PDF using browser print dialog"
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
              title="Toggle Print-Friendly High Contrast Mode"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrintFriendly ? 'Print Mode: ON' : 'Print Mode'}</span>
            </button>

            <button onClick={onClose} className="text-slate-400 hover:text-white text-xs font-bold px-2 py-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Toast / Auto-Save Alert Banner */}
          {autoSaveToast && (
            <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-mono animate-in fade-in slide-in-from-top-2 no-print">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>{autoSaveToast}</span>
              </div>
              <span className="text-[10px] bg-emerald-700 px-2 py-0.5 rounded font-bold">100% COMPLETE</span>
            </div>
          )}

          {/* File Storage Banner */}
          <div
            className={`p-3.5 rounded-xl border no-print ${
              isDelivery
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : isAdjustment
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            } flex items-start space-x-3 text-xs`}
          >
            <FolderCheck
              className={`w-5 h-5 shrink-0 mt-0.5 ${
                isDelivery ? 'text-blue-400' : isAdjustment ? 'text-amber-400' : 'text-emerald-400'
              }`}
            />
            <div className="space-y-1">
              <div className="font-bold text-slate-900 dark:text-slate-100">
                Master Directory File Location:
              </div>
              <code className="font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-900 px-2 py-1 rounded block break-all text-[11px] border border-slate-700">
                {docObj.data.fullSavedPath}
              </code>
              <div className="text-[10px] text-slate-400">
                Subfolder Location:{' '}
                <strong
                  className={
                    isDelivery
                      ? 'text-blue-400'
                      : isAdjustment
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }
                >
                  {docObj.data.folderPath}
                </strong>
              </div>
            </div>
          </div>

          {/* Document Canvas Preview (Formatted for Print & Screen) */}
          <div
            className={`stationery-sheet bg-white text-slate-900 p-6 rounded-lg shadow-inner border-2 border-slate-900 space-y-4 font-sans ${
              isPrintFriendly ? 'ring-4 ring-amber-400/50' : ''
            }`}
          >
            {/* Header Box with Official Paramount Logo in Top-Left */}
            <div className="border-2 border-slate-900 flex items-stretch overflow-hidden">
              <div className="logo-container bg-[#22252A] p-2 flex items-center justify-center border-r-2 border-slate-900 shrink-0 min-w-[64px]">
                <img
                  src={logoSrc}
                  onError={() => {
                    // Fallback to high-res Base64 canvas data URL if public file path fails
                    const dataUrl = getPexGreenLogoDataUrl();
                    if (logoSrc !== dataUrl) {
                      setLogoSrc(dataUrl);
                    }
                  }}
                  alt="Paramount PEX Green (2).png Official Logo"
                  className="h-16 w-auto object-contain block select-none"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              </div>

              <div className="flex-1 p-3 flex flex-col items-center justify-center text-center bg-white">
                <h2 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase">
                  {isDelivery
                    ? 'Goods / Items Received Voucher (GRN)'
                    : isAdjustment
                    ? 'Stock Adjustment & Count Discrepancy Voucher'
                    : 'Stationery & Cleaning Requisition Issue Form'}
                </h2>
                <span className="text-[10px] font-mono text-slate-700 font-bold">
                  PARAMOUNT PROCUREMENT & INVENTORY CONTROL
                </span>
                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                  Voucher: {isDelivery ? (docObj.data as ReceivedDocument).voucherNumber : isAdjustment ? (docObj.data as AdjustmentDocument).voucherNumber : (docObj.data as IssuedDocument).slipNumber} | Issued: {docObj.data.timestamp}
                </span>
              </div>
            </div>

            {/* Metadata Section */}
            <div className="border-2 border-slate-900 divide-y-2 divide-slate-300 text-xs font-sans">
              {isDelivery ? (
                <>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Voucher GRN Ref:</span>
                    <span className="font-mono font-bold text-blue-700">
                      {(docObj.data as ReceivedDocument).voucherNumber}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Delivery Note / Invoice Ref:</span>
                    <span className="font-mono text-slate-900">
                      {(docObj.data as ReceivedDocument).deliveryRef || 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Received Timestamp:</span>
                    <span className="font-mono text-slate-900">{docObj.data.timestamp}</span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Receiver / User Details:</span>
                    <span className="font-bold text-slate-900">
                      {docObj.data.issuerName} ({docObj.data.issuerID}) - {docObj.data.issuerRole || 'Procurement'}
                    </span>
                  </div>
                </>
              ) : isAdjustment ? (
                <>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Adjustment Voucher Ref:</span>
                    <span className="font-mono font-bold text-amber-700">
                      {(docObj.data as AdjustmentDocument).voucherNumber}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Count Ref / Audit Tag:</span>
                    <span className="font-mono text-slate-900 font-bold">
                      {(docObj.data as AdjustmentDocument).countRef}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Discrepancy Reason:</span>
                    <span className="font-bold text-amber-800">
                      {(docObj.data as AdjustmentDocument).reasonLabel}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Auditor / Controller:</span>
                    <span className="font-bold text-slate-900">
                      {docObj.data.issuerName} ({docObj.data.issuerID})
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Audit Remarks / Notes:</span>
                    <span className="text-slate-700 italic">
                      {(docObj.data as AdjustmentDocument).notes || 'Physical inventory discrepancy reconciled.'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Slip Reference:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {(docObj.data as IssuedDocument).slipNumber}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Issue Timestamp:</span>
                    <span className="font-mono text-slate-900">{docObj.data.timestamp}</span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">
                      {(docObj.data as IssuedDocument).deptID?.startsWith('MGR-') ? 'Requesting Entity:' : 'Department ID & Name:'}
                    </span>
                    <span className="font-bold text-slate-900">
                      {(docObj.data as IssuedDocument).deptID} - {(docObj.data as IssuedDocument).deptName}
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">
                      {(docObj.data as IssuedDocument).deptID?.startsWith('MGR-') ? 'Authorized Manager:' : 'Department Head:'}
                    </span>
                    <span className="text-slate-900 font-medium">
                      {(docObj.data as IssuedDocument).deptHeadName} ({(docObj.data as IssuedDocument).deptHeadEmail})
                    </span>
                  </div>
                  <div className="p-2 flex">
                    <span className="font-bold w-48 text-slate-900">Authorized Issuer:</span>
                    <span className="text-slate-900 font-medium">
                      {docObj.data.issuerName} ({docObj.data.issuerID})
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Items Table */}
            <div className="border-2 border-slate-900">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-extrabold border-b-2 border-slate-900">
                    <th className="p-2 border-r border-slate-400">Item Code</th>
                    <th className="p-2 border-r border-slate-400">Item Description</th>
                    {isAdjustment ? (
                      <>
                        <th className="p-2 border-r border-slate-400 text-right">System Qty</th>
                        <th className="p-2 border-r border-slate-400 text-right">Physical Count</th>
                        <th className="p-2 text-right">Variance Delta</th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 border-r border-slate-400">Category</th>
                        <th className="p-2 text-right">
                          {isDelivery ? 'Qty Received' : 'Qty Issued'}
                        </th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {isAdjustment ? (
                    (Array.isArray((docObj.data as AdjustmentDocument).items) ? (docObj.data as AdjustmentDocument).items : []).map((item) => (
                      <tr key={item?.ItemID || Math.random()}>
                        <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                          {item?.ItemID}
                        </td>
                        <td className="p-2 font-medium border-r border-slate-300">{item?.ItemName}</td>
                        <td className="p-2 text-right font-mono border-r border-slate-300">
                          {item?.SystemQty} {item?.Unit}
                        </td>
                        <td className="p-2 text-right font-mono font-bold border-r border-slate-300">
                          {item?.PhysicalQty} {item?.Unit}
                        </td>
                        <td className="p-2 text-right font-mono font-extrabold">
                          {(item?.VarianceQty || 0) > 0 ? (
                            <span className="text-emerald-700">+{item.VarianceQty} {item.Unit}</span>
                          ) : (item?.VarianceQty || 0) < 0 ? (
                            <span className="text-red-700">{item.VarianceQty} {item.Unit}</span>
                          ) : (
                            <span className="text-slate-700">0 {item?.Unit}</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    (Array.isArray(docObj.data?.items) ? docObj.data.items : []).map((item) => (
                      <tr key={item?.ItemID || Math.random()}>
                        <td className="p-2 font-mono font-bold text-slate-900 border-r border-slate-300">
                          {item?.ItemID}
                        </td>
                        <td className="p-2 font-medium border-r border-slate-300">{item?.ItemName}</td>
                        <td className="p-2 text-slate-700 border-r border-slate-300">{item?.Category}</td>
                        <td className="p-2 text-right font-mono font-extrabold text-slate-900">
                          {isDelivery ? `+${item?.Qty || 0}` : (item?.Qty || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Signatures */}
            <div className="pt-2 grid grid-cols-2 gap-4 text-xs font-sans">
              <div className="border-2 border-slate-900 p-3 bg-slate-50 space-y-2">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  {isDelivery
                    ? 'Receiver / Inspector Signature'
                    : isAdjustment
                    ? 'Physical Stock Counter / Auditor'
                    : 'Issuer Signature & Stamp'}
                </div>
                <div
                  className={`p-2 rounded font-mono text-[11px] space-y-0.5 border ${
                    isDelivery
                      ? 'bg-blue-50 border-blue-400 text-blue-900'
                      : isAdjustment
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-emerald-50 border-emerald-400 text-emerald-900'
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase ${
                      isDelivery ? 'text-blue-700' : isAdjustment ? 'text-amber-700' : 'text-emerald-700'
                    }`}
                  >
                    Digital Verification Stamp
                  </div>
                  <div className="font-bold tracking-tight">{digitalSignatureStamp}</div>
                  <div className="text-[10px] text-slate-600">
                    User: {docObj.data.issuerName} ({docObj.data.issuerID})
                  </div>
                </div>
              </div>

              <div className="border-2 border-slate-900 p-3 space-y-3 bg-slate-50">
                <div className="font-bold text-slate-900 border-b border-slate-400 pb-1 uppercase text-[10px]">
                  {isDelivery
                    ? 'Warehouse Master Verification'
                    : isAdjustment
                    ? 'Inventory Controller Approval'
                    : (docObj.data as IssuedDocument).deptID?.startsWith('MGR-')
                    ? 'Authorized Manager Signature'
                    : 'Department Head Signature'}
                </div>
                <div className="border-b-2 border-dashed border-slate-400 pt-6" />
                <div className="text-[11px] text-slate-700 font-semibold">
                  Confirmed By:{' '}
                  <span>
                    {isDelivery
                      ? docObj.data.issuerName
                      : isAdjustment
                      ? 'Rachel Pickard (Procurement Manager)'
                      : (docObj.data as IssuedDocument).deptHeadName}
                  </span>
                </div>
              </div>
            </div>

            {/* Print Footer Note */}
            <div className="text-[9px] text-slate-500 text-center font-mono pt-1">
              *** Paramount Stationery & Cleaning Official Voucher — Formatted for Printing, Emailing and Archiving ***
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700 no-print">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-xl transition text-center"
            >
              Close Document
            </button>

            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleNativeSaveAsPdf}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg hover:shadow-emerald-500/20 transition active:scale-[0.98]"
                title="Trigger native browser print dialog to Save as PDF"
              >
                <FileDown className="w-4 h-4 text-emerald-100" />
                <span>Save as PDF</span>
              </button>

              <button
                type="button"
                onClick={handlePrintNow}
                className="flex-1 sm:flex-initial flex items-center justify-center space-x-1.5 px-4 py-2.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow transition active:scale-[0.98]"
                title="Print voucher document directly"
              >
                <Printer className="w-4 h-4" />
                <span>Print Voucher</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadPdf}
                className={`flex-1 sm:flex-initial flex items-center justify-center space-x-2 px-5 py-2.5 text-xs font-bold text-white ${
                  hasAutoSaved
                    ? 'bg-slate-700 hover:bg-slate-600 ring-2 ring-emerald-400'
                    : isDelivery
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : isAdjustment
                    ? 'bg-amber-600 hover:bg-amber-500'
                    : 'bg-emerald-700 hover:bg-emerald-600'
                } rounded-xl shadow transition active:scale-[0.98]`}
                title="Single click auto-save PDF to designated directory"
              >
                <Download className="w-4 h-4" />
                <span>{hasAutoSaved ? '✓ PDF Auto-Saved' : 'Auto-Save to Directory'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
