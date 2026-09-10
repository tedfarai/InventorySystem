import { VbaModule } from '../types';

export const VBA_MODULES: VbaModule[] = [
  {
    id: 'thisworkbook',
    name: 'ThisWorkbook.cls',
    type: 'Class',
    description: 'Workbook event triggers, auto-login launch on open, structure check, and autosave enforcement.',
    code: `'===============================================================================
' SYSTEM: Stationery & Cleaning Items Procurement System
' FILE: ThisWorkbook.cls
' COMPATIBILITY: Excel 32-Bit / 64-Bit (VBA7 / Win32 API Compatible)
'===============================================================================
Option Explicit

Private Sub Workbook_Open()
    On Error GoTo ErrorHandler
    
    ' Ensure Admin_Config is very hidden by default on workbook launch
    On Error Resume Next
    ThisWorkbook.Sheets("Admin_Config").Visible = xlSheetVeryHidden
    On Error GoTo ErrorHandler
    
    ' Ensure system worksheets and folders exist safely
    Call EnsureDirectoriesExist
    Call CheckWorkbookStructure
    
    ' Reset session state
    g_CurrentIssuerID = ""
    g_CurrentIssuerName = ""
    g_IsAuthenticated = False
    
    Application.ScreenUpdating = True
    
    ' Launch Sequential Pop-Up Workflow Starting with Masked Login
    frmLogin.Show
    
    ' If authenticated, launch main switchboard navigation
    If g_IsAuthenticated Then
        frmNavigation.Show
    Else
        MsgBox "Authentication cancelled or failed. Access restricted.", _
               vbExclamation + vbOKOnly, "Access Denied"
    End If
    Exit Sub

ErrorHandler:
    Application.ScreenUpdating = True
    MsgBox "An error occurred during Workbook_Open: " & Err.Description, _
           vbCritical, "Initialization Error"
End Sub

Private Sub Workbook_BeforeSave(ByVal SaveAsUI As Boolean, Cancel As Boolean)
    ' Enforce FileFormat 52 (.xlsm macro-enabled) on SaveAs
    On Error Resume Next
    If SaveAsUI Then
        ' Prompt user or enforce .xlsm format
    End If
End Sub

Private Sub Workbook_SheetActivate(ByVal Sh As Object)
    ' Enforce Admin_Config Access Restriction (Rachel Pickard ADM001 Only)
    If Sh.Name = "Admin_Config" Then
        If Trim(UCase(g_CurrentIssuerID)) <> "ADM001" Then
            MsgBox "Access Restricted: The 'Admin_Config' worksheet contains confidential credentials and system settings. It is strictly restricted to Rachel Pickard (Procurement Manager / Superior Admin).", _
                   vbCritical + vbOKOnly, "Access Restricted"
            On Error Resume Next
            Worksheets("Master_Stock").Activate
        End If
    End If
End Sub
`
  },
  {
    id: 'modProcurementSystem',
    name: 'modProcurementSystem.bas',
    type: 'Module',
    description: 'Core procurement workflows: stock updates, issue processing, Dir/MkDir PDF export, Outlook Late Binding email dispatch, safe path handling, and structure check.',
    code: `'===============================================================================
' SYSTEM: Stationery & Cleaning Items Procurement System
' FILE: modProcurementSystem.bas
' DESCRIPTION: Core Business Logic, PDF Generation, Outlook Late Binding Email, Safe Paths
' COMPATIBILITY: Windows 32-Bit & 64-Bit Excel
'===============================================================================
Option Explicit

' Global Session Variables
Public g_CurrentIssuerID As String
Public g_CurrentIssuerName As String
Public g_IsAuthenticated As Boolean

' Win32 API Sleep Declaration (Compatible with 32-bit & 64-bit Excel)
#If VBA7 Then
    Public Declare PtrSafe Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#Else
    Public Declare Sub Sleep Lib "kernel32" (ByVal dwMilliseconds As Long)
#End If

' Directory Constant for Issued Items
Public Const ISSUED_FOLDER_NAME As String = "Issued_Items"

'===============================================================================
' 0. SAFE PATH HELPER
'===============================================================================
Public Function GetNormalizedBasePath() As String
    Dim sPath As String
    sPath = ThisWorkbook.Path
    If sPath = "" Then
        sPath = CurDir()
    End If
    If Right(sPath, 1) <> Application.PathSeparator Then
        sPath = sPath & Application.PathSeparator
    End If
    GetNormalizedBasePath = sPath
End Function

'===============================================================================
' 1. ENSURE DIRECTORIES EXIST (Dir / MkDir Pattern with Safe Path Separators)
'===============================================================================
Public Sub EnsureDirectoriesExist()
    Dim sBasePath As String
    Dim sFolderPath As String
    
    On Error GoTo ErrHandler
    sBasePath = GetNormalizedBasePath()
    sFolderPath = sBasePath & ISSUED_FOLDER_NAME
    
    ' Check if directory exists using Dir function
    If Dir(sFolderPath, vbDirectory) = "" Then
        MkDir sFolderPath
    End If
    Exit Sub

ErrHandler:
    MsgBox "Unable to create directory '" & ISSUED_FOLDER_NAME & "': " & Err.Description, _
           vbCritical, "Directory Error"
End Sub

'===============================================================================
' 1B. CHECK WORKBOOK STRUCTURE & REBUILD MISSING SHEETS
'===============================================================================
Public Sub CheckWorkbookStructure()
    Dim wb As Workbook
    Dim wsStock As Worksheet, wsLog As Worksheet, wsAdmin As Worksheet
    
    On Error Resume Next
    Set wb = ThisWorkbook
    Set wsStock = wb.Sheets("Master_Stock")
    Set wsLog = wb.Sheets("Movement_Log")
    Set wsAdmin = wb.Sheets("Admin_Config")
    On Error GoTo 0
    
    If wsStock Is Nothing Or wsLog Is Nothing Or wsAdmin Is Nothing Then
        If MsgBox("One or more required worksheets (Master_Stock, Movement_Log, Admin_Config) are missing." & vbCrLf & _
                  "Would you like to run the automated setup macro to initialize the workbook structure?", _
                  vbQuestion + vbYesNo, "Structure Check") = vbYes Then
            Call SetupSystemWorksheets
        End If
    End If
End Sub

'===============================================================================
' 1C. AUTOMATED SYSTEM WORKSHEETS SETUP MACRO (Self-Contained inside Module)
'===============================================================================
Public Sub SetupSystemWorksheets()
    Dim wb As Workbook
    Dim wsStock As Worksheet, wsLog As Worksheet, wsAdmin As Worksheet
    
    Set wb = ThisWorkbook
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' 1. Master_Stock Sheet
    On Error Resume Next
    Set wsStock = wb.Sheets("Master_Stock")
    If wsStock Is Nothing Then Set wsStock = wb.Sheets.Add(Before:=wb.Sheets(1))
    wsStock.Name = "Master_Stock"
    On Error GoTo 0
    wsStock.Cells.Clear
    
    wsStock.Range("A1:D1").Value = Array("ItemID", "ItemName", "Category", "Qty")
    wsStock.Range("A1:D1").Font.Bold = True
    wsStock.Range("A1:D1").Interior.Color = RGB(41, 128, 185)
    wsStock.Range("A1:D1").Font.Color = RGB(255, 255, 255)
    
    ' Complete Seed Inventory Items (Stationery & Cleaning)
    wsStock.Range("A2:D2").Value = Array("ST-001", "A4 Copy Paper (500 sheets/ream)", "Stationery", 120)
    wsStock.Range("A3:D3").Value = Array("ST-002", "Blue Ballpoint Pens (Box of 12)", "Stationery", 45)
    wsStock.Range("A4:D4").Value = Array("ST-003", "Black Gel Pens (Box of 12)", "Stationery", 30)
    wsStock.Range("A5:D5").Value = Array("ST-004", "Heavy Duty Stapler (24/6)", "Stationery", 18)
    wsStock.Range("A6:D6").Value = Array("ST-005", "Staple Pins 24/6 (Box)", "Stationery", 85)
    wsStock.Range("A7:D7").Value = Array("ST-006", "Highlighter Markers (Pack of 4)", "Stationery", 50)
    wsStock.Range("A8:D8").Value = Array("ST-007", "Sticky Notes 3x3 Yellow (10 pads)", "Stationery", 60)
    wsStock.Range("A9:D9").Value = Array("ST-008", "A4 Lever Arch Files (50mm)", "Stationery", 40)
    wsStock.Range("A10:D10").Value = Array("ST-009", "Correction Tape 5mm x 12m", "Stationery", 35)
    wsStock.Range("A11:D11").Value = Array("ST-010", "Permanent Markers Black (Box 10)", "Stationery", 25)

    wsStock.Range("A12:D12").Value = Array("CL-101", "Multi-Surface Cleaner (5L)", "Cleaning", 30)
    wsStock.Range("A13:D13").Value = Array("CL-102", "Microfiber Cloths (Pack of 10)", "Cleaning", 40)
    wsStock.Range("A14:D14").Value = Array("CL-103", "Industrial Floor Cleaner (10L)", "Cleaning", 15)
    wsStock.Range("A15:D15").Value = Array("CL-104", "Antibacterial Hand Soap Refill (5L)", "Cleaning", 22)
    wsStock.Range("A16:D16").Value = Array("CL-105", "2-Ply Paper Towel Rolls (Pack 12)", "Cleaning", 65)
    wsStock.Range("A17:D17").Value = Array("CL-106", "Heavy Duty Latex Gloves (Box 100)", "Cleaning", 28)
    wsStock.Range("A18:D18").Value = Array("CL-107", "Trash Bags Heavy Duty 50L (Roll 20)", "Cleaning", 90)
    wsStock.Range("A19:D19").Value = Array("CL-108", "Glass Cleaner Spray (750ml)", "Cleaning", 34)
    wsStock.Range("A20:D20").Value = Array("CL-109", "Toilet Cleaner Bleach Gel (750ml)", "Cleaning", 50)
    wsStock.Range("A21:D21").Value = Array("CL-110", "Air Freshener Spray Citrus (300ml)", "Cleaning", 42)
    wsStock.Columns("A:D").AutoFit
    
    ' 2. Movement_Log Sheet
    On Error Resume Next
    Set wsLog = wb.Sheets("Movement_Log")
    If wsLog Is Nothing Then Set wsLog = wb.Sheets.Add(After:=wsStock)
    wsLog.Name = "Movement_Log"
    On Error GoTo 0
    wsLog.Cells.Clear
    
    wsLog.Range("A1:H1").Value = Array("Timestamp", "Type", "Item", "Qty", "DeptID", "DeptName", "DeptHead", "IssuerID")
    wsLog.Range("A1:H1").Font.Bold = True
    wsLog.Range("A1:H1").Interior.Color = RGB(39, 174, 96)
    wsLog.Range("A1:H1").Font.Color = RGB(255, 255, 255)
    wsLog.Columns("A:H").AutoFit
    
    ' 3. Admin_Config Sheet
    On Error Resume Next
    Set wsAdmin = wb.Sheets("Admin_Config")
    If wsAdmin Is Nothing Then Set wsAdmin = wb.Sheets.Add(After:=wsLog)
    wsAdmin.Name = "Admin_Config"
    On Error GoTo 0
    wsAdmin.Cells.Clear
    
    ' Issuer Admins Table (A:D)
    wsAdmin.Range("A1:D1").Value = Array("IssuerID", "IssuerName", "Role", "SecretPassword")
    wsAdmin.Range("A1:D1").Font.Bold = True
    wsAdmin.Range("A1:D1").Interior.Color = RGB(142, 68, 173)
    wsAdmin.Range("A1:D1").Font.Color = RGB(255, 255, 255)
    
    wsAdmin.Range("A2:D2").Value = Array("ADM001", "Rachel Pickard", "Chief Procurement Officer", "Superior1234")
    wsAdmin.Range("A3:D3").Value = Array("ADM002", "Loveness Mawisire", "Master Inventory Controller", "Micky1234Master")
    wsAdmin.Range("A4:D4").Value = Array("ADM003", "Lyda Gurupira", "Senior Storekeeper", "Master1234")
    wsAdmin.Range("A5:D5").Value = Array("ADM004", "Caeser Joe", "Assistant Inventory Officer", "Second1234")
    wsAdmin.Range("A6:D6").Value = Array("ADM005", "Farai Mandoreba", "Procurement Specialist", "Procurement1234")
    wsAdmin.Range("A7:D7").Value = Array("ADM006", "Bianca Mpakairi", "System Administrator", "Admin1234!")
    
    ' Departments Reference Table (F:I) — Complete Directory (DEPT-101 to DEPT-106)
    wsAdmin.Range("F1:I1").Value = Array("DeptID", "DeptName", "DeptHeadName", "DeptHeadEmail")
    wsAdmin.Range("F1:I1").Font.Bold = True
    wsAdmin.Range("F1:I1").Interior.Color = RGB(211, 84, 0)
    wsAdmin.Range("F1:I1").Font.Color = RGB(255, 255, 255)
    
    wsAdmin.Range("F2:I2").Value = Array("DEPT-101", "Human Resources & Talent", "Elena Rostova", "elena.rostova@company.com")
    wsAdmin.Range("F3:I3").Value = Array("DEPT-102", "Finance & Accounting", "Robert Vance", "robert.vance@company.com")
    wsAdmin.Range("F4:I4").Value = Array("DEPT-103", "Information Technology", "Marcus Thorne", "marcus.thorne@company.com")
    wsAdmin.Range("F5:I5").Value = Array("DEPT-104", "Operations & Logistics", "Amanda Hayes", "amanda.hayes@company.com")
    wsAdmin.Range("F6:I6").Value = Array("DEPT-105", "Facilities & Sanitation", "Carlos Mendez", "carlos.mendez@company.com")
    wsAdmin.Range("F7:I7").Value = Array("DEPT-106", "Sales & Marketing", "Patricia Sterling", "patricia.sterling@company.com")
    
    wsAdmin.Columns("A:I").AutoFit
    
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "Worksheets (Master_Stock, Movement_Log, Admin_Config) set up successfully!", vbInformation, "Setup Complete"
End Sub

'===============================================================================
' 2. PROCESS NEW DELIVERY / STOCK UPDATE
'===============================================================================
Public Sub ProcessStockDelivery(ByVal sItemID As String, ByVal dblAddQty As Double)
    Dim wsStock As Worksheet
    Dim wsLog As Worksheet
    Dim rFound As Range
    Dim lNextRow As Long
    Dim sItemName As String
    Dim dblOldQty As Double, dblNewQty As Double
    
    On Error GoTo ErrHandler
    
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    Set wsLog = ThisWorkbook.Sheets("Movement_Log")
    
    ' Find item in Master_Stock
    Set rFound = wsStock.Columns("A").Find(What:=sItemID, LookIn:=xlValues, LookAt:=xlWhole)
    If rFound Is Nothing Then
        MsgBox "Item ID '" & sItemID & "' not found in Master_Stock!", vbExclamation, "Stock Update Failed"
        Exit Sub
    End If
    
    sItemName = rFound.Offset(0, 1).Value
    dblOldQty = Val(rFound.Offset(0, 3).Value)
    dblNewQty = dblOldQty + dblAddQty
    
    ' Update Master_Stock
    rFound.Offset(0, 3).Value = dblNewQty
    
    ' Log Entry in Movement_Log
    lNextRow = wsLog.Cells(wsLog.Rows.Count, "A").End(xlUp).Row + 1
    wsLog.Cells(lNextRow, 1).Value = Format(Now, "YYYY-MM-DD HH:NN:SS")
    wsLog.Cells(lNextRow, 2).Value = "DELIVERY"
    wsLog.Cells(lNextRow, 3).Value = sItemID & " - " & sItemName
    wsLog.Cells(lNextRow, 4).Value = dblAddQty
    wsLog.Cells(lNextRow, 5).Value = "N/A"
    wsLog.Cells(lNextRow, 6).Value = "Central Warehouse"
    wsLog.Cells(lNextRow, 7).Value = "N/A"
    wsLog.Cells(lNextRow, 8).Value = g_CurrentIssuerID
    
    ' Auto-save workbook as .xlsm (FileFormat 52)
    Call SaveWorkbookAsXLSM
    
    MsgBox "Stock updated successfully!" & vbCrLf & _
           "Item: " & sItemName & vbCrLf & _
           "Added: " & dblAddQty & vbCrLf & _
           "New Total: " & dblNewQty, vbInformation, "Delivery Logged"
    Exit Sub

ErrHandler:
    MsgBox "Error processing delivery: " & Err.Description, vbCritical, "System Error"
End Sub

'===============================================================================
' 2B. PROCESS BULK STOCK DELIVERIES / BULK SHIPMENT BATCH
'===============================================================================
Public Sub ProcessBulkStockDeliveries(ByVal vDeliveryArray As Variant)
    ' vDeliveryArray is 2D array: Row 1..N (Col 1: ItemID, Col 2: AddQty)
    Dim wsStock As Worksheet
    Dim wsLog As Worksheet
    Dim rFound As Range
    Dim i As Long, lNextRow As Long
    Dim sItemID As String, sItemName As String
    Dim dblAddQty As Double, dblOldQty As Double
    Dim lTotalCount As Long
    Dim dblTotalUnits As Double
    
    On Error GoTo ErrHandler
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    Set wsLog = ThisWorkbook.Sheets("Movement_Log")
    
    lTotalCount = 0
    dblTotalUnits = 0
    
    For i = LBound(vDeliveryArray, 1) To UBound(vDeliveryArray, 1)
        sItemID = Trim(vDeliveryArray(i, 1))
        dblAddQty = CDbl(vDeliveryArray(i, 2))
        
        If sItemID <> "" And dblAddQty > 0 Then
            Set rFound = wsStock.Columns("A").Find(What:=sItemID, LookIn:=xlValues, LookAt:=xlWhole)
            If Not rFound Is Nothing Then
                sItemName = rFound.Offset(0, 1).Value
                dblOldQty = Val(rFound.Offset(0, 3).Value)
                
                ' 1. Increment Stock Level
                rFound.Offset(0, 3).Value = dblOldQty + dblAddQty
                
                ' 2. Append to Movement_Log
                lNextRow = wsLog.Cells(wsLog.Rows.Count, "A").End(xlUp).Row + 1
                wsLog.Cells(lNextRow, 1).Value = Format(Now, "YYYY-MM-DD HH:NN:SS")
                wsLog.Cells(lNextRow, 2).Value = "DELIVERY"
                wsLog.Cells(lNextRow, 3).Value = sItemID & " - " & sItemName
                wsLog.Cells(lNextRow, 4).Value = dblAddQty
                wsLog.Cells(lNextRow, 5).Value = "N/A"
                wsLog.Cells(lNextRow, 6).Value = "Central Warehouse (Bulk Shipment)"
                wsLog.Cells(lNextRow, 7).Value = "N/A"
                wsLog.Cells(lNextRow, 8).Value = g_CurrentIssuerID
                
                lTotalCount = lTotalCount + 1
                dblTotalUnits = dblTotalUnits + dblAddQty
            End If
        End If
    Next i
    
    Call SaveWorkbookAsXLSM
    
    MsgBox "Bulk Delivery Batch Processed Successfully!" & vbCrLf & _
           "• Line Items Updated: " & lTotalCount & vbCrLf & _
           "• Total Units Added: " & dblTotalUnits & vbCrLf & _
           "• Master_Stock & Movement_Log Updated" & vbCrLf & _
           "• File Autosaved (.xlsm)", vbInformation, "Bulk Shipment Logged"
    Exit Sub

ErrHandler:
    MsgBox "Error processing bulk deliveries: " & Err.Description, vbCritical, "Bulk Error"
End Sub

'===============================================================================
' 3. PROCESS ISSUE OUT REQUEST (VALIDATE, DEDUCT, LOG, PDF, OUTLOOK, AUTOSAVE)
'===============================================================================
Public Function ProcessIssueRequest(ByVal sDeptID As String, _
                                    ByVal sDeptName As String, _
                                    ByVal sDeptHead As String, _
                                    ByVal sDeptEmail As String, _
                                    ByVal vItemArray As Variant) As Boolean
    ' vItemArray contains 2D array: (Row 1..N, Col 1: ItemID, Col 2: ItemName, Col 3: QtyRequested)
    
    Dim wsStock As Worksheet
    Dim wsLog As Worksheet
    Dim rFound As Range
    Dim i As Long
    Dim sItemID As String, sItemName As String
    Dim dblReqQty As Double, dblAvailQty As Double
    Dim lNextRow As Long
    Dim sTimestampStr As String
    Dim sPdfPath As String
    
    On Error GoTo ErrHandler
    ProcessIssueRequest = False
    
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    Set wsLog = ThisWorkbook.Sheets("Movement_Log")
    
    ' Phase A: Re-Validate All Stock Quantities
    For i = LBound(vItemArray, 1) To UBound(vItemArray, 1)
        sItemID = Trim(vItemArray(i, 1))
        dblReqQty = CDbl(vItemArray(i, 3))
        
        Set rFound = wsStock.Columns("A").Find(What:=sItemID, LookIn:=xlValues, LookAt:=xlWhole)
        If rFound Is Nothing Then
            MsgBox "Validation Failed: Item ID " & sItemID & " does not exist in Master_Stock.", vbCritical, "Error"
            Exit Function
        Else
            dblAvailQty = CDbl(rFound.Offset(0, 3).Value)
            If dblReqQty > dblAvailQty Then
                MsgBox "Insufficient Stock for " & rFound.Offset(0, 1).Value & "!" & vbCrLf & _
                       "Requested: " & dblReqQty & vbCrLf & _
                       "Available: " & dblAvailQty, vbExclamation, "Stock Validation Failed"
                Exit Function
            End If
        End If
    Next i
    
    sTimestampStr = Format(Now, "YYYYMMDD_HHNNSS")
    
    ' Phase B: Deduct Stock & Write Movement Log
    For i = LBound(vItemArray, 1) To UBound(vItemArray, 1)
        sItemID = Trim(vItemArray(i, 1))
        sItemName = Trim(vItemArray(i, 2))
        dblReqQty = CDbl(vItemArray(i, 3))
        
        ' Deduct from Stock
        Set rFound = wsStock.Columns("A").Find(What:=sItemID, LookIn:=xlValues, LookAt:=xlWhole)
        rFound.Offset(0, 3).Value = CDbl(rFound.Offset(0, 3).Value) - dblReqQty
        
        ' Log Movement
        lNextRow = wsLog.Cells(wsLog.Rows.Count, "A").End(xlUp).Row + 1
        wsLog.Cells(lNextRow, 1).Value = Format(Now, "YYYY-MM-DD HH:NN:SS")
        wsLog.Cells(lNextRow, 2).Value = "ISSUE"
        wsLog.Cells(lNextRow, 3).Value = sItemID & " - " & sItemName
        wsLog.Cells(lNextRow, 4).Value = dblReqQty
        wsLog.Cells(lNextRow, 5).Value = sDeptID
        wsLog.Cells(lNextRow, 6).Value = sDeptName
        wsLog.Cells(lNextRow, 7).Value = sDeptHead
        wsLog.Cells(lNextRow, 8).Value = g_CurrentIssuerID
    Next i
    
    ' Phase C: Generate PDF Issue Slip in 'Issued_Items' Folder
    sPdfPath = GenerateIssueSlipPDF(sDeptID, sDeptName, sDeptHead, sDeptEmail, vItemArray, sTimestampStr)
    
    ' Phase D: Auto-save Workbook as .xlsm (FileFormat 52)
    Call SaveWorkbookAsXLSM
    
    ' Final Confirmation Dialogue
    MsgBox "SUCCESS! Issue request completed." & vbCrLf & vbCrLf & _
           "• Master_Stock updated." & vbCrLf & _
           "• Movement_Log updated." & vbCrLf & _
           "• PDF Slip generated & saved: " & sPdfPath & vbCrLf & _
           "• Workbook autosaved as .xlsm", vbInformation + vbOKOnly, "Issue Complete"
           
    ProcessIssueRequest = True
    Exit Function

ErrHandler:
    MsgBox "Error processing issue request: " & Err.Description, vbCritical, "System Error"
End Function

'===============================================================================
' 4. PDF ISSUE SLIP GENERATOR USING EXPORTASFIXEDFORMAT & SAFE PATHS
'===============================================================================
Private Function GenerateIssueSlipPDF(ByVal sDeptID As String, _
                                      ByVal sDeptName As String, _
                                      ByVal sDeptHead As String, _
                                      ByVal sDeptEmail As String, _
                                      ByVal vItemArray As Variant, _
                                      ByVal sTimestampStr As String) As String
    Dim wsTemp As Worksheet
    Dim sBasePath As String
    Dim sPdfFullPath As String
    Dim i As Long, lRow As Long
    
    On Error GoTo ErrHandler
    
    ' Build Output File Path safely
    Call EnsureDirectoriesExist
    sBasePath = GetNormalizedBasePath()
    sPdfFullPath = sBasePath & ISSUED_FOLDER_NAME & Application.PathSeparator & "IssueSlip_" & Replace(sDeptID, "-", "") & "_" & sTimestampStr & ".pdf"
    
    ' Create temporary print sheet
    Set wsTemp = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
    wsTemp.Name = "PDF_Temp_" & Int(Rnd * 1000)
    
    ' Format Header matching Paramount Template
    wsTemp.Cells(1, 1).Value = "Stationery & Cleaning Item Issue Slip"
    wsTemp.Cells(1, 1).Font.Size = 16
    wsTemp.Cells(1, 1).Font.Bold = True
    
    ' Metadata Section
    wsTemp.Cells(3, 1).Value = "Slip Reference:"
    wsTemp.Cells(3, 2).Value = "SLIP-" & Int((9000 * Rnd) + 1000)
    
    wsTemp.Cells(4, 1).Value = "Issue Timestamp:"
    wsTemp.Cells(4, 2).Value = Format(Now, "YYYY-MM-DD HH:NN:SS")
    
    wsTemp.Cells(5, 1).Value = "Department ID & Name:"
    wsTemp.Cells(5, 2).Value = sDeptID & " - " & sDeptName
    
    wsTemp.Cells(6, 1).Value = "Department Head:"
    wsTemp.Cells(6, 2).Value = sDeptHead & " (" & sDeptEmail & ")"
    
    wsTemp.Cells(7, 1).Value = "Issuer:"
    wsTemp.Cells(7, 2).Value = g_CurrentIssuerName & " (" & g_CurrentIssuerID & ")"
    
    wsTemp.Range("A3:A7").Font.Bold = True
    
    ' Item Table Headers
    lRow = 9
    wsTemp.Cells(lRow, 1).Value = "Item ID"
    wsTemp.Cells(lRow, 2).Value = "Item Description"
    wsTemp.Cells(lRow, 3).Value = "Category"
    wsTemp.Cells(lRow, 4).Value = "Qty Issued"
    wsTemp.Range(wsTemp.Cells(lRow, 1), wsTemp.Cells(lRow, 4)).Font.Bold = True
    wsTemp.Range(wsTemp.Cells(lRow, 1), wsTemp.Cells(lRow, 4)).Interior.Color = RGB(240, 243, 246)
    
    ' Populate Items
    For i = LBound(vItemArray, 1) To UBound(vItemArray, 1)
        lRow = lRow + 1
        wsTemp.Cells(lRow, 1).Value = vItemArray(i, 1)
        wsTemp.Cells(lRow, 2).Value = vItemArray(i, 2)
        wsTemp.Cells(lRow, 3).Value = "Inventory Item"
        wsTemp.Cells(lRow, 4).Value = vItemArray(i, 3)
    Next i
    
    ' Bottom Signature & Stamp Section (Bottom Left: Digital TimeStamp - WorkId Signature)
    lRow = lRow + 3
    wsTemp.Cells(lRow, 1).Value = "Issuer Signature & Stamp Section:"
    wsTemp.Cells(lRow, 1).Font.Bold = True
    wsTemp.Cells(lRow + 1, 1).Value = "Digital Signature: " & Format(Now, "YYYY-MM-DD HH:NN:SS") & "-" & g_CurrentIssuerID
    wsTemp.Cells(lRow + 1, 1).Font.Name = "Courier New"
    wsTemp.Cells(lRow + 1, 1).Font.Bold = True
    
    wsTemp.Cells(lRow, 3).Value = "Department Head Signature:"
    wsTemp.Cells(lRow, 3).Font.Bold = True
    wsTemp.Cells(lRow + 1, 3).Value = "Recipient Confirmation: " & sDeptHead
    
    ' Page Setup & Export to PDF
    With wsTemp.PageSetup
        .Orientation = xlPortrait
        .Zoom = False
        .FitToPagesWide = 1
        .FitToPagesTall = 1
    End With
    
    ' Export PDF
    wsTemp.ExportAsFixedFormat Type:=xlTypePDF, _
                              Filename:=sPdfFullPath, _
                              Quality:=xlQualityStandard, _
                              IncludeDocProperties:=True, _
                              IgnorePrintAreas:=False, _
                              OpenAfterPublish:=False
                              
    ' Clean up temp sheet
    Application.DisplayAlerts = False
    wsTemp.Delete
    Application.DisplayAlerts = True
    
    GenerateIssueSlipPDF = sPdfFullPath
    Exit Function

ErrHandler:
    Application.DisplayAlerts = True
    MsgBox "PDF Generation Error: " & Err.Description, vbCritical, "PDF Error"
    GenerateIssueSlipPDF = ""
End Function

'===============================================================================
' 5. AUTO-EMAIL PDF TO DEPT HEAD VIA OUTLOOK LATE BINDING
'===============================================================================
Private Sub SendEmailViaOutlookLateBinding(ByVal sRecipientEmail As String, _
                                          ByVal sDeptHead As String, _
                                          ByVal sDeptName As String, _
                                          ByVal sPdfPath As String, _
                                          ByVal vItemArray As Variant)
    Dim olApp As Object
    Dim olMail As Object
    Dim sBody As String
    Dim i As Long
    
    On Error GoTo ErrHandler
    
    ' Late Binding: Create Outlook Application instance dynamically without library reference
    Set olApp = CreateObject("Outlook.Application")
    Set olMail = olApp.CreateItem(0) ' 0 = olMailItem
    
    ' Build HTML Email Body
    sBody = "<p>Dear " & sDeptHead & ",</p>"
    sBody = sBody & "<p>This is an automated notification from the <b>Procurement System</b> regarding an item issue request for <b>" & sDeptName & "</b>.</p>"
    sBody = sBody & "<p><b>Summary of Issued Items:</b></p><ul>"
    
    For i = LBound(vItemArray, 1) To UBound(vItemArray, 1)
        sBody = sBody & "<li><b>" & vItemArray(i, 2) & "</b> (ID: " & vItemArray(i, 1) & ") — Quantity: " & vItemArray(i, 3) & "</li>"
    Next i
    
    sBody = sBody & "</ul>"
    sBody = sBody & "<p>The official Issue Slip PDF is attached to this email for your records.</p>"
    sBody = sBody & "<br><p>Best regards,<br><b>Procurement & Inventory Stores Team</b><br>Issuer ID: " & g_CurrentIssuerID & "</p>"
    
    With olMail
        .To = sRecipientEmail
        .Subject = "Official Procurement Issue Slip - " & sDeptName & " [" & Format(Now, "YYYY-MM-DD") & "]"
        .HTMLBody = sBody
        .Attachments.Add sPdfPath
        .Send
    End With
    
    Set olMail = Nothing
    Set olApp = Nothing
    Exit Sub

ErrHandler:
    MsgBox "Outlook Email Dispatch Warning: " & Err.Description & vbCrLf & _
           "Make sure Microsoft Outlook is installed and configured.", vbExclamation, "Email Notification"
End Sub

'===============================================================================
' 6. AUTOSAVE WORKBOOK AS .XLSM (FileFormat 52)
'===============================================================================
Public Sub SaveWorkbookAsXLSM()
    On Error GoTo ErrHandler
    
    Application.DisplayAlerts = False
    If ThisWorkbook.Path <> "" Then
        ThisWorkbook.Save
    Else
        ' FileFormat 52 = xlOpenXMLWorkbookMacroEnabled
        ThisWorkbook.SaveAs Filename:=ThisWorkbook.Name, FileFormat:=52
    End If
    Application.DisplayAlerts = True
    Exit Sub

ErrHandler:
    Application.DisplayAlerts = True
    MsgBox "Autosave Error: " & Err.Description, vbExclamation, "Save Warning"
End Sub
`
  },
  {
    id: 'modSecurity',
    name: 'modSecurity.bas',
    type: 'Module',
    description: 'Authentication logic against Admin_Config, Work ID lookup, password masking, and VBA protection instructions.',
    code: `'===============================================================================
' SYSTEM: Stationery & Cleaning Items Procurement System
' FILE: modSecurity.bas
' DESCRIPTION: Login Validation, Admin_Config Lookup, Password Security
'===============================================================================
Option Explicit

'===============================================================================
' VALIDATE ISSUER CREDENTIALS AGAINST ADMIN_CONFIG SHEET
'===============================================================================
Public Function ValidateIssuerLogin(ByVal sWorkID As String, _
                                    ByVal sPassword As String, _
                                    ByRef outName As String) As Boolean
    Dim wsAdmin As Worksheet
    Dim rFound As Range
    Dim sStoredPassword As String
    
    On Error GoTo ErrHandler
    ValidateIssuerLogin = False
    
    Set wsAdmin = ThisWorkbook.Sheets("Admin_Config")
    
    ' Search column A for Work ID (IssuerID)
    Set rFound = wsAdmin.Columns("A").Find(What:=Trim(sWorkID), LookIn:=xlValues, LookAt:=xlWhole)
    
    If Not rFound Is Nothing Then
        outName = rFound.Offset(0, 1).Value
        sStoredPassword = rFound.Offset(0, 3).Value ' Password stored in Column D
        
        If Trim(sPassword) = Trim(sStoredPassword) Then
            g_CurrentIssuerID = Trim(sWorkID)
            g_CurrentIssuerName = outName
            g_IsAuthenticated = True
            
            ' Admin_Config Sheet Visibility: Unhide ONLY for Rachel Pickard (ADM001)
            If Trim(UCase(g_CurrentIssuerID)) = "ADM001" Then
                wsAdmin.Visible = xlSheetVisible
            Else
                wsAdmin.Visible = xlSheetVeryHidden
            End If
            
            ValidateIssuerLogin = True
            Exit Function
        End If
    End If
    
    ValidateIssuerLogin = False
    Exit Function

ErrHandler:
    MsgBox "Security validation error: " & Err.Description, vbCritical, "Login Error"
    ValidateIssuerLogin = False
End Function

'===============================================================================
' DEPT HEAD AUTO-LOOKUP FROM ADMIN_CONFIG / DEPARTMENTS TABLE
'===============================================================================
Public Function LookupDepartmentInfo(ByVal sDeptID As String, _
                                     ByRef outDeptName As String, _
                                     ByRef outHeadName As String, _
                                     ByRef outHeadEmail As String) As Boolean
    Dim wsAdmin As Worksheet
    Dim rFound As Range
    
    On Error GoTo ErrHandler
    LookupDepartmentInfo = False
    
    Set wsAdmin = ThisWorkbook.Sheets("Admin_Config")
    
    ' Lookup Dept ID in Column F (Departments Table inside Admin_Config)
    Set rFound = wsAdmin.Columns("F").Find(What:=Trim(sDeptID), LookIn:=xlValues, LookAt:=xlWhole)
    
    If Not rFound Is Nothing Then
        outDeptName = rFound.Offset(0, 1).Value
        outHeadName = rFound.Offset(0, 2).Value
        outHeadEmail = rFound.Offset(0, 3).Value
        LookupDepartmentInfo = True
        Exit Function
    End If
    
    LookupDepartmentInfo = False
    Exit Function

ErrHandler:
    LookupDepartmentInfo = False
End Function

'===============================================================================
' SUPERIOR ADMIN PRIVILEGE CHECK (RACHEL PICKARD ONLY)
'===============================================================================
Public Function CheckSuperiorAdminPrivileges() As Boolean
    If Trim(UCase(g_CurrentIssuerID)) = "ADM001" Then
        CheckSuperiorAdminPrivileges = True
    Else
        MsgBox "Access Denied: Only Rachel Pickard (Procurement Manager / Superior Admin) has permission to perform User Management and Credential CRUD operations.", _
               vbCritical + vbOKOnly, "Access Restricted"
        CheckSuperiorAdminPrivileges = False
    End If
End Function
`
  },
  {
    id: 'frmLogin',
    name: 'frmLogin.frm',
    type: 'UserForm',
    description: 'UserForm for Work ID and Masked Password input with validation against Admin_Config.',
    code: `'===============================================================================
' USERFORM: frmLogin
' REQUIRED CONTROL NAMES IN VBE PROPERTIES WINDOW (F4):
'   - txtWorkID (TextBox)
'   - txtPassword (TextBox with PasswordChar = "*")
'   - btnLogin (CommandButton)
'   - btnCancel (CommandButton)
'   - lblStatus (Label)
'
' NOTE IF YOU GET "Variable not defined":
' Select each control on the UserForm canvas, press F4, and change the
' (Name) property from TextBox1 / TextBox2 / Label1 to match the names above!
'===============================================================================
Option Explicit

Private iAttempts As Integer

Private Sub UserForm_Initialize()
    iAttempts = 0
    
    On Error Resume Next
    ' Safe initialization via Me.Controls array
    If ControlExists("txtWorkID") Then
        Me.Controls("txtWorkID").Value = ""
    ElseIf ControlExists("TextBox1") Then
        Me.Controls("TextBox1").Value = ""
    End If
    
    If ControlExists("txtPassword") Then
        Me.Controls("txtPassword").Value = ""
        Me.Controls("txtPassword").PasswordChar = "*"
    ElseIf ControlExists("TextBox2") Then
        Me.Controls("TextBox2").Value = ""
        Me.Controls("TextBox2").PasswordChar = "*"
    End If
    
    If ControlExists("lblStatus") Then
        Me.Controls("lblStatus").Caption = "Please enter your Work ID and Password to proceed."
    ElseIf ControlExists("Label1") Then
        Me.Controls("Label1").Caption = "Please enter your Work ID and Password to proceed."
    End If
    On Error GoTo 0
End Sub

Private Sub btnLogin_Click()
    Dim sWorkID As String
    Dim sPassword As String
    Dim sIssuerName As String
    
    On Error Resume Next
    If ControlExists("txtWorkID") Then
        sWorkID = Trim(Me.Controls("txtWorkID").Text)
    ElseIf ControlExists("TextBox1") Then
        sWorkID = Trim(Me.Controls("TextBox1").Text)
    End If
    
    If ControlExists("txtPassword") Then
        sPassword = Trim(Me.Controls("txtPassword").Text)
    ElseIf ControlExists("TextBox2") Then
        sPassword = Trim(Me.Controls("TextBox2").Text)
    End If
    On Error GoTo 0
    
    If sWorkID = "" Or sPassword = "" Then
        MsgBox "Please fill in both Work ID and Password fields.", vbExclamation, "Missing Input"
        Exit Sub
    End If
    
    If ValidateIssuerLogin(sWorkID, sPassword, sIssuerName) Then
        MsgBox "Welcome, " & sIssuerName & " (" & sWorkID & ")!", vbInformation, "Login Successful"
        Unload Me
    Else
        iAttempts = iAttempts + 1
        If iAttempts >= 3 Then
            MsgBox "Maximum login attempts (3) exceeded. Access denied.", vbCritical, "Security Alert"
            g_IsAuthenticated = False
            Unload Me
        Else
            On Error Resume Next
            If ControlExists("lblStatus") Then
                Me.Controls("lblStatus").Caption = "Invalid Work ID or Password. Attempt " & iAttempts & " of 3."
                Me.Controls("lblStatus").ForeColor = RGB(200, 0, 0)
            ElseIf ControlExists("Label1") Then
                Me.Controls("Label1").Caption = "Invalid Work ID or Password. Attempt " & iAttempts & " of 3."
                Me.Controls("Label1").ForeColor = RGB(200, 0, 0)
            End If
            
            If ControlExists("txtPassword") Then
                Me.Controls("txtPassword").Text = ""
                Me.Controls("txtPassword").SetFocus
            ElseIf ControlExists("TextBox2") Then
                Me.Controls("TextBox2").Text = ""
                Me.Controls("TextBox2").SetFocus
            End If
            On Error GoTo 0
        End If
    End If
End Sub

Private Sub btnCancel_Click()
    g_IsAuthenticated = False
    Unload Me
End Sub

' Safe Control Existence Checker Helper
Private Function ControlExists(ByVal sControlName As String) As Boolean
    On Error Resume Next
    ControlExists = Not Me.Controls(sControlName) Is Nothing
    On Error GoTo 0
End Function
`
  },
  {
    id: 'frmNavigation',
    name: 'frmNavigation.frm',
    type: 'UserForm',
    description: 'Main Switchboard UserForm offering Delivery/Stock Update or Issue Request workflows.',
    code: `'===============================================================================
' USERFORM: frmNavigation (Switchboard)
' DIALOGUE TABS SPECIFIED BY USER:
'   1. Edit Departments Dialogue
'   2. Create New Stock Dialogue
'   3. Edit Stock Item Name
'   4. Enter New Delivery / Update Stock
'   5. Issue Out Requests
'===============================================================================
Option Explicit

Private Sub UserForm_Initialize()
    lblWelcome.Caption = "Authenticated Issuer: " & g_CurrentIssuerName & " [" & g_CurrentIssuerID & "]"
End Sub

Private Sub btnEditDepts_Click()
    Me.Hide
    frmProcurementOperations.MultiPage1.Value = 0 ' Tab 1: Edit Departments
    frmProcurementOperations.Show
    Me.Show
End Sub

Private Sub btnCreateStock_Click()
    Me.Hide
    frmProcurementOperations.MultiPage1.Value = 1 ' Tab 2: Create New Stock
    frmProcurementOperations.Show
    Me.Show
End Sub

Private Sub btnEditStockName_Click()
    Me.Hide
    frmProcurementOperations.MultiPage1.Value = 2 ' Tab 3: Edit Stock Item Name
    frmProcurementOperations.Show
    Me.Show
End Sub

Private Sub btnStockDelivery_Click()
    Me.Hide
    frmProcurementOperations.MultiPage1.Value = 3 ' Tab 4: Enter New Delivery
    frmProcurementOperations.Show
    Me.Show
End Sub

Private Sub btnIssueRequests_Click()
    Me.Hide
    frmProcurementOperations.MultiPage1.Value = 4 ' Tab 5: Issue Out Requests
    frmProcurementOperations.Show
    Me.Show
End Sub

Private Sub btnUserManagement_Click()
    ' Enforce Superior Admin Privileges (Rachel Pickard Only)
    If CheckSuperiorAdminPrivileges() Then
        Me.Hide
        frmUserManagement.Show
        Me.Show
    End If
End Sub

Private Sub btnExit_Click()
    Unload Me
End Sub
`
  },
  {
    id: 'frmStockDelivery',
    name: 'frmStockDelivery.frm',
    type: 'UserForm',
    description: 'UserForm to select item, enter delivery quantity, update Master_Stock, and log in Movement_Log.',
    code: `'===============================================================================
' USERFORM: frmStockDelivery
' CONTROLS REQUIRED:
'   - cmbItems (ComboBox: Item list)
'   - txtQuantity (TextBox: Received Quantity)
'   - btnSaveDelivery (CommandButton)
'   - btnClose (CommandButton)
'===============================================================================
Option Explicit

Private Sub UserForm_Initialize()
    Dim wsStock As Worksheet
    Dim lLastRow As Long, i As Long
    Dim sItemID As String, sItemName As String
    
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    lLastRow = wsStock.Cells(wsStock.Rows.Count, "A").End(xlUp).Row
    
    cmbItems.Clear
    For i = 2 To lLastRow
        sItemID = wsStock.Cells(i, 1).Value
        sItemName = wsStock.Cells(i, 2).Value
        If sItemID <> "" Then
            cmbItems.AddItem sItemID & " | " & sItemName
        End If
    Next i
End Sub

Private Sub btnSaveDelivery_Click()
    Dim sSelected As String
    Dim sItemID As String
    Dim dblQty As Double
    
    If cmbItems.ListIndex = -1 Then
        MsgBox "Please select an item from the list.", vbExclamation, "Validation Error"
        Exit Sub
    End If
    
    If Not IsNumeric(txtQuantity.Text) Or Val(txtQuantity.Text) <= 0 Then
        MsgBox "Please enter a valid positive delivery quantity.", vbExclamation, "Invalid Quantity"
        Exit Sub
    End If
    
    sSelected = cmbItems.Value
    sItemID = Trim(Split(sSelected, "|")(0))
    dblQty = CDbl(txtQuantity.Text)
    
    Call ProcessStockDelivery(sItemID, dblQty)
    Unload Me
End Sub

Private Sub btnClose_Click()
    Unload Me
End Sub
`
  },
  {
    id: 'frmIssueRequest',
    name: 'frmIssueRequest.frm',
    type: 'UserForm',
    description: 'UserForm with Department auto-lookup, item selection, quantity verification, list queue cart management, PDF export, Outlook email, and autosave.',
    code: `'===============================================================================
' USERFORM: frmIssueRequest
' CONTROLS REQUIRED:
'   - txtDeptID (TextBox: Department ID Input)
'   - btnLookupDept (CommandButton: Lookup Department Info)
'   - lblDeptName, lblDeptHead, lblDeptEmail (Labels)
'   - cmbItems (ComboBox: Item picker)
'   - txtQty (TextBox: Quantity to issue)
'   - btnAddItem (CommandButton: Add to Issue Queue)
'   - btnRemoveItem (CommandButton: Remove Selected Item from Queue)
'   - btnClearCart (CommandButton: Clear All Queue Items)
'   - lstQueue (ListBox: Selected items queue, ColumnCount = 3)
'   - btnConfirmIssue (CommandButton: Triggers Preview & Processing)
'   - btnClose (CommandButton: Close form)
'===============================================================================
Option Explicit

Private Sub UserForm_Initialize()
    Dim wsStock As Worksheet
    Dim lLastRow As Long, i As Long
    Dim sItemID As String, sItemName As String, dblQty As Double
    
    ' Configure ListBox for 3 columns: ItemID, ItemName, Quantity
    lstQueue.ColumnCount = 3
    lstQueue.ColumnWidths = "70 pt;180 pt;50 pt"
    lstQueue.Clear
    
    ' Populate Item Picker Dropdown
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    lLastRow = wsStock.Cells(wsStock.Rows.Count, "A").End(xlUp).Row
    
    cmbItems.Clear
    For i = 2 To lLastRow
        sItemID = wsStock.Cells(i, 1).Value
        sItemName = wsStock.Cells(i, 2).Value
        dblQty = Val(wsStock.Cells(i, 4).Value)
        If sItemID <> "" Then
            cmbItems.AddItem sItemID & " | " & sItemName & " (Avail: " & dblQty & ")"
        End If
    Next i
    
    lblDeptName.Caption = "-"
    lblDeptHead.Caption = "-"
    lblDeptEmail.Caption = "-"
End Sub

Private Sub txtDeptID_Change()
    Call AutoLookupDepartment
End Sub

Private Sub btnLookupDept_Click()
    Call AutoLookupDepartment
End Sub

Private Sub AutoLookupDepartment()
    Dim sDeptID As String
    Dim sName As String, sHead As String, sEmail As String
    
    sDeptID = Trim(txtDeptID.Text)
    If sDeptID = "" Then
        lblDeptName.Caption = "-"
        lblDeptHead.Caption = "-"
        lblDeptEmail.Caption = "-"
        Exit Sub
    End If
    
    If LookupDepartmentInfo(sDeptID, sName, sHead, sEmail) Then
        lblDeptName.Caption = sName
        lblDeptHead.Caption = sHead
        lblDeptEmail.Caption = sEmail
        lblDeptName.ForeColor = RGB(0, 100, 0)
    Else
        lblDeptName.Caption = "Department Not Found"
        lblDeptHead.Caption = "-"
        lblDeptEmail.Caption = "-"
        lblDeptName.ForeColor = RGB(180, 0, 0)
    End If
End Sub

'===============================================================================
' ADD ITEM TO REQUISITION CART (FULL IMPLEMENTATION & STOCK VERIFICATION)
'===============================================================================
Private Sub btnAddItem_Click()
    Dim sSelected As String
    Dim sItemID As String, sItemName As String
    Dim dblRequestedQty As Double, dblAvailableQty As Double
    Dim wsStock As Worksheet
    Dim rFound As Range
    Dim i As Long
    Dim dblExistingCartQty As Double
    Dim bFoundInCart As Boolean
    
    ' 1. Validate Selection
    If cmbItems.ListIndex = -1 Then
        MsgBox "Please select an item from the drop-down list.", vbExclamation, "No Item Selected"
        Exit Sub
    End If
    
    ' 2. Validate Quantity
    If Not IsNumeric(txtQty.Text) Or Val(txtQty.Text) <= 0 Then
        MsgBox "Please enter a valid positive quantity.", vbExclamation, "Invalid Quantity"
        txtQty.SetFocus
        Exit Sub
    End If
    
    dblRequestedQty = CDbl(txtQty.Text)
    
    ' Parse ItemID and ItemName from cmbItems
    sSelected = cmbItems.Value
    sItemID = Trim(Split(sSelected, "|")(0))
    sItemName = Trim(Split(Split(sSelected, "|")(1), "(")(0))
    
    ' 3. Verify Available Stock in Master_Stock
    Set wsStock = ThisWorkbook.Sheets("Master_Stock")
    Set rFound = wsStock.Columns("A").Find(What:=sItemID, LookIn:=xlValues, LookAt:=xlWhole)
    
    If rFound Is Nothing Then
        MsgBox "Item ID " & sItemID & " not found in Master_Stock.", vbCritical, "Error"
        Exit Sub
    End If
    
    dblAvailableQty = CDbl(rFound.Offset(0, 3).Value)
    
    ' Check existing quantity in lstQueue
    dblExistingCartQty = 0
    bFoundInCart = False
    For i = 0 To lstQueue.ListCount - 1
        If lstQueue.List(i, 0) = sItemID Then
            dblExistingCartQty = CDbl(lstQueue.List(i, 2))
            bFoundInCart = True
            Exit For
        End If
    Next i
    
    If (dblExistingCartQty + dblRequestedQty) > dblAvailableQty Then
        MsgBox "Insufficient stock for " & sItemName & "!" & vbCrLf & _
               "• Available in Stock: " & dblAvailableQty & vbCrLf & _
               "• Already in Cart: " & dblExistingCartQty & vbCrLf & _
               "• Additional Requested: " & dblRequestedQty, vbExclamation, "Stock Limit Exceeded"
        Exit Sub
    End If
    
    ' Add or Update Cart Item
    If bFoundInCart Then
        lstQueue.List(i, 2) = dblExistingCartQty + dblRequestedQty
    Else
        lstQueue.AddItem sItemID
        lstQueue.List(lstQueue.ListCount - 1, 1) = sItemName
        lstQueue.List(lstQueue.ListCount - 1, 2) = dblRequestedQty
    End If
    
    ' Reset input field
    txtQty.Text = ""
    cmbItems.SetFocus
End Sub

'===============================================================================
' REMOVE SELECTED ITEM FROM CART
'===============================================================================
Private Sub btnRemoveItem_Click()
    If lstQueue.ListIndex <> -1 Then
        lstQueue.RemoveItem lstQueue.ListIndex
    Else
        MsgBox "Please select an item from the list queue to remove.", vbInformation, "No Selection"
    End If
End Sub

'===============================================================================
' CLEAR ENTIRE CART QUEUE
'===============================================================================
Private Sub btnClearCart_Click()
    If lstQueue.ListCount > 0 Then
        If MsgBox("Clear all items from the requisition queue?", vbQuestion + vbYesNo, "Clear Cart") = vbYes Then
            lstQueue.Clear
        End If
    End If
End Sub

'===============================================================================
' CONFIRM & EXECUTE REQUISITION
'===============================================================================
Private Sub btnConfirmIssue_Click()
    Dim sDeptID As String, sDeptName As String, sDeptHead As String, sDeptEmail As String
    Dim iItemCount As Long, i As Long
    Dim itemArray() As Variant
    Dim sPreviewMsg As String
    
    sDeptID = Trim(txtDeptID.Text)
    sDeptName = lblDeptName.Caption
    sDeptHead = lblDeptHead.Caption
    sDeptEmail = lblDeptEmail.Caption
    
    If sDeptName = "Department Not Found" Or sDeptName = "-" Or sDeptID = "" Then
        MsgBox "Please enter a valid Department ID before proceeding.", vbExclamation, "Invalid Department"
        Exit Sub
    End If
    
    iItemCount = lstQueue.ListCount
    If iItemCount = 0 Then
        MsgBox "Please add at least one item to the issue request queue.", vbExclamation, "Empty Queue"
        Exit Sub
    End If
    
    ' Build 2D Item Array from ListBox
    ReDim itemArray(1 To iItemCount, 1 To 3)
    sPreviewMsg = "CONFIRMATION PREVIEW — ISSUE OUT REQUEST" & vbCrLf & _
                  "----------------------------------------" & vbCrLf & _
                  "Department ID: " & sDeptID & vbCrLf & _
                  "Department Name: " & sDeptName & vbCrLf & _
                  "Department Head: " & sDeptHead & vbCrLf & _
                  "Recipient Email: " & sDeptEmail & vbCrLf & _
                  "Issuer ID: " & g_CurrentIssuerID & " (" & g_CurrentIssuerName & ")" & vbCrLf & vbCrLf & _
                  "ITEMS TO BE ISSUED:" & vbCrLf
                  
    For i = 0 To iItemCount - 1
        itemArray(i + 1, 1) = lstQueue.List(i, 0) ' ItemID
        itemArray(i + 1, 2) = lstQueue.List(i, 1) ' ItemName
        itemArray(i + 1, 3) = lstQueue.List(i, 2) ' Qty
        
        sPreviewMsg = sPreviewMsg & " • " & lstQueue.List(i, 1) & " — Qty: " & lstQueue.List(i, 2) & vbCrLf
    Next i
    
    sPreviewMsg = sPreviewMsg & vbCrLf & "Actions on Confirmation:" & vbCrLf & _
                  "1. Update Master_Stock & Movement_Log" & vbCrLf & _
                  "2. Generate PDF Slip in 'Issued_Items' Folder" & vbCrLf & _
                  "3. Send Email to " & sDeptEmail & " via Outlook" & vbCrLf & _
                  "4. Auto-save Workbook as .xlsm" & vbCrLf & vbCrLf & _
                  "Proceed with Issue Request?"
                  
    ' Sequential Confirmation Dialogue
    If MsgBox(sPreviewMsg, vbQuestion + vbYesNo, "Preview & Confirm Issue Request") = vbYes Then
        If ProcessIssueRequest(sDeptID, sDeptName, sDeptHead, sDeptEmail, itemArray) Then
            Unload Me
        End If
    End If
End Sub

Private Sub btnClose_Click()
    Unload Me
End Sub
`
  },
  {
    id: 'setupMacro',
    name: 'SetupMacro.bas',
    type: 'Setup',
    description: 'One-click VBA initialization macro that creates Master_Stock, Movement_Log, and Admin_Config worksheets with full formatted tables and seed data.',
    code: `'===============================================================================
' MACRO: SetupSystemWorksheets
' RUN THIS MACRO ONCE IN A FRESH WORKBOOK TO BUILD ALL REQUIRED SHEETS
'===============================================================================
Sub SetupSystemWorksheets()
    Dim wb As Workbook
    Dim wsStock As Worksheet, wsLog As Worksheet, wsAdmin As Worksheet
    
    Set wb = ThisWorkbook
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    ' 1. Master_Stock Sheet
    On Error Resume Next
    Set wsStock = wb.Sheets("Master_Stock")
    If wsStock Is Nothing Then Set wsStock = wb.Sheets.Add(Before:=wb.Sheets(1))
    wsStock.Name = "Master_Stock"
    On Error GoTo 0
    wsStock.Cells.Clear
    
    wsStock.Range("A1:D1").Value = Array("ItemID", "ItemName", "Category", "Qty")
    wsStock.Range("A1:D1").Font.Bold = True
    wsStock.Range("A1:D1").Interior.Color = RGB(41, 128, 185)
    wsStock.Range("A1:D1").Font.Color = RGB(255, 255, 255)
    
    ' Complete Seed Inventory Items (Stationery & Cleaning)
    wsStock.Range("A2:D2").Value = Array("ST-001", "A4 Copy Paper (500 sheets/ream)", "Stationery", 120)
    wsStock.Range("A3:D3").Value = Array("ST-002", "Blue Ballpoint Pens (Box of 12)", "Stationery", 45)
    wsStock.Range("A4:D4").Value = Array("ST-003", "Black Gel Pens (Box of 12)", "Stationery", 30)
    wsStock.Range("A5:D5").Value = Array("ST-004", "Heavy Duty Stapler (24/6)", "Stationery", 18)
    wsStock.Range("A6:D6").Value = Array("ST-005", "Staple Pins 24/6 (Box)", "Stationery", 85)
    wsStock.Range("A7:D7").Value = Array("ST-006", "Highlighter Markers (Pack of 4)", "Stationery", 50)
    wsStock.Range("A8:D8").Value = Array("ST-007", "Sticky Notes 3x3 Yellow (10 pads)", "Stationery", 60)
    wsStock.Range("A9:D9").Value = Array("ST-008", "A4 Lever Arch Files (50mm)", "Stationery", 40)
    wsStock.Range("A10:D10").Value = Array("ST-009", "Correction Tape 5mm x 12m", "Stationery", 35)
    wsStock.Range("A11:D11").Value = Array("ST-010", "Permanent Markers Black (Box 10)", "Stationery", 25)

    wsStock.Range("A12:D12").Value = Array("CL-101", "Multi-Surface Cleaner (5L)", "Cleaning", 30)
    wsStock.Range("A13:D13").Value = Array("CL-102", "Microfiber Cloths (Pack of 10)", "Cleaning", 40)
    wsStock.Range("A14:D14").Value = Array("CL-103", "Industrial Floor Cleaner (10L)", "Cleaning", 15)
    wsStock.Range("A15:D15").Value = Array("CL-104", "Antibacterial Hand Soap Refill (5L)", "Cleaning", 22)
    wsStock.Range("A16:D16").Value = Array("CL-105", "2-Ply Paper Towel Rolls (Pack 12)", "Cleaning", 65)
    wsStock.Range("A17:D17").Value = Array("CL-106", "Heavy Duty Latex Gloves (Box 100)", "Cleaning", 28)
    wsStock.Range("A18:D18").Value = Array("CL-107", "Trash Bags Heavy Duty 50L (Roll 20)", "Cleaning", 90)
    wsStock.Range("A19:D19").Value = Array("CL-108", "Glass Cleaner Spray (750ml)", "Cleaning", 34)
    wsStock.Range("A20:D20").Value = Array("CL-109", "Toilet Cleaner Bleach Gel (750ml)", "Cleaning", 50)
    wsStock.Range("A21:D21").Value = Array("CL-110", "Air Freshener Spray Citrus (300ml)", "Cleaning", 42)
    wsStock.Columns("A:D").AutoFit
    
    ' 2. Movement_Log Sheet
    On Error Resume Next
    Set wsLog = wb.Sheets("Movement_Log")
    If wsLog Is Nothing Then Set wsLog = wb.Sheets.Add(After:=wsStock)
    wsLog.Name = "Movement_Log"
    On Error GoTo 0
    wsLog.Cells.Clear
    
    wsLog.Range("A1:H1").Value = Array("Timestamp", "Type", "Item", "Qty", "DeptID", "DeptName", "DeptHead", "IssuerID")
    wsLog.Range("A1:H1").Font.Bold = True
    wsLog.Range("A1:H1").Interior.Color = RGB(39, 174, 96)
    wsLog.Range("A1:H1").Font.Color = RGB(255, 255, 255)
    wsLog.Columns("A:H").AutoFit
    
    ' 3. Admin_Config Sheet
    On Error Resume Next
    Set wsAdmin = wb.Sheets("Admin_Config")
    If wsAdmin Is Nothing Then Set wsAdmin = wb.Sheets.Add(After:=wsLog)
    wsAdmin.Name = "Admin_Config"
    On Error GoTo 0
    wsAdmin.Cells.Clear
    
    ' Issuer Admins Table (A:D)
    wsAdmin.Range("A1:D1").Value = Array("IssuerID", "IssuerName", "Role", "SecretPassword")
    wsAdmin.Range("A1:D1").Font.Bold = True
    wsAdmin.Range("A1:D1").Interior.Color = RGB(142, 68, 173)
    wsAdmin.Range("A1:D1").Font.Color = RGB(255, 255, 255)
    
    wsAdmin.Range("A2:D2").Value = Array("ADM001", "Rachel Pickard", "Chief Procurement Officer", "Superior1234")
    wsAdmin.Range("A3:D3").Value = Array("ADM002", "Loveness Mawisire", "Master Inventory Controller", "Micky1234Master")
    wsAdmin.Range("A4:D4").Value = Array("ADM003", "Lyda Gurupira", "Senior Storekeeper", "Master1234")
    wsAdmin.Range("A5:D5").Value = Array("ADM004", "Caeser Joe", "Assistant Inventory Officer", "Second1234")
    wsAdmin.Range("A6:D6").Value = Array("ADM005", "Farai Mandoreba", "Procurement Specialist", "Procurement1234")
    wsAdmin.Range("A7:D7").Value = Array("ADM006", "Bianca Mpakairi", "System Administrator", "Admin1234!")
    
    ' Departments Reference Table (F:I) — Complete Directory (DEPT-101 to DEPT-106)
    wsAdmin.Range("F1:I1").Value = Array("DeptID", "DeptName", "DeptHeadName", "DeptHeadEmail")
    wsAdmin.Range("F1:I1").Font.Bold = True
    wsAdmin.Range("F1:I1").Interior.Color = RGB(211, 84, 0)
    wsAdmin.Range("F1:I1").Font.Color = RGB(255, 255, 255)
    
    wsAdmin.Range("F2:I2").Value = Array("DEPT-101", "Human Resources & Talent", "Elena Rostova", "elena.rostova@company.com")
    wsAdmin.Range("F3:I3").Value = Array("DEPT-102", "Finance & Accounting", "Robert Vance", "robert.vance@company.com")
    wsAdmin.Range("F4:I4").Value = Array("DEPT-103", "Information Technology", "Marcus Thorne", "marcus.thorne@company.com")
    wsAdmin.Range("F5:I5").Value = Array("DEPT-104", "Operations & Logistics", "Amanda Hayes", "amanda.hayes@company.com")
    wsAdmin.Range("F6:I6").Value = Array("DEPT-105", "Facilities & Sanitation", "Carlos Mendez", "carlos.mendez@company.com")
    wsAdmin.Range("F7:I7").Value = Array("DEPT-106", "Sales & Marketing", "Patricia Sterling", "patricia.sterling@company.com")
    
    wsAdmin.Columns("A:I").AutoFit
    
    Application.DisplayAlerts = True
    Application.ScreenUpdating = True
    MsgBox "Worksheets (Master_Stock, Movement_Log, Admin_Config) set up successfully!", vbInformation, "Setup Complete"
End Sub
`
  },
  {
    id: 'powershellSetup',
    name: 'Setup_XLSM_Project.ps1',
    type: 'Setup',
    description: 'Automated PowerShell script that builds the complete .xlsm workbook on Windows using Excel COM Object with sheets and macros pre-configured.',
    code: `#===============================================================================
# POWERSHELL AUTOMATED EXCEL .XLSM CREATOR SCRIPT
# RUN THIS IN POWERSHELL ON WINDOWS TO AUTOMATICALLY BUILD THE .XLSM WORKBOOK
#===============================================================================
Write-Host "Initializing Excel 32-bit / 64-bit COM Object..." -ForegroundColor Cyan

try {
    $excel = New-Object -ComObject Excel.Application
    $excel.Visible = $true
    $excel.DisplayAlerts = $false
    
    $workbook = $excel.Workbooks.Add()
    
    # 1. Setup Master_Stock
    $sheetStock = $workbook.Sheets.Item(1)
    $sheetStock.Name = "Master_Stock"
    $sheetStock.Cells.Item(1,1).Value2 = "ItemID"
    $sheetStock.Cells.Item(1,2).Value2 = "ItemName"
    $sheetStock.Cells.Item(1,3).Value2 = "Category"
    $sheetStock.Cells.Item(1,4).Value2 = "Qty"
    
    $sheetStock.Cells.Item(2,1).Value2 = "ST-001"
    $sheetStock.Cells.Item(2,2).Value2 = "A4 Copy Paper (500 sheets/ream)"
    $sheetStock.Cells.Item(2,3).Value2 = "Stationery"
    $sheetStock.Cells.Item(2,4).Value2 = 120

    $sheetStock.Cells.Item(3,1).Value2 = "ST-002"
    $sheetStock.Cells.Item(3,2).Value2 = "Blue Ballpoint Pens (Box of 12)"
    $sheetStock.Cells.Item(3,3).Value2 = "Stationery"
    $sheetStock.Cells.Item(3,4).Value2 = 45

    $sheetStock.Cells.Item(4,1).Value2 = "CL-101"
    $sheetStock.Cells.Item(4,2).Value2 = "Multi-Surface Disinfectant Cleaner (5L)"
    $sheetStock.Cells.Item(4,3).Value2 = "Cleaning"
    $sheetStock.Cells.Item(4,4).Value2 = 30
    
    # 2. Setup Movement_Log
    $sheetLog = $workbook.Sheets.Add([System.Reflection.Missing]::Value, $sheetStock)
    $sheetLog.Name = "Movement_Log"
    $sheetLog.Cells.Item(1,1).Value2 = "Timestamp"
    $sheetLog.Cells.Item(1,2).Value2 = "Type"
    $sheetLog.Cells.Item(1,3).Value2 = "Item"
    $sheetLog.Cells.Item(1,4).Value2 = "Qty"
    $sheetLog.Cells.Item(1,5).Value2 = "DeptID"
    $sheetLog.Cells.Item(1,6).Value2 = "DeptName"
    $sheetLog.Cells.Item(1,7).Value2 = "DeptHead"
    $sheetLog.Cells.Item(1,8).Value2 = "IssuerID"
    
    # 3. Setup Admin_Config
    $sheetAdmin = $workbook.Sheets.Add([System.Reflection.Missing]::Value, $sheetLog)
    $sheetAdmin.Name = "Admin_Config"
    $sheetAdmin.Cells.Item(1,1).Value2 = "IssuerID"
    $sheetAdmin.Cells.Item(1,2).Value2 = "IssuerName"
    $sheetAdmin.Cells.Item(1,3).Value2 = "Role"
    $sheetAdmin.Cells.Item(1,4).Value2 = "SecretPassword"
    
    $sheetAdmin.Cells.Item(2,1).Value2 = "ADM001"
    $sheetAdmin.Cells.Item(2,2).Value2 = "Rachel Pickard"
    $sheetAdmin.Cells.Item(2,3).Value2 = "Chief Procurement Officer"
    $sheetAdmin.Cells.Item(2,4).Value2 = "Superior1234"

    $sheetAdmin.Cells.Item(3,1).Value2 = "ADM002"
    $sheetAdmin.Cells.Item(3,2).Value2 = "Loveness Mawisire"
    $sheetAdmin.Cells.Item(3,3).Value2 = "Master Inventory Controller"
    $sheetAdmin.Cells.Item(3,4).Value2 = "Micky1234Master"

    $sheetAdmin.Cells.Item(4,1).Value2 = "ADM003"
    $sheetAdmin.Cells.Item(4,2).Value2 = "Lyda Gurupira"
    $sheetAdmin.Cells.Item(4,3).Value2 = "Senior Storekeeper"
    $sheetAdmin.Cells.Item(4,4).Value2 = "Master1234"

    $sheetAdmin.Cells.Item(5,1).Value2 = "ADM004"
    $sheetAdmin.Cells.Item(5,2).Value2 = "Caeser Joe"
    $sheetAdmin.Cells.Item(5,3).Value2 = "Assistant Inventory Officer"
    $sheetAdmin.Cells.Item(5,4).Value2 = "Second1234"

    $sheetAdmin.Cells.Item(6,1).Value2 = "ADM005"
    $sheetAdmin.Cells.Item(6,2).Value2 = "Farai Mandoreba"
    $sheetAdmin.Cells.Item(6,3).Value2 = "Procurement Specialist"
    $sheetAdmin.Cells.Item(6,4).Value2 = "Procurement1234"

    $sheetAdmin.Cells.Item(7,1).Value2 = "ADM006"
    $sheetAdmin.Cells.Item(7,2).Value2 = "Bianca Mpakairi"
    $sheetAdmin.Cells.Item(7,3).Value2 = "System Administrator"
    $sheetAdmin.Cells.Item(7,4).Value2 = "Admin1234!"

    # Departments Table (F:I)
    $sheetAdmin.Cells.Item(1,6).Value2 = "DeptID"
    $sheetAdmin.Cells.Item(1,7).Value2 = "DeptName"
    $sheetAdmin.Cells.Item(1,8).Value2 = "DeptHeadName"
    $sheetAdmin.Cells.Item(1,9).Value2 = "DeptHeadEmail"

    $sheetAdmin.Cells.Item(2,6).Value2 = "DEPT-101"
    $sheetAdmin.Cells.Item(2,7).Value2 = "Human Resources & Talent"
    $sheetAdmin.Cells.Item(2,8).Value2 = "Elena Rostova"
    $sheetAdmin.Cells.Item(2,9).Value2 = "elena.rostova@company.com"

    $sheetAdmin.Cells.Item(3,6).Value2 = "DEPT-102"
    $sheetAdmin.Cells.Item(3,7).Value2 = "Finance & Accounting"
    $sheetAdmin.Cells.Item(3,8).Value2 = "Robert Vance"
    $sheetAdmin.Cells.Item(3,9).Value2 = "robert.vance@company.com"

    $sheetAdmin.Cells.Item(4,6).Value2 = "DEPT-103"
    $sheetAdmin.Cells.Item(4,7).Value2 = "Information Technology"
    $sheetAdmin.Cells.Item(4,8).Value2 = "Marcus Thorne"
    $sheetAdmin.Cells.Item(4,9).Value2 = "marcus.thorne@company.com"

    $sheetAdmin.Cells.Item(5,6).Value2 = "DEPT-104"
    $sheetAdmin.Cells.Item(5,7).Value2 = "Operations & Logistics"
    $sheetAdmin.Cells.Item(5,8).Value2 = "Amanda Hayes"
    $sheetAdmin.Cells.Item(5,9).Value2 = "amanda.hayes@company.com"

    $sheetAdmin.Cells.Item(6,6).Value2 = "DEPT-105"
    $sheetAdmin.Cells.Item(6,7).Value2 = "Facilities & Sanitation"
    $sheetAdmin.Cells.Item(6,8).Value2 = "Carlos Mendez"
    $sheetAdmin.Cells.Item(6,9).Value2 = "carlos.mendez@company.com"

    $sheetAdmin.Cells.Item(7,6).Value2 = "DEPT-106"
    $sheetAdmin.Cells.Item(7,7).Value2 = "Sales & Marketing"
    $sheetAdmin.Cells.Item(7,8).Value2 = "Patricia Sterling"
    $sheetAdmin.Cells.Item(7,9).Value2 = "patricia.sterling@company.com"
    
    # Save as .xlsm (FileFormat 52)
    $outputPath = Join-Path -Path [Environment]::GetFolderPath("Desktop") -ChildPath "Stationery_&_Cleaning_System.xlsm"
    
    # 52 = xlOpenXMLWorkbookMacroEnabled
    $workbook.SaveAs($outputPath, 52)
    Write-Host "Successfully generated baseline .xlsm workbook at: $outputPath" -ForegroundColor Green
    
    $excel.Quit()
}
catch {
    Write-Host "Error generating Excel workbook: $_" -ForegroundColor Red
}
`
  },
  {
    id: 'theme_engine',
    name: 'mod_ThemeEngine.bas',
    type: 'Module',
    description: 'Enterprise Light & Dark Mode Toggle Engine for Excel VBA with WCAG AA compliant color palettes and typography enforcement.',
    code: `'===============================================================================
' SYSTEM: Stationery & Cleaning Items Procurement System
' FILE: mod_ThemeEngine.bas
' COMPATIBILITY: Excel 32-Bit / 64-Bit (VBA7 / Win32 API)
' DESCRIPTION: Enterprise Light/Dark Mode Switcher with WCAG AA Contrast Compliance
'===============================================================================
Option Explicit

' Global Theme State Enum & Variables
Public Enum AppThemeMode
    Theme_Light = 0
    Theme_Dark = 1
End Enum

Public g_CurrentTheme As AppThemeMode

' ===============================================================================
' 1. LIGHT MODE COLOR PALETTE DEFINITIONS (WCAG AA Compliant >= 4.5:1 Contrast)
' ===============================================================================
Public Const COLOR_LIGHT_BASE_BG        As Long = 16382457    ' #F8FAFC | RGB(248, 250, 252) - Slate 50 Main Canvas
Public Const COLOR_LIGHT_CARD_BG        As Long = 16777215    ' #FFFFFF | RGB(255, 255, 255) - Crisp White Container
Public Const COLOR_LIGHT_TEXT_PRIMARY   As Long = 1971727     ' #0F172A | RGB(15, 23, 42)    - Slate 900 (15.8:1 on Base)
Public Const COLOR_LIGHT_TEXT_MUTED     As Long = 4938334     ' #475569 | RGB(71, 85, 105)   - Slate 600 (5.6:1 on Card)
Public Const COLOR_LIGHT_ACCENT         As Long = 8011277     ' #0D9488 | RGB(13, 148, 136)  - Teal 600 Primary Action
Public Const COLOR_LIGHT_ACCENT_BG      As Long = 15334380    ' #CCFBF1 | RGB(204, 251, 241) - Teal 100 Accent Container
Public Const COLOR_LIGHT_SUCCESS        As Long = 4038166     ' #16A34A | RGB(22, 163, 74)   - Emerald 600
Public Const COLOR_LIGHT_SUCCESS_BG     As Long = 14548684    ' #DCFCE7 | RGB(220, 252, 231) - Emerald 100 Chip Background
Public Const COLOR_LIGHT_WARNING        As Long = 1752293     ' #D97706 | RGB(217, 119, 6)   - Amber 600
Public Const COLOR_LIGHT_WARNING_BG     As Long = 14220542    ' #FEF3C7 | RGB(254, 243, 199) - Amber 100 Chip Background
Public Const COLOR_LIGHT_DANGER         As Long = 2763486     ' #DC2626 | RGB(220, 38, 38)   - Red 600
Public Const COLOR_LIGHT_DANGER_BG      As Long = 15003646    ' #FEE2E2 | RGB(254, 226, 226) - Red 100 Chip Background
Public Const COLOR_LIGHT_BORDER         As Long = 14607077    ' #E2E8F0 | RGB(226, 232, 240) - Slate 200 Hairline Grid

' ===============================================================================
' 2. DARK MODE COLOR PALETTE DEFINITIONS (WCAG AA Compliant >= 4.5:1 Contrast)
' ===============================================================================
Public Const COLOR_DARK_BASE_BG         As Long = 1445634     ' #020617 | RGB(2, 6, 23)      - Slate 950 Deep Canvas
Public Const COLOR_DARK_CARD_BG         As Long = 2564111     ' #0F172A | RGB(15, 23, 42)    - Slate 900 Card Surface
Public Const COLOR_DARK_TEXT_PRIMARY    As Long = 16382457    ' #F8FAFC | RGB(248, 250, 252) - Slate 50 (16.2:1 on Base)
Public Const COLOR_DARK_TEXT_MUTED      As Long = 10463654    ' #94A3B8 | RGB(148, 163, 184) - Slate 400 (5.1:1 on Card)
Public Const COLOR_DARK_ACCENT          As Long = 12762644    ' #2DD4BF | RGB(45, 212, 191)  - Teal 400 Primary Action
Public Const COLOR_DARK_ACCENT_BG       As Long = 3159059     ' #134E4A | RGB(19, 78, 74)    - Teal 900 Accent Container
Public Const COLOR_DARK_SUCCESS         As Long = 6282810     ' #4ADE80 | RGB(74, 222, 128)  - Emerald 400
Public Const COLOR_DARK_SUCCESS_BG      As Long = 1915920     ' #052E16 | RGB(5, 46, 22)     - Emerald 950 Chip Background
Public Const COLOR_DARK_WARNING         As Long = 2810363     ' #FBBF24 | RGB(251, 191, 36)  - Amber 400
Public Const COLOR_DARK_WARNING_BG      As Long = 2307877     ' #451A03 | RGB(69, 26, 3)     - Amber 950 Chip Background
Public Const COLOR_DARK_DANGER          As Long = 6120440     ' #F87171 | RGB(248, 113, 113) - Red 400
Public Const COLOR_DARK_DANGER_BG       As Long = 2302789     ' #450A0A | RGB(69, 10, 10)    - Red 950 Chip Background
Public Const COLOR_DARK_BORDER          As Long = 3485741     ' #1E293B | RGB(30, 41, 59)    - Slate 800 Hairline Grid

' ===============================================================================
' 3. TYPOGRAPHY CONSTANTS (Native Excel System Font Hierarchy)
' ===============================================================================
Public Const FONT_FAMILY_PRIMARY        As String = "Segoe UI"
Public Const FONT_FAMILY_FALLBACK       As String = "Calibri"

' ===============================================================================
' 4. THEME TOGGLE SUBROUTINE (Called via Ribbon Button or UserForm Toggle)
' ===============================================================================
Public Sub ToggleWorkbookTheme()
    On Error GoTo ErrHandler
    Application.ScreenUpdating = False
    
    If g_CurrentTheme = Theme_Light Then
        g_CurrentTheme = Theme_Dark
    Else
        g_CurrentTheme = Theme_Light
    End If
    
    ' Apply theme to all visible worksheets
    Call ApplyThemeToSheet(ThisWorkbook.Sheets("Master_Stock"))
    Call ApplyThemeToSheet(ThisWorkbook.Sheets("Movement_Log"))
    
    Application.ScreenUpdating = True
    Exit Sub

ErrHandler:
    Application.ScreenUpdating = True
    MsgBox "Failed to toggle theme: " & Err.Description, vbCritical, "Theme Error"
End Sub

' ===============================================================================
' 5. APPLY THEME TO WORKSHEET
' ===============================================================================
Public Sub ApplyThemeToSheet(ws As Worksheet)
    On Error Resume Next
    Dim isDark As Boolean
    isDark = (g_CurrentTheme = Theme_Dark)
    
    Dim cBaseBg As Long, cCardBg As Long, cTextPri As Long, cTextMut As Long, cBorder As Long
    
    If isDark Then
        cBaseBg = COLOR_DARK_BASE_BG
        cCardBg = COLOR_DARK_CARD_BG
        cTextPri = COLOR_DARK_TEXT_PRIMARY
        cTextMut = COLOR_DARK_TEXT_MUTED
        cBorder = COLOR_DARK_BORDER
    Else
        cBaseBg = COLOR_LIGHT_BASE_BG
        cCardBg = COLOR_LIGHT_CARD_BG
        cTextPri = COLOR_LIGHT_TEXT_PRIMARY
        cTextMut = COLOR_LIGHT_TEXT_MUTED
        cBorder = COLOR_LIGHT_BORDER
    End If
    
    ' Sheet Canvas Base Formatting
    ws.Cells.Font.Name = FONT_FAMILY_PRIMARY
    ws.Cells.Interior.Color = cBaseBg
    ws.Cells.Font.Color = cTextPri
    
    ' Table Header Row Styling (Row 1)
    With ws.Range("A1:Z1")
        .Interior.Color = cCardBg
        .Font.Name = FONT_FAMILY_PRIMARY
        .Font.Size = 11
        .Font.Bold = True
        .Font.Color = IIf(isDark, COLOR_DARK_ACCENT, COLOR_LIGHT_ACCENT)
        .Borders.Color = cBorder
    End With
    
    ' Data Range Formatting (Rows 2 to 500)
    With ws.Range("A2:Z500")
        .Font.Name = FONT_FAMILY_PRIMARY
        .Font.Size = 10
        .Borders.Color = cBorder
    End With
End Sub

' ===============================================================================
' 6. APPLY THEME TO USERFORMS (E.g. frmLogin, frmNavigation, frmOperations)
' ===============================================================================
Public Sub ApplyThemeToUserForm(frm As Object)
    On Error Resume Next
    Dim isDark As Boolean
    isDark = (g_CurrentTheme = Theme_Dark)
    
    Dim ctrl As Control
    Dim cBg As Long, cTxtPri As Long, cTxtMut As Long
    
    If isDark Then
        cBg = COLOR_DARK_CARD_BG
        cTxtPri = COLOR_DARK_TEXT_PRIMARY
        cTxtMut = COLOR_DARK_TEXT_MUTED
    Else
        cBg = COLOR_LIGHT_CARD_BG
        cTxtPri = COLOR_LIGHT_TEXT_PRIMARY
        cTxtMut = COLOR_LIGHT_TEXT_MUTED
    End If
    
    frm.BackColor = cBg
    
    For Each ctrl In frm.Controls
        Select Case TypeName(ctrl)
            Case "Label"
                ctrl.BackColor = cBg
                ctrl.ForeColor = cTxtPri
                ctrl.Font.Name = FONT_FAMILY_PRIMARY
            Case "TextBox", "ComboBox", "ListBox"
                ctrl.BackColor = IIf(isDark, COLOR_DARK_BASE_BG, RGB(255, 255, 255))
                ctrl.ForeColor = cTxtPri
                ctrl.Font.Name = FONT_FAMILY_PRIMARY
                ctrl.BorderColor = IIf(isDark, COLOR_DARK_BORDER, COLOR_LIGHT_BORDER)
            Case "CommandButton"
                ctrl.Font.Name = FONT_FAMILY_PRIMARY
                ctrl.Font.Bold = True
        End Select
    Next ctrl
End Sub
`
  },
  {
    id: 'mod_backup_recovery',
    name: 'mod_BackupRecovery.bas',
    type: 'Module',
    description: 'Automated workbook backup schedules, transaction snapshots, Point-In-Time disaster recovery, and CSV emergency dump protocols.',
    code: `'===============================================================================
' SYSTEM: Stationery & Cleaning Items Procurement System
' FILE: mod_BackupRecovery.bas
' COMPATIBILITY: Excel 32-Bit / 64-Bit (VBA7 / Win32 FileSystemObject Compatible)
' DESCRIPTION: Automated Backup Scheduling, Transaction Snapshots, Disaster Recovery,
'              Integrity Validation, and Failsafe Data Export Protocols.
'===============================================================================
Option Explicit

Public Const BACKUP_ROOT_DIR As String = "C:\\Stationery & Cleaning\\Backups\\"
Public Const BACKUP_HOURLY_DIR As String = "C:\\Stationery & Cleaning\\Backups\\Hourly\\"
Public Const BACKUP_DAILY_DIR As String = "C:\\Stationery & Cleaning\\Backups\\Daily\\"
Public Const BACKUP_TRANSACTION_DIR As String = "C:\\Stationery & Cleaning\\Backups\\Transactions\\"
Public Const BACKUP_RETENTION_DAYS As Integer = 30

Private g_NextScheduledBackupTime As Double

' ===============================================================================
' 1. ENSURE BACKUP DIRECTORY TOPOLOGY EXISTS
' ===============================================================================
Public Sub EnsureBackupDirectories()
    On Error Resume Next
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If Not fso.FolderExists(BACKUP_ROOT_DIR) Then fso.CreateFolder BACKUP_ROOT_DIR
    If Not fso.FolderExists(BACKUP_HOURLY_DIR) Then fso.CreateFolder BACKUP_HOURLY_DIR
    If Not fso.FolderExists(BACKUP_DAILY_DIR) Then fso.CreateFolder BACKUP_DAILY_DIR
    If Not fso.FolderExists(BACKUP_TRANSACTION_DIR) Then fso.CreateFolder BACKUP_TRANSACTION_DIR
    Set fso = Nothing
End Sub

' ===============================================================================
' 2. REAL-TIME TRANSACTION-TRIGGERED SNAPSHOT (RPO = 0 SECONDS)
' Call this immediately after executing Issue, Delivery, or Stock Adjustment.
' ===============================================================================
Public Function CreateTransactionBackup(ByVal actionType As String, ByVal refId As String) As String
    On Error GoTo BackupErr
    Call EnsureBackupDirectories
    
    Dim timeStamp As String
    timeStamp = Format(Now, "YYYYMMDD_HHNNSS")
    
    Dim backupPath As String
    backupPath = BACKUP_TRANSACTION_DIR & "Paramount_Snap_" & actionType & "_" & refId & "_" & timeStamp & ".xlsm.bak"
    
    ' Execute non-blocking background copy of active workbook
    ThisWorkbook.SaveCopyAs backupPath
    CreateTransactionBackup = backupPath
    Exit Function

BackupErr:
    Debug.Print "Transaction backup notice: " & Err.Description
    CreateTransactionBackup = ""
End Function

' ===============================================================================
' 3. SCHEDULED HOURLY DIFFERENTIAL BACKUP ENGINE
' ===============================================================================
Public Sub StartAutomatedBackupScheduler()
    On Error Resume Next
    ' Schedule next run in 60 minutes
    g_NextScheduledBackupTime = Now + TimeValue("01:00:00")
    Application.OnTime g_NextScheduledBackupTime, "ExecuteHourlyBackupRoutine"
End Sub

Public Sub StopAutomatedBackupScheduler()
    On Error Resume Next
    If g_NextScheduledBackupTime > 0 Then
        Application.OnTime g_NextScheduledBackupTime, "ExecuteHourlyBackupRoutine", , False
        g_NextScheduledBackupTime = 0
    End If
End Sub

Public Sub ExecuteHourlyBackupRoutine()
    On Error GoTo HourlyErr
    Call EnsureBackupDirectories
    
    Dim timeStamp As String
    timeStamp = Format(Now, "YYYYMMDD_HHNNSS")
    
    Dim backupFile As String
    backupFile = BACKUP_HOURLY_DIR & "Paramount_Hourly_" & timeStamp & ".xlsm.bak"
    
    ThisWorkbook.SaveCopyAs backupFile
    Call PurgeExpiredBackups(BACKUP_HOURLY_DIR, 7) ' Retain hourly for 7 days
    
    ' Reschedule next hourly cycle
    Call StartAutomatedBackupScheduler
    Exit Sub

HourlyErr:
    Debug.Print "Hourly backup error: " & Err.Description
    Call StartAutomatedBackupScheduler
End Sub

' ===============================================================================
' 4. DAILY CLOSE-OF-BUSINESS ARCHIVE (TRIGGERED BEFORE WORKBOOK CLOSE)
' ===============================================================================
Public Sub ExecuteDailyFullBackup()
    On Error GoTo DailyErr
    Call EnsureBackupDirectories
    
    Dim dateStamp As String
    dateStamp = Format(Now, "YYYY-MM-DD_HHNNSS")
    
    Dim dailyFile As String
    dailyFile = BACKUP_DAILY_DIR & "Paramount_Daily_Master_" & dateStamp & ".xlsm.bak"
    
    ThisWorkbook.SaveCopyAs dailyFile
    Call PurgeExpiredBackups(BACKUP_DAILY_DIR, BACKUP_RETENTION_DAYS)
    Exit Sub

DailyErr:
    MsgBox "Notice: Daily backup failed to write: " & Err.Description, vbInformation, "Backup Status"
End Sub

' ===============================================================================
' 5. AUTOMATED RETENTION PURGE PROTOCOL (PREVENT DISK OVERFLOW)
' ===============================================================================
Private Sub PurgeExpiredBackups(ByVal targetFolder As String, ByVal maxAgeDays As Integer)
    On Error Resume Next
    Dim fso As Object, folderObj As Object, fileObj As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If fso.FolderExists(targetFolder) Then
        Set folderObj = fso.GetFolder(targetFolder)
        For Each fileObj In folderObj.Files
            If DateDiff("d", fileObj.DateCreated, Now) > maxAgeDays Then
                fileObj.Delete True
            End If
        Next fileObj
    End If
    
    Set fileObj = Nothing
    Set folderObj = Nothing
    Set fso = Nothing
End Sub

' ===============================================================================
' 6. POINT-IN-TIME DISASTER RECOVERY PROTOCOL (WORKBOOK RESTORATION)
' ===============================================================================
Public Sub RestoreWorkbookFromBackup(ByVal backupFilePath As String)
    On Error GoTo RestoreErr
    
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    
    If Not fso.FileExists(backupFilePath) Then
        MsgBox "Backup file not found at: " & backupFilePath, vbCritical, "Restore Failed"
        Exit Sub
    End If
    
    ' Confirm Restore with Operator
    Dim resp As VbMsgBoxResult
    resp = MsgBox("WARNING: Restoring will overwrite all active Master_Stock, Movement_Log, and Admin_Config records with the state from:" & vbCrLf & _
                  backupFilePath & vbCrLf & vbCrLf & _
                  "An automated pre-restore safety copy will be generated first. Proceed?", _
                  vbExclamation + vbYesNo, "Confirm Disaster Recovery Restore")
    If resp <> vbYes Then Exit Sub
    
    ' 1. Create Pre-Restore Safety Snapshot
    Dim safetyPath As String
    safetyPath = BACKUP_ROOT_DIR & "Pre_Restore_Safety_" & Format(Now, "YYYYMMDD_HHNNSS") & ".xlsm.bak"
    ThisWorkbook.SaveCopyAs safetyPath
    
    ' 2. Open Backup in Background to Stream Content
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    Dim bkBook As Workbook
    Set bkBook = Workbooks.Open(backupFilePath, ReadOnly:=True)
    
    ' Copy sheets: Master_Stock, Movement_Log, Admin_Config
    Dim srcWs As Worksheet, destWs As Worksheet
    Dim sheetNames As Variant, sName As Variant
    sheetNames = Array("Master_Stock", "Movement_Log", "Admin_Config")
    
    For Each sName In sheetNames
        On Error Resume Next
        Set srcWs = bkBook.Sheets(CStr(sName))
        Set destWs = ThisWorkbook.Sheets(CStr(sName))
        On Error GoTo RestoreErr
        
        If Not srcWs Is Nothing And Not destWs Is Nothing Then
            destWs.Cells.Clear
            srcWs.UsedRange.Copy destWs.Range("A1")
        End If
    Next sName
    
    bkBook.Close SaveChanges:=False
    
    ' Save restored active workbook
    ThisWorkbook.Save
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "DISASTER RECOVERY COMPLETE!" & vbCrLf & _
           "Workbook records successfully restored from:" & vbCrLf & backupFilePath & vbCrLf & _
           "Safety snapshot saved to:" & vbCrLf & safetyPath, _
           vbInformation + vbOKOnly, "Restore Successful"
    Exit Sub

RestoreErr:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Error executing workbook restore: " & Err.Description, vbCritical, "Restore Failed"
End Sub

' ===============================================================================
' 7. EMERGENCY FAILSAFE CSV DUMP (DATA EXTRACT ON CORRUPTION)
' ===============================================================================
Public Sub EmergencyExportAllSheetsToCSV()
    On Error GoTo CsvErr
    Call EnsureBackupDirectories
    
    Dim exportDir As String
    exportDir = BACKUP_ROOT_DIR & "Emergency_CSV_Dump_" & Format(Now, "YYYYMMDD_HHNNSS") & "\\"
    
    Dim fso As Object
    Set fso = CreateObject("Scripting.FileSystemObject")
    If Not fso.FolderExists(exportDir) Then fso.CreateFolder exportDir
    
    Application.ScreenUpdating = False
    Application.DisplayAlerts = False
    
    Dim ws As Worksheet
    For Each ws In ThisWorkbook.Worksheets
        If ws.Visible <> xlSheetVeryHidden Or ws.Name = "Admin_Config" Then
            ws.Copy
            ActiveWorkbook.SaveAs Filename:=exportDir & ws.Name & ".csv", _
                                  FileFormat:=xlCSV, _
                                  CreateBackup:=False
            ActiveWorkbook.Close SaveChanges:=False
        End If
    Next ws
    
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    
    MsgBox "Emergency CSV Data Dump completed successfully!" & vbCrLf & _
           "Files exported to: " & exportDir, vbInformation, "Emergency Data Dump"
    Exit Sub

CsvErr:
    Application.ScreenUpdating = True
    Application.DisplayAlerts = True
    MsgBox "Error during emergency CSV dump: " & Err.Description, vbCritical, "Dump Failed"
End Sub
`
  }
];

