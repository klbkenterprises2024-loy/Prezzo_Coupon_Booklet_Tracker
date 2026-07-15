/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Database, 
  KeyRound, 
  Download, 
  Upload, 
  Trash2, 
  Check, 
  AlertTriangle, 
  FileSpreadsheet, 
  Settings, 
  FileJson,
  RefreshCw
} from "lucide-react";
import { Booklet, Redemption } from "../types";
import { 
  exportDatabaseBackup, 
  importDatabaseBackup, 
  getPasscodes, 
  savePasscodes,
  initializeDatabase
} from "../lib/db";

interface SystemSettingsProps {
  booklets: Booklet[];
  redemptions: Redemption[];
  onDataChange: () => void;
  isAdmin: boolean;
}

export default function SystemSettings({
  booklets,
  redemptions,
  onDataChange,
  isAdmin
}: SystemSettingsProps) {
  const { adminPin: initialAdminPin, staffPin: initialStaffPin } = getPasscodes();

  // Passcodes states
  const [adminPin, setAdminPin] = useState(initialAdminPin);
  const [staffPin, setStaffPin] = useState(initialStaffPin);
  const [passcodeSuccess, setPasscodeSuccess] = useState(false);
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Backup states
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // CSV Booklet Import states
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState(false);
  const [csvCount, setCsvCount] = useState(0);
  const [csvImportMode, setCsvImportMode] = useState<"append" | "replace">("append");

  // Helper to parse CSV string with full support for quotes and commas inside fields
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentVal = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentVal += '"';
          i++; // skip double quote escape
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') {
          i++; // skip combined CRLF
        }
        row.push(currentVal.trim());
        if (row.length > 1 || row[0] !== "") {
          lines.push(row);
        }
        row = [];
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    if (row.length > 0 || currentVal !== "") {
      row.push(currentVal.trim());
      lines.push(row);
    }
    return lines;
  };

  // Download a clean Booklet template CSV
  const handleDownloadCSVTemplate = () => {
    const headers = [
      "Booklet ID", 
      "Customer Name", 
      "Customer Phone", 
      "Date Sold (YYYY-MM-DD)", 
      "Price Paid (INR)", 
      "Outlet Sold At", 
      "Sold By Staff", 
      "Status (Active/Suspended)", 
      "Notes"
    ];
    
    const sampleRow = [
      "B-2001",
      "Karan Johar",
      "+91 99999 88888",
      new Date().toISOString().split("T")[0],
      "1000",
      "Antop Hill",
      "Loy Rego",
      "Active",
      "Regular customer sample notes"
    ];

    triggerCSVDownload("prezzo_booklets_template.csv", headers, [sampleRow]);
  };

  // Import booklets from CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const rows = parseCSV(text);

        if (rows.length <= 1) {
          throw new Error("The uploaded CSV file is empty or contains only headers.");
        }

        // Detect columns from headers
        const headers = rows[0].map(h => h.toLowerCase().trim());
        
        // Find indices or use default positioning
        const getIndex = (possibleNames: string[], defaultIdx: number) => {
          const idx = headers.findIndex(h => possibleNames.some(p => h.includes(p)));
          return idx !== -1 ? idx : defaultIdx;
        };

        const idIdx = getIndex(["id", "booklet id", "booklet_id"], 0);
        const nameIdx = getIndex(["name", "customer name", "customer_name", "customer"], 1);
        const phoneIdx = getIndex(["phone", "customer phone", "phone number", "customer_phone"], 2);
        const dateIdx = getIndex(["date", "date sold", "date_sold", "sold_date"], 3);
        const priceIdx = getIndex(["price", "paid", "price paid", "price_paid", "amount"], 4);
        const outletIdx = getIndex(["outlet", "sold at", "location", "outlet_sold_at"], 5);
        const staffIdx = getIndex(["staff", "sold by", "staff name", "sold_by_staff"], 6);
        const statusIdx = getIndex(["status", "active"], 7);
        const notesIdx = getIndex(["notes", "note", "comment"], 8);

        const newBooklets: Booklet[] = [];
        const seenIds = new Set<string>();

        // Parse data rows
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (row.length === 0 || (row.length === 1 && row[0] === "")) continue;

          // Extract values
          let bookletId = row[idIdx]?.trim() || "";
          const customerName = row[nameIdx]?.trim() || "Unknown Customer";
          const customerPhone = row[phoneIdx]?.trim() || "";
          const dateSold = row[dateIdx]?.trim() || new Date().toISOString().split("T")[0];
          const rawPrice = row[priceIdx]?.trim() || "1000";
          const pricePaid = isNaN(Number(rawPrice)) ? 1000 : Number(rawPrice);
          const outlet = row[outletIdx]?.trim() || "Antop Hill";
          const staffName = row[staffIdx]?.trim() || "Loy Rego";
          let statusRaw = row[statusIdx]?.trim() || "Active";
          let status: "Active" | "Inactive" | "Expired" = "Active";
          const lowerStatus = statusRaw.toLowerCase();
          if (lowerStatus === "inactive" || lowerStatus === "suspended") {
            status = "Inactive";
          } else if (lowerStatus === "expired") {
            status = "Expired";
          }
          const notes = row[notesIdx]?.trim() || undefined;

          // Generate sequential / unique ID if missing
          if (!bookletId) {
            bookletId = `B-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
          }

          // Avoid duplicates within the uploaded file
          if (seenIds.has(bookletId)) {
            continue;
          }
          seenIds.add(bookletId);

          newBooklets.push({
            id: bookletId,
            customerName,
            customerPhone,
            dateSold,
            pricePaid,
            outlet,
            staffName,
            status,
            notes
          });
        }

        if (newBooklets.length === 0) {
          throw new Error("No valid booklet records found in the CSV file.");
        }

        // Save to Database
        let finalBooklets: Booklet[] = [];
        if (csvImportMode === "replace") {
          finalBooklets = newBooklets;
        } else {
          // Append mode: avoid duplication of existing Booklet IDs
          const existingBooklets = [...booklets];
          const existingIds = new Set(existingBooklets.map(b => b.id));
          
          const filteredNew = newBooklets.filter(b => !existingIds.has(b.id));
          finalBooklets = [...filteredNew, ...existingBooklets];
        }

        // Update storage
        localStorage.setItem("prezzo_booklets", JSON.stringify(finalBooklets));
        onDataChange();

        setCsvCount(newBooklets.length);
        setCsvSuccess(true);
        setCsvError(null);
        setTimeout(() => setCsvSuccess(false), 5000);
      } catch (err: any) {
        setCsvError(err.message || "Failed to process CSV file. Ensure columns match the template.");
        setCsvSuccess(false);
      }
    };
    reader.readAsText(file);
    // Reset file input so user can upload the same file again
    e.target.value = "";
  };

  // Download logic for CSV Booklets
  const handleDownloadBookletsCSV = () => {
    const headers = [
      "Booklet ID", 
      "Customer Name", 
      "Customer Phone", 
      "Date Sold", 
      "Price Paid (INR)", 
      "Outlet Sold At", 
      "Sold By Staff", 
      "Status", 
      "Notes"
    ];
    
    const rows = booklets.map(b => [
      b.id,
      b.customerName,
      b.customerPhone,
      b.dateSold,
      String(b.pricePaid),
      b.outlet,
      b.staffName,
      b.status,
      b.notes || ""
    ]);

    triggerCSVDownload("prezzo_booklets_sales.csv", headers, rows);
  };

  // Download logic for CSV Redemptions
  const handleDownloadRedemptionsCSV = () => {
    const headers = [
      "Redemption ID",
      "Booklet ID",
      "Coupon Type",
      "Coupon Number",
      "Date Redeemed",
      "Bill Order Value (INR)",
      "Redeemed By Staff",
      "Outlet",
      "Notes"
    ];

    const rows = redemptions.map(r => [
      r.id,
      r.bookletId,
      r.couponType,
      String(r.couponIndex),
      r.dateRedeemed,
      String(r.orderValue),
      r.staffName,
      r.outlet,
      r.notes || ""
    ]);

    triggerCSVDownload("prezzo_coupon_redemptions.csv", headers, rows);
  };

  const triggerCSVDownload = (filename: string, headers: string[], rows: string[][]) => {
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      const formattedRow = row.map(val => {
        const escaped = String(val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(formattedRow.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Backup
  const handleExportJSON = () => {
    const backupStr = exportDatabaseBackup();
    const blob = new Blob([backupStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `prezzo_backup_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON Backup
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importDatabaseBackup(content);
      if (success) {
        setImportSuccess(true);
        setImportError(null);
        onDataChange();
        setTimeout(() => setImportSuccess(false), 3000);
      } else {
        setImportError("Failed to parse JSON file. Please make sure this is a valid Prezzo backup file.");
        setImportSuccess(false);
      }
    };
    reader.readAsText(file);
  };

  // Save PINs
  const handleSavePINs = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin.length < 4 || staffPin.length < 4) {
      setPasscodeError("Passcodes must be at least 4 digits or characters.");
      return;
    }

    savePasscodes(adminPin.trim(), staffPin.trim());
    setPasscodeSuccess(true);
    setPasscodeError(null);
    setTimeout(() => setPasscodeSuccess(false), 3000);
  };

  // Reset Database
  const handleResetDatabase = () => {
    const confirm1 = window.confirm(
      "⚠️ DANGER ZONE: This will restore the database back to default seed data, replacing all customized booklets or logged redemptions. Proceed?"
    );
    if (!confirm1) return;

    const confirm2 = window.confirm(
      "Are you absolutely sure? You will lose any booklets or redemptions that you did not export as backup."
    );
    if (!confirm2) return;

    initializeDatabase(true);
    onDataChange();
    alert("Database successfully reset to default seed data.");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-stone-800">
      <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-6">
          <Settings className="h-6 w-6 text-[#991B1B]" />
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">System & Backup Administration</h2>
            <p className="text-xs text-stone-500">Manage device passcodes, download sales reports, or restore backup archives</p>
          </div>
        </div>

        {/* Current status info banner */}
        <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 text-stone-700 flex items-start space-x-3 mb-6">
          <Database className="h-5 w-5 text-[#991B1B] flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-stone-900">100% Offline Static Deploy</h4>
            <p className="mt-1 text-xs text-stone-600 leading-relaxed">
              This app is fully optimized for GitHub Pages. All records are stored locally on your device.
              We recommend downloading a <strong className="text-stone-900 font-semibold">JSON Backup</strong> periodically to prevent data loss if browser caches are cleared.
            </p>
          </div>
        </div>

        {/* PIN Configuration Form */}
        {isAdmin ? (
          <form onSubmit={handleSavePINs} className="bg-stone-50 border border-stone-100 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono flex items-center gap-2 mb-4">
              <KeyRound size={16} className="text-[#991B1B]" />
              <span>Passcode Access Configuration</span>
            </h3>
            
            <div className="grid gap-4 sm:grid-cols-2 mb-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 font-mono">
                  Admin Passcode
                </label>
                <input
                  type="text"
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value)}
                  placeholder="e.g. 1973"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 font-mono">
                  Staff Passcode
                </label>
                <input
                  type="text"
                  value={staffPin}
                  onChange={(e) => setStaffPin(e.target.value)}
                  placeholder="e.g. 4321"
                  className="w-full px-3 py-2 border border-stone-200 rounded-xl text-stone-900 font-mono text-sm focus:outline-none focus:ring-1 focus:ring-[#991B1B] bg-white"
                />
              </div>
            </div>

            {passcodeError && (
              <p className="text-xs text-red-600 font-semibold mb-3">{passcodeError}</p>
            )}

            {passcodeSuccess && (
              <div className="flex items-center text-xs text-emerald-700 font-semibold gap-1 mb-3">
                <Check size={14} />
                <span>Passcodes saved successfully! Refresh page to apply.</span>
              </div>
            )}

            <button
              type="submit"
              className="px-4 py-2 bg-[#991B1B] hover:bg-[#7F1D1D] text-white font-semibold text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              Update Passcodes
            </button>
          </form>
        ) : (
          <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-medium leading-relaxed mb-6">
            <AlertTriangle className="h-4 w-4 inline mr-1 text-amber-600 align-text-bottom" />
            Passcode administration is locked. Please login with the Admin Passcode to configure access PINs.
          </div>
        )}

        {/* Data Downloads Section */}
        <div className="space-y-4 mb-6">
          <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono">
            Download Reports & Backup Archives
          </h3>

          <div className="grid gap-3 sm:grid-cols-3">
            {/* Download Booklets CSV */}
            <button
              type="button"
              onClick={handleDownloadBookletsCSV}
              className="flex items-center justify-center space-x-2.5 p-4 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-700 hover:text-stone-950 transition-all cursor-pointer text-left shadow-sm"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div className="truncate">
                <span className="block text-xs font-bold text-stone-900 leading-tight">Booklets Sold List</span>
                <span className="text-[10px] text-stone-500 font-mono">Export as .CSV</span>
              </div>
            </button>

            {/* Download Redemptions CSV */}
            <button
              type="button"
              onClick={handleDownloadRedemptionsCSV}
              className="flex items-center justify-center space-x-2.5 p-4 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-700 hover:text-stone-950 transition-all cursor-pointer text-left shadow-sm"
            >
              <FileSpreadsheet className="h-5 w-5 text-emerald-600 flex-shrink-0" />
              <div className="truncate">
                <span className="block text-xs font-bold text-stone-900 leading-tight">Redemption History</span>
                <span className="text-[10px] text-stone-500 font-mono">Export as .CSV</span>
              </div>
            </button>

            {/* Export JSON Backup */}
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center justify-center space-x-2.5 p-4 border border-stone-200 rounded-xl hover:bg-stone-50 text-stone-700 hover:text-stone-950 transition-all cursor-pointer text-left shadow-sm"
            >
              <FileJson className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <div className="truncate">
                <span className="block text-xs font-bold text-stone-900 leading-tight">System Backup</span>
                <span className="text-[10px] text-stone-500 font-mono">Export as .JSON</span>
              </div>
            </button>
          </div>
        </div>

        {/* CSV Booklet Import Section */}
        {isAdmin && (
          <div className="border-t border-stone-100 pt-6 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono">
                Bulk Booklet Import (.csv)
              </h3>
              <button
                type="button"
                onClick={handleDownloadCSVTemplate}
                className="text-[10px] font-mono font-bold text-[#991B1B] hover:underline flex items-center gap-1 cursor-pointer self-start sm:self-center"
              >
                <Download size={12} />
                Download Booklet CSV Template
              </button>
            </div>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Quickly import your actual existing booklet data. Fill out the downloaded CSV template in Microsoft Excel, Google Sheets, or Apple Numbers, then upload it below.
            </p>

            <div className="bg-stone-50 border border-stone-200/50 rounded-xl p-4 mb-4">
              <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider mb-2 font-mono">
                Import Method
              </span>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="csvImportMode"
                    checked={csvImportMode === "append"}
                    onChange={() => setCsvImportMode("append")}
                    className="text-[#991B1B] focus:ring-[#991B1B] accent-[#991B1B]"
                  />
                  <span>Append (Add to existing records)</span>
                </label>
                <label className="flex items-center space-x-2 text-xs font-semibold text-stone-700 cursor-pointer">
                  <input
                    type="radio"
                    name="csvImportMode"
                    checked={csvImportMode === "replace"}
                    onChange={() => setCsvImportMode("replace")}
                    className="text-[#991B1B] focus:ring-[#991B1B] accent-[#991B1B]"
                  />
                  <span>Overwrite (Replace all current booklets)</span>
                </label>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <label className="relative flex items-center justify-center space-x-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer border border-stone-300">
                <Upload size={14} />
                <span>Upload Booklet CSV</span>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="hidden"
                />
              </label>

              {csvSuccess && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Check size={14} />
                  Successfully imported {csvCount} booklet(s)!
                </span>
              )}

              {csvError && (
                <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {csvError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Restore Backup Section */}
        {isAdmin && (
          <div className="border-t border-stone-100 pt-6 mb-6">
            <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider font-mono mb-3">
              Restore System Backup (.json)
            </h3>
            <p className="text-xs text-stone-500 mb-4 leading-relaxed">
              Upload a previously exported <strong className="text-stone-800">.json</strong> backup file to completely restore booklets, redemptions, outlets, staff, and passcodes. This will overwrite the current active data.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <label className="relative flex items-center justify-center space-x-2 bg-stone-100 hover:bg-stone-200 text-stone-700 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer border border-stone-300">
                <Upload size={14} />
                <span>Upload JSON Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              {importSuccess && (
                <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                  <Check size={14} />
                  Backup restored successfully!
                </span>
              )}

              {importError && (
                <span className="text-xs text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {importError}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        {isAdmin && (
          <div className="border-t border-red-100 pt-6">
            <h3 className="text-sm font-bold text-red-800 uppercase tracking-wider font-mono mb-2">
              Danger Zone
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Restore this device's storage back to the default seed data (Amit Patel, Sneha Sharma, and Rohan Mehta demo booklet logs). This action cannot be undone.
            </p>
            <button
              onClick={handleResetDatabase}
              className="flex items-center space-x-1.5 px-4 py-2.5 bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Trash2 size={14} />
              <span>Reset Database to Seed Data</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
