/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Database, HelpCircle, CheckCircle, AlertTriangle, Play, RefreshCw } from "lucide-react";
import { SyncState } from "../types";

interface SheetSettingsProps {
  syncState: SyncState;
  onLinkSheet: (spreadsheetId: string) => Promise<void>;
  onInitializeSchema: () => Promise<void>;
  onSync: () => Promise<void>;
  isAdmin: boolean;
  token: string | null;
  onSaveToken: (token: string) => void;
  onRemoveToken: () => void;
  onGoogleLogin?: () => void;
}

const PRESET_SHEETS = [
  {
    id: "1WyE-409xzE1AtyvkEbBa8upOUdhxlyM8wzmKEDa-qAI",
    label: "AppSheet Live Sheet (1WyE...)",
    desc: "Google Sheet with sold booklets and redemptions data"
  },
  {
    id: "1Ej9Vc_T90NaShnzmJV8Vxqy5Sdg5eDo_8cuPyc2GvHc",
    label: "Main Booklets & Redemptions Sheet (1Ej9...)",
    desc: "Alternative customer database sheet"
  }
];

export default function SheetSettings({
  syncState,
  onLinkSheet,
  onInitializeSchema,
  onSync,
  isAdmin,
  token,
  onSaveToken,
  onRemoveToken,
  onGoogleLogin
}: SheetSettingsProps) {
  const [inputId, setInputId] = useState(syncState.spreadsheetId || "");
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState(token || "");
  const [tokenSuccess, setTokenSuccess] = useState<string | null>(null);

  const extractId = (urlOrId: string) => {
    const trimmed = urlOrId.trim();
    if (trimmed.includes("docs.google.com/spreadsheets/d/")) {
      const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : trimmed;
    }
    return trimmed;
  };

  const handleLink = async (id: string) => {
    const finalId = extractId(id);
    if (!finalId) {
      setActionError("Please provide a valid Spreadsheet ID or URL");
      return;
    }

    setLoading(true);
    setActionError(null);
    setSuccessMsg(null);
    try {
      await onLinkSheet(finalId);
      setInputId(finalId);
      setSuccessMsg("Spreadsheet successfully connected and validated!");
    } catch (e: any) {
      setActionError(e.message || "Failed to link spreadsheet. Please verify access rights.");
    } finally {
      setLoading(false);
    }
  };

  const handleInit = async () => {
    const confirm = window.confirm(
      "This will check the spreadsheet for required tabs (Booklets, Redemptions, Outlets, Staff) and initialize them with headers if they are missing. It will NOT overwrite any existing data. Proceed?"
    );
    if (!confirm) return;

    setLoading(true);
    setActionError(null);
    setSuccessMsg(null);
    try {
      await onInitializeSchema();
      setSuccessMsg("Required tables successfully checked/created! The sheet is ready.");
      await onSync();
    } catch (e: any) {
      setActionError(e.message || "Failed to initialize spreadsheet tabs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-stone-800">
      <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200">
        <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-6">
          <Database className="h-6 w-6 text-[#991B1B]" />
          <div>
            <h2 className="text-xl font-serif font-bold text-stone-900">Google Sheets Sync Configuration</h2>
            <p className="text-xs text-stone-500">Connect the application to your database spreadsheet for real-time tracking</p>
          </div>
        </div>

        {/* Sync Status Banner */}
        <div className={`p-4 rounded-xl border mb-6 flex items-start space-x-3 ${
          syncState.isLinked 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-[#991B1B]/5 border-[#991B1B]/15 text-[#991B1B]"
        }`}>
          {syncState.isLinked ? (
            <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-[#991B1B] flex-shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <h4 className="font-semibold text-stone-900">{syncState.isLinked ? "Connected to Google Sheet" : "Spreadsheet Link Required"}</h4>
            <p className="mt-1 text-xs opacity-95 text-stone-600">
              {syncState.isLinked 
                ? `Currently syncing in real-time with Spreadsheet ID: ${syncState.spreadsheetId}`
                : "No active Google Sheet is linked. Logged booklet sales and redemptions will only exist in memory until a spreadsheet is linked."}
            </p>
            {syncState.lastSyncTime && (
              <span className="inline-block mt-2 text-[10px] bg-stone-100 border border-stone-200 px-2.5 py-0.5 rounded-full font-mono text-stone-600">
                Last synced: {new Date(syncState.lastSyncTime).toLocaleString()}
              </span>
            )}
          </div>
          {syncState.isLinked && (
            <button
              onClick={onSync}
              disabled={syncState.isSyncing}
              className="flex items-center space-x-1.5 bg-white border border-stone-200 text-stone-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-stone-50 hover:text-stone-900 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={syncState.isSyncing ? "animate-spin" : ""} />
              <span>{syncState.isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          )}
        </div>

        {/* Set Spreadsheet Connection */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-serif font-bold text-stone-700 mb-2">Select Preset Spreadsheet</label>
            <div className="grid gap-3 sm:grid-cols-2">
              {PRESET_SHEETS.map((preset) => (
                <button
                  key={preset.id}
                  disabled={loading}
                  onClick={() => handleLink(preset.id)}
                  className={`text-left p-4 rounded-xl border text-sm transition-all cursor-pointer ${
                    syncState.spreadsheetId === preset.id
                      ? "border-[#991B1B] bg-[#991B1B]/5 shadow-sm ring-1 ring-[#991B1B]"
                      : "border-stone-200 hover:border-stone-300 hover:bg-stone-50/50"
                  }`}
                >
                  <div className={`font-semibold ${syncState.spreadsheetId === preset.id ? "text-[#991B1B]" : "text-stone-900"}`}>{preset.label}</div>
                  <div className="text-xs text-stone-500 mt-1">{preset.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-stone-100"></div>
            <span className="flex-shrink mx-4 text-stone-400 text-xs font-mono uppercase">OR CONNECT MANUAL SHEET</span>
            <div className="flex-grow border-t border-stone-100"></div>
          </div>

          <div>
            <label className="block text-sm font-serif font-bold text-stone-700 mb-2">Spreadsheet ID or full URL</label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                disabled={loading}
                className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] sm:text-sm bg-stone-50"
              />
              <button
                onClick={() => handleLink(inputId)}
                disabled={loading || !inputId}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl shadow-md text-sm font-semibold text-white bg-[#991B1B] hover:bg-[#7F1D1D] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>{loading ? "Linking..." : "Link"}</span>
              </button>
            </div>
          </div>

          {actionError && (
            <div className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 p-3 rounded-lg flex items-center space-x-1.5 leading-relaxed">
              <AlertTriangle size={14} className="flex-shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {successMsg && (
            <div className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-lg flex items-center space-x-1.5 leading-relaxed">
              <CheckCircle size={14} className="flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>

      {/* Google Sheets API Token Card (Optional) */}
      {isAdmin && (
        <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200">
          <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-4">
            <Database className="h-6 w-6 text-[#991B1B]" />
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900 font-sans">Google Sheets API Token Connection</h3>
              <p className="text-xs text-stone-500">Provide or authorize Google Sheets Access to sync data</p>
            </div>
          </div>

          {onGoogleLogin && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-150 rounded-xl">
              <h4 className="text-sm font-semibold text-emerald-900 mb-1.5">Recommended: Automatic Google Auth Connection</h4>
              <p className="text-xs text-stone-600 mb-3 leading-relaxed">
                Authenticate directly with Google to dynamically load, update, and manage your spreadsheets securely without manually pasting short-lived tokens.
              </p>
              <button
                onClick={onGoogleLogin}
                className="mt-1 flex items-center space-x-2.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M12.24 10.285V14.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.583-7.859-8s3.529-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l3.227-3.103C18.23 2.012 15.42 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.078-1.31-.176-1.879l-10.617-.33z"/>
                </svg>
                <span>Authorize / Refresh via Google Sign-In</span>
              </button>
            </div>
          )}

          {onGoogleLogin && (
            <div className="relative flex py-2 items-center mb-4">
              <div className="flex-grow border-t border-stone-100"></div>
              <span className="flex-shrink mx-3 text-stone-400 text-[9px] font-mono uppercase tracking-wider">or paste manual token (Expert)</span>
              <div className="flex-grow border-t border-stone-100"></div>
            </div>
          )}

          <p className="text-stone-600 text-sm leading-relaxed mb-4 font-sans">
            By default, this app operates in a secure, high-performance <strong>Offline/Local Mode</strong> using browser database storage. To sync with your Google Spreadsheet, paste a valid Google OAuth Access Token below.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5 font-sans">Google OAuth Access Token</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="password"
                  placeholder={token ? "••••••••••••••••••••••••••••••••" : "Paste your OAuth Access Token here"}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 min-w-0 block w-full px-4 py-2.5 rounded-xl border border-stone-200 text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#991B1B] focus:border-[#991B1B] sm:text-sm bg-stone-50 font-mono"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (tokenInput.trim()) {
                        onSaveToken(tokenInput.trim());
                        setTokenSuccess("Token saved successfully!");
                        setTimeout(() => setTokenSuccess(null), 3000);
                      }
                    }}
                    className="px-5 py-2.5 rounded-xl shadow-md text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors cursor-pointer"
                  >
                    Save
                  </button>
                  {token && (
                    <button
                      onClick={() => {
                        onRemoveToken();
                        setTokenInput("");
                        setTokenSuccess("Token removed.");
                        setTimeout(() => setTokenSuccess(null), 3000);
                      }}
                      className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 transition-colors text-sm font-semibold cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              {tokenSuccess && (
                <div className="mt-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-lg">
                  {tokenSuccess}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Initialize Schema Card (Admin Only) */}
      {syncState.isLinked && isAdmin && (
        <div className="bg-white shadow-md rounded-2xl p-6 border border-stone-200">
          <div className="flex items-center space-x-3 border-b border-stone-100 pb-4 mb-4">
            <HelpCircle className="h-6 w-6 text-emerald-600" />
            <div>
              <h3 className="text-lg font-serif font-bold text-stone-900">Initialize Google Sheet Schema</h3>
              <p className="text-xs text-stone-500">Ensure all required tables exist in your linked sheet</p>
            </div>
          </div>
          <p className="text-stone-600 text-sm leading-relaxed mb-4">
            This utility will check the current spreadsheet for our required tabs: <code className="bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-[#991B1B] font-mono text-xs">Booklets</code>, <code className="bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-[#991B1B] font-mono text-xs">Redemptions</code>, <code className="bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-[#991B1B] font-mono text-xs">Outlets</code>, and <code className="bg-stone-50 border border-stone-200 px-1.5 py-0.5 rounded text-[#991B1B] font-mono text-xs">Staff</code>. If any are missing, it will safely append them as new tabs and initialize the correct headers. It will <strong>NOT</strong> delete or overwrite any of your existing sheet columns or records.
          </p>
          <button
            onClick={handleInit}
            disabled={loading}
            className="flex items-center space-x-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm px-5 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer disabled:opacity-50"
          >
            <Play size={16} />
            <span>Verify & Structure Spreadsheet Tabs</span>
          </button>
        </div>
      )}
    </div>
  );
}
